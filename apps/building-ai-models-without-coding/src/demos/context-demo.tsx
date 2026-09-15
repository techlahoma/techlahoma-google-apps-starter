import {
  PaperAirplaneIcon,
  SparklesIcon,
  StopIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {useEffect, useState, type FormEvent} from 'react';

import {CopyButton} from '../components/ui/copy-button';
import {Button} from '../components/ui/button';
import {SystemDiagram} from '../components/system-diagram';
import {getCorpus, groundingPrompt} from '../corpus';
import {ModelClient} from '../model-client';
import {DocumentContext} from './document-context';

type DiagramState = 'idle' | 'sources' | 'context' | 'model' | 'answer';

interface ChatMessage {
  id: number;
  kind: 'user' | 'assistant';
  text: string;
  contextIncluded?: boolean;
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
  const [diagramState, setDiagramState] = useState<DiagramState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => () => client.cancel(), [client]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || busy) return;

    const selected = includeContext ? getCorpus().slice(0, 6) : [];
    const exactPrompt = includeContext
      ? groundingPrompt(cleanQuestion, selected)
      : cleanQuestion;
    const userMessage: ChatMessage = {
      id: Date.now(),
      kind: 'user',
      text: cleanQuestion,
      contextIncluded: includeContext,
    };
    setMessages(current => [...current, userMessage]);
    setPrompt(exactPrompt);
    setBusy(true);
    setDiagramState('context');
    setStatus(`Building a prompt with ${selected.length} source chunks…`);

    try {
      setDiagramState('model');
      const result = await client.run(
        {kind: 'generate', prompt: exactPrompt},
        message => {
          setStatus(message);
        },
      );
      if (result.kind !== 'text') throw new Error('Unexpected model response.');
      setMessages(current => [
        ...current,
        {
          id: Date.now() + 1,
          kind: 'assistant',
          text: result.text || '(The model produced no text.)',
        },
      ]);
      setDiagramState('answer');
      setStatus(
        `Finished locally. ${selected.length} source chunks supplied; model weights unchanged.`,
      );
    } catch (error) {
      setDiagramState('idle');
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <p className="description max-w-3xl">
        This experiment answers a practical question about pretend emails. You
        choose which files enter the context, inspect the exact prompt, and
        compare what Gemma says with or without those notes. The model is
        prompted, not retrained.
      </p>

      <SystemDiagram state={diagramState} />

      <DocumentContext
        disabled={busy}
        onChange={(_, message) => {
          setDiagramState('sources');
          setStatus(message);
        }}
      />

      <section
        className="overflow-hidden rounded-md border border-[var(--border)]"
        aria-label="Chat"
      >
        <p className="description m-0 border-b border-[var(--border)] px-4 py-2">
          Each question is an independent model run. Earlier chat bubbles are
          not sent again.
        </p>
        <div
          className="max-h-[28rem] min-h-56 space-y-4 overflow-y-auto bg-[#101114] p-4"
          aria-live="polite"
        >
          {messages.length === 0 ? (
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
            messages.map(message => (
              <article
                key={message.id}
                className={`flex gap-3 ${message.kind === 'user' ? 'ml-auto max-w-[85%]' : 'answer max-w-[92%]'}`}
              >
                {message.kind === 'assistant' ? (
                  <SparklesIcon
                    className="mt-1 size-5 shrink-0 text-[var(--accent)]"
                    aria-hidden="true"
                  />
                ) : (
                  <UserIcon
                    className="mt-1 size-5 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
                  <p className="m-0 whitespace-pre-wrap">{message.text}</p>
                  {message.kind === 'user' && (
                    <span className="description mt-1 block text-xs">
                      {message.contextIncluded
                        ? 'Sent with file context'
                        : 'Sent without file context'}
                    </span>
                  )}
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
            onChange={event => setQuestion(event.currentTarget.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="m-0 inline-flex items-center gap-2 font-normal">
              <input
                type="checkbox"
                checked={includeContext}
                disabled={busy}
                onChange={event =>
                  setIncludeContext(event.currentTarget.checked)
                }
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
                <PaperAirplaneIcon className="size-4" aria-hidden="true" /> Ask
                Gemma
              </Button>
            </div>
          </div>
        </form>
      </section>

      <p className="status" role="status">
        {status}
      </p>

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
    </section>
  );
}
