import {mkdir, rename} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const target = fileURLToPath(
  new URL('../../public/rust/rustc/', import.meta.url),
);
const assets = [
  {
    archive: 'rustc-wasm.tar.zst',
    archiveSha:
      'a96f6d53afff3c95d6387def27f6ddb53a02575679dc6c981d60797c32dcd022',
    member: 'rustc/rustc.wasm',
    name: 'rustc.wasm',
    sha: '41412081eefc3e08ec5664ed0748902a7e575e1f267898dcc64d412702df7e83',
    bytes: 87871387,
  },
  {
    archive: 'wasip1-sysroot.tar.zst',
    archiveSha:
      '4eedff7b0cd4330bfe226734b67751a97fac5572ac55392e93f9d3e4886a277d',
    member: 'rustc/sysroot-wasip1.bundle',
    name: 'sysroot-wasip1.bundle',
    sha: '6dba13d6077cb7936ed6661cd1087bc9e92dc1d8b35903ecf22881c97ac3980b',
    bytes: 71313335,
  },
];
const hash = (bytes: Uint8Array) =>
  new Bun.CryptoHasher('sha256').update(bytes).digest('hex');
const mode = process.argv[2];
if (mode !== 'plan' && mode !== 'apply')
  throw new Error('Usage: bun scripts/rust/prepare-assets.ts plan|apply');
console.log(`${mode}: pinned compiler assets → ${target}`);
for (const asset of assets) {
  const destination = join(target, asset.name);
  const file = Bun.file(destination);
  const valid =
    (await file.exists()) &&
    file.size === asset.bytes &&
    hash(await file.bytes()) === asset.sha;
  console.log(
    `${asset.name}: ${valid ? 'verified' : 'needs download'} (${asset.bytes} bytes)`,
  );
  if (valid || mode === 'plan') continue;
  const url = `https://github.com/AngelOnFira/wasm-rustc/releases/download/artifacts-test-7/${asset.archive}`;
  const response = await fetch(url, {signal: AbortSignal.timeout(120_000)});
  if (!response.ok)
    throw new Error(`Download failed: ${url} (${response.status})`);
  const compressed = new Uint8Array(await response.arrayBuffer());
  if (hash(compressed) !== asset.archiveSha)
    throw new Error(`Archive checksum mismatch: ${asset.archive}`);
  const files = await new Bun.Archive(
    Bun.zstdDecompressSync(compressed),
  ).files();
  const member = files.get(asset.member);
  if (!member) throw new Error(`Missing pinned member: ${asset.member}`);
  const bytes = new Uint8Array(await member.arrayBuffer());
  if (bytes.length !== asset.bytes || hash(bytes) !== asset.sha)
    throw new Error(`Extracted checksum mismatch: ${asset.name}`);
  await mkdir(target, {recursive: true});
  const temporary = `${destination}.${process.pid}.tmp`;
  await Bun.write(temporary, bytes);
  await rename(temporary, destination);
  console.log(`Verified and staged ${asset.name}`);
}
