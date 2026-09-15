import {
  BeakerIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import {useEffect, useState, type FormEvent} from 'react';

import {SystemDiagram} from '../components/system-diagram';
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
import {getCorpus, groundingPrompt, sampleCorpus} from '../corpus';
import {ModelClient} from '../model-client';
import {
  hybridSearch,
  lexicalSearch,
  semanticSearch,
  type RetrievalMode,
  type SearchHit,
} from '../retrieval';
import {DocumentContext} from './document-context';

type DiagramState = 'idle' | 'sources' | 'context' | 'model' | 'answer';

interface EvaluationResult {
  question: string;
  expected: string;
  lexical: string;
  semantic: string;
  hybrid: string;
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

export function RagDemo() {
  const [question, setQuestion] = useState('What should I bring?');
  const [mode, setMode] = useState<RetrievalMode>('hybrid');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    'Ready. Retrieval runs locally in your browser.',
  );
  const [diagramState, setDiagramState] = useState<DiagramState>('idle');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [answer, setAnswer] = useState('');
  const [prompt, setPrompt] = useState(
    'Find sources to inspect the exact grounded prompt.',
  );
  const [evaluation, setEvaluation] = useState<EvaluationResult[]>([]);
  const [client] = useState(() => new ModelClient());

  useEffect(() => () => client.cancel(), [client]);

  const retrieve = async (
    query: string,
    selectedMode: RetrievalMode,
  ): Promise<SearchHit[]> => {
    const documents = getCorpus();
    const lexical = lexicalSearch(query, documents);
    if (selectedMode === 'lexical') return lexical;

    setDiagramState('model');
    setStatus('Loading EmbeddingGemma 300M and comparing document vectors…');
    const result = await client.run(
      {
        kind: 'embed',
        texts: [
          `task: search result | query: ${query}`,
          ...documents.map(
            document => `title: ${document.title} | text: ${document.text}`,
          ),
        ],
      },
      setStatus,
    );
    if (result.kind !== 'vectors')
      throw new Error('Unexpected embedding response.');
    const semantic = semanticSearch(documents, result.vectors);
    return selectedMode === 'semantic'
      ? semantic
      : hybridSearch(lexical, semantic);
  };

  const execute = async (generate: boolean) => {
    const query = question.trim();
    if (!query || busy) return;
    setBusy(true);
    setAnswer('');
    setDiagramState('sources');
    setStatus(`Ranking attached files with ${mode} search…`);

    try {
      const ranked = await retrieve(query, mode);
      const top = ranked.slice(0, 3);
      setHits(top);
      if (!top.length) {
        setDiagramState('sources');
        setStatus(
          'No keyword matches. Try different wording or semantic search.',
        );
        return;
      }

      const exactPrompt = groundingPrompt(
        query,
        top.map(hit => hit.document),
      );
      setPrompt(exactPrompt);
      setDiagramState('context');
      if (!generate) {
        setStatus(
          `Retrieved ${top.length} sources. Percentages are normalized within this result set.`,
        );
        return;
      }

      setDiagramState('model');
      setStatus('Giving the retrieved evidence to Gemma…');
      const result = await client.run(
        {kind: 'generate', prompt: exactPrompt},
        setStatus,
      );
      if (result.kind !== 'text')
        throw new Error('Unexpected generation response.');
      setAnswer(result.text || '(The model produced no text.)');
      setDiagramState('answer');
      setStatus(
        `Finished locally with ${top.length} retrieved sources. Check the answer against them.`,
      );
    } catch (error) {
      setDiagramState('idle');
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const runEvaluation = async () => {
    if (busy) return;
    setBusy(true);
    setEvaluation([]);
    setDiagramState('model');
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
          setStatus,
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
    <section className="space-y-6">
      <p className="description max-w-3xl">
        This experiment searches pretend emails before asking Gemma a question.
        Keyword, embedding, or hybrid retrieval ranks the available evidence;
        only the three strongest chunks enter the final prompt. No model weights
        change.
      </p>

      <SystemDiagram state={diagramState} />

      <DocumentContext
        disabled={busy}
        onChange={(_, message) => {
          setDiagramState('sources');
          setStatus(message);
          setHits([]);
          setAnswer('');
        }}
      />

      <form
        className="space-y-3 rounded-md border border-[var(--border)] p-4"
        onSubmit={submit}
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="m-0" htmlFor="rag-question">
              Your question
            </label>
            <textarea
              id="rag-question"
              value={question}
              maxLength={1000}
              rows={3}
              required
              disabled={busy}
              onChange={event => setQuestion(event.currentTarget.value)}
            />
          </div>
          <div>
            <label className="m-0" htmlFor="retrieval-mode">
              Retrieval method
            </label>
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
              }}
            >
              <option value="lexical">Keywords · BM25</option>
              <option value="semantic">Semantic · EmbeddingGemma</option>
              <option value="hybrid">Hybrid · rank fusion</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
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
            <MagnifyingGlassIcon className="size-4" aria-hidden="true" /> Find
            sources only
          </Button>
          <Button type="submit" disabled={busy || !question.trim()}>
            <PaperAirplaneIcon className="size-4" aria-hidden="true" /> Retrieve
            and ask
          </Button>
        </div>
      </form>

      <p className="status" role="status">
        {status}
      </p>

      {hits.length > 0 && (
        <section aria-labelledby="ranked-sources-heading">
          <h3 id="ranked-sources-heading">Ranked sources</h3>
          <p className="description">
            Percentages are normalized to the strongest result, not confidence
            probabilities. Focus or hover a percentage for the original{' '}
            {scoreNames[mode]}.
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
              {hits.map((hit, index) => (
                <TableRow key={hit.document.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <h3 className="m-0 text-sm font-medium">
                      [{index + 1}] {hit.document.title}
                    </h3>
                    <span className="description block text-xs">
                      {hit.document.source}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-block whitespace-nowrap rounded-sm px-1 focus-visible:outline"
                      tabIndex={0}
                      title={`${scoreNames[mode]}: ${hit.score.toFixed(6)}`}
                    >
                      {normalizedPercentage(hit.score, hits)}%
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
      )}

      {answer && (
        <article
          className="answer flex gap-3 rounded-md border border-[var(--border)] bg-[#101114] p-4"
          aria-label="Gemma answer"
        >
          <SparklesIcon
            className="mt-1 size-5 shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <div>
            <h3 className="m-0 text-base">Gemma</h3>
            <p className="mb-0 whitespace-pre-wrap">{answer}</p>
          </div>
        </article>
      )}

      <details>
        <summary>Prompt · inspect what the model sees</summary>
        <div className="relative">
          <pre tabIndex={0} className="pr-14">
            <code>{prompt}</code>
          </pre>
          <div className="absolute right-2 top-2">
            <CopyButton value={prompt} label="Copy exact prompt" />
          </div>
        </div>
      </details>

      <details>
        <summary>Evaluation · check retrieval on synthetic examples</summary>
        <p className="description">
          Three authored questions check whether each method finds the expected
          sample. This tests retrieval behavior, not answer accuracy or a
          general benchmark.
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
    </section>
  );
}
