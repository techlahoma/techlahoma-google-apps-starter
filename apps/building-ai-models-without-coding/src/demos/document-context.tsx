import {
  DocumentArrowUpIcon,
  EnvelopeIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';
import {useId, useState} from 'react';

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

export function DocumentContext({disabled, onChange}: DocumentContextProps) {
  const inputId = useId();
  const [documents, setDocuments] = useState(getCorpus);

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
        `Added ${selected.length} local ${selected.length === 1 ? 'file' : 'files'}.`,
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

  return (
    <section className="space-y-3" aria-labelledby={`${inputId}-heading`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id={`${inputId}-heading`} className="m-0 text-base font-semibold">
            Files in this conversation
          </h3>
          <p className="description m-0">
            Add a pretend email instantly, or choose your own text files.
            Everything stays in this tab.
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
