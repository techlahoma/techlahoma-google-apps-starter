import {mountTerminalOutput} from './components/mount-terminal';

/** Train and prompt the same Rust model; every reply is executed WASI stdout. */
export function mountRustDemo(container: HTMLElement): () => void {
  container.classList.add('demo-system-layout');
  const chat = document.createElement('section');
  chat.className = 'workshop-chat';
  const heading = document.createElement('h2');
  heading.textContent = 'Train, then continue a little text';
  const intro = document.createElement('p');
  intro.textContent =
    'This is a tiny character model, not an assistant. Train it on fictional GDG topics, then give it a short prefix. Replies extend that prefix using the actual trained weights; they will often be nonsense.';
  const thread = document.createElement('div');
  thread.className = 'chat-thread';
  thread.setAttribute('aria-label', 'Rust training and continuation history');
  const status = document.createElement('p');
  status.role = 'status';
  status.textContent = 'Loading Rust source…';
  const tools = document.createElement('div');
  tools.className = 'chat-tools';
  const train = document.createElement('button');
  train.id = 'rust-run';
  train.type = 'button';
  train.textContent = 'Compile and train';
  train.disabled = true;
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancel Rust run';
  cancel.disabled = true;
  tools.append(train, cancel);
  const composer = document.createElement('form');
  composer.className = 'chat-composer';
  const promptLabel = document.createElement('label');
  promptLabel.htmlFor = 'rust-prompt';
  promptLabel.textContent = 'Character prefix';
  const prompt = document.createElement('input');
  prompt.id = 'rust-prompt';
  prompt.placeholder = 'Try “build” or “learn” after training';
  prompt.maxLength = 256;
  prompt.disabled = true;
  const send = document.createElement('button');
  send.type = 'submit';
  send.textContent = 'Continue text';
  send.disabled = true;
  const promptHelp = document.createElement('p');
  promptHelp.id = 'rust-prompt-help';
  promptHelp.textContent =
    'Default model: fewer than 16 characters, lowercase letters and spaces from the dataset. Unsupported characters are rejected. Each prefix is independent; previous turns are not context.';
  prompt.setAttribute('aria-describedby', promptHelp.id);
  const examples = document.createElement('div');
  examples.className = 'chat-tools';
  for (const prefix of ['build', 'learn']) {
    const example = document.createElement('button');
    example.type = 'button';
    example.textContent = `Try “${prefix}”`;
    example.onclick = () => {
      prompt.value = prefix;
      prompt.focus();
    };
    examples.append(example);
  }
  composer.append(promptLabel, prompt, send, examples, tools, status);
  chat.append(heading, intro, thread, composer, promptHelp);

  const inspector = document.createElement('aside');
  inspector.className = 'chat-inspector';
  inspector.setAttribute('aria-label', 'Rust model inspector');
  const inspectorTitle = document.createElement('h3');
  inspectorTitle.textContent = 'Tiny character model';
  const facts = document.createElement('p');
  facts.textContent =
    'Default source: 1,280 parameters · 30 steps · 16-character context. Editing source can change these values.';
  const modelState = document.createElement('p');
  const sourceDetails = document.createElement('details');
  const sourceSummary = document.createElement('summary');
  sourceSummary.textContent = 'Edit source and CLI tools';
  sourceDetails.append(sourceSummary);
  const label = document.createElement('label');
  label.htmlFor = 'rust-source';
  label.textContent = 'Editable Rust model source';
  const editor = document.createElement('textarea');
  editor.id = 'rust-source';
  editor.rows = 18;
  editor.spellcheck = false;
  editor.disabled = true;
  const note = document.createElement('p');
  note.textContent =
    'This page keeps the latest 12 turns; older turns are removed. The first run downloads about 160 MB of compiler assets. Training and inference run locally on your CPU. Source changes take effect on the next training turn. Checkpoints stay in this worker only; cancel or leave this page and train again.';
  const download = document.createElement('button');
  download.textContent = 'Download Rust source';
  download.disabled = true;
  const fallback = document.createElement('p');
  fallback.textContent =
    'CLI: bun scripts/rust/prepare-assets.ts apply, then bun scripts/rust/run-cli.ts. No Xcode or native Rust needed. Download source to keep edits; this page does not save your conversation or checkpoint to disk.';
  const warning = document.createElement('p');
  warning.textContent =
    'The compiler warning “sub and ptr_eq are never used” refers to two unused helper methods. It is nonfatal: training and prompting still run. The original warning remains in each training log.';
  sourceDetails.append(label, editor, download, note, warning, fallback);
  inspector.append(inspectorTitle, facts, modelState, sourceDetails);
  container.append(chat, inspector);

  const terminals: ReturnType<typeof mountTerminalOutput>[] = [];
  const sourceController = new AbortController();
  let jobController: AbortController | null = null;
  let worker: Worker | null = null;
  let deadline: ReturnType<typeof setTimeout> | null = null;
  let active = true;
  let ready = false;
  let sourceReady = false;
  let busy = false;
  let sequence = 0;
  let trainingSource = '';
  let current: ReturnType<typeof addTurn> | null = null;
  let currentKind: 'run' | 'prompt' = 'run';
  const controls = () => {
    modelState.textContent = busy
      ? 'Running locally…'
      : ready
        ? 'Trained checkpoint ready for prefixes.'
        : 'No trained checkpoint. Start a training turn.';
    train.disabled = busy || !sourceReady;
    cancel.disabled = !busy;
    prompt.disabled = busy || !ready;
    send.disabled = busy || !ready;
  };
  const finish = () => {
    if (deadline !== null) clearTimeout(deadline);
    deadline = null;
    busy = false;
    controls();
  };
  const stop = () => {
    jobController?.abort();
    jobController = null;
    worker?.terminate();
    worker = null;
    ready = false;
    finish();
  };
  function addTurn(request: string, training: boolean) {
    const turn = document.createElement('article');
    turn.className = 'chat-turn';
    const user = document.createElement('p');
    user.className = 'chat-user-message';
    user.textContent = request;
    const response = document.createElement('div');
    response.className = 'chat-assistant-message';
    const summary = document.createElement('p');
    summary.textContent = training
      ? 'Compiling and training…'
      : 'Continuing with trained weights…';
    const figure = document.createElement('figure');
    figure.hidden = !training;
    figure.innerHTML =
      '<svg viewBox="0 0 640 200" role="img" aria-label="Actual Rust loss by training step"><path d="M50 20 V150 H620" fill="none" stroke="currentColor"/><polyline fill="none" stroke="currentColor" stroke-width="3" points=""/><text x="8" y="16" fill="currentColor">Loss</text><text data-loss-max x="8" y="36" fill="currentColor"></text><text x="25" y="150" fill="currentColor">0</text><text x="50" y="175" fill="currentColor">1</text><text data-last-step x="620" y="175" text-anchor="end" fill="currentColor"></text><text x="300" y="195" fill="currentColor">Training step</text></svg><figcaption>Waiting for actual training loss…</figcaption>';
    const details = document.createElement('details');
    details.open = training;
    const detailsTitle = document.createElement('summary');
    detailsTitle.textContent = 'Actual compiler and model output';
    const output = document.createElement('div');
    details.append(detailsTitle, output);
    response.append(summary, figure, details);
    if (training) {
      const snapshot = document.createElement('details');
      const snapshotLabel = document.createElement('summary');
      snapshotLabel.textContent = 'Exact source used for this training turn';
      const code = document.createElement('pre');
      code.textContent = trainingSource;
      snapshot.append(snapshotLabel, code);
      response.append(snapshot);
    }
    turn.append(user, response);
    thread.append(turn);
    const terminal = mountTerminalOutput(
      output,
      'Rust compiler and training output',
    );
    terminals.push(terminal);
    if (terminals.length > 12) {
      terminals.shift()?.dispose();
      thread.firstElementChild?.remove();
    }
    let text = '';
    let lossCeiling = 0;
    function render(next: string) {
      text = next.slice(-100_000);
      terminal.setOutput(text);
      const losses = [
        ...text.matchAll(
          /step\s+(\d+)\s*\/\s*(\d+)\s*\|\s*loss\s+([0-9]+(?:\.[0-9]+)?)/g,
        ),
      ]
        .map(match => Number(match[3]))
        .filter(Number.isFinite);
      const line = figure.querySelector('polyline');
      const caption = figure.querySelector('figcaption');
      if (line && caption && losses.length) {
        const min = Math.min(...losses);
        if (lossCeiling === 0)
          lossCeiling = Math.max(5, Math.ceil((losses[0] ?? 1) * 2));
        const steps = [...text.matchAll(/step\s+(\d+)\s*\/\s*(\d+)\s*\|/g)];
        const total = Number(steps[0]?.[2]) || losses.length;
        line.setAttribute(
          'points',
          losses
            .map((loss, i) => {
              const step = Number(steps[i]?.[1]) || i + 1;
              return `${50 + ((step - 1) / Math.max(1, total - 1)) * 570},${150 - (Math.min(lossCeiling, Math.max(0, loss)) / lossCeiling) * 130}`;
            })
            .join(' '),
        );
        const upper = figure.querySelector('[data-loss-max]');
        const lastStep = figure.querySelector('[data-last-step]');
        if (upper) upper.textContent = String(lossCeiling);
        if (lastStep) lastStep.textContent = String(total);
        caption.textContent = `${losses.length} actual steps · latest loss ${losses.at(-1)?.toFixed(4)} · best ${min.toFixed(4)}. Fixed axes: steps 1–${total}, loss 0–${lossCeiling}; values outside this range are clipped.`;
      }
    }
    return {
      summary,
      render,
      append: (chunk: string) => render(text + chunk),
      terminal,
    };
  }
  const fail = (error: unknown) => {
    if (!active) return;
    stop();
    const message = error instanceof Error ? error.message : String(error);
    status.textContent = `Rust run failed: ${message}`;
    current?.append(`\n${message}`);
    if (current) current.summary.textContent = status.textContent;
    current?.terminal.setStatus(status.textContent, 'error');
  };
  const startDeadline = () => {
    busy = true;
    controls();
    deadline = setTimeout(
      () => fail('Stopped after five minutes. Train again with fewer steps.'),
      300_000,
    );
  };
  function receive(event: MessageEvent<unknown>, jobWorker: Worker) {
    if (worker !== jobWorker || !active) return;
    const data = event.data;
    if (typeof data !== 'object' || data === null || !('type' in data)) return;
    if ('id' in data && data.id !== sequence) return;
    if (data.type === 'ready') {
      jobWorker.postMessage({
        type: 'job',
        id: sequence,
        kind: 'run',
        source: trainingSource,
      });
    } else if (
      data.type === 'status' &&
      'text' in data &&
      typeof data.text === 'string'
    ) {
      status.textContent = data.text;
    } else if (
      data.type === 'stdout' &&
      'text' in data &&
      typeof data.text === 'string'
    ) {
      current?.append(data.text);
    } else if (data.type === 'init-error' && 'error' in data) {
      fail(data.error);
    } else if (data.type === 'result' && 'result' in data) {
      const result = data.result;
      if (typeof result !== 'object' || result === null) {
        fail('Invalid worker response.');
        return;
      }
      const lines: string[] = [];
      for (const field of ['stdout', 'stderr', 'output', 'runtimeError']) {
        const value: unknown = Reflect.get(result, field);
        if (typeof value === 'string' && value) lines.push(value);
      }
      if ('diagnostics' in result && Array.isArray(result.diagnostics)) {
        for (const diagnostic of result.diagnostics) {
          if (
            typeof diagnostic === 'object' &&
            diagnostic !== null &&
            'rendered' in diagnostic &&
            typeof diagnostic.rendered === 'string'
          )
            lines.push(diagnostic.rendered);
        }
      }
      const text = lines.join('\n');
      const ok = 'ok' in result && result.ok === true;
      ready = 'promptReady' in result && result.promptReady === true;
      current?.render(text);
      const continuation = text.match(/^continuation: (.*)$/m)?.[1];
      status.textContent = ok
        ? currentKind === 'run'
          ? ready
            ? 'Training complete. Send a short character prefix.'
            : 'Program completed without a checkpoint. Restore checkpoint saving in the source to enable prompts.'
          : 'Continuation complete. No retraining.'
        : 'Rust compile or execution failed. Read the diagnostic in this turn.';
      if (current)
        current.summary.textContent =
          ok && currentKind === 'prompt' && continuation !== undefined
            ? `Character continuation: ${continuation}`
            : status.textContent;
      current?.terminal.setStatus(status.textContent, ok ? 'success' : 'error');
      finish();
    }
  }
  fetch('/rust/tiny-gpt.rs', {signal: sourceController.signal})
    .then(async response => {
      if (!response.ok)
        throw new Error(`Source download failed: ${response.status}`);
      const text = await response.text();
      if (!active) return;
      editor.value = text;
      editor.disabled = false;
      download.disabled = false;
      sourceReady = true;
      status.textContent =
        'Start with a training turn, then try “build” or “learn”.';
      controls();
    })
    .catch(error => {
      if (!sourceController.signal.aborted) fail(error);
    });
  train.onclick = async () => {
    stop();
    currentKind = 'run';
    trainingSource = editor.value;
    sequence++;
    current = addTurn(
      'Compile this source and train a fresh tiny character model.',
      true,
    );
    startDeadline();
    status.textContent = 'Downloading and compiling the Rust compiler…';
    const controller = new AbortController();
    jobController = controller;
    try {
      const response = await fetch('/rust/rustc/rustc.wasm', {
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Compiler download failed: ${response.status}`);
      const moduleBytes = await response.arrayBuffer();
      if (controller.signal.aborted || !active) return;
      const jobWorker = new Worker('/rust/worker.js', {type: 'module'});
      worker = jobWorker;
      jobWorker.onerror = event => fail(event.message);
      jobWorker.onmessage = event => receive(event, jobWorker);
      // Compile inside the disposable worker so Cancel also stops compilation.
      jobWorker.postMessage(
        {
          type: 'init',
          moduleBytes,
          bundleUrl: new URL('/rust/rustc/sysroot-wasip1.bundle', location.href)
            .href,
        },
        [moduleBytes],
      );
    } catch (error) {
      if (!controller.signal.aborted) fail(error);
    }
  };
  composer.onsubmit = event => {
    event.preventDefault();
    if (!ready || busy || !worker) return;
    const prefix = prompt.value;
    currentKind = 'prompt';
    sequence++;
    current = addTurn(prefix || '(Empty prefix)', false);
    status.textContent = 'Continuing from trained weights…';
    startDeadline();
    worker.postMessage({
      type: 'job',
      id: sequence,
      kind: 'prompt',
      prompt: prefix,
    });
    prompt.value = '';
  };
  cancel.onclick = () => {
    stop();
    status.textContent = 'Cancelled. Train again to create a new checkpoint.';
    if (current) current.summary.textContent = status.textContent;
    current?.terminal.setStatus(status.textContent, 'error');
  };
  download.onclick = () => {
    const url = URL.createObjectURL(
      new Blob([editor.value], {type: 'text/plain'}),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tiny-gpt.rs';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return () => {
    active = false;
    sourceController.abort();
    stop();
    terminals.forEach(terminal => terminal.dispose());
    container.classList.remove('demo-system-layout');
  };
}
