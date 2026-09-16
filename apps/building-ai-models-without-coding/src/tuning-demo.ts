import {
  mountTerminalOutput,
  type MountedTerminal,
} from './components/mount-terminal';
import {
  loadFunctionGemma,
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

export function mountTuningDemo(container: HTMLElement): () => void {
  container.innerHTML = `<section aria-label="FunctionGemma fine-tuning">
    <h2>Teach a repeatable task</h2>
    <p>Compare FunctionGemma before and after a small, real adapter update. The examples are fictional. No actions are executed.</p>
    <p id="tuning-task-explanation"></p>
    <p class="hint"><a href="functiongemma/NOTICE.txt">Model source and modification notice</a> · <a href="functiongemma/TERMS.txt">Gemma terms and use restrictions</a></p>
    <label for="tuning-lesson">Choose an everyday task</label><select id="tuning-lesson"></select>
    <div class="toolbar"><button id="tuning-run" class="primary">Train and compare</button><button id="tuning-cancel" disabled>Stop</button><button id="tuning-save" disabled>Save adapter</button></div>
    <output id="tuning-status" aria-live="polite">Ready. First use downloads a 426 MB model. Training needs WebGPU.</output>
    <progress id="tuning-progress" value="0" max="1" hidden></progress>
    <figure class="m-0" aria-labelledby="tuning-visual-title tuning-visual-caption">
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
    </figure>
    <div id="tuning-results"></div>
    <section id="tuning-try" aria-labelledby="tuning-try-title">
      <h3 id="tuning-try-title">Try the default model first</h3>
      <p class="hint">Pick an example or write your own. You can run the unchanged model before training, then use the same input to compare the tuned adapter.</p>
      <div id="tuning-examples" class="toolbar" role="group" aria-label="Example inputs"></div>
      <label for="tuning-input">A short note or notification</label>
      <textarea id="tuning-input" maxlength="500" rows="3"></textarea>
      <div class="toolbar"><button id="tuning-baseline">Run default model</button><button id="tuning-compare" disabled>Compare default vs tuned</button></div>
      <div id="tuning-custom-result" class="grid gap-3 sm:grid-cols-2" aria-live="polite"></div>
    </section>
    <details><summary>Examples and evaluation</summary><p>Training examples change the adapter. The test inputs below are withheld from those updates. These small authored examples are a teaching exercise, not a benchmark.</p><div id="tuning-data"></div></details>
    <details><summary>What changes inside the model?</summary><p>The original FunctionGemma body stays frozen. We train two small matrices on its output projection with full-vocabulary cross-entropy. GPU shaders calculate the adapter and weight updates; the CPU calculates softmax and loss. This is output-head LoRA, not the attention-layer QLoRA used in the CLI example.</p><p>The browser adapter is specific to this model and this demo. It is not an MLX or PEFT adapter file.</p><div id="tuning-loss"></div></details>
    <details><summary>Train with Antigravity or the CLI</summary><p>The repository includes a separate, verified MLX FunctionGemma experiment. It trains attention adapters, saves them, reloads them, and records held-out outputs.</p><p><a href="https://github.com/techlahoma/techlahoma-google-apps-starter/tree/main/apps/building-ai-models-without-coding/scripts/functiongemma">Open the CLI instructions ↗</a></p></details>
  </section>`;
  function get<T extends Element>(selector: string): T {
    const element = container.querySelector<T>(selector);
    if (!element) throw new Error(`Missing tuning element ${selector}`);
    return element;
  }
  const select = get<HTMLSelectElement>('#tuning-lesson');
  lessons.forEach((lesson, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = lesson.name;
    select.append(option);
  });
  const status = get<HTMLOutputElement>('#tuning-status');
  const run = get<HTMLButtonElement>('#tuning-run');
  const stop = get<HTMLButtonElement>('#tuning-cancel');
  const save = get<HTMLButtonElement>('#tuning-save');
  const progress = get<HTMLProgressElement>('#tuning-progress');
  const results = get('#tuning-results');
  const examples = get('#tuning-examples');
  const input = get<HTMLTextAreaElement>('#tuning-input');
  const baseline = get<HTMLButtonElement>('#tuning-baseline');
  const compare = get<HTMLButtonElement>('#tuning-compare');
  const customResult = get('#tuning-custom-result');
  const dataOutputRoot = mountTerminalOutput(
    get('#tuning-data'),
    'Training and held-out examples',
    'Fine-tuning examples and evaluation data',
  );
  const lossOutputRoot = mountTerminalOutput(
    get('#tuning-loss'),
    'Adapter training log',
    'Fine-tuning loss output',
  );
  function renderTerminal(
    root: MountedTerminal,
    _title: string,
    _ariaLabel: string,
    output: string,
  ) {
    root.setOutput(output);
  }
  let lossLog = '';
  const lossLine = get<SVGPolylineElement>('#tuning-loss-line');
  const lossPoint = get<SVGCircleElement>('#tuning-loss-point');
  const lossLabel = get<SVGTextElement>('#tuning-loss-label');
  const visualStages = {
    data: get<SVGGElement>('#tuning-visual-data'),
    model: get<SVGGElement>('#tuning-visual-model'),
    adapter: get<SVGGElement>('#tuning-visual-adapter'),
  };
  let activeVisualStage: keyof typeof visualStages | undefined;
  let losses: number[] = [];
  let customPrediction:
    ((text: string, adapted: boolean) => Promise<string>) | undefined;
  let cancelled = false;
  let mounted = true;
  let adapter: OutputLora | undefined;
  let running = false;
  let loading: AbortController | undefined;
  let model: FunctionGemmaInference | undefined;
  const currentLesson = () => lessons[Number(select.value)] ?? lessons[0]!;
  function createPredictionPanel(
    title: string,
    state: PredictionPanelState,
  ): HTMLElement {
    const panel = document.createElement('article');
    panel.className =
      'min-h-28 rounded-lg border border-slate-700 bg-slate-900/50 p-4';
    const heading = document.createElement('h4');
    heading.className =
      'm-0 text-xs font-semibold uppercase tracking-wide text-slate-400';
    heading.textContent = title;
    panel.append(heading);
    if (state.kind === 'loading') {
      panel.setAttribute('aria-busy', 'true');
      const loadingMessage = document.createElement('span');
      loadingMessage.className = 'sr-only';
      loadingMessage.textContent = state.message;
      const shimmer = document.createElement('div');
      shimmer.className =
        'mt-4 space-y-2 motion-safe:animate-pulse motion-reduce:animate-none';
      shimmer.setAttribute('aria-hidden', 'true');
      for (const width of ['w-3/4', 'w-full', 'w-1/2']) {
        const line = document.createElement('div');
        line.className = `h-3 rounded bg-slate-700 ${width}`;
        shimmer.append(line);
      }
      panel.append(loadingMessage, shimmer);
      return panel;
    }
    const message = document.createElement('p');
    message.className =
      state.kind === 'result'
        ? 'mb-0 mt-3 text-lg font-semibold text-slate-100'
        : 'mb-0 mt-3 text-sm text-slate-400';
    message.textContent =
      state.kind === 'result'
        ? displayPrediction(state.prediction)
        : state.message;
    panel.append(message);
    return panel;
  }
  function renderPredictionPanels(
    defaultState: PredictionPanelState,
    tunedState: PredictionPanelState,
  ) {
    customResult.replaceChildren(
      createPredictionPanel('Default FunctionGemma', defaultState),
      createPredictionPanel('After tuning', tunedState),
    );
  }
  function renderExampleButtons() {
    examples.replaceChildren();
    for (const [index, example] of currentLesson().test.entries()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'text-left text-sm';
      button.textContent = example.input;
      button.setAttribute(
        'aria-label',
        `Use example ${index + 1}: ${example.input}`,
      );
      button.addEventListener('click', () => {
        input.value = example.input;
        input.focus();
        renderPredictionPanels(
          {kind: 'idle', message: 'Ready to run this input.'},
          adapter
            ? {kind: 'idle', message: 'Use compare to run the tuned adapter.'}
            : {
                kind: 'unavailable',
                message: 'Train an adapter to unlock this comparison.',
              },
        );
      });
      examples.append(button);
    }
  }
  function setInputControlsDisabled(disabled: boolean) {
    input.disabled = disabled;
    for (const button of examples.querySelectorAll('button')) {
      button.disabled = disabled;
    }
  }
  function renderTrainingLoading() {
    const loadingSection = document.createElement('section');
    loadingSection.setAttribute('aria-label', 'Preparing held-out comparison');
    loadingSection.setAttribute('aria-busy', 'true');
    loadingSection.className =
      'space-y-3 motion-safe:animate-pulse motion-reduce:animate-none';
    const message = document.createElement('span');
    message.className = 'sr-only';
    message.textContent = 'Preparing held-out comparison.';
    loadingSection.append(message);
    for (let index = 0; index < 3; index++) {
      const row = document.createElement('div');
      row.className = 'grid grid-cols-2 gap-3';
      for (let column = 0; column < 2; column++) {
        const block = document.createElement('div');
        block.className = 'h-20 rounded-lg bg-slate-800';
        row.append(block);
      }
      loadingSection.append(row);
    }
    results.replaceChildren(loadingSection);
  }
  function renderResultsTable(
    lesson: Lesson,
    before: string[],
    after?: string[],
  ) {
    const table = document.createElement('table');
    const header = document.createElement('tr');
    for (const label of [
      'Unseen input',
      'Expected',
      'Default',
      'After tuning',
    ]) {
      const th = document.createElement('th');
      th.textContent = label;
      header.append(th);
    }
    const head = document.createElement('thead');
    head.append(header);
    table.append(head);
    const body = document.createElement('tbody');
    for (const [index, row] of lesson.test.entries()) {
      const tr = document.createElement('tr');
      for (const text of [
        row.input,
        displayPrediction(row.answer),
        displayPrediction(before[index] ?? ''),
      ]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      const tuned = document.createElement('td');
      if (after) {
        tuned.textContent = displayPrediction(after[index] ?? '');
      } else {
        tuned.setAttribute('aria-label', 'Training adapter');
        const shimmer = document.createElement('div');
        shimmer.className =
          'h-3 w-3/4 rounded bg-slate-700 motion-safe:animate-pulse motion-reduce:animate-none';
        shimmer.setAttribute('aria-hidden', 'true');
        tuned.append(shimmer);
      }
      tr.append(tuned);
      body.append(tr);
    }
    table.append(body);
    results.replaceChildren(table);
  }
  function showData() {
    const lesson = currentLesson();
    get('#tuning-task-explanation').textContent = lesson.explanation;
    renderTerminal(
      dataOutputRoot,
      'Training and held-out examples',
      'Fine-tuning examples and evaluation data',
      `TRAIN\n${lesson.train.map(row => `${row.input} → ${row.answer}`).join('\n')}\n\nTEST\n${lesson.test.map(row => `${row.input} → ${row.answer}`).join('\n')}`,
    );
    results.replaceChildren();
    renderExampleButtons();
    compare.disabled = true;
    customPrediction = undefined;
    save.disabled = true;
    adapter?.dispose();
    adapter = undefined;
    losses = [];
    renderLoss();
    highlightStage('data');
    input.value = lesson.test[0]?.input ?? '';
    renderPredictionPanels(
      {kind: 'idle', message: 'Run the unchanged model before training.'},
      {
        kind: 'unavailable',
        message: 'Train an adapter to unlock this comparison.',
      },
    );
  }
  function highlightStage(stage: keyof typeof visualStages) {
    const changed = activeVisualStage !== stage;
    activeVisualStage = stage;
    for (const [name, element] of Object.entries(visualStages)) {
      element.setAttribute('opacity', name === stage ? '1' : '0.45');
    }
    if (
      changed &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      visualStages[stage].animate([{opacity: 0.55}, {opacity: 1}], {
        duration: 240,
        easing: 'ease-out',
      });
    }
  }
  function renderLoss() {
    if (losses.length === 0) {
      lossLine.setAttribute('points', '');
      lossPoint.setAttribute('opacity', '0');
      lossLabel.textContent = 'Run training to plot loss';
      return;
    }
    const width = 570;
    const height = 100;
    const maximumLoss = 20;
    const totalPasses = 200;
    const points = losses.map((loss, index) => {
      const x = ((index + 1) / totalPasses) * width;
      const boundedLoss = Math.min(Math.max(loss, 0), maximumLoss);
      const y = height - (boundedLoss / maximumLoss) * height;
      return {x, y};
    });
    lossLine.setAttribute(
      'points',
      points
        .map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
        .join(' '),
    );
    const lastPoint = points[points.length - 1]!;
    lossPoint.setAttribute('cx', lastPoint.x.toFixed(1));
    lossPoint.setAttribute('cy', lastPoint.y.toFixed(1));
    lossPoint.setAttribute('opacity', '1');
    lossLabel.textContent = `Pass ${losses.length} · loss ${losses[losses.length - 1]!.toFixed(3)}`;
  }
  select.addEventListener('change', showData);
  showData();
  renderTerminal(
    lossOutputRoot,
    'Adapter training log',
    'Fine-tuning loss output',
    '',
  );
  stop.addEventListener('click', () => {
    cancelled = true;
    loading?.abort();
    status.value = 'Stopping after the current model operation…';
  });
  function checkCancelled() {
    if (cancelled || !mounted)
      throw new Error('Stopped. No completed training run was recorded.');
  }
  async function ensureModel(): Promise<FunctionGemmaInference> {
    if (model) return model;
    loading = new AbortController();
    const loadedModel = await loadFunctionGemma(message => {
      if (mounted) status.value = message;
    }, loading.signal);
    loading = undefined;
    checkCancelled();
    model = loadedModel;
    return model;
  }
  async function generate(
    activeModel: FunctionGemmaInference,
    lesson: Lesson,
    text: string,
    outputAdapter?: OutputLora,
  ): Promise<string> {
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
    return activeModel.decode(output).trim();
  }
  baseline.addEventListener('click', () => {
    void runBaseline();
  });
  async function runBaseline() {
    const text = input.value.trim();
    if (!text) {
      renderPredictionPanels(
        {kind: 'idle', message: 'Enter a short input first.'},
        adapter
          ? {kind: 'idle', message: 'Use compare to run the tuned adapter.'}
          : {
              kind: 'unavailable',
              message: 'Train an adapter to unlock this comparison.',
            },
      );
      return;
    }
    if (running) return;
    running = true;
    cancelled = false;
    baseline.disabled = true;
    compare.disabled = true;
    run.disabled = true;
    save.disabled = true;
    select.disabled = true;
    stop.disabled = false;
    setInputControlsDisabled(true);
    renderPredictionPanels(
      {kind: 'loading', message: 'Running the unchanged model.'},
      adapter
        ? {kind: 'idle', message: 'Use compare to run the tuned adapter.'}
        : {
            kind: 'unavailable',
            message: 'Train an adapter to unlock this comparison.',
          },
    );
    try {
      const activeModel = await ensureModel();
      highlightStage('model');
      const prediction = await generate(activeModel, currentLesson(), text);
      checkCancelled();
      renderPredictionPanels(
        {kind: 'result', prediction},
        adapter
          ? {kind: 'idle', message: 'Use compare to run the tuned adapter.'}
          : {
              kind: 'unavailable',
              message: 'Train an adapter to unlock this comparison.',
            },
      );
      status.value =
        'Default FunctionGemma inference complete. No adapter was used.';
    } catch (error) {
      if (mounted) {
        const message = error instanceof Error ? error.message : String(error);
        status.value = message;
        renderPredictionPanels(
          {kind: 'idle', message},
          adapter
            ? {kind: 'idle', message: 'Use compare to run the tuned adapter.'}
            : {
                kind: 'unavailable',
                message: 'Train an adapter to unlock this comparison.',
              },
        );
      }
    } finally {
      running = false;
      if (mounted) {
        baseline.disabled = false;
        compare.disabled = !adapter;
        run.disabled = false;
        save.disabled = !adapter;
        select.disabled = false;
        stop.disabled = true;
        setInputControlsDisabled(false);
      }
    }
  }
  save.addEventListener('click', () => {
    void saveAdapter();
  });
  async function saveAdapter() {
    if (!adapter || running) return;
    running = true;
    save.disabled = true;
    run.disabled = true;
    baseline.disabled = true;
    compare.disabled = true;
    select.disabled = true;
    setInputControlsDisabled(true);
    try {
      const snapshot = await adapter.export();
      if (!mounted) return;
      const blob = new Blob([JSON.stringify(snapshot)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'functiongemma-output-adapter.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (mounted)
        status.value = `Could not save adapter: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      running = false;
      if (mounted) {
        save.disabled = false;
        run.disabled = false;
        baseline.disabled = false;
        compare.disabled = false;
        select.disabled = false;
        setInputControlsDisabled(false);
      } else {
        adapter?.dispose();
        adapter = undefined;
      }
    }
  }
  compare.addEventListener('click', () => {
    void compareInput();
  });
  async function compareInput() {
    const text = input.value.trim();
    if (!text) {
      renderPredictionPanels(
        {kind: 'idle', message: 'Enter a short input first.'},
        {kind: 'idle', message: 'Enter a short input first.'},
      );
      return;
    }
    if (running || !customPrediction) return;
    running = true;
    cancelled = false;
    compare.disabled = true;
    baseline.disabled = true;
    run.disabled = true;
    save.disabled = true;
    select.disabled = true;
    stop.disabled = false;
    setInputControlsDisabled(true);
    try {
      renderPredictionPanels(
        {kind: 'loading', message: 'Running the unchanged model.'},
        {kind: 'idle', message: 'Waiting for the same input.'},
      );
      const before = await customPrediction(text, false);
      checkCancelled();
      renderPredictionPanels(
        {kind: 'result', prediction: before},
        {kind: 'loading', message: 'Running the tuned adapter.'},
      );
      const after = await customPrediction(text, true);
      checkCancelled();
      renderPredictionPanels(
        {kind: 'result', prediction: before},
        {kind: 'result', prediction: after},
      );
      status.value =
        'Default and tuned predictions are ready for the same input.';
    } catch (error) {
      if (mounted) {
        const message = error instanceof Error ? error.message : String(error);
        renderPredictionPanels(
          {kind: 'idle', message},
          {kind: 'idle', message},
        );
      }
    } finally {
      running = false;
      if (mounted) {
        compare.disabled = false;
        baseline.disabled = false;
        run.disabled = false;
        save.disabled = false;
        select.disabled = false;
        stop.disabled = true;
        setInputControlsDisabled(false);
      } else {
        adapter?.dispose();
        adapter = undefined;
      }
    }
  }
  run.addEventListener('click', () => {
    void execute();
  });
  async function execute() {
    if (running) return;
    running = true;
    cancelled = false;
    run.disabled = true;
    baseline.disabled = true;
    select.disabled = true;
    stop.disabled = false;
    save.disabled = true;
    compare.disabled = true;
    customPrediction = undefined;
    progress.hidden = false;
    progress.value = 0;
    setInputControlsDisabled(true);
    renderTrainingLoading();
    lossLog = '';
    renderTerminal(
      lossOutputRoot,
      'Adapter training log',
      'Fine-tuning loss output',
      lossLog,
    );
    losses = [];
    renderLoss();
    highlightStage('data');
    adapter?.dispose();
    adapter = undefined;
    try {
      const activeModel = await ensureModel();
      highlightStage('model');
      checkCancelled();
      const lesson = currentLesson();
      const before: string[] = [];
      for (const row of lesson.test) {
        status.value = 'Testing the unchanged base model…';
        before.push(await generate(activeModel, lesson, row.input));
      }
      renderResultsTable(lesson, before);
      let trained = await OutputLora.create({
        hiddenSize: 640,
        vocabSize: 262144,
        rank: 4,
        learningRate: 0.003,
        seed: 137,
      });
      adapter = trained;
      const features: Array<FunctionGemmaEvaluation & {target: number}> = [];
      const end = activeModel.encode('<end_of_turn>');
      for (const [index, row] of lesson.train.entries()) {
        status.value = `Reading training example ${index + 1} of ${lesson.train.length}. The base model stays frozen.`;
        const ids = prompt(activeModel, lesson, row.input);
        const target = activeModel.encode(row.answer).concat(end);
        for (let i = 0; i < target.length; i++) {
          checkCancelled();
          const values = await activeModel.evaluateTokens(
            ids.concat(target.slice(0, i)),
          );
          features.push({...values, target: target[i]!});
          await yieldToPage();
        }
        progress.value = ((index + 1) / lesson.train.length) * 0.25;
      }
      for (let epoch = 0; epoch < 200; epoch++) {
        checkCancelled();
        const {loss} = await trained.trainBatch(features);
        if (!Number.isFinite(loss))
          throw new Error('Training became unstable. This run did not pass.');
        lossLog += `Pass ${epoch + 1}: mean pre-update batch loss ${loss.toFixed(5)}\n`;
        renderTerminal(
          lossOutputRoot,
          'Adapter training log',
          'Fine-tuning loss output',
          lossLog,
        );
        losses.push(loss);
        renderLoss();
        highlightStage('adapter');
        status.value = `Training pass ${epoch + 1} / 200 · mean loss ${loss.toFixed(3)}`;
        progress.value = 0.25 + ((epoch + 1) / 200) * 0.55;
        await yieldToPage();
      }
      // Prove exported adapter values can be loaded before comparing results.
      const snapshot = await trained.export();
      trained.dispose();
      adapter = undefined;
      trained = await OutputLora.create({
        hiddenSize: 640,
        vocabSize: 262144,
        rank: 4,
        learningRate: 0.003,
        seed: 137,
      });
      adapter = trained;
      await trained.import(JSON.parse(JSON.stringify(snapshot)));
      checkCancelled();
      const after: string[] = [];
      let correct = 0;
      for (const [index, row] of lesson.test.entries()) {
        status.value = `Testing reloaded adapter ${index + 1} / ${lesson.test.length}…`;
        const prediction = await generate(
          activeModel,
          lesson,
          row.input,
          trained,
        );
        after.push(prediction);
        if (prediction === row.answer) correct++;
      }
      checkCancelled();
      renderResultsTable(lesson, before, after);
      progress.value = 1;
      status.value = `Training and reload complete. ${correct} / ${lesson.test.length} held-out outputs exactly match. Inspect the failures too.`;
      save.disabled = false;
      customPrediction = (text, adapted) =>
        generate(activeModel, lesson, text, adapted ? trained : undefined);
      compare.disabled = false;
    } catch (error) {
      if (mounted)
        status.value = error instanceof Error ? error.message : String(error);
      adapter?.dispose();
      adapter = undefined;
      if (mounted) {
        const errorMessage = document.createElement('p');
        errorMessage.role = 'alert';
        errorMessage.textContent = status.value;
        results.replaceChildren(errorMessage);
      }
    } finally {
      running = false;
      if (mounted) {
        run.disabled = false;
        baseline.disabled = false;
        select.disabled = false;
        stop.disabled = true;
        setInputControlsDisabled(false);
      } else {
        adapter?.dispose();
        adapter = undefined;
      }
    }
  }
  return () => {
    mounted = false;
    cancelled = true;
    loading?.abort();
    if (!running) adapter?.dispose();
    dataOutputRoot.dispose();
    lossOutputRoot.dispose();
  };
}
