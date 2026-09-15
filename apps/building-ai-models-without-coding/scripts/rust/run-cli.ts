import {fileURLToPath} from 'node:url';

const publicRoot = new URL('../../public/rust/', import.meta.url);
const sourcePath =
  process.argv[2] || fileURLToPath(new URL('tiny-gpt.rs', publicRoot));
const source = await Bun.file(sourcePath).text();
const compiler = await Bun.file(
  new URL('rustc/rustc.wasm', publicRoot),
).bytes();
const bundle = await Bun.file(
  new URL('rustc/sysroot-wasip1.bundle', publicRoot),
).bytes();
const hash = (bytes: Uint8Array) =>
  new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
if (
  hash(compiler) !==
    '41412081eefc3e08ec5664ed0748902a7e575e1f267898dcc64d412702df7e83' ||
  hash(bundle) !==
    '6dba13d6077cb7936ed6661cd1087bc9e92dc1d8b35903ecf22881c97ac3980b'
) {
  throw new Error(
    'Compiler checksum mismatch. Run prepare-assets.ts apply to restore pinned assets.',
  );
}
console.error(
  `Compiling and running ${sourcePath} with the pinned WASM Rust toolchain.`,
);

process.exitCode = await new Promise<number>(resolve => {
  const worker = new Worker(
    new URL('../../public/rust/worker.js', import.meta.url).href,
  );
  let finished = false;
  const finish = (code: number) => {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    worker.terminate();
    resolve(code);
  };
  const timeout = setTimeout(() => {
    console.error('Rust execution stopped after the five-minute deadline.');
    finish(124);
  }, 300_000);
  worker.onerror = event => {
    console.error(event.message);
    finish(1);
  };
  worker.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data;
    if (typeof data !== 'object' || data === null || !('type' in data)) return;
    if (data.type === 'ready') {
      worker.postMessage({type: 'job', id: 1, kind: 'run', source});
    } else if (
      data.type === 'stdout' &&
      'text' in data &&
      typeof data.text === 'string'
    ) {
      process.stdout.write(data.text);
    } else if (
      data.type === 'status' &&
      'text' in data &&
      typeof data.text === 'string'
    ) {
      console.error(data.text);
    } else if (data.type === 'init-error' && 'error' in data) {
      console.error(String(data.error));
      finish(1);
    } else if (data.type === 'result' && 'result' in data) {
      const result = data.result;
      if (typeof result !== 'object' || result === null) {
        console.error('Invalid worker result.');
        finish(1);
        return;
      }
      for (const field of ['stderr', 'output', 'runtimeError']) {
        if (field in result) {
          const value: unknown = Reflect.get(result, field);
          if (typeof value === 'string' && value) console.error(value);
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
            console.error(diagnostic.rendered);
          }
        }
      }
      if ('ok' in result && result.ok === true) finish(0);
      else if (
        'exit' in result &&
        typeof result.exit === 'number' &&
        Number.isInteger(result.exit) &&
        result.exit > 0 &&
        result.exit < 256
      )
        finish(result.exit);
      else finish(1);
    }
  };
  worker.postMessage({type: 'init', moduleBytes: compiler, bundle});
});
