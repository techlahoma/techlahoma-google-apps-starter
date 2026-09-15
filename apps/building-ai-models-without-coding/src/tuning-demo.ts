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
      <svg id="tuning-visual" class="h-auto w-full" viewBox="0 0 720 280" role="img" aria-labelledby="tuning-visual-title tuning-visual-desc">
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
        <g transform="translate(54 142)">
          <text x="0" y="-12" fill="#eceef2" font-size="14">Measured training loss</text>
          <line x1="0" y1="100" x2="612" y2="100" stroke="#697386" />
          <line x1="0" y1="0" x2="0" y2="100" stroke="#697386" />
          <polyline id="tuning-loss-line" points="" fill="none" stroke="#b2c9ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
          <circle id="tuning-loss-point" cx="0" cy="100" r="5" fill="#b2c9ff" opacity="0" />
          <text id="tuning-loss-label" x="612" y="122" text-anchor="end" fill="#a7abb6" font-size="12">Run training to plot loss</text>
        </g>
      </svg>
      <figcaption id="tuning-visual-caption" class="text-sm text-slate-400">The large model remains fixed. Each pass changes only the small adapter; a falling loss means its next-token predictions are getting closer to the training labels.</figcaption>
    </figure>
    <div id="tuning-results"></div>
    <details id="tuning-try"><summary>Try your own input</summary><label for="tuning-input">A short note or notification</label><textarea id="tuning-input" maxlength="500" rows="3"></textarea><button id="tuning-compare" disabled>Compare before and after</button><div id="tuning-custom-result" aria-live="polite"></div></details>
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
  const compare = get<HTMLButtonElement>('#tuning-compare');
  const customOutputRoot = mountTerminalOutput(
    get('#tuning-custom-result'),
    'Before and after',
    'Custom input comparison',
  );
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
  const currentLesson = () => lessons[Number(select.value)] ?? lessons[0]!;
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
    compare.disabled = true;
    customPrediction = undefined;
    save.disabled = true;
    adapter?.dispose();
    adapter = undefined;
    losses = [];
    renderLoss();
    highlightStage('data');
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
    const width = 612;
    const height = 100;
    const minimum = Math.min(...losses);
    const maximum = Math.max(...losses);
    const range = Math.max(maximum - minimum, 0.0001);
    const points = losses.map((loss, index) => {
      const x = losses.length === 1 ? 0 : (index / (losses.length - 1)) * width;
      const y = ((maximum - loss) / range) * (height - 12) + 6;
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
    customOutputRoot,
    'Before and after',
    'Custom input comparison',
    'Train an adapter first. This text stays on your device.',
  );
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
  save.addEventListener('click', () => {
    void saveAdapter();
  });
  async function saveAdapter() {
    if (!adapter || running) return;
    running = true;
    save.disabled = true;
    run.disabled = true;
    select.disabled = true;
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
        select.disabled = false;
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
    const text = get<HTMLTextAreaElement>('#tuning-input').value.trim();
    if (!text) {
      renderTerminal(
        customOutputRoot,
        'Before and after',
        'Custom input comparison',
        'Enter a short input first.',
      );
      return;
    }
    if (running || !customPrediction) return;
    running = true;
    cancelled = false;
    compare.disabled = true;
    run.disabled = true;
    save.disabled = true;
    select.disabled = true;
    stop.disabled = false;
    try {
      renderTerminal(
        customOutputRoot,
        'Before and after',
        'Custom input comparison',
        'Running the original model…',
      );
      const before = await customPrediction(text, false);
      checkCancelled();
      renderTerminal(
        customOutputRoot,
        'Before and after',
        'Custom input comparison',
        'Running the adapted model…',
      );
      const after = await customPrediction(text, true);
      checkCancelled();
      renderTerminal(
        customOutputRoot,
        'Before and after',
        'Custom input comparison',
        `Before: ${before || '(empty output)'}\nAfter: ${after || '(empty output)'}`,
      );
    } catch (error) {
      if (mounted)
        renderTerminal(
          customOutputRoot,
          'Before and after',
          'Custom input comparison',
          error instanceof Error ? error.message : String(error),
        );
    } finally {
      running = false;
      if (mounted) {
        compare.disabled = false;
        run.disabled = false;
        save.disabled = false;
        select.disabled = false;
        stop.disabled = true;
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
    select.disabled = true;
    stop.disabled = false;
    save.disabled = true;
    compare.disabled = true;
    customPrediction = undefined;
    progress.hidden = false;
    progress.value = 0;
    results.replaceChildren();
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
      loading = new AbortController();
      const model = await loadFunctionGemma(message => {
        if (mounted) status.value = message;
      }, loading.signal);
      highlightStage('model');
      loading = undefined;
      checkCancelled();
      const lesson = currentLesson();
      let trained = await OutputLora.create({
        hiddenSize: 640,
        vocabSize: 262144,
        rank: 4,
        learningRate: 0.003,
        seed: 137,
      });
      adapter = trained;
      const features: Array<FunctionGemmaEvaluation & {target: number}> = [];
      const end = model.encode('<end_of_turn>');
      for (const [index, row] of lesson.train.entries()) {
        status.value = `Reading training example ${index + 1} of ${lesson.train.length}. The base model stays frozen.`;
        const ids = prompt(model, lesson, row.input);
        const target = model.encode(row.answer).concat(end);
        for (let i = 0; i < target.length; i++) {
          checkCancelled();
          const values = await model.evaluateTokens(
            ids.concat(target.slice(0, i)),
          );
          features.push({...values, target: target[i]!});
          await yieldToPage();
        }
        progress.value = ((index + 1) / lesson.train.length) * 0.25;
      }
      const before: string[] = [];
      async function generate(
        input: string,
        withAdapter: boolean,
      ): Promise<string> {
        const ids = prompt(model, lesson, input);
        const output: number[] = [];
        for (let step = 0; step < 12; step++) {
          checkCancelled();
          const values = await model.evaluateTokens(ids.concat(output));
          const token = withAdapter
            ? (await trained.predict(values.hidden, values.logits)).token
            : bestToken(values.logits);
          if (end.includes(token) || token === 1) break;
          output.push(token);
          await yieldToPage();
        }
        return model.decode(output).trim();
      }
      for (const row of lesson.test) {
        status.value = 'Testing the unchanged base model…';
        before.push(await generate(row.input, false));
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
      const table = document.createElement('table');
      const header = document.createElement('tr');
      for (const label of ['Unseen input', 'Expected', 'Before', 'After']) {
        const th = document.createElement('th');
        th.textContent = label;
        header.append(th);
      }
      const head = document.createElement('thead');
      head.append(header);
      table.append(head);
      const body = document.createElement('tbody');
      table.append(body);
      results.append(table);
      let correct = 0;
      for (const [index, row] of lesson.test.entries()) {
        status.value = `Testing reloaded adapter ${index + 1} / ${lesson.test.length}…`;
        const after = await generate(row.input, true);
        if (after === row.answer) correct++;
        const tr = document.createElement('tr');
        for (const text of [
          row.input,
          row.answer,
          before[index] || '(empty output)',
          after || '(empty output)',
        ]) {
          const td = document.createElement('td');
          td.textContent = text;
          tr.append(td);
        }
        body.append(tr);
      }
      checkCancelled();
      progress.value = 1;
      status.value = `Training and reload complete. ${correct} / ${lesson.test.length} held-out outputs exactly match. Inspect the failures too.`;
      save.disabled = false;
      customPrediction = generate;
      compare.disabled = false;
    } catch (error) {
      if (mounted)
        status.value = error instanceof Error ? error.message : String(error);
      adapter?.dispose();
      adapter = undefined;
    } finally {
      running = false;
      if (mounted) {
        run.disabled = false;
        select.disabled = false;
        stop.disabled = true;
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
    customOutputRoot.dispose();
    dataOutputRoot.dispose();
    lossOutputRoot.dispose();
  };
}
