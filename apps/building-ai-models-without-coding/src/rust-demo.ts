/** Browser Rust training: compile the edited source, then execute its real WASI output. */
export function mountRustDemo(container: HTMLElement): () => void {
  const heading = document.createElement('h2');
  heading.textContent = 'Train a tiny model from scratch';
  const intro = document.createElement('p');
  intro.textContent =
    'Edit a complete Rust GPT: attention, autograd and Adam. Compile it here, then train on synthetic GDG topic titles. Thirty steps demonstrate learning mechanics; generated fragments will usually be rough.';
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
  const output = document.createElement('pre');
  output.tabIndex = 0;
  output.setAttribute('aria-label', 'Rust compiler and training output');
  const fallback = document.createElement('p');
  fallback.textContent =
    'CLI fallback: from this app directory, run bun scripts/rust/prepare-assets.ts apply, then bun scripts/rust/run-cli.ts. Pass a saved .rs file as the final argument to run your edited source. This uses the same WASM compiler and needs no Xcode or native Rust install. Shell and PowerShell wrappers are also included.';
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
    outputLabel,
    output,
    fallback,
  );

  const sourceController = new AbortController();
  let jobController: AbortController | null = null;
  let worker: Worker | null = null;
  let deadline: ReturnType<typeof setTimeout> | null = null;
  let active = true;
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
    output.textContent += `\n${error instanceof Error ? error.message : String(error)}`;
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
    output.textContent = '';
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
          output.textContent = (output.textContent + data.text).slice(-100_000);
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
          output.textContent = lines.join('\n').slice(-100_000);
          status.textContent =
            'ok' in result && result.ok === true
              ? 'Rust program completed. Losses and samples above came from this run.'
              : 'Rust compile or execution failed. Read the diagnostic above.';
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
    container.replaceChildren();
  };
}
