import {
  DocumentArrowUpIcon,
  EnvelopeIcon,
  PaperClipIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {useEffect, useId, useRef, useState} from 'react';

import {CopyButton} from '../components/ui/copy-button';
import {Button} from '../components/ui/button';
import type {SystemDiagramSource} from '../components/system-diagram';
import {
  addSampleDocument,
  clearCorpus,
  getCorpus,
  importCorpus,
  MAX_FILE_BYTES,
  removeCorpusDocument,
  sampleCorpus,
  type DocumentChunk,
} from '../corpus';

interface DocumentContextProps {
  disabled: boolean;
  onChange: (documents: DocumentChunk[], message: string) => void;
}

interface SourceReceiptProps {
  prompt: string;
  retrieved: readonly DocumentChunk[];
  supplied: readonly DocumentChunk[];
  generationRequested: boolean;
}

type PreviewTarget =
  {kind: 'sample'; id: string} | {kind: 'uploaded'; id: string};

function documentKey(document: DocumentChunk): string {
  if (document.source === 'synthetic') return document.id;
  return document.id.split(':', 1)[0] ?? document.id;
}

export function countDocuments(documents: readonly DocumentChunk[]): number {
  return summarizeDocuments(documents).length;
}

export function summarizeDocuments(
  documents: readonly DocumentChunk[],
): SystemDiagramSource[] {
  const summaries = new Map<string, SystemDiagramSource>();
  for (const document of documents) {
    const id = documentKey(document);
    const existing = summaries.get(id);
    if (existing) {
      summaries.set(id, {...existing, chunkCount: existing.chunkCount + 1});
      continue;
    }
    summaries.set(id, {
      id,
      title:
        document.source === 'local file'
          ? document.title.replace(/ · \d+$/, '')
          : document.title,
      chunkCount: 1,
      kind: document.source,
    });
  }
  return [...summaries.values()];
}

function SourceList({
  label,
  sources,
}: {
  label: string;
  sources: readonly DocumentChunk[];
}) {
  return (
    <div>
      <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label} · {sources.length}
      </p>
      {sources.length === 0 ? (
        <p className="description m-0 text-xs">None</p>
      ) : (
        <ol className="m-0 space-y-2 pl-5">
          {sources.map((source, index) => (
            <li key={`${source.id}:${index}`}>
              <details className="m-0 border-0">
                <summary className="min-h-0 py-1 text-sm">
                  {source.title}
                </summary>
                <pre className="mt-1 max-h-48" tabIndex={0}>
                  <code>{source.text}</code>
                </pre>
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function SourceReceipt({
  prompt,
  retrieved,
  supplied,
  generationRequested,
}: SourceReceiptProps) {
  return (
    <details className="chat-details request-receipt mt-3 border-t border-[var(--border)] pt-2">
      <summary className="min-h-0 py-1 text-xs text-[var(--accent)]">
        {generationRequested
          ? `Request receipt · ${supplied.length} ${supplied.length === 1 ? 'chunk' : 'chunks'} selected for model prompt`
          : `Request receipt · ${retrieved.length} ${retrieved.length === 1 ? 'chunk' : 'chunks'} retrieved · prompt prepared`}
      </summary>
      <p className="description mb-2 text-xs">
        This freezes what the app retrieved and supplied for this request.
        {generationRequested
          ? ' A local model response was requested; the result status above shows whether execution finished.'
          : ' The prompt was prepared, but generation was not requested.'}{' '}
        The app cannot observe which supplied text influenced the model
        internally.
      </p>
      <SourceList label="Retrieved" sources={retrieved} />
      <SourceList
        label={
          generationRequested
            ? 'Selected for model prompt'
            : 'Selected for prepared prompt'
        }
        sources={supplied}
      />
      <div className="relative mt-3">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Exact prompt
        </p>
        <pre className="max-h-64 pr-14" tabIndex={0}>
          <code>{prompt}</code>
        </pre>
        <div className="absolute right-2 top-7">
          <CopyButton value={prompt} label="Copy this request prompt" />
        </div>
      </div>
    </details>
  );
}

export function DocumentContext({disabled, onChange}: DocumentContextProps) {
  const inputId = useId();
  const dialogTitleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentSummaryRef = useRef<HTMLElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mountedRef = useRef(true);
  const [documents, setDocuments] = useState(getCorpus);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(
    null,
  );
  const documentCount = countDocuments(documents);
  const documentSummaries = summarizeDocuments(documents);

  const commit = (message: string) => {
    const next = getCorpus();
    setDocuments(next);
    onChange(next, message);
  };

  const toggleSample = (id: string) => {
    try {
      if (documents.some(document => document.id === id)) {
        removeCorpusDocument(id);
        commit('Sample removed from the model context.');
      } else {
        addSampleDocument(id);
        commit('Sample added to the model context.');
      }
    } catch (error) {
      onChange(
        documents,
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const upload = async (files: FileList | null) => {
    try {
      const selected = Array.from(files ?? []);
      if (!selected.length) return;
      if (selected.length > 8) throw new Error('Choose at most 8 files.');
      if (selected.some(file => file.size > MAX_FILE_BYTES))
        throw new Error('Each file must be at most 64 KiB.');
      const imported = await Promise.all(
        selected.map(async file => ({
          name: file.name,
          text: await file.text(),
        })),
      );
      if (!mountedRef.current) return;
      importCorpus(imported);
      commit(
        `Added ${selected.length} local ${selected.length === 1 ? 'file' : 'files'} to the attachments.`,
      );
    } catch (error) {
      onChange(
        documents,
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  useEffect(() => {
    if (previewTarget && !dialogRef.current?.open)
      dialogRef.current?.showModal();
  }, [previewTarget]);

  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  const removeDocument = (id: string) => {
    for (const document of documents) {
      if (documentKey(document) === id) removeCorpusDocument(document.id);
    }
    commit('Local document removed from the model context.');
  };

  const clearDocuments = () => {
    clearCorpus();
    commit('All attachments removed.');
  };

  const openPreview = (target: PreviewTarget, trigger: HTMLButtonElement) => {
    previewTriggerRef.current = trigger;
    setPreviewTarget(target);
  };

  const closePreview = () => dialogRef.current?.close();

  const previewSources =
    previewTarget?.kind === 'sample'
      ? sampleCorpus.filter(source => source.id === previewTarget.id)
      : previewTarget?.kind === 'uploaded'
        ? documents.filter(
            document => documentKey(document) === previewTarget.id,
          )
        : [];
  const previewTitle =
    previewTarget?.kind === 'sample'
      ? sampleCorpus.find(source => source.id === previewTarget.id)?.title
      : previewTarget?.kind === 'uploaded'
        ? documentSummaries.find(document => document.id === previewTarget.id)
            ?.title
        : undefined;
  const previewSampleSelected =
    previewTarget?.kind === 'sample' &&
    documents.some(document => document.id === previewTarget.id);

  return (
    <>
      <details className="chat-tools">
        <summary ref={attachmentSummaryRef}>
          <span className="inline-flex items-center gap-2">
            <PaperClipIcon className="size-4" aria-hidden="true" />
            Attachments
            <span className="description text-xs">
              {documentCount} {documentCount === 1 ? 'document' : 'documents'} ·{' '}
              {documents.length} {documents.length === 1 ? 'chunk' : 'chunks'}
            </span>
          </span>
        </summary>
        <section
          className="space-y-3 pb-2"
          aria-labelledby={`${inputId}-heading`}
        >
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3
                id={`${inputId}-heading`}
                className="m-0 text-sm font-semibold"
              >
                Files in this conversation
              </h3>
              <p className="description m-0 text-xs">
                Preview a pretend file before adding it, or upload local text.
                Uploads are added to the current attachments and stay in this
                tab.
              </p>
            </div>
            <button
              className="m-0 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[#2b303b]"
              type="button"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              <DocumentArrowUpIcon className="size-4" aria-hidden="true" />
              Upload files
            </button>
            <input
              ref={fileInputRef}
              hidden
              id={inputId}
              type="file"
              aria-label="Upload files"
              accept=".txt,.md,.json,.eml"
              multiple
              disabled={disabled}
              onChange={event => {
                const input = event.currentTarget;
                void upload(input.files).finally(() => {
                  input.value = '';
                });
              }}
            />
          </div>

          {documentSummaries.some(
            document => document.kind === 'local file',
          ) && (
            <div>
              <p className="description mb-2 text-xs">Uploaded documents</p>
              <ul className="m-0 space-y-1 p-0" role="list">
                {documentSummaries
                  .filter(document => document.kind === 'local file')
                  .map(document => (
                    <li
                      key={document.id}
                      className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2"
                    >
                      <DocumentArrowUpIcon
                        className="size-4 shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {document.title}
                      </span>
                      <span className="description shrink-0 text-xs">
                        {document.chunkCount}{' '}
                        {document.chunkCount === 1 ? 'chunk' : 'chunks'}
                      </span>
                      <button
                        className="min-h-0 px-2 py-1 text-xs"
                        type="button"
                        aria-label={`Preview ${document.title}`}
                        disabled={disabled}
                        onClick={event =>
                          openPreview(
                            {kind: 'uploaded', id: document.id},
                            event.currentTarget,
                          )
                        }
                      >
                        Preview
                      </button>
                      <button
                        className="min-h-0 p-1"
                        type="button"
                        aria-label={`Remove ${document.title}`}
                        disabled={disabled}
                        onClick={() => removeDocument(document.id)}
                      >
                        <XMarkIcon className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div>
            <p className="description mb-2 text-xs">Sample files</p>
            <ul className="m-0 space-y-1 p-0" role="list">
              {sampleCorpus.map(sample => {
                const selected = documents.some(
                  document => document.id === sample.id,
                );
                return (
                  <li
                    key={sample.id}
                    className="flex items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2"
                  >
                    <EnvelopeIcon
                      className="size-4 shrink-0 text-[var(--accent)]"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {sample.title.replace('Synthetic ', '')}
                    </span>
                    {selected && (
                      <span className="description shrink-0 text-xs">
                        Attached
                      </span>
                    )}
                    <button
                      className="min-h-0 px-2 py-1 text-xs"
                      type="button"
                      aria-label={`Preview ${sample.title.replace('Synthetic ', '')}`}
                      disabled={disabled}
                      onClick={event =>
                        openPreview(
                          {kind: 'sample', id: sample.id},
                          event.currentTarget,
                        )
                      }
                    >
                      Preview
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="description text-xs">
              {documentCount} {documentCount === 1 ? 'document' : 'documents'} ·{' '}
              {documents.length} {documents.length === 1 ? 'chunk' : 'chunks'}{' '}
              attached
            </span>
            <button
              className="min-h-0 px-2 py-1 text-xs"
              type="button"
              disabled={disabled}
              onClick={clearDocuments}
            >
              Clear attachments
            </button>
          </div>
        </section>
      </details>

      <dialog
        ref={dialogRef}
        className="source-preview"
        aria-labelledby={dialogTitleId}
        onClose={() => {
          setPreviewTarget(null);
          const trigger = previewTriggerRef.current;
          if (trigger?.isConnected) trigger.focus();
          else attachmentSummaryRef.current?.focus();
        }}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow m-0">FILE PREVIEW</p>
            <h3 id={dialogTitleId} className="mb-1 mt-1 text-lg">
              {previewTitle ?? 'Source file'}
            </h3>
            <p className="description m-0 text-xs">
              {previewSources.length} source{' '}
              {previewSources.length === 1 ? 'chunk' : 'chunks'}
            </p>
          </div>
          <button
            className="min-h-0 p-2"
            type="button"
            aria-label="Close file preview"
            onClick={closePreview}
          >
            <XMarkIcon className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="my-4 space-y-3">
          {previewSources.map(source => (
            <article key={source.id}>
              <h4 className="mb-1 mt-0 text-sm">{source.title}</h4>
              <pre className="m-0 max-h-72" tabIndex={0}>
                <code>{source.text}</code>
              </pre>
            </article>
          ))}
        </div>

        <footer className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={closePreview}>
            Close
          </Button>
          {previewTarget?.kind === 'sample' && (
            <Button
              type="button"
              onClick={() => {
                toggleSample(previewTarget.id);
                closePreview();
              }}
            >
              {previewSampleSelected ? 'Remove sample' : 'Add sample'}
            </Button>
          )}
          {previewTarget?.kind === 'uploaded' && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                removeDocument(previewTarget.id);
                closePreview();
              }}
            >
              Remove file
            </Button>
          )}
        </footer>
      </dialog>
    </>
  );
}
