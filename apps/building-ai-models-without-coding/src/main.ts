import './style.css';
import {mountContextDemo} from './context-demo';
import {mountRagDemo} from './rag-demo';
import {mountRustDemo} from './rust-demo';
import {mountTuningDemo} from './tuning-demo';

const demos = [
  {
    id: 'context',
    name: 'Context',
    verb: 'Tell it',
    description: 'Give a model something useful to work with.',
    mount: mountContextDemo,
  },
  {
    id: 'retrieval',
    name: 'Retrieval',
    verb: 'Let it look',
    description: 'Find the right information before asking for an answer.',
    mount: mountRagDemo,
  },
  {
    id: 'fine-tuning',
    name: 'Fine-tuning',
    verb: 'Teach a habit',
    description: 'Train on examples. Test on something new.',
    mount: mountTuningDemo,
  },
  {
    id: 'train',
    name: 'From scratch',
    verb: 'Watch it learn',
    description: 'Edit a tiny model, train it, and see what it makes.',
    mount: mountRustDemo,
  },
];

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Application root is missing');
app.innerHTML = `
  <button class="skip" id="skip-to-demo" type="button">Skip to the demo</button>
  <aside class="sidebar">
    <a class="wordmark" href="#context"><span class="brand-mark" aria-hidden="true">&lt; &gt;</span> Model Workshop</a>
    <p class="eyebrow">GDG TULSA × TECHLAHOMA</p>
    <nav aria-label="Workshop demos"></nav>
    <div class="sidebar-bottom">
      <a id="kit-link" href="https://samcarltoncreative.notion.site/GDG-Tulsa-Model-Workshop-Kit-3dc012b9b020817e93b7dac0365ca614">Open the meetup kit ↗</a>
      <p>Four ways to change what AI does.<br>One small experiment at a time.</p>
    </div>
  </aside>
  <main id="workspace" tabindex="-1">
    <header class="workspace-header"><span id="step-label"></span><span class="local-label">Your files stay on this device</span></header>
    <div class="workspace-content">
      <p class="eyebrow" id="demo-verb"></p>
      <h1 id="demo-title"></h1>
      <p class="intro" id="demo-description"></p>
      <div id="demo-content"></div>
      <details class="build-later"><summary>Make your own version</summary>
        <p>Use the same workshop repository in Google AI Studio or Antigravity. Change one thing, then compare what happened.</p>
        <p><a href="https://github.com/techlahoma/techlahoma-google-apps-starter">Open the GitHub repository ↗</a> · <a href="https://aistudio.google.com/">Open Google AI Studio ↗</a></p>
        <p>In AI Studio Build, use <strong>Add files → Import from GitHub</strong> and select the workshop repository. Ask it to run <code>apps/building-ai-models-without-coding</code>.</p>
        <label for="rebuild-prompt">Prompt for this demo</label><textarea id="rebuild-prompt" readonly rows="4"></textarea>
        <button id="copy-prompt" type="button">Copy prompt</button><output id="copy-status" aria-live="polite"></output>
      </details>
    </div>
    <footer>Independent community workshop. Small models can be wrong. Check what changed.</footer>
  </main>`;

function required<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}
required('#skip-to-demo').addEventListener('click', () =>
  required('#workspace').focus(),
);
const navigation = required('nav');
for (const [index, demo] of demos.entries()) {
  const link = document.createElement('a');
  link.href = `#${demo.id}`;
  link.className = 'demo-link';
  const number = document.createElement('span');
  number.textContent = String(index + 1).padStart(2, '0');
  const label = document.createElement('span');
  label.textContent = demo.name;
  link.append(number, label);
  navigation.append(link);
}
let dispose: (() => void) | undefined;
function navigate(moveFocus: boolean) {
  const slug = location.hash.slice(1);
  const demo = demos.find(item => item.id === slug) ?? demos[0]!;
  if (slug !== demo.id) history.replaceState(null, '', `#${demo.id}`);
  dispose?.();
  const container = required('#demo-content');
  container.replaceChildren();
  for (const link of navigation.querySelectorAll('a')) {
    if (link.hash === `#${demo.id}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  required('#step-label').textContent =
    `EXPERIMENT ${demos.indexOf(demo) + 1} / 4`;
  required('#demo-verb').textContent = demo.verb;
  required('#demo-title').textContent = demo.name;
  required('#demo-description').textContent = demo.description;
  document.title = `${demo.name} · Model Workshop`;
  required<HTMLTextAreaElement>('#rebuild-prompt').value =
    `Open apps/building-ai-models-without-coding in this repository. Inspect its instructions and the ${demo.name} demo. Help me change one behavior that I choose. Keep my files local, preserve the other demos, use real model computations, and test the changed behavior in a browser. Show me what changed and what still needs checking. Do not publish or deploy without my request.`;
  required('#copy-status').textContent = '';
  dispose = demo.mount(container);
  if (moveFocus) required('#workspace').focus();
}
window.addEventListener('hashchange', () => navigate(true));
required('#copy-prompt').addEventListener('click', () => {
  const prompt = required<HTMLTextAreaElement>('#rebuild-prompt');
  void navigator.clipboard
    .writeText(prompt.value)
    .then(() => {
      required('#copy-status').textContent = 'Copied';
    })
    .catch(() => {
      prompt.focus();
      prompt.select();
      required('#copy-status').textContent =
        'Select and copy the prompt above.';
    });
});
navigate(false);
