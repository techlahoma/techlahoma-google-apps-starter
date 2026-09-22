import {createHash} from 'node:crypto';
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const revision = '1f2dea3e25379f9dfc98cb83c324f00ab5deda37';
const base = `https://raw.githubusercontent.com/TheoLeeCJ/SemIf/${revision}/webgpu-demo/vendor/wllama/`;
const output = fileURLToPath(
  new URL('../../public/semif/vendor/', import.meta.url),
);
const files = [
  {
    name: 'index.js',
    source: 'index.js',
    sha256: 'ee4b31125271a8d525db06d59724ebdb79c3bda5396eb9e3245f64fd531faf6b',
  },
  {
    name: 'wllama.wasm',
    source: 'wasm/wllama.wasm',
    sha256: '6ca9fdd1b6c03206cd3a04e359b52c8f539896d6c5fb5d36243dded4a689f0ad',
  },
];
const action = process.argv[2];
if (action !== 'plan' && action !== 'apply')
  throw new Error('Use prepare-assets.ts plan or apply.');
console.log(`${action}: SemIf wllama 3.6.1 assets → ${output}`);
for (const file of files) {
  const path = join(output, file.name);
  const matches = async (): Promise<boolean> => {
    try {
      return (
        createHash('sha256')
          .update(await readFile(path))
          .digest('hex') === file.sha256
      );
    } catch {
      return false;
    }
  };
  if (await matches()) {
    console.log(`${file.name}: verified`);
    continue;
  }
  console.log(`${file.name}: download ${base}${file.source}`);
  if (action === 'plan') continue;
  const response = await fetch(`${base}${file.source}`, {
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw new Error(`Asset download failed: HTTP ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== file.sha256)
    throw new Error(`Checksum mismatch: ${file.name}`);
  await mkdir(output, {recursive: true});
  await writeFile(`${path}.partial`, bytes);
  await rename(`${path}.partial`, path);
}
