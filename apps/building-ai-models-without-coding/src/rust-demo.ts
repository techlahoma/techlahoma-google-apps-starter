import {mountTerminalOutput} from './components/mount-terminal';

/** Browser Rust training: compile the edited source, then execute its real WASI output. */
export function mountRustDemo(container: HTMLElement): () => void {
  const heading = document.createElement('h2');
  heading.textContent = 'Train a tiny model from scratch';
  const intro = document.createElement('p');
  intro.textContent =
    'Task: train a tiny character-level language model to continue synthetic GDG topic text. Edit its Rust implementation, compile it in the browser, then watch thirty real optimization steps; the generated fragments will usually be rough.';
  const label = document.createElement('label');
  label.htmlFor = 'rust-source';
  label.textContent = 'Editable Rust model source';
  const editor = document.createElement('textarea');
  editor.id = 'rust-source';
  editor.rows = 18;
  editor.spellcheck = false;
  editor.disabled = true;
  editor.setAttribute('aria-describedby', 'rust-download-note');
  const note = document.createElement('p');
  note.id = 'rust-download-note';
  note.textContent =
    'The first run downloads about 160 MB of compiler and standard library files. Training runs locally in a cancellable worker on your CPU, without an API key. Source edits disappear when you leave: download your work first.';
  const run = document.createElement('button');
  run.textContent = 'Compile and train';
  run.disabled = true;
  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel Rust run';
  cancel.disabled = true;
  const download = document.createElement('button');
  download.textContent = 'Download Rust source';
  download.disabled = true;
  const status = document.createElement('p');
  status.role = 'status';
  status.textContent = 'Loading editable source…';
  const outputLabel = document.createElement('h3');
  outputLabel.textContent = 'Actual compiler and training output';
  const lossFigure = document.createElement('figure');
  lossFigure.className = 'm-0';
  lossFigure.setAttribute(
    'aria-labelledby',
    'rust-loss-title rust-loss-caption',
  );
  lossFigure.innerHTML = `<svg class="h-auto w-full" viewBox="0 0 720 210" role="img" aria-labelledby="rust-loss-title rust-loss-desc">
    <title id="rust-loss-title">Rust training loss by step</title>
    <desc id="rust-loss-desc">A line chart built from loss values printed by the running Rust program.</desc>
    <g transform="translate(54 30)">
      <line x1="0" y1="130" x2="612" y2="130" stroke="#697386" />
      <line x1="0" y1="0" x2="0" y2="130" stroke="#697386" />
      <polyline id="rust-loss-line" points="" fill="none" stroke="#b2c9ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      <circle id="rust-loss-point" cx="0" cy="130" r="5" fill="#b2c9ff" opacity="0" />
      <text id="rust-loss-label" x="612" y="154" text-anchor="end" fill="#a7abb6" font-size="12">Compile and train to plot stdout loss</text>
    </g>
  </svg><figcaption id="rust-loss-caption" class="text-sm text-slate-400">Each point comes from a <code>step … | loss …</code> line emitted by the Rust model. Lower is better on this tiny training set.</figcaption>`;
  const output = document.createElement('div');
  const fallback = document.createElement('p');
  fallback.textContent =
    'CLI fallback: from this app directory, run bun scripts/rust/prepare-assets.ts apply, then bun scripts/rust/run-cli.ts. Pass a saved .rs file as the final argument to run your edited source. This uses the same WASM compiler and needs no Xcode or native Rust install. Shell and PowerShell wrappers are also included.';
  const warningNote = document.createElement('p');
  warningNote.className = 'hint';
  warningNote.textContent =
    '⚠️ “sub and ptr_eq are never used” is a compiler warning about two unused helper methods. The program still runs. ✅ marks completed execution; ❌ marks a compiler or runtime failure. Rough generated fragments are expected after only 30 training steps.';
  container.append(
    heading,
    intro,
    label,
    editor,
    note,
    run,
    cancel,
    download,
    status,
    lossFigure,
    outputLabel,
    output,
    warningNote,
    fallback,
  );

  const sourceController = new AbortController();
  let jobController: AbortController | null = null;
  let worker: Worker | null = null;
  let deadline: ReturnType<typeof setTimeout> | null = null;
  let active = true;
  const outputTerminal = mountTerminalOutput(
    output,
    'Rust compiler and training output',
  );
  function renderOutput(text: string) {
    outputTerminal.setOutput(text);
  }
  renderOutput('Compiler output will appear here.');
  function getVisualElement<T extends Element>(selector: string): T {
    const element = lossFigure.querySelector<T>(selector);
    if (!element) throw new Error(`Rust loss visual is missing ${selector}.`);
    return element;
  }
  const lossLine = getVisualElement<SVGPolylineElement>('#rust-loss-line');
  const lossPoint = getVisualElement<SVGCircleElement>('#rust-loss-point');
  const lossLabel = getVisualElement<SVGTextElement>('#rust-loss-label');
  let streamedOutput = '';
  function renderLosses(text: string) {
    const matches = [
      ...text.matchAll(
        /step\s+(\d+)\s*\/\s*(\d+)\s*\|\s*loss\s+([0-9]+(?:\.[0-9]+)?)/g,
      ),
    ];
    const losses = matches
      .map(match => Number(match[3]))
      .filter(loss => Number.isFinite(loss));
    if (losses.length === 0) {
      lossLine.setAttribute('points', '');
      lossPoint.setAttribute('opacity', '0');
      lossLabel.textContent = 'Compile and train to plot stdout loss';
      return;
    }
    const width = 612;
    const height = 130;
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
    lossLabel.textContent = `Step ${matches.length} · loss ${losses[losses.length - 1]!.toFixed(4)} · best ${minimum.toFixed(4)}`;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      lossPoint.animate([{opacity: 0.35}, {opacity: 1}], {
        duration: 180,
        easing: 'ease-out',
      });
    }
  }
  const stop = () => {
    jobController?.abort();
    jobController = null;
    worker?.terminate();
    worker = null;
    if (deadline !== null) clearTimeout(deadline);
    deadline = null;
    run.disabled = false;
    cancel.disabled = true;
  };
  const fail = (error: unknown) => {
    if (!active) return;
    stop();
    status.textContent =
      'Rust run failed. Read the diagnostic below or use the CLI fallback.';
    streamedOutput += `\n${error instanceof Error ? error.message : String(error)}`;
    streamedOutput = streamedOutput.slice(-100_000);
    renderOutput(streamedOutput);
    outputTerminal.setStatus('Rust run failed.', 'error');
    renderLosses(streamedOutput);
  };

  fetch('/rust/tiny-gpt.rs', {signal: sourceController.signal})
    .then(async response => {
      if (!response.ok)
        throw new Error(`Source download failed: ${response.status}`);
      const source = await response.text();
      if (!active) return;
      editor.value = source;
      editor.disabled = false;
      run.disabled = false;
      download.disabled = false;
      status.textContent =
        'Ready. Change the dataset or training steps, then compile and train.';
    })
    .catch(error => {
      if (!sourceController.signal.aborted) fail(error);
    });

  run.onclick = async () => {
    stop();
    run.disabled = true;
    cancel.disabled = false;
    streamedOutput = '';
    outputTerminal.setStatus('', 'idle');
    renderOutput(streamedOutput);
    renderLosses(streamedOutput);
    status.textContent = 'Downloading and compiling the Rust compiler…';
    const controller = new AbortController();
    jobController = controller;
    deadline = setTimeout(() => {
      stop();
      status.textContent =
        'Stopped after 5 minutes. Reduce training steps or use the CLI fallback.';
    }, 300_000);
    try {
      const response = await fetch('/rust/rustc/rustc.wasm', {
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`Compiler download failed: ${response.status}`);
      const module = await WebAssembly.compileStreaming(response);
      if (controller.signal.aborted || !active) return;
      const jobWorker = new Worker('/rust/worker.js', {type: 'module'});
      worker = jobWorker;
      status.textContent = 'Loading Rust standard library…';
      const source = editor.value;
      jobWorker.onerror = event => fail(event.message);
      jobWorker.onmessage = (event: MessageEvent<unknown>) => {
        if (worker !== jobWorker || !active) return;
        const data = event.data;
        if (typeof data !== 'object' || data === null || !('type' in data))
          return;
        if (data.type === 'ready') {
          jobWorker.postMessage({type: 'job', id: 1, kind: 'run', source});
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
          // Bound DOM output even when edited code prints indefinitely.
          streamedOutput = (streamedOutput + data.text).slice(-100_000);
          renderOutput(streamedOutput);
          renderLosses(streamedOutput);
        } else if (data.type === 'init-error' && 'error' in data) {
          fail(data.error);
        } else if (data.type === 'result' && 'result' in data) {
          const result = data.result;
          stop();
          if (typeof result !== 'object' || result === null) {
            fail('Invalid worker response.');
            return;
          }
          const lines: string[] = [];
          for (const field of ['stdout', 'stderr', 'output', 'runtimeError']) {
            if (field in result) {
              const value = Reflect.get(result, field);
              if (typeof value === 'string' && value) lines.push(value);
            }
          }
          if ('diagnostics' in result && Array.isArray(result.diagnostics)) {
            for (const diagnostic of result.diagnostics) {
              if (
                typeof diagnostic === 'object' &&
                diagnostic !== null &&
                'rendered' in diagnostic &&
                typeof diagnostic.rendered === 'string'
              ) {
                lines.push(diagnostic.rendered);
              }
            }
          }
          streamedOutput = lines.join('\n').slice(-100_000);
          renderLosses(streamedOutput);
          status.textContent =
            'ok' in result && result.ok === true
              ? 'Rust program completed. Losses and samples above came from this run.'
              : 'Rust compile or execution failed. Read the diagnostic above.';
          renderOutput(streamedOutput);
          outputTerminal.setStatus(
            status.textContent,
            'ok' in result && result.ok === true ? 'success' : 'error',
          );
        }
      };
      jobWorker.postMessage({
        type: 'init',
        module,
        bundleUrl: new URL('/rust/rustc/sysroot-wasip1.bundle', location.href)
          .href,
      });
    } catch (error) {
      if (!controller.signal.aborted) fail(error);
    }
  };
  cancel.onclick = () => {
    stop();
    status.textContent = 'Cancelled. Partial stdout is preserved below.';
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
    outputTerminal.dispose();
  };
}
