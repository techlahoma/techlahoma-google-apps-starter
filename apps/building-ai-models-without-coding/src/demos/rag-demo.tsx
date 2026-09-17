import {
  BeakerIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import {useEffect, useState, type FormEvent} from 'react';

import {
  SystemDiagram,
  type SystemDiagramState,
} from '../components/system-diagram';
import {Button} from '../components/ui/button';
import {CopyButton} from '../components/ui/copy-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  getCorpus,
  groundingPrompt,
  sampleCorpus,
  type DocumentChunk,
} from '../corpus';
import {ModelClient} from '../model-client';
import {
  hybridSearch,
  lexicalSearch,
  semanticSearch,
  type RetrievalMode,
  type SearchHit,
} from '../retrieval';
import {
  DocumentContext,
  SourceReceipt,
  summarizeDocuments,
} from './document-context';

interface EvaluationResult {
  question: string;
  expected: string;
  lexical: string;
  semantic: string;
  hybrid: string;
}

type RagRunResult =
  | {kind: 'pending'}
  | {kind: 'complete'; outcome: 'no-results'}
  | {kind: 'complete'; outcome: 'sources-only'}
  | {kind: 'complete'; outcome: 'answer'; answer: string}
  | {kind: 'failed'; message: string};

interface RagRun {
  id: number;
  question: string;
  mode: RetrievalMode;
  ranked: readonly SearchHit[];
  retrieved: readonly DocumentChunk[];
  supplied: readonly DocumentChunk[];
  prompt: string;
  generationRequested: boolean;
  result: RagRunResult;
}

const fixtures = [
  {question: 'What should I bring?', expected: 'equipment'},
  {question: 'Where can I leave my bike?', expected: 'transit'},
  {question: 'Which symbol says we are ready to rehearse?', expected: 'emoji'},
];

const scoreNames: Record<RetrievalMode, string> = {
  lexical: 'BM25 score',
  semantic: 'cosine similarity',
  hybrid: 'RRF rank score',
};

function resultLabel(hits: SearchHit[], expected: string): string {
  const rank = hits.findIndex(hit => hit.document.id === expected) + 1;
  return `${rank ? `#${rank}` : 'miss'} · ${hits[0]?.document.id ?? 'no result'}`;
}

function normalizedPercentage(score: number, hits: SearchHit[]): number {
  const highest = Math.max(...hits.map(hit => Math.max(0, hit.score)), 0);
  if (highest === 0) return 0;
  return Math.round((Math.max(0, score) / highest) * 100);
}

function freezeSources(sources: readonly DocumentChunk[]): DocumentChunk[] {
  return sources.map(source => ({...source}));
}

function RankedSources({run, latest}: {run: RagRun; latest: boolean}) {
  if (run.ranked.length === 0) return null;
  return (
    <section
      className="mt-3"
      aria-labelledby={latest ? 'ranked-sources-heading' : undefined}
    >
      <h4
        id={latest ? 'ranked-sources-heading' : undefined}
        className="mb-1 mt-0 text-sm font-semibold"
      >
        Ranked sources
      </h4>
      <p className="description mt-0 text-xs">
        Percentages are normalized within this result set, not confidence
        probabilities. Focus or hover one for the raw {scoreNames[run.mode]}.
      </p>
      <Table>
        <caption className="sr-only">Retrieved source ranking</caption>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Match</TableHead>
            <TableHead className="hidden sm:table-cell">Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {run.ranked.map((hit, index) => (
            <TableRow key={hit.document.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <h4 className="m-0 text-sm font-medium">
                  [{index + 1}] {hit.document.title}
                </h4>
                <span className="description block text-xs">
                  {hit.document.source}
                </span>
              </TableCell>
              <TableCell>
                <span
                  className="inline-block whitespace-nowrap rounded-sm px-1 focus-visible:outline"
                  tabIndex={0}
                  title={`${scoreNames[run.mode]}: ${hit.score.toFixed(6)}`}
                >
                  {normalizedPercentage(hit.score, [...run.ranked])}%
                </span>
              </TableCell>
              <TableCell className="hidden max-w-md sm:table-cell">
                {hit.document.text}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}

export function RagDemo() {
  const [question, setQuestion] = useState('What should I bring?');
  const [mode, setMode] = useState<RetrievalMode>('hybrid');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    'Ready. Retrieval runs locally in your browser.',
  );
  const [diagramState, setDiagramState] = useState<SystemDiagramState>('idle');
  const [runId, setRunId] = useState(0);
  const [documents, setDocuments] = useState(getCorpus);
  const [activeSuppliedCount, setActiveSuppliedCount] = useState(0);
  const [prompt, setPrompt] = useState(
    'Find sources to inspect the exact grounded prompt.',
  );
  const [runs, setRuns] = useState<RagRun[]>([]);
  const [evaluation, setEvaluation] = useState<EvaluationResult[]>([]);
  const [client] = useState(() => new ModelClient());

  useEffect(() => () => client.cancel(), [client]);

  const updateRun = (id: number, update: Partial<RagRun>) => {
    setRuns(current =>
      current.map(run => (run.id === id ? {...run, ...update} : run)),
    );
  };

  const retrieve = async (
    query: string,
    selectedMode: RetrievalMode,
  ): Promise<SearchHit[]> => {
    const corpus = getCorpus();
    const lexical = lexicalSearch(query, corpus);
    if (selectedMode === 'lexical') return lexical;

    setDiagramState('loading');
    setStatus('Loading EmbeddingGemma 300M and comparing document vectors…');
    const result = await client.run(
      {
        kind: 'embed',
        texts: [
          `task: search result | query: ${query}`,
          ...corpus.map(
            document => `title: ${document.title} | text: ${document.text}`,
          ),
        ],
      },
      message => {
        setDiagramState(
          message.startsWith('Embedding') ? 'generating' : 'loading',
        );
        setStatus(message);
      },
    );
    if (result.kind !== 'vectors')
      throw new Error('Unexpected embedding response.');
    const semantic = semanticSearch(corpus, result.vectors);
    return selectedMode === 'semantic'
      ? semantic
      : hybridSearch(lexical, semantic);
  };

  const execute = async (generate: boolean) => {
    const query = question.trim();
    if (!query || busy) return;
    const id = Date.now();
    const emptyPrompt = groundingPrompt(query, []);
    setRuns(current => [
      ...current,
      {
        id,
        question: query,
        mode,
        ranked: [],
        retrieved: [],
        supplied: [],
        prompt: emptyPrompt,
        generationRequested: generate,
        result: {kind: 'pending'},
      },
    ]);
    setRunId(current => current + 1);
    setBusy(true);
    setActiveSuppliedCount(0);
    setDiagramState('sources');
    setStatus(`Ranking attached files with ${mode} search…`);

    try {
      const ranked = await retrieve(query, mode);
      const top = ranked.slice(0, 3);
      const frozenRanked = top.map(hit => ({
        score: hit.score,
        document: {...hit.document},
      }));
      const retrieved = freezeSources(top.map(hit => hit.document));
      const exactPrompt = groundingPrompt(query, retrieved);
      setPrompt(exactPrompt);
      setDiagramState('context');

      if (!top.length) {
        updateRun(id, {
          retrieved,
          ranked: frozenRanked,
          prompt: exactPrompt,
          result: {kind: 'complete', outcome: 'no-results'},
        });
        setStatus(
          mode === 'lexical'
            ? 'No keyword matches. Try different wording or semantic search.'
            : 'No matching sources. Try different wording or another retrieval method.',
        );
        return;
      }

      if (!generate) {
        updateRun(id, {
          retrieved,
          ranked: frozenRanked,
          prompt: exactPrompt,
          result: {kind: 'complete', outcome: 'sources-only'},
        });
        setStatus(
          `Retrieved ${top.length} sources. Percentages are normalized within this result set.`,
        );
        return;
      }

      const supplied = freezeSources(retrieved);
      setActiveSuppliedCount(supplied.length);
      updateRun(id, {
        retrieved,
        ranked: frozenRanked,
        supplied,
        prompt: exactPrompt,
      });
      setDiagramState('loading');
      setStatus('Preparing Gemma with the retrieved evidence…');
      const request = client.run(
        {kind: 'generate', prompt: exactPrompt},
        message => {
          setDiagramState(
            message.startsWith('Generating') ? 'generating' : 'loading',
          );
          setStatus(message);
        },
      );
      const result = await request;
      if (result.kind !== 'text')
        throw new Error('Unexpected generation response.');
      updateRun(id, {
        result: {
          kind: 'complete',
          outcome: 'answer',
          answer: result.text || '(The model produced no text.)',
        },
      });
      setDiagramState('answer');
      setStatus(
        `Finished locally with ${top.length} retrieved sources. Check the answer against them.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateRun(id, {result: {kind: 'failed', message}});
      setDiagramState('idle');
      setStatus(message);
    } finally {
      setBusy(false);
    }
  };

  const runEvaluation = async () => {
    if (busy) return;
    setRunId(current => current + 1);
    setBusy(true);
    setEvaluation([]);
    setDiagramState('loading');
    try {
      const rows: EvaluationResult[] = [];
      for (const fixture of fixtures) {
        const result = await client.run(
          {
            kind: 'embed',
            texts: [
              `task: search result | query: ${fixture.question}`,
              ...sampleCorpus.map(
                document => `title: ${document.title} | text: ${document.text}`,
              ),
            ],
          },
          message => {
            setDiagramState(
              message.startsWith('Embedding') ? 'generating' : 'loading',
            );
            setStatus(message);
          },
        );
        if (result.kind !== 'vectors')
          throw new Error('Unexpected embedding response.');
        const lexical = lexicalSearch(fixture.question, sampleCorpus);
        const semantic = semanticSearch(sampleCorpus, result.vectors);
        const hybrid = hybridSearch(lexical, semantic);
        rows.push({
          question: fixture.question,
          expected: fixture.expected,
          lexical: resultLabel(lexical, fixture.expected),
          semantic: resultLabel(semantic, fixture.expected),
          hybrid: resultLabel(hybrid, fixture.expected),
        });
        setEvaluation([...rows]);
      }
      setDiagramState('answer');
      setStatus(
        'Retrieval checks finished locally. Each cell shows expected rank and top result.',
      );
    } catch (error) {
      setDiagramState('idle');
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void execute(true);
  };

  return (
    <section className="workshop-chat">
      <div className="demo-system-layout grid gap-6 min-[1101px]:grid-cols-[minmax(0,1fr)_15.625rem] min-[1101px]:items-start">
        <div className="demo-system-main min-w-0">
          <section className="chat-thread" aria-label="Retrieval conversation">
            <article className="chat-turn">
              <div className="chat-assistant-message">
                <SparklesIcon
                  className="size-5 shrink-0 text-[var(--accent)]"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="m-0 text-base">Search, then ask</h3>
                  <p className="description mb-0 mt-1">
                    Choose files in the composer. Keyword, embedding, or hybrid
                    retrieval ranks evidence first; only the strongest chunks
                    enter a generated answer. Model weights do not change.
                  </p>
                </div>
              </div>
            </article>

            <h3 id="request-history-heading" className="sr-only">
              Request history
            </h3>
            {runs.map((run, index) => (
              <article key={run.id} className="chat-turn">
                <div className="chat-user-message">
                  <p className="m-0 whitespace-pre-wrap">{run.question}</p>
                  <span className="description mt-1 block text-xs">
                    {run.mode} retrieval ·{' '}
                    {run.generationRequested
                      ? 'retrieve and ask'
                      : 'sources only'}
                  </span>
                </div>
                <div className="chat-assistant-message">
                  <SparklesIcon
                    className="size-5 shrink-0 text-[var(--accent)]"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    {run.result.kind === 'pending' && (
                      <p className="description m-0">Request in progress…</p>
                    )}
                    {run.result.kind === 'failed' && (
                      <p className="error m-0">{run.result.message}</p>
                    )}
                    {run.result.kind === 'complete' &&
                      run.result.outcome === 'no-results' && (
                        <p className="description m-0">
                          No sources were retrieved.
                          {run.generationRequested
                            ? ' Generation was requested but skipped because there was no evidence to supply.'
                            : ''}
                        </p>
                      )}
                    {run.result.kind === 'complete' &&
                      run.result.outcome === 'sources-only' && (
                        <p className="description m-0">
                          Sources retrieved; generation was not requested.
                        </p>
                      )}
                    {run.result.kind === 'complete' &&
                      run.result.outcome === 'answer' && (
                        <p className="answer m-0 whitespace-pre-wrap">
                          {run.result.answer}
                        </p>
                      )}
                    <RankedSources
                      run={run}
                      latest={index === runs.length - 1}
                    />
                    <SourceReceipt
                      prompt={run.prompt}
                      retrieved={run.retrieved}
                      supplied={run.supplied}
                      generationRequested={run.generationRequested}
                    />
                  </div>
                </div>
              </article>
            ))}
          </section>

          <details className="chat-details">
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

          <details className="chat-details">
            <summary>
              Evaluation · check retrieval on synthetic examples
            </summary>
            <p className="description">
              Three authored questions check whether each method finds the
              expected sample. This tests retrieval behavior, not answer
              accuracy or a general benchmark.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void runEvaluation()}
            >
              <BeakerIcon className="size-4" aria-hidden="true" /> Run retrieval
              checks
            </Button>
            {evaluation.length === 0 ? (
              <p className="description">Not run yet.</p>
            ) : (
              <Table>
                <caption className="sr-only">
                  Synthetic retrieval evaluation results
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead>Semantic</TableHead>
                    <TableHead>Hybrid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluation.map(row => (
                    <TableRow key={row.question}>
                      <TableCell>{row.question}</TableCell>
                      <TableCell>{row.expected}</TableCell>
                      <TableCell>{row.lexical}</TableCell>
                      <TableCell>{row.semantic}</TableCell>
                      <TableCell>{row.hybrid}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </details>

          <form className="chat-composer" onSubmit={submit}>
            <label className="sr-only" htmlFor="rag-question">
              Your question
            </label>
            <textarea
              id="rag-question"
              value={question}
              maxLength={1000}
              rows={3}
              required
              disabled={busy}
              placeholder="Ask a question about the attached files…"
              onKeyDown={event => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              onChange={event => {
                setQuestion(event.currentTarget.value);
                if (!busy) setDiagramState('sources');
              }}
            />

            <DocumentContext
              disabled={busy}
              onChange={(nextDocuments, message) => {
                setDocuments(nextDocuments);
                setDiagramState('sources');
                setStatus(message);
                setActiveSuppliedCount(0);
              }}
            />

            <div className="chat-tools flex flex-wrap items-end gap-3">
              <label className="m-0" htmlFor="retrieval-mode">
                Retrieval method
                <select
                  id="retrieval-mode"
                  value={mode}
                  disabled={busy}
                  onChange={event => {
                    const value = event.currentTarget.value;
                    setMode(
                      value === 'semantic' || value === 'hybrid'
                        ? value
                        : 'lexical',
                    );
                    setActiveSuppliedCount(0);
                    setDiagramState('sources');
                  }}
                >
                  <option value="lexical">Keywords · BM25</option>
                  <option value="semantic">Semantic · EmbeddingGemma</option>
                  <option value="hybrid">Hybrid · rank fusion</option>
                </select>
              </label>
              <div className="ml-auto flex flex-wrap justify-end gap-2">
                {busy && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => client.cancel()}
                  >
                    <StopIcon className="size-4" aria-hidden="true" /> Cancel
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !question.trim()}
                  onClick={() => void execute(false)}
                >
                  <MagnifyingGlassIcon className="size-4" aria-hidden="true" />{' '}
                  Find sources only
                </Button>
                <Button type="submit" disabled={busy || !question.trim()}>
                  <PaperAirplaneIcon className="size-4" aria-hidden="true" />{' '}
                  Retrieve and ask
                </Button>
              </div>
            </div>

            <p className="status m-0" role="status">
              {status}
            </p>
          </form>
        </div>

        <aside className="chat-inspector demo-system-rail sticky top-0 z-10 order-first min-[1101px]:top-5 min-[1101px]:order-last">
          <SystemDiagram
            state={diagramState}
            runId={runId}
            sources={summarizeDocuments(documents)}
            suppliedChunkCount={activeSuppliedCount}
          />
        </aside>
      </div>
    </section>
  );
}
