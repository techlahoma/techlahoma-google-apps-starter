export interface DocumentChunk {
  id: string;
  title: string;
  text: string;
  source: 'synthetic' | 'local file';
}

// Authored workshop fixtures. None of these records describe a real event.
export const sampleCorpus: DocumentChunk[] = [
  {
    id: 'snacks',
    title: 'Synthetic email: refreshments',
    text: 'Subject: Refreshments\nWe will serve vegan pizza and sparkling water. Please bring a reusable cup. 🍕',
    source: 'synthetic',
  },
  {
    id: 'access',
    title: 'Synthetic document: access',
    text: 'The workshop room has step-free access through the east entrance. A quiet room is available beside the library.',
    source: 'synthetic',
  },
  {
    id: 'equipment',
    title: 'Synthetic email: equipment',
    text: 'Subject: What to bring\nBring a charged laptop and its power adapter. Use a current Chromium browser for WebGPU exercises. No API key is needed for local inference. 💻',
    source: 'synthetic',
  },
  {
    id: 'transit',
    title: 'Synthetic document: transport',
    text: 'Bicycle racks are beside the north door. The nearest bus stop is opposite the library. Car parking is behind the building.',
    source: 'synthetic',
  },
  {
    id: 'emoji',
    title: 'Synthetic document: emoji guide',
    text: 'In our example team chat, 🦬 means the demo is ready to rehearse, 🧪 means an experiment needs testing, and 🛑 means stop the current run.',
    source: 'synthetic',
  },
];

export const MAX_FILE_BYTES = 64 * 1024;
export const MAX_CHUNKS = 48;

export function chunkDocument(name: string, text: string): DocumentChunk[] {
  if (!/\.(txt|md|json|eml)$/i.test(name))
    throw new Error('Choose a .txt, .md, .json, or .eml file.');
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw new Error('Each file must be at most 64 KiB.');
  if (text.includes('\0')) throw new Error('Binary files are not supported.');
  const clean = text.trim();
  if (!clean) throw new Error('The file is empty.');
  const chunks: DocumentChunk[] = [];
  for (let start = 0; start < clean.length; start += 700) {
    chunks.push({
      id: `${name}:${start}`,
      title: `${name} · ${chunks.length + 1}`,
      text: clean.slice(start, start + 800),
      source: 'local file',
    });
  }
  if (chunks.length > MAX_CHUNKS)
    throw new Error('Too much text: use a smaller document (up to 48 chunks).');
  return chunks;
}

export function groundingPrompt(
  question: string,
  chunks: DocumentChunk[],
): string {
  const context = chunks
    .map((chunk, index) => `[${index + 1}] ${chunk.title}\n${chunk.text}`)
    .join('\n\n');
  return `Read the notes below. Answer the question with a short, direct answer from the notes.\n\nNOTES\n${context || '(No sources supplied.)'}\n\nQUESTION: ${question}\nANSWER:`;
}

// Tab-local source of truth shared by Context and Retrieval route mounts.
// No localStorage, IndexedDB, or remote persistence: a page reload clears it.
let activeCorpus: DocumentChunk[] = [];

export function getCorpus(): DocumentChunk[] {
  return activeCorpus.map(document => ({...document}));
}

export function importCorpus(files: {name: string; text: string}[]): void {
  if (!files.length || files.length > 8)
    throw new Error('Choose between 1 and 8 files.');
  const nextFileIndex =
    activeCorpus.reduce((highest, document) => {
      if (document.source !== 'local file') return highest;
      const prefix = Number.parseInt(document.id.split(':', 1)[0] ?? '', 10);
      return Number.isFinite(prefix) ? Math.max(highest, prefix + 1) : highest;
    }, 0) || 0;
  const imported = files.flatMap((file, index) =>
    chunkDocument(file.name, file.text).map(chunk => ({
      ...chunk,
      id: `${nextFileIndex + index}:${chunk.id}`,
    })),
  );
  if (activeCorpus.length + imported.length > MAX_CHUNKS)
    throw new Error(
      'Import exceeds 48 chunks total; remove documents or choose smaller files.',
    );
  // Commit only after every file validates, preserving the current data on error.
  activeCorpus = [...activeCorpus, ...imported];
}

export function addSampleDocument(id: string): void {
  const sample = sampleCorpus.find(document => document.id === id);
  if (!sample) throw new Error(`Unknown sample document: ${id}`);
  if (activeCorpus.some(document => document.id === id)) return;
  if (activeCorpus.length >= MAX_CHUNKS)
    throw new Error(
      'The context already contains 48 chunks. Remove one first.',
    );
  activeCorpus = [...activeCorpus, {...sample}];
}

export function removeCorpusDocument(id: string): void {
  activeCorpus = activeCorpus.filter(document => document.id !== id);
}

export function restoreExampleCorpus(): void {
  activeCorpus = sampleCorpus.map(document => ({...document}));
}

export function clearCorpus(): void {
  activeCorpus = [];
}
