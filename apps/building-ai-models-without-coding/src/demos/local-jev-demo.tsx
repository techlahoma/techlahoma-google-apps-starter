import {useEffect, useRef, useState} from 'react';
import {
  CpuChipIcon,
  EyeIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';
import {DEFAULT_SEMIF_MODEL, SEMIF_MODELS, SemifClient} from '../semif-client';

const initialRule =
  'Classify this writing. Slop: empty marketing hype, buzzwords, sweeping claims, vague inspiration. Clear: concrete instructions, facts, evidence, dates, or specific changes. Which category fits best?';
const posts = [
  {
    id: 'launch',
    title: 'The announcement',
    text: 'We are thrilled to announce a groundbreaking solution that will revolutionize the way you work. By leveraging cutting-edge innovation, we empower teams to unlock their full potential and navigate an ever-evolving digital landscape.',
  },
  {
    id: 'release',
    title: 'The release note',
    text: 'The export button now downloads a CSV with dates in UTC. Previously, dates used your browser’s time zone. Existing exports are unchanged. Refresh the page to get the update.',
  },
  {
    id: 'leadership',
    title: 'The big idea',
    text: 'Success is a journey, not a destination. In today’s fast-paced world, the key is to embrace change, foster collaboration, and push boundaries. Together, we can build a brighter future. What are your thoughts?',
  },
  {
    id: 'meetup',
    title: 'The practical note',
    text: 'For this fictional workshop, bring a charged laptop and a power adapter. The examples run locally in Chrome. Download the model before the session so you do not have to wait on the room’s Wi-Fi.',
  },
  {
    id: 'mixed',
    title: 'The mixed case',
    text: 'Our game-changing update makes CSV imports 30% faster on the attached 10,000-row test file. It also unlocks unprecedented possibilities for teams looking to supercharge their workflows.',
  },
];
type Result = Awaited<ReturnType<SemifClient['score']>>;
type Request = {revision: number; text: string; rule: string};

export function LocalJevDemo() {
  const [modelId, setModelId] = useState(DEFAULT_SEMIF_MODEL);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'ready' | 'failed'>(
    'idle',
  );
  const [status, setStatus] = useState(
    'Load a model to begin. No model downloads automatically.',
  );
  const [mode, setMode] = useState<'feed' | 'editor'>('feed');
  const [activePost, setActivePost] = useState(posts[0]!.id);
  const [draft, setDraft] = useState(posts[0]!.text);
  const [rule, setRule] = useState(initialRule);
  const [paused, setPaused] = useState(false);
  const [scoredInput, setResult] = useState<{
    text: string;
    rule: string;
    score: Result;
  } | null>(null);
  const [error, setError] = useState('');
  const [activity, setActivity] = useState<'idle' | 'waiting' | 'scoring'>(
    'idle',
  );
  const feed = useRef<HTMLDivElement>(null);
  const client = useRef<SemifClient | null>(null);
  const revision = useRef(0);
  const pending = useRef<Request | null>(null);
  const running = useRef(false);
  const session = useRef(0);
  const text =
    mode === 'feed' ? posts.find(post => post.id === activePost)!.text : draft;
  const selectedModel = SEMIF_MODELS.find(model => model.id === modelId)!;
  const result =
    phase === 'ready' &&
    !paused &&
    scoredInput?.text === text &&
    scoredInput.rule === rule
      ? scoredInput.score
      : null;

  useEffect(
    () => () => {
      session.current++;
      revision.current++;
      client.current?.dispose();
      client.current = null;
    },
    [],
  );

  useEffect(() => {
    if (mode !== 'feed' || !feed.current) return;
    const root = feed.current;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const middle = root.getBoundingClientRect().top + root.clientHeight / 2;
        let closest: HTMLElement | null = null;
        let distance = Infinity;
        for (const card of root.querySelectorAll<HTMLElement>('[data-post]')) {
          const box = card.getBoundingClientRect();
          const current = Math.abs(box.top + box.height / 2 - middle);
          if (current < distance) {
            closest = card;
            distance = current;
          }
        }
        if (closest?.dataset.post) setActivePost(closest.dataset.post);
      });
    };
    root.addEventListener('scroll', update, {passive: true});
    const observer = new ResizeObserver(update);
    observer.observe(root);
    update();
    return () => {
      root.removeEventListener('scroll', update);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [mode]);

  useEffect(() => {
    const id = ++revision.current;
    pending.current = null;
    setResult(null);
    setError('');
    if (phase !== 'ready' || paused || !text.trim() || !rule.trim()) {
      setActivity('idle');
      return;
    }
    setActivity('waiting');
    async function drain() {
      const engine = client.current;
      if (running.current || !engine || !pending.current) return;
      const request = pending.current;
      pending.current = null;
      running.current = true;
      setActivity('scoring');
      try {
        const scored = await engine.score(request.text, request.rule);
        if (
          client.current === engine &&
          revision.current === request.revision
        ) {
          setResult({text: request.text, rule: request.rule, score: scored});
          setActivity('idle');
        }
      } catch (failure) {
        if (
          client.current === engine &&
          revision.current === request.revision
        ) {
          setError(
            failure instanceof Error ? failure.message : String(failure),
          );
          setActivity('idle');
        }
      } finally {
        if (client.current === engine) {
          running.current = false;
          if (pending.current) void drain();
        }
      }
    }
    const timer = setTimeout(() => {
      pending.current = {revision: id, text, rule};
      void drain();
    }, 650);
    return () => clearTimeout(timer);
  }, [text, rule, phase, paused]);

  const stop = () => {
    session.current++;
    revision.current++;
    pending.current = null;
    client.current?.dispose();
    client.current = null;
    running.current = false;
    setPhase('idle');
    setResult(null);
    setError('');
    setStatus(
      'Stopped. Load the model again to resume. Downloaded weights may be cached by the browser.',
    );
  };
  const load = async () => {
    const ownSession = ++session.current;
    client.current?.dispose();
    const engine = new SemifClient();
    client.current = engine;
    setPhase('loading');
    setError('');
    setStatus('Checking browser support and loading the selected model…');
    try {
      await engine.load(modelId, message => {
        if (session.current === ownSession) setStatus(message);
      });
      if (session.current !== ownSession) return;
      setPhase('ready');
      setStatus('Model ready. Decisions run on this device.');
    } catch (failure) {
      if (session.current !== ownSession) return;
      engine.dispose();
      client.current = null;
      setPhase('failed');
      setError(failure instanceof Error ? failure.message : String(failure));
      setStatus('Model could not load. Choose a smaller model or retry.');
    }
  };
  const slop = result?.scores.find(
    score => score.label === 'Slop',
  )?.probability;
  const decision = slop === undefined ? null : slop >= 0.5 ? 'Slop' : 'Clear';
  const liveStatus =
    phase !== 'ready'
      ? status
      : paused
        ? 'Paused'
        : !text.trim()
          ? 'Add some text to score.'
          : !rule.trim()
            ? 'Add a judging rule.'
            : activity === 'waiting'
              ? 'Waiting for you to pause…'
              : activity === 'scoring'
                ? 'Reading the visible text locally…'
                : result
                  ? 'Current text scored.'
                  : 'Ready';

  return (
    <section className="jev-layout" aria-label="Local Jev slop detector">
      <div className="jev-main">
        <div className="jev-mode" role="group" aria-label="Detector mode">
          <button
            type="button"
            aria-pressed={mode === 'feed'}
            onClick={() => setMode('feed')}
          >
            Scroll a sample feed
          </button>
          <button
            type="button"
            aria-pressed={mode === 'editor'}
            onClick={() => setMode('editor')}
          >
            Try your own text
          </button>
        </div>
        <p className="jev-inline-status" aria-live="off">
          {decision ? `Current decision: ${decision}` : liveStatus}
        </p>
        <p className="description">
          A semantic “if”: does this writing match your definition of slop? The
          highlighted post is the one being scored. All feed posts are authored
          workshop examples.
        </p>
        {mode === 'feed' ? (
          <div
            className="jev-feed"
            ref={feed}
            tabIndex={0}
            aria-label="Synthetic feed. Scroll to score a different post."
          >
            {posts.map((post, index) => (
              <article
                key={post.id}
                data-post={post.id}
                className="jev-post"
                data-active={activePost === post.id}
                data-verdict={
                  activePost === post.id ? (decision ?? 'unscored') : 'unscored'
                }
              >
                <div className="jev-post-heading">
                  <span>
                    Sample {index + 1} · {post.title}
                  </span>
                  {activePost === post.id && (
                    <span className="jev-badge">{decision ?? 'In view'}</span>
                  )}
                </div>
                <p>{post.text}</p>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(post.text);
                    setMode('editor');
                  }}
                >
                  Edit this example
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="jev-editor">
            <label htmlFor="jev-draft">Writing to inspect</label>
            <textarea
              id="jev-draft"
              rows={10}
              maxLength={1200}
              value={draft}
              onChange={event => setDraft(event.currentTarget.value)}
              placeholder="Paste or write a paragraph…"
            />
            <p className="description">
              {draft.length} / 1,200 characters · rescored after a 650 ms pause
            </p>
            <div className="chat-tools">
              <button type="button" onClick={() => setDraft(posts[0]!.text)}>
                Promotional example
              </button>
              <button type="button" onClick={() => setDraft(posts[1]!.text)}>
                Specific example
              </button>
              <button type="button" onClick={() => setDraft('')}>
                Clear text
              </button>
            </div>
          </div>
        )}
        <details className="chat-details">
          <summary>Change the judging rule</summary>
          <label htmlFor="jev-rule">What counts as slop?</label>
          <textarea
            id="jev-rule"
            rows={4}
            maxLength={500}
            value={rule}
            onChange={event => setRule(event.currentTarget.value)}
          />
          <button type="button" onClick={() => setRule(initialRule)}>
            Restore rule
          </button>
        </details>
        <details className="chat-details">
          <summary>Why “Local Jev”?</summary>
          <p>
            Jev inspired the idea of asking a model for a decision that software
            can use directly. This independent experiment uses SemIf’s open
            browser setup, not Jev’s hosted service. It does not detect AI
            authorship.
          </p>
          <p>
            <a href="https://x.com/RBilgil/status/2100976648552169805">
              Robin Bilgil’s scrolling slop detector
            </a>{' '}
            ·{' '}
            <a href="https://x.com/jpschroeder/status/2100347770867458384">
              Justin Schroeder’s driving experiment
            </a>
          </p>
          <p className="description">
            These are inspiration links, not claims that this demo reproduces
            their implementation or capabilities.
          </p>
        </details>
      </div>
      <aside
        className="chat-inspector jev-inspector"
        aria-label="Local decision"
      >
        <h2>
          <CpuChipIcon aria-hidden="true" /> Local decision
        </h2>
        <label htmlFor="jev-model">Browser model</label>
        <select
          id="jev-model"
          value={modelId}
          disabled={phase === 'loading' || phase === 'ready'}
          onChange={event => setModelId(event.currentTarget.value)}
        >
          {SEMIF_MODELS.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} · {model.download}
            </option>
          ))}
        </select>
        <p className="description">
          {selectedModel.download} on first load. Model files download; your
          writing stays on this device.
        </p>
        <div className="chat-tools">
          {phase !== 'ready' && phase !== 'loading' && (
            <button
              id="jev-load"
              type="button"
              className="primary"
              onClick={() => void load()}
            >
              Load local model
            </button>
          )}
          {(phase === 'loading' || phase === 'ready') && (
            <button type="button" onClick={stop}>
              Stop and unload
            </button>
          )}
          {phase === 'ready' && (
            <button
              type="button"
              aria-pressed={paused}
              onClick={() => setPaused(value => !value)}
            >
              {paused ? (
                <PlayIcon aria-hidden="true" />
              ) : (
                <PauseIcon aria-hidden="true" />
              )}
              {paused ? 'Resume' : 'Pause'}
            </button>
          )}
        </div>
        <p className="status" role="status">
          {liveStatus}
        </p>
        {error && <p role="alert">{error}</p>}
        <div
          className="jev-verdict"
          data-verdict={decision ?? 'unscored'}
          aria-busy={activity === 'scoring'}
        >
          <EyeIcon aria-hidden="true" />
          <strong>{decision ?? 'No current score'}</strong>
          <p>
            {decision
              ? 'The model’s choice under your current rule.'
              : 'Scores appear after a real model run.'}
          </p>
        </div>
        {result && (
          <div className="jev-scores">
            {result.scores.map(score => (
              <div key={score.label}>
                <div className="jev-score-label">
                  <span>{score.label}</span>
                  <span>{(score.probability * 100).toFixed(1)}%</span>
                </div>
                <meter
                  min={0}
                  max={1}
                  value={score.probability}
                  aria-label={`${score.label} option score`}
                />
              </div>
            ))}
            <p className="description">
              {result.elapsedMs.toFixed(0)} ms · {result.inputTokens} input
              tokens · one constrained readout
            </p>
            <details className="jev-receipt">
              <summary>Inspect this decision</summary>
              <p>Scored text</p>
              <pre>{scoredInput?.text}</pre>
              <p>Rule</p>
              <pre>{scoredInput?.rule}</pre>
              <p className="description">
                {selectedModel.name} · revision {selectedModel.revision}. The
                first score also includes shader preparation.
              </p>
            </details>
          </div>
        )}
        <p className="description">
          Scores are normalized across these two choices. They are not
          calibrated confidence or proof of authorship. Inspect disagreements
          and change the rule.
        </p>
        <p className="description">
          <a href="https://github.com/TheoLeeCJ/SemIf">Powered by SemIf</a> ·
          Independent of Jev / TypeSafe.
        </p>
      </aside>
    </section>
  );
}
