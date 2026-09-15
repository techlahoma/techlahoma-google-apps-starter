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
  instruction: string;
  train: Example[];
  test: Example[];
}
const lessons: Lesson[] = [
  {
    name: 'Notification → now / later / ignore',
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
    <p class="hint"><a href="functiongemma/NOTICE.txt">Model source and modification notice</a> · <a href="functiongemma/TERMS.txt">Gemma terms and use restrictions</a></p>
    <label for="tuning-lesson">Choose an everyday task</label><select id="tuning-lesson"></select>
    <div class="toolbar"><button id="tuning-run" class="primary">Train and compare</button><button id="tuning-cancel" disabled>Stop</button><button id="tuning-save" disabled>Save adapter</button></div>
    <output id="tuning-status" aria-live="polite">Ready. First use downloads a 426 MB model. Training needs WebGPU.</output>
    <progress id="tuning-progress" value="0" max="1" hidden></progress>
    <div id="tuning-results"></div>
    <details id="tuning-try"><summary>Try your own input</summary><label for="tuning-input">A short note or notification</label><textarea id="tuning-input" maxlength="500" rows="3"></textarea><button id="tuning-compare" disabled>Compare before and after</button><pre id="tuning-custom-result" aria-live="polite">Train an adapter first. This text stays on your device.</pre></details>
    <details><summary>Examples and evaluation</summary><p>Training examples change the adapter. The test inputs below are withheld from those updates. These small authored examples are a teaching exercise, not a benchmark.</p><pre id="tuning-data"></pre></details>
    <details><summary>What changes inside the model?</summary><p>The original FunctionGemma body stays frozen. We train two small matrices on its output projection with full-vocabulary cross-entropy. GPU shaders calculate the adapter and weight updates; the CPU calculates softmax and loss. This is output-head LoRA, not the attention-layer QLoRA used in the CLI example.</p><p>The browser adapter is specific to this model and this demo. It is not an MLX or PEFT adapter file.</p><pre id="tuning-loss"></pre></details>
    <details><summary>Train with Antigravity or the CLI</summary><p>The repository includes a separate, verified MLX FunctionGemma experiment. It trains attention adapters, saves them, reloads them, and records held-out outputs.</p><p><a href="https://github.com/techlahoma/techlahoma-google-apps-starter/tree/main/apps/building-ai-models-without-coding/scripts/functiongemma">Open the CLI instructions ↗</a></p></details>
  </section>`;
  function get<T extends HTMLElement>(selector: string): T {
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
    get('#tuning-data').textContent =
      `TRAIN\n${lesson.train.map(row => `${row.input} → ${row.answer}`).join('\n')}\n\nTEST\n${lesson.test.map(row => `${row.input} → ${row.answer}`).join('\n')}`;
    results.replaceChildren();
    compare.disabled = true;
    customPrediction = undefined;
    save.disabled = true;
    adapter?.dispose();
    adapter = undefined;
  }
  select.addEventListener('change', showData);
  showData();
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
    const result = get('#tuning-custom-result');
    if (!text) {
      result.textContent = 'Enter a short input first.';
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
      result.textContent = 'Running the original model…';
      const before = await customPrediction(text, false);
      checkCancelled();
      result.textContent = 'Running the adapted model…';
      const after = await customPrediction(text, true);
      checkCancelled();
      result.textContent = `Before: ${before || '(empty output)'}\nAfter: ${after || '(empty output)'}`;
    } catch (error) {
      if (mounted)
        result.textContent =
          error instanceof Error ? error.message : String(error);
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
    get('#tuning-loss').textContent = '';
    adapter?.dispose();
    adapter = undefined;
    try {
      loading = new AbortController();
      const model = await loadFunctionGemma(message => {
        if (mounted) status.value = message;
      }, loading.signal);
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
        get('#tuning-loss').textContent +=
          `Pass ${epoch + 1}: mean pre-update batch loss ${loss.toFixed(5)}\n`;
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
  };
}
