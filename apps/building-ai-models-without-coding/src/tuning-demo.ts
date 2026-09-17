import {
  mountTerminalOutput,
  type MountedTerminal,
} from './components/mount-terminal';
import {
  loadFunctionGemma,
  FUNCTIONGEMMA_REVISION,
  type FunctionGemmaInference,
  type FunctionGemmaEvaluation,
} from './functiongemma-inference';
import {OutputLora} from './lora-engine';

interface Example {
  input: string;
  answer: string;
}
interface Lesson {
  name: string;
  explanation: string;
  instruction: string;
  train: Example[];
  test: Example[];
}

type PredictionPanelState =
  | {kind: 'idle'; message: string}
  | {kind: 'loading'; message: string}
  | {kind: 'result'; prediction: string}
  | {kind: 'unavailable'; message: string};

const displayPrediction = (prediction: string): string => {
  const normalized = prediction.trim().toLowerCase();
  const labels: Record<string, string> = {
    now: '🚨 now',
    later: '🕒 later',
    ignore: '🚫 ignore',
  };
  return labels[normalized] ?? (prediction.trim() || '(empty output)');
};
const lessons: Lesson[] = [
  {
    name: 'Notification → now / later / ignore',
    explanation:
      'Task: teach the model to triage a notification by urgency. It should surface immediate problems, defer useful nonurgent notes, and filter obvious spam.',
    instruction:
      'Classify the notification. Reply with exactly now, later, or ignore. Urgent problems are now. Useful nonurgent information is later. Spam is ignore.',
    train: [
      {input: 'The meeting starts in two minutes.', answer: 'now'},
      {input: 'Urgent: the projector stopped working.', answer: 'now'},
      {input: 'Someone is waiting at the locked door.', answer: 'now'},
      {input: 'Next month’s newsletter is available.', answer: 'later'},
      {input: 'Read these optional notes this weekend.', answer: 'later'},
      {input: 'Review next week’s agenda when you have time.', answer: 'later'},
      {input: 'Spam: you won a fake lottery.', answer: 'ignore'},
      {input: 'Unsolicited bulk advertisement.', answer: 'ignore'},
      {input: 'A phishing email wants your password.', answer: 'ignore'},
    ],
    test: [
      {input: 'Urgent: attendees cannot join the call.', answer: 'now'},
      {input: 'An optional article for next weekend.', answer: 'later'},
      {input: 'Spam offer for a miracle cure.', answer: 'ignore'},
    ],
  },
  {
    name: 'Voice note → first action',
    explanation:
      'Task: teach the model to strip filler from a short voice note and return the first concrete action as a compact task.',
    instruction:
      'Extract the one action from the voice note. Reply with only the short action, without filler.',
    train: [
      {input: 'Um, remind me to buy milk.', answer: 'buy milk'},
      {input: 'I need to book the room.', answer: 'book the room'},
      {
        input: 'Please add a task to call the printer.',
        answer: 'call the printer',
      },
      {input: 'I should send the agenda.', answer: 'send the agenda'},
      {input: 'Remind me to charge the laptop.', answer: 'charge the laptop'},
      {
        input: 'I need to check the microphone.',
        answer: 'check the microphone',
      },
    ],
    test: [
      {input: 'Um, I should buy milk.', answer: 'buy milk'},
      {input: 'Please remind me to book the room.', answer: 'book the room'},
      {input: 'Add a task to charge the laptop.', answer: 'charge the laptop'},
    ],
  },
  {
    name: 'Messy instructions → workflow',
    explanation:
      'Task: teach the model to route an informal request into one of three workflows: meeting, event, or document.',
    instruction:
      'Choose one workflow. Reply meeting for agendas or team discussions, event for venues or RSVPs, document for writing or proofreading. Reply with only that word.',
    train: [
      {
        input: 'Get an agenda together and capture meeting notes.',
        answer: 'meeting',
      },
      {input: 'Invite the team to discuss the project.', answer: 'meeting'},
      {input: 'Schedule our weekly check-in.', answer: 'meeting'},
      {input: 'Find a venue and collect RSVPs.', answer: 'event'},
      {
        input: 'Organize a workshop with seats and registration.',
        answer: 'event',
      },
      {input: 'Book the event space and invite attendees.', answer: 'event'},
      {
        input: 'Outline the draft, edit it, then proofread.',
        answer: 'document',
      },
      {input: 'Turn these notes into a written guide.', answer: 'document'},
      {input: 'Prepare a report and check the spelling.', answer: 'document'},
    ],
    test: [
      {input: 'Collect talking points for the team sync.', answer: 'meeting'},
      {input: 'Arrange registration for the meetup.', answer: 'event'},
      {input: 'Proofread our draft handbook.', answer: 'document'},
    ],
  },
];

function prompt(
  model: FunctionGemmaInference,
  lesson: Lesson,
  input: string,
): number[] {
  return model.encode(
    `<bos><start_of_turn>user\n${lesson.instruction}\n\n${input}<end_of_turn>\n<start_of_turn>model\n`,
  );
}
function bestToken(logits: Float32Array): number {
  let best = 0;
  for (let i = 1; i < logits.length; i++)
    if (logits[i]! > logits[best]!) best = i;
  return best;
}
const yieldToPage = () => new Promise<void>(resolve => setTimeout(resolve, 0));

const trainingFigure = `<figure class="m-0" aria-labelledby="tuning-visual-title tuning-visual-caption">
      <svg id="tuning-visual" class="h-auto w-full" viewBox="0 0 720 310" role="img" aria-labelledby="tuning-visual-title tuning-visual-desc">
        <title id="tuning-visual-title">How the adapter learns while the base model stays frozen</title>
        <desc id="tuning-visual-desc">Training examples flow through a frozen model into a small trainable adapter. The loss plot updates from the measurements produced by this run.</desc>
        <g id="tuning-visual-data" opacity="0.45">
          <rect x="20" y="34" width="150" height="70" rx="8" fill="#202229" stroke="#697386" />
          <text x="95" y="63" text-anchor="middle" fill="#eceef2" font-size="15">Training examples</text>
          <text x="95" y="85" text-anchor="middle" fill="#a7abb6" font-size="12">input → expected label</text>
        </g>
        <path d="M170 69 H230" stroke="#697386" stroke-width="2" marker-end="url(#tuning-arrow)" />
        <g id="tuning-visual-model" opacity="0.45">
          <rect x="232" y="34" width="150" height="70" rx="8" fill="#202229" stroke="#697386" />
          <text x="307" y="63" text-anchor="middle" fill="#eceef2" font-size="15">Frozen model</text>
          <text x="307" y="85" text-anchor="middle" fill="#a7abb6" font-size="12">640-number features</text>
        </g>
        <path d="M382 69 H442" stroke="#697386" stroke-width="2" marker-end="url(#tuning-arrow)" />
        <g id="tuning-visual-adapter" opacity="0.45">
          <rect x="444" y="34" width="150" height="70" rx="8" fill="#202229" stroke="#b2c9ff" />
          <text x="519" y="63" text-anchor="middle" fill="#eceef2" font-size="15">Trainable adapter</text>
          <text x="519" y="85" text-anchor="middle" fill="#b2c9ff" font-size="12">rank 4 · updates here</text>
        </g>
        <defs><marker id="tuning-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#697386" /></marker></defs>
        <g transform="translate(78 146)">
          <text x="0" y="-12" fill="#eceef2" font-size="14">Measured training loss</text>
          <line x1="0" y1="0" x2="570" y2="0" stroke="#383b44" />
          <line x1="0" y1="50" x2="570" y2="50" stroke="#383b44" />
          <line x1="0" y1="100" x2="570" y2="100" stroke="#697386" />
          <line x1="0" y1="0" x2="0" y2="100" stroke="#697386" />
          <text x="-10" y="4" text-anchor="end" fill="#a7abb6" font-size="11">20</text>
          <text x="-10" y="54" text-anchor="end" fill="#a7abb6" font-size="11">10</text>
          <text x="-10" y="104" text-anchor="end" fill="#a7abb6" font-size="11">0</text>
          <text x="0" y="119" text-anchor="middle" fill="#a7abb6" font-size="11">0</text>
          <text x="285" y="119" text-anchor="middle" fill="#a7abb6" font-size="11">100</text>
          <text x="570" y="119" text-anchor="middle" fill="#a7abb6" font-size="11">200</text>
          <text x="285" y="141" text-anchor="middle" fill="#a7abb6" font-size="12">training pass</text>
          <text x="-50" y="50" text-anchor="middle" fill="#a7abb6" font-size="12" transform="rotate(-90 -50 50)">loss</text>
          <polyline id="tuning-loss-line" points="" fill="none" stroke="#b2c9ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <circle id="tuning-loss-point" cx="0" cy="100" r="5" fill="#b2c9ff" opacity="0" />
          <text id="tuning-loss-label" x="570" y="-12" text-anchor="end" fill="#a7abb6" font-size="12">Run training to plot loss</text>
        </g>
      </svg>
      <figcaption id="tuning-visual-caption" class="text-sm text-slate-400">Loss is the model’s penalty for predicting the wrong training label, so lower is better. The axes stay fixed at 200 passes and loss 0–20, making the shape comparable throughout the run. Only the small adapter changes; the large model remains fixed.</figcaption>
    </figure>`;

interface FrozenFeature extends FunctionGemmaEvaluation {
  target: number;
}

/** Retain only exact frozen computations for the currently selected lesson.
 * Adapters and measured update passes are never cached or reused on retrain.
 */
interface LessonCache {
  key: string;
  features: FrozenFeature[] | undefined;
  baseline: Map<string, string>;
}

export function mountTuningDemo(container: HTMLElement): () => void {
  container.innerHTML = `<div class="demo-system-layout">
    <section class="workshop-chat" aria-label="FunctionGemma fine-tuning">
      <div id="tuning-thread" class="chat-thread" role="log" aria-label="Fine-tuning conversation" aria-relevant="additions">
        <article class="chat-turn chat-assistant-message">
          <h2>Teach a repeatable task</h2>
          <p>Try a note with the default model, train on a few fictional examples, then compare. Your previous messages and training runs stay here until you leave this demo.</p>
          <div id="tuning-try"><div id="tuning-custom-result" class="grid gap-3 sm:grid-cols-2"></div></div>
        </article>
      </div>
      <form id="tuning-composer" class="chat-composer">
        <label for="tuning-input">Send a short note or notification</label>
        <textarea id="tuning-input" maxlength="500" rows="3" placeholder="Try a notification…"></textarea>
        <div class="chat-tools"><button type="submit" id="tuning-baseline" class="primary">Run default model</button><button type="button" id="tuning-compare" disabled>Compare default vs tuned</button><button type="button" id="tuning-run">Train and compare</button><button type="button" id="tuning-cancel" disabled>Stop</button></div>
        <output id="tuning-status" aria-live="polite">Ready. First use downloads a 426 MB model. Training needs WebGPU.</output>
      </form>
    </section>
    <aside class="chat-inspector" aria-label="Fine-tuning controls">
      <h3>Teach a habit</h3>
      <label for="tuning-lesson">Everyday task</label><select id="tuning-lesson"></select>
      <p id="tuning-task-explanation" class="hint"></p>
      <div id="tuning-examples" class="chat-tools" role="group" aria-label="Example inputs"></div>
      <button type="button" id="tuning-save" disabled>Save latest adapter</button>
      <details><summary>Examples and evaluation</summary><p>Test inputs are withheld from updates. These authored examples are a teaching exercise, not a benchmark.</p><div id="tuning-data"></div></details>
      <details><summary>What changes inside the model?</summary><p>The original model stays frozen. WebGPU trains an output-head LoRA adapter with full-vocabulary cross-entropy. Each retrain starts a fresh adapter and repeats all 200 passes. Frozen features and default predictions can be reused exactly for this task, in this tab.</p><p>Saving an adapter uses this demo’s own format, not MLX or PEFT. No tool actions are executed.</p><div id="tuning-loss"></div></details>
      <details><summary>Continue with the CLI</summary><p>The separate MLX example trains attention adapters and records actual held-out outputs.</p><a href="https://github.com/techlahoma/techlahoma-google-apps-starter/tree/main/apps/building-ai-models-without-coding/scripts/functiongemma">CLI instructions ↗</a></details>
      <p class="hint"><a href="functiongemma/NOTICE.txt">Model source</a> · <a href="functiongemma/TERMS.txt">Gemma terms</a></p>
    </aside>
  </div>`;
  function get<T extends Element>(selector: string): T {
    const element = container.querySelector<T>(selector);
    if (!element) throw new Error(`Missing tuning element ${selector}`);
    return element;
  }
  function node<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text = '',
    className = '',
  ) {
    const element = document.createElement(tag);
    element.textContent = text;
    element.className = className;
    return element;
  }
  const select = get<HTMLSelectElement>('#tuning-lesson');
  lessons.forEach((lesson, index) => {
    const option = node('option', lesson.name);
    option.value = String(index);
    select.append(option);
  });
  const thread = get<HTMLElement>('#tuning-thread');
  const status = get<HTMLOutputElement>('#tuning-status');
  const run = get<HTMLButtonElement>('#tuning-run');
  const stop = get<HTMLButtonElement>('#tuning-cancel');
  const save = get<HTMLButtonElement>('#tuning-save');
  const examples = get<HTMLElement>('#tuning-examples');
  const input = get<HTMLTextAreaElement>('#tuning-input');
  const baseline = get<HTMLButtonElement>('#tuning-baseline');
  const compare = get<HTMLButtonElement>('#tuning-compare');
  const terminals: MountedTerminal[] = [];
  function terminal(host: HTMLElement, title: string) {
    const output = mountTerminalOutput(host, title);
    terminals.push(output);
    return output;
  }
  const dataOutput = terminal(
    get('#tuning-data'),
    'Training and held-out examples',
  );
  terminal(get('#tuning-loss'), 'Adapter training log').setOutput(
    'Train to add a measured loss plot and log to the conversation.',
  );
  let cancelled = false;
  let mounted = true;
  let running = false;
  let loading: AbortController | undefined;
  let model: FunctionGemmaInference | undefined;
  let adapter: OutputLora | undefined;
  let runCount = 0;
  let retiredId = 0;
  let cache: LessonCache | undefined;
  const currentLesson = () => lessons[Number(select.value)] ?? lessons[0]!;
  const cacheFor = (lesson: Lesson): LessonCache => {
    // Model identity plus exact prompt/data and decode limit. Changing any
    // input invalidates the cached body computations, without touching history.
    const key = JSON.stringify([
      FUNCTIONGEMMA_REVISION,
      'user-template-v1',
      12,
      lesson,
    ]);
    if (!cache || cache.key !== key)
      cache = {key, features: undefined, baseline: new Map()};
    return cache;
  };
  function latestId(element: Element, id: string) {
    const previous = container.querySelector(`#${id}`);
    if (previous) previous.id = `${id}-history-${++retiredId}`;
    element.id = id;
  }
  function createTurn(message: string, lesson: Lesson) {
    const turn = node('article', '', 'chat-turn');
    turn.dataset.lesson = lesson.name;
    const user = node('div', '', 'chat-user-message');
    user.append(node('p', message));
    const assistant = node('div', '', 'chat-assistant-message');
    assistant.append(node('p', lesson.name, 'hint'));
    turn.append(user, assistant);
    thread.append(turn);
    // Scroll only when a user starts a new turn, not at every training step.
    turn.scrollIntoView({block: 'nearest', behavior: 'instant'});
    return {turn, assistant};
  }
  function predictionPanel(title: string, state: PredictionPanelState) {
    const panel = node(
      'article',
      '',
      'min-h-28 rounded-lg border border-slate-700 bg-slate-900/50 p-4',
    );
    panel.append(
      node(
        'h4',
        title,
        'm-0 text-xs font-semibold uppercase tracking-wide text-slate-400',
      ),
    );
    if (state.kind === 'loading') {
      panel.setAttribute('aria-busy', 'true');
      panel.append(node('span', state.message, 'sr-only'));
      const shimmer = node(
        'div',
        '',
        'mt-4 space-y-2 motion-safe:animate-pulse motion-reduce:animate-none',
      );
      shimmer.setAttribute('aria-hidden', 'true');
      for (const width of ['w-3/4', 'w-full', 'w-1/2'])
        shimmer.append(node('div', '', `h-3 rounded bg-slate-700 ${width}`));
      panel.append(shimmer);
    } else {
      panel.append(
        node(
          'p',
          state.kind === 'result'
            ? displayPrediction(state.prediction)
            : state.message,
          state.kind === 'result'
            ? 'mb-0 mt-3 text-lg font-semibold text-slate-100'
            : 'mb-0 mt-3 text-sm text-slate-400',
        ),
      );
    }
    return panel;
  }
  function renderPanels(
    host: HTMLElement,
    defaultState: PredictionPanelState,
    tunedState: PredictionPanelState,
  ) {
    host.replaceChildren(
      predictionPanel('Default FunctionGemma', defaultState),
      predictionPanel('After tuning', tunedState),
    );
  }
  renderPanels(
    get('#tuning-custom-result'),
    {kind: 'idle', message: 'Send a message to try the default model.'},
    {kind: 'unavailable', message: 'Train an adapter to compare.'},
  );
  function controls(active: boolean) {
    running = active;
    run.disabled = active;
    baseline.disabled = active;
    compare.disabled = active || !adapter;
    save.disabled = active || !adapter;
    select.disabled = active;
    input.disabled = active;
    stop.disabled = !active;
    for (const button of examples.querySelectorAll('button'))
      button.disabled = active;
    run.textContent = adapter ? 'Retrain and compare' : 'Train and compare';
  }
  function showData() {
    const lesson = currentLesson();
    get('#tuning-task-explanation').textContent = lesson.explanation;
    dataOutput.setOutput(
      `TRAIN\n${lesson.train.map(row => `${row.input} → ${row.answer}`).join('\n')}\n\nTEST\n${lesson.test.map(row => `${row.input} → ${row.answer}`).join('\n')}`,
    );
    adapter?.dispose();
    adapter = undefined;
    cache = undefined;
    examples.replaceChildren();
    for (const [index, example] of lesson.test.entries()) {
      const button = node('button', example.input, 'text-left text-sm');
      button.type = 'button';
      button.setAttribute(
        'aria-label',
        `Use example ${index + 1}: ${example.input}`,
      );
      button.onclick = () => {
        input.value = example.input;
        input.focus();
      };
      examples.append(button);
    }
    input.value = lesson.test[0]?.input ?? '';
    controls(false);
  }
  select.addEventListener('change', showData);
  showData();
  stop.onclick = () => {
    cancelled = true;
    loading?.abort();
    status.value = 'Stopping after the current model operation…';
  };
  function checkCancelled() {
    if (cancelled || !mounted)
      throw new Error('Stopped. This operation did not complete.');
  }
  async function ensureModel(): Promise<FunctionGemmaInference> {
    if (model) return model;
    loading = new AbortController();
    try {
      const loaded = await loadFunctionGemma(message => {
        if (mounted) status.value = message;
      }, loading.signal);
      checkCancelled();
      model = loaded;
      return loaded;
    } finally {
      loading = undefined;
    }
  }
  async function generate(
    activeModel: FunctionGemmaInference,
    lesson: Lesson,
    text: string,
    outputAdapter?: OutputLora,
  ) {
    const lessonCache = cacheFor(lesson);
    const cached = outputAdapter ? undefined : lessonCache.baseline.get(text);
    if (cached !== undefined) return cached;
    const ids = prompt(activeModel, lesson, text);
    const output: number[] = [];
    const end = activeModel.encode('<end_of_turn>');
    for (let step = 0; step < 12; step++) {
      checkCancelled();
      const values = await activeModel.evaluateTokens(ids.concat(output));
      const token = outputAdapter
        ? (await outputAdapter.predict(values.hidden, values.logits)).token
        : bestToken(values.logits);
      if (end.includes(token) || token === 1) break;
      output.push(token);
      await yieldToPage();
    }
    checkCancelled();
    const prediction = activeModel.decode(output).trim();
    if (!outputAdapter) {
      // Bound custom-prompt retention independently from the conversation DOM.
      if (lessonCache.baseline.size >= 32)
        lessonCache.baseline.delete(lessonCache.baseline.keys().next().value!);
      lessonCache.baseline.set(text, prediction);
    }
    return prediction;
  }
  async function predict(compareAdapter: boolean) {
    const text = input.value.trim();
    if (!text) {
      status.value = 'Enter a short input first.';
      input.focus();
      return;
    }
    if (running || (compareAdapter && !adapter)) return;
    const lesson = currentLesson();
    const selectedAdapter = compareAdapter ? adapter : undefined;
    const {turn, assistant} = createTurn(text, lesson);
    latestId(turn, 'tuning-try');
    const panels = node('div', '', 'grid gap-3 sm:grid-cols-2');
    latestId(panels, 'tuning-custom-result');
    const receipt = node('p', '', 'hint');
    assistant.append(panels, receipt);
    renderPanels(
      panels,
      {kind: 'loading', message: 'Running the unchanged model.'},
      selectedAdapter
        ? {kind: 'loading', message: 'Waiting for the same input.'}
        : {
            kind: 'unavailable',
            message: 'Train an adapter, then send this input again to compare.',
          },
    );
    controls(true);
    cancelled = false;
    const started = performance.now();
    const reused = cacheFor(lesson).baseline.has(text);
    let before: string | undefined;
    try {
      const activeModel = await ensureModel();
      before = await generate(activeModel, lesson, text);
      checkCancelled();
      renderPanels(
        panels,
        {kind: 'result', prediction: before},
        selectedAdapter
          ? {kind: 'loading', message: 'Running the tuned adapter.'}
          : {kind: 'unavailable', message: 'No adapter used in this message.'},
      );
      if (selectedAdapter) {
        const after = await generate(
          activeModel,
          lesson,
          text,
          selectedAdapter,
        );
        checkCancelled();
        renderPanels(
          panels,
          {kind: 'result', prediction: before},
          {kind: 'result', prediction: after},
        );
      }
      receipt.textContent = `${((performance.now() - started) / 1000).toFixed(2)} s · ${reused ? 'Exact default prediction reused from this task.' : 'Default model evaluated locally.'}${selectedAdapter ? ' Tuned model evaluated locally.' : ''}`;
      status.value = selectedAdapter
        ? 'Default and tuned predictions are ready for the same input.'
        : 'Default FunctionGemma inference complete. No adapter was used.';
    } catch (error) {
      if (mounted) {
        const message = error instanceof Error ? error.message : String(error);
        renderPanels(
          panels,
          before === undefined
            ? {kind: 'idle', message}
            : {kind: 'result', prediction: before},
          {kind: 'unavailable', message},
        );
        receipt.textContent = message;
        status.value = message;
      }
    } finally {
      if (mounted) controls(false);
      else {
        running = false;
        adapter?.dispose();
        adapter = undefined;
      }
    }
  }
  const composer = get<HTMLFormElement>('#tuning-composer');
  composer.onsubmit = event => {
    event.preventDefault();
    void predict(false);
  };
  input.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    if (!running) composer.requestSubmit(baseline);
  });
  compare.onclick = () => {
    void predict(true);
  };
  save.onclick = () => {
    void saveAdapter();
  };
  async function saveAdapter() {
    if (!adapter || running) return;
    controls(true);
    stop.disabled = true;
    try {
      const snapshot = await adapter.export();
      if (!mounted) return;
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(snapshot)], {type: 'application/json'}),
      );
      const link = node('a');
      link.href = url;
      link.download = 'functiongemma-output-adapter.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.value =
        'Latest adapter saved. Previous result messages remain in this conversation.';
    } catch (error) {
      if (mounted)
        status.value = `Could not save adapter: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      if (mounted) controls(false);
      else {
        running = false;
        adapter?.dispose();
        adapter = undefined;
      }
    }
  }
  function resultsTable(
    host: HTMLElement,
    lesson: Lesson,
    before: string[],
    after?: string[],
  ) {
    const table = node('table');
    const head = node('thead');
    const header = node('tr');
    for (const label of ['Unseen input', 'Expected', 'Default', 'After tuning'])
      header.append(node('th', label));
    head.append(header);
    const body = node('tbody');
    for (const [index, example] of lesson.test.entries()) {
      const row = node('tr');
      for (const text of [
        example.input,
        displayPrediction(example.answer),
        displayPrediction(before[index] ?? ''),
        after ? displayPrediction(after[index] ?? '') : 'Training…',
      ])
        row.append(node('td', text));
      body.append(row);
    }
    table.append(head, body);
    host.replaceChildren(table);
  }
  run.onclick = () => {
    void train();
  };
  async function train() {
    if (running) return;
    const lesson = currentLesson();
    const lessonCache = cacheFor(lesson);
    const reusedFeatures = lessonCache.features !== undefined;
    const baselineReusedCount = lesson.test.filter(row =>
      lessonCache.baseline.has(row.input),
    ).length;
    const baselineTotal = lesson.test.length;
    const reusedBaseline = baselineReusedCount === baselineTotal;
    const modelAlreadyLoaded = model !== undefined;
    const {turn, assistant} = createTurn(
      `${adapter ? 'Retrain' : 'Train'} on the ${lesson.train.length} examples and compare with the default model.`,
      lesson,
    );
    const runNumber = ++runCount;
    turn.dataset.trainingRun = String(runNumber);
    const runStatus = node('p', 'Preparing training…');
    const progress = node('progress');
    progress.max = 1;
    progress.value = 0;
    progress.setAttribute('aria-label', `Training run ${runNumber} progress`);
    latestId(progress, 'tuning-progress');
    const visual = node('div');
    visual.innerHTML = trainingFigure.replaceAll(
      'tuning-',
      `tuning-run-${runNumber}-`,
    );
    const plot = visual.querySelector<SVGPolylineElement>('polyline')!;
    const point = visual.querySelector<SVGCircleElement>('circle')!;
    const lossLabel = visual.querySelector<SVGTextElement>(
      `#tuning-run-${runNumber}-loss-label`,
    )!;
    const results = node('div');
    latestId(results, 'tuning-results');
    const timings = node('p', '', 'hint');
    timings.dataset.trainingTimings = '';
    const details = node('details');
    details.append(node('summary', `Training log · run ${runNumber}`));
    const logHost = node('div');
    latestId(logHost, 'tuning-loss');
    details.append(logHost);
    assistant.append(
      node('h3', `Training run ${runNumber}`),
      runStatus,
      progress,
      visual,
      results,
      timings,
      details,
    );
    const log = terminal(logHost, `Adapter training log · run ${runNumber}`);
    const updateStatus = (message: string) => {
      if (!mounted) return;
      runStatus.textContent = message;
      status.value = message;
    };
    const highlight = (stage: 'data' | 'model' | 'adapter') => {
      for (const name of ['data', 'model', 'adapter'])
        visual
          .querySelector(`#tuning-run-${runNumber}-visual-${name}`)
          ?.setAttribute('opacity', stage === name ? '1' : '0.45');
    };
    const losses: number[] = [];
    function renderLoss() {
      const points = losses.map((loss, index) => ({
        x: ((index + 1) / 200) * 570,
        y: 100 - (Math.min(Math.max(loss, 0), 20) / 20) * 100,
      }));
      plot.setAttribute(
        'points',
        points
          .map(value => `${value.x.toFixed(1)},${value.y.toFixed(1)}`)
          .join(' '),
      );
      const last = points[points.length - 1]!;
      point.setAttribute('cx', last.x.toFixed(1));
      point.setAttribute('cy', last.y.toFixed(1));
      point.setAttribute('opacity', '1');
      lossLabel.textContent = `Pass ${losses.length} · loss ${losses[losses.length - 1]!.toFixed(3)}`;
    }
    controls(true);
    cancelled = false;
    adapter?.dispose();
    adapter = undefined;
    const started = performance.now();
    const measured: Record<string, number> = {};
    let lossLog = '';
    try {
      let stageStarted = performance.now();
      const activeModel = await ensureModel();
      measured.modelLoadMs = performance.now() - stageStarted;
      checkCancelled();
      highlight('model');
      stageStarted = performance.now();
      const before: string[] = [];
      for (const row of lesson.test) {
        updateStatus(
          lessonCache.baseline.has(row.input)
            ? 'Reusing an exact default prediction for this input…'
            : 'Testing the unchanged base model…',
        );
        before.push(await generate(activeModel, lesson, row.input));
      }
      measured.baselineMs = performance.now() - stageStarted;
      resultsTable(results, lesson, before);
      stageStarted = performance.now();
      let features = lessonCache.features;
      if (!features) {
        const pending: FrozenFeature[] = [];
        const end = activeModel.encode('<end_of_turn>');
        for (const [index, row] of lesson.train.entries()) {
          updateStatus(
            `Reading training example ${index + 1} of ${lesson.train.length}. The base model stays frozen.`,
          );
          const ids = prompt(activeModel, lesson, row.input);
          const target = activeModel.encode(row.answer).concat(end);
          for (let i = 0; i < target.length; i++) {
            checkCancelled();
            const values = await activeModel.evaluateTokens(
              ids.concat(target.slice(0, i)),
            );
            pending.push({...values, target: target[i]!});
            await yieldToPage();
          }
          progress.value = ((index + 1) / lesson.train.length) * 0.25;
        }
        checkCancelled();
        features = pending;
        lessonCache.features = features;
      } else {
        updateStatus(
          'Reusing exact frozen model features. A fresh adapter still trains for all 200 passes.',
        );
        progress.value = 0.25;
      }
      measured.featuresMs = performance.now() - stageStarted;
      stageStarted = performance.now();
      const options = {
        hiddenSize: 640,
        vocabSize: 262144,
        rank: 4,
        learningRate: 0.003,
        seed: 137,
      };
      let trained = await OutputLora.create(options);
      adapter = trained;
      measured.adapterSetupMs = performance.now() - stageStarted;
      stageStarted = performance.now();
      highlight('adapter');
      for (let epoch = 0; epoch < 200; epoch++) {
        checkCancelled();
        const {loss} = await trained.trainBatch(features);
        if (!Number.isFinite(loss))
          throw new Error('Training became unstable. This run did not pass.');
        lossLog += `Pass ${epoch + 1}: mean pre-update batch loss ${loss.toFixed(5)}\n`;
        log.setOutput(lossLog);
        losses.push(loss);
        renderLoss();
        updateStatus(
          `Training pass ${epoch + 1} / 200 · mean loss ${loss.toFixed(3)}`,
        );
        progress.value = 0.25 + ((epoch + 1) / 200) * 0.55;
        await yieldToPage();
      }
      measured.updatesMs = performance.now() - stageStarted;
      stageStarted = performance.now();
      const snapshot = await trained.export();
      trained.dispose();
      adapter = undefined;
      trained = await OutputLora.create(options);
      adapter = trained;
      await trained.import(JSON.parse(JSON.stringify(snapshot)));
      measured.reloadMs = performance.now() - stageStarted;
      checkCancelled();
      stageStarted = performance.now();
      const after: string[] = [];
      for (const [index, row] of lesson.test.entries()) {
        updateStatus(
          `Testing reloaded adapter ${index + 1} / ${lesson.test.length}…`,
        );
        after.push(await generate(activeModel, lesson, row.input, trained));
      }
      measured.evaluationMs = performance.now() - stageStarted;
      checkCancelled();
      resultsTable(results, lesson, before, after);
      const correct = after.filter(
        (prediction, index) => prediction === lesson.test[index]!.answer,
      ).length;
      progress.value = 1;
      updateStatus(
        `Training and reload complete. ${correct} / ${lesson.test.length} held-out outputs exactly match. Inspect the failures too.`,
      );
      measured.totalMs = performance.now() - started;
      const receipt = {
        modelRevision: FUNCTIONGEMMA_REVISION,
        lesson: lesson.name,
        passes: 200,
        reusedFrozenFeatures: reusedFeatures,
        reusedBaseline,
        baselineReusedCount,
        baselineTotal,
        modelAlreadyLoaded,
        featureCount: features.length,
        frozenBytes: features.reduce(
          (total, feature) =>
            total + feature.hidden.byteLength + feature.logits.byteLength,
          0,
        ),
        timingsMs: measured,
      };
      turn.dataset.trainingReceipt = JSON.stringify(receipt);
      timings.textContent = `Total ${(measured.totalMs / 1000).toFixed(2)} s · model preparation ${(measured.modelLoadMs! / 1000).toFixed(2)} s${modelAlreadyLoaded ? ' (already loaded)' : ''} · default ${(measured.baselineMs! / 1000).toFixed(2)} s (${baselineReusedCount}/${baselineTotal} reused) · frozen features ${(measured.featuresMs! / 1000).toFixed(2)} s${reusedFeatures ? ' (reused)' : ''} · 200 update passes ${(measured.updatesMs! / 1000).toFixed(2)} s · reload ${(measured.reloadMs! / 1000).toFixed(2)} s · held-out ${(measured.evaluationMs! / 1000).toFixed(2)} s.`;
      log.setStatus('Training and adapter reload completed.', 'success');
    } catch (error) {
      if (mounted) {
        const message = error instanceof Error ? error.message : String(error);
        updateStatus(message);
        assistant.append(
          node(
            'p',
            'This run is incomplete. Any partial loss plot or predictions above are retained.',
            'hint',
          ),
        );
        log.setStatus(message, 'error');
      }
      adapter?.dispose();
      adapter = undefined;
    } finally {
      if (mounted) controls(false);
      else {
        running = false;
        adapter?.dispose();
        adapter = undefined;
      }
    }
  }
  return () => {
    mounted = false;
    cancelled = true;
    loading?.abort();
    cache = undefined;
    if (!running) adapter?.dispose();
    for (const output of terminals) output.dispose();
  };
}
