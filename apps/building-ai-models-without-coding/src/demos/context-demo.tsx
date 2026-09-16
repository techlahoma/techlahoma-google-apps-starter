import {
  PaperAirplaneIcon,
  SparklesIcon,
  StopIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {useEffect, useState, type FormEvent} from 'react';

import {
  SystemDiagram,
  type SystemDiagramState,
} from '../components/system-diagram';
import {Button} from '../components/ui/button';
import {CopyButton} from '../components/ui/copy-button';
import {getCorpus, groundingPrompt, type DocumentChunk} from '../corpus';
import {ModelClient} from '../model-client';
import {
  DocumentContext,
  SourceReceipt,
  summarizeDocuments,
} from './document-context';

type RunResult =
  | {kind: 'pending'}
  | {kind: 'complete'; answer: string}
  | {kind: 'failed'; message: string};

interface ContextRun {
  id: number;
  question: string;
  prompt: string;
  supplied: readonly DocumentChunk[];
  result: RunResult;
}

function freezeSources(sources: readonly DocumentChunk[]): DocumentChunk[] {
  return sources.map(source => ({...source}));
}

function progressState(message: string): SystemDiagramState {
  return message.startsWith('Generating') ? 'generating' : 'loading';
}

export function ContextDemo() {
  const [client] = useState(() => new ModelClient());
  const [question, setQuestion] = useState('What should I bring?');
  const [includeContext, setIncludeContext] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    'Ready. Pick an email or ask about the samples.',
  );
  const [prompt, setPrompt] = useState(
    'Run a question to inspect the exact prompt.',
  );
  const [diagramState, setDiagramState] = useState<SystemDiagramState>('idle');
  const [runId, setRunId] = useState(0);
  const [documents, setDocuments] = useState(getCorpus);
  const [activeSuppliedCount, setActiveSuppliedCount] = useState<number | null>(
    null,
  );
  const [runs, setRuns] = useState<ContextRun[]>([]);

  useEffect(() => () => client.cancel(), [client]);

  const updateRun = (id: number, update: Partial<ContextRun>) => {
    setRuns(current =>
      current.map(run => (run.id === id ? {...run, ...update} : run)),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || busy) return;

    const supplied = freezeSources(
      includeContext ? getCorpus().slice(0, 6) : [],
    );
    const exactPrompt = includeContext
      ? groundingPrompt(cleanQuestion, supplied)
      : cleanQuestion;
    const id = Date.now();
    setRuns(current => [
      ...current,
      {
        id,
        question: cleanQuestion,
        prompt: exactPrompt,
        supplied,
        result: {kind: 'pending'},
      },
    ]);
    setRunId(current => current + 1);
    setPrompt(exactPrompt);
    setBusy(true);
    setActiveSuppliedCount(supplied.length);
    setDiagramState('context');
    setStatus(`Building a prompt with ${supplied.length} source chunks…`);

    try {
      setDiagramState('loading');
      const request = client.run(
        {kind: 'generate', prompt: exactPrompt},
        message => {
          setDiagramState(progressState(message));
          setStatus(message);
        },
      );
      const result = await request;
      if (result.kind !== 'text') throw new Error('Unexpected model response.');
      updateRun(id, {
        result: {
          kind: 'complete',
          answer: result.text || '(The model produced no text.)',
        },
      });
      setDiagramState('answer');
      setStatus(
        `Finished locally. ${supplied.length} source chunks supplied; model weights unchanged.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateRun(id, {result: {kind: 'failed', message}});
      setDiagramState('idle');
      setStatus(message);
    } finally {
      setBusy(false);
      setActiveSuppliedCount(null);
    }
  };

  const previewSuppliedCount = includeContext
    ? Math.min(6, documents.length)
    : 0;

  return (
    <section className="space-y-6">
      <p className="description max-w-3xl">
        This experiment answers a practical question about pretend emails. You
        choose which files enter the context, inspect the exact prompt, and
        compare what Gemma says with or without those notes. The model is
        prompted, not retrained.
      </p>

      <div className="demo-system-layout grid gap-6 min-[1101px]:grid-cols-[minmax(0,1fr)_15.625rem] min-[1101px]:items-start">
        <div className="demo-system-main min-w-0 space-y-6">
          <DocumentContext
            disabled={busy}
            onChange={(nextDocuments, message) => {
              setDocuments(nextDocuments);
              setActiveSuppliedCount(null);
              setDiagramState('sources');
              setStatus(message);
            }}
          />

          <section
            className="overflow-hidden rounded-md border border-[var(--border)]"
            aria-label="Chat"
          >
            <p className="description m-0 border-b border-[var(--border)] px-4 py-2">
              Each question is an independent model run. Earlier requests are
              saved below but are not sent again.
            </p>
            <div className="max-h-[34rem] min-h-56 space-y-5 overflow-y-auto bg-[#101114] p-4">
              {runs.length === 0 ? (
                <div className="mx-auto max-w-md py-12 text-center">
                  <SparklesIcon
                    className="mx-auto size-7 text-[var(--accent)]"
                    aria-hidden="true"
                  />
                  <h3 className="mb-1 mt-3 text-base">
                    Ask about the attached files
                  </h3>
                  <p className="description m-0">
                    Try “What should I bring?” or “Is the room accessible?”
                  </p>
                </div>
              ) : (
                runs.map(run => (
                  <article key={run.id} className="space-y-3">
                    <div className="ml-auto flex max-w-[85%] gap-3">
                      <UserIcon
                        className="mt-1 size-5 shrink-0"
                        aria-hidden="true"
                      />
                      <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                        <p className="m-0 whitespace-pre-wrap">
                          {run.question}
                        </p>
                        <span className="description mt-1 block text-xs">
                          {run.supplied.length > 0
                            ? `${run.supplied.length} chunks selected for this request`
                            : 'No file context supplied'}
                        </span>
                      </div>
                    </div>
                    <div className="answer flex max-w-[92%] gap-3">
                      <SparklesIcon
                        className="mt-1 size-5 shrink-0 text-[var(--accent)]"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                        {run.result.kind === 'pending' && (
                          <p className="description m-0">
                            Model run in progress…
                          </p>
                        )}
                        {run.result.kind === 'complete' && (
                          <p className="m-0 whitespace-pre-wrap">
                            {run.result.answer}
                          </p>
                        )}
                        {run.result.kind === 'failed' && (
                          <p className="error m-0">{run.result.message}</p>
                        )}
                        <SourceReceipt
                          prompt={run.prompt}
                          retrieved={[]}
                          supplied={run.supplied}
                          generationRequested
                        />
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>

            <form
              className="space-y-3 border-t border-[var(--border)] p-4"
              onSubmit={event => void submit(event)}
            >
              <label className="m-0" htmlFor="context-question">
                Your question
              </label>
              <textarea
                id="context-question"
                value={question}
                maxLength={1000}
                rows={3}
                required
                disabled={busy}
                onChange={event => {
                  setQuestion(event.currentTarget.value);
                  if (!busy) setDiagramState('sources');
                }}
              />
              <div className="flex flex-wrap items-center gap-3">
                <label className="m-0 inline-flex items-center gap-2 font-normal">
                  <input
                    type="checkbox"
                    checked={includeContext}
                    disabled={busy}
                    onChange={event => {
                      setIncludeContext(event.currentTarget.checked);
                      setDiagramState('sources');
                    }}
                  />
                  Include attached files
                </label>
                <div className="ml-auto flex gap-2">
                  {busy && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => client.cancel()}
                    >
                      <StopIcon className="size-4" aria-hidden="true" /> Cancel
                    </Button>
                  )}
                  <Button type="submit" disabled={busy || !question.trim()}>
                    <PaperAirplaneIcon className="size-4" aria-hidden="true" />{' '}
                    Ask Gemma
                  </Button>
                </div>
              </div>
            </form>
          </section>

          <p className="status" role="status">
            {status}
          </p>

          <details>
            <summary>Latest prompt · inspect what the model sees</summary>
            <div className="relative">
              <pre tabIndex={0} className="pr-14">
                <code>{prompt}</code>
              </pre>
              <div className="absolute right-2 top-2">
                <CopyButton value={prompt} label="Copy exact prompt" />
              </div>
            </div>
          </details>
        </div>

        <aside className="demo-system-rail sticky top-0 z-10 order-first min-[1101px]:top-5 min-[1101px]:order-last">
          <SystemDiagram
            state={diagramState}
            runId={runId}
            sources={summarizeDocuments(documents)}
            suppliedChunkCount={activeSuppliedCount ?? previewSuppliedCount}
          />
        </aside>
      </div>
    </section>
  );
}
