import './style.css';

import {
  ArrowTopRightOnSquareIcon,
  BeakerIcon,
  BookOpenIcon,
  CircleStackIcon,
  ClipboardDocumentIcon,
  CodeBracketSquareIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import {useEffect, useMemo, useRef, useState, type ComponentType} from 'react';
import {createRoot} from 'react-dom/client';
import {ContextDemo} from './demos/context-demo';
import {RagDemo} from './demos/rag-demo';

type MountDemo = (container: HTMLElement) => () => void;

interface DemoBase {
  id: string;
  name: string;
  verb: string;
  description: string;
  icon: ComponentType<{className?: string; 'aria-hidden'?: boolean | 'true'}>;
}

type Demo = DemoBase &
  (
    | {component: ComponentType; loadMount?: never}
    | {component?: never; loadMount: () => Promise<MountDemo>}
  );

const demos: Demo[] = [
  {
    id: 'context',
    name: 'Context',
    verb: 'Tell it',
    description:
      'Build the exact input a local model can see, then ask it about your files.',
    icon: BookOpenIcon,
    component: ContextDemo,
  },
  {
    id: 'retrieval',
    name: 'Retrieval',
    verb: 'Let it look',
    description:
      'Rank the evidence first, then give only the strongest matches to the model.',
    icon: CircleStackIcon,
    component: RagDemo,
  },
  {
    id: 'fine-tuning',
    name: 'Fine-tuning',
    verb: 'Teach a habit',
    description:
      'Train a small adapter to classify everyday messages, then test something unseen.',
    icon: BeakerIcon,
    loadMount: async () => (await import('./tuning-demo')).mountTuningDemo,
  },
  {
    id: 'train',
    name: 'From scratch',
    verb: 'Watch it learn',
    description:
      'Compile a tiny Rust model, watch its loss change, and inspect what it generates.',
    icon: CodeBracketSquareIcon,
    loadMount: async () => (await import('./rust-demo')).mountRustDemo,
  },
];

function ImperativeDemo({load}: {load: () => Promise<MountDemo>}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void load().then(mount => {
      if (!cancelled && ref.current) dispose = mount(ref.current);
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [load]);
  return <div ref={ref} />;
}

function RebuildPrompt({demo}: {demo: Demo}) {
  const [status, setStatus] = useState('');
  const text = `Open apps/building-ai-models-without-coding in this repository. Inspect its instructions and the ${demo.name} demo. Help me change one behavior that I choose. Keep my files local, preserve the other demos, use real model computations, and test the changed behavior in a browser. Show me what changed and what still needs checking. Do not publish or deploy without my request.`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied');
    } catch {
      setStatus('Copy failed. Select the prompt and copy it manually.');
    }
  };
  return (
    <details className="build-later">
      <summary>Make your own version</summary>
      <p>
        Use the same workshop repository in Google AI Studio or Antigravity.
        Change one thing, then compare what happened.
      </p>
      <p className="link-row">
        <a href="https://github.com/techlahoma/techlahoma-google-apps-starter">
          GitHub repository <ArrowTopRightOnSquareIcon aria-hidden="true" />
        </a>
        <a href="https://aistudio.google.com/">
          Google AI Studio <ArrowTopRightOnSquareIcon aria-hidden="true" />
        </a>
      </p>
      <p>
        In AI Studio Build, use <strong>Add files → Import from GitHub</strong>{' '}
        and select the workshop repository. Ask it to run{' '}
        <code>apps/building-ai-models-without-coding</code>.
      </p>
      <label htmlFor="rebuild-prompt">Prompt for this demo</label>
      <textarea id="rebuild-prompt" readOnly rows={4} value={text} />
      <button
        className="button-with-icon"
        type="button"
        onClick={() => void copy()}
      >
        <ClipboardDocumentIcon aria-hidden="true" /> Copy prompt
      </button>
      <output aria-live="polite">{status}</output>
    </details>
  );
}

function App() {
  const initial = location.hash.slice(1);
  const [slug, setSlug] = useState(
    demos.some(item => item.id === initial) ? initial : 'context',
  );
  const workspace = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!location.hash || !demos.some(item => `#${item.id}` === location.hash))
      history.replaceState(null, '', '#context');
    const onHash = () => {
      const next = location.hash.slice(1);
      setSlug(demos.some(item => item.id === next) ? next : 'context');
      workspace.current?.focus();
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const demo = useMemo(
    () => demos.find(item => item.id === slug) ?? demos[0]!,
    [slug],
  );
  useEffect(() => {
    document.title = `${demo.name} · Model Workshop`;
  }, [demo]);
  const Content = demo.component;
  return (
    <>
      <button
        className="skip"
        type="button"
        onClick={() => workspace.current?.focus()}
      >
        Skip to the demo
      </button>
      <aside className="sidebar">
        <a className="wordmark" href="#context">
          <CpuChipIcon aria-hidden="true" /> Model Workshop
        </a>
        <p className="eyebrow">GDG TULSA × TECHLAHOMA</p>
        <nav aria-label="Workshop demos">
          {demos.map((item, index) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                className="demo-link"
                href={`#${item.id}`}
                aria-current={item.id === demo.id ? 'page' : undefined}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <Icon aria-hidden="true" />
                <span>{item.name}</span>
              </a>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <a href="https://samcarltoncreative.notion.site/GDG-Tulsa-Model-Workshop-Kit-3dc012b9b020817e93b7dac0365ca614">
            Open the meetup kit <ArrowTopRightOnSquareIcon aria-hidden="true" />
          </a>
          <p>
            Four ways to change what AI does. One small experiment at a time.
          </p>
        </div>
      </aside>
      <main id="workspace" ref={workspace} tabIndex={-1}>
        <header className="workspace-header">
          <span>EXPERIMENT {demos.indexOf(demo) + 1} / 4</span>
          <span className="local-label">Your files stay on this device</span>
        </header>
        <div className="workspace-content">
          <p className="eyebrow">{demo.verb}</p>
          <h1>{demo.name}</h1>
          <p className="intro">{demo.description}</p>
          <div id="demo-content" key={demo.id}>
            {Content ? (
              <Content />
            ) : (
              <ImperativeDemo load={demo.loadMount} />
            )}
          </div>
          <RebuildPrompt demo={demo} />
        </div>
        <footer>
          Independent community workshop. Small models can be wrong. Check what
          changed.
        </footer>
      </main>
    </>
  );
}

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Application root is missing');
createRoot(root).render(<App />);
