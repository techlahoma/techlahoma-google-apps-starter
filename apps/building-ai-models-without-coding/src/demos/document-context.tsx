import {
  DocumentArrowUpIcon,
  EnvelopeIcon,
  PaperClipIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {useId, useState} from 'react';

import {CopyButton} from '../components/ui/copy-button';
import type {SystemDiagramSource} from '../components/system-diagram';
import {
  addSampleDocument,
  getCorpus,
  importCorpus,
  MAX_FILE_BYTES,
  removeCorpusDocument,
  restoreExampleCorpus,
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
    <details className="request-receipt mt-3 border-t border-[var(--border)] pt-2">
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
  const [documents, setDocuments] = useState(getCorpus);
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
      importCorpus(imported);
      commit(
        `Replaced the current documents with ${selected.length} local ${selected.length === 1 ? 'file' : 'files'}.`,
      );
    } catch (error) {
      onChange(
        documents,
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const restore = () => {
    restoreExampleCorpus();
    commit('All synthetic email samples restored.');
  };

  const removeDocument = (id: string) => {
    for (const document of documents) {
      if (documentKey(document) === id) removeCorpusDocument(document.id);
    }
    commit('Local document removed from the model context.');
  };

  return (
    <section className="space-y-3" aria-labelledby={`${inputId}-heading`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id={`${inputId}-heading`} className="m-0 text-base font-semibold">
            Files in this conversation
          </h3>
          <p className="description m-0">
            Add a pretend email instantly, or choose your own text files.
            Uploading replaces the current documents. Everything stays in this
            tab.
          </p>
        </div>
        <label
          className="m-0 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] px-3 py-2 font-medium hover:bg-[#2b303b]"
          htmlFor={inputId}
        >
          <DocumentArrowUpIcon className="size-5" aria-hidden="true" />
          Upload files
        </label>
        <input
          hidden
          id={inputId}
          type="file"
          accept=".txt,.md,.json,.eml"
          multiple
          disabled={disabled}
          onChange={event => void upload(event.currentTarget.files)}
        />
      </div>

      {documentSummaries.some(document => document.kind === 'local file') && (
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

      <div className="grid gap-2 sm:grid-cols-2">
        {sampleCorpus.map(sample => {
          const selected = documents.some(
            document => document.id === sample.id,
          );
          return (
            <button
              key={sample.id}
              className="flex min-h-0 items-start gap-3 p-3 text-left"
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggleSample(sample.id)}
            >
              <EnvelopeIcon
                className="mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <span>
                <span className="block font-medium">
                  {sample.title.replace('Synthetic ', '')}
                </span>
                <span className="description block">
                  {selected ? 'Added · click to remove' : 'Click to add'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PaperClipIcon className="size-4" aria-hidden="true" />
        <span className="description">
          {documentCount} {documentCount === 1 ? 'document' : 'documents'} ·{' '}
          {documents.length} {documents.length === 1 ? 'chunk' : 'chunks'}{' '}
          attached
        </span>
        <button
          className="min-h-0 px-2 py-1 text-xs"
          type="button"
          disabled={disabled}
          onClick={restore}
        >
          Restore samples
        </button>
      </div>
    </section>
  );
}
