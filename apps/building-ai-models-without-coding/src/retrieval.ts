import type {DocumentChunk} from './corpus';
export type RetrievalMode = 'lexical' | 'semantic' | 'hybrid';
export interface SearchHit {
  document: DocumentChunk;
  score: number;
}
const tokens = (text: string): string[] =>
  text.toLocaleLowerCase().match(/[\p{L}\p{N}]+|\p{Extended_Pictographic}/gu) ??
  [];

export function lexicalSearch(
  query: string,
  documents: DocumentChunk[],
): SearchHit[] {
  const terms = [...new Set(tokens(query))];
  const tokenized = documents.map(document => tokens(document.text));
  const averageLength =
    tokenized.reduce((sum, words) => sum + words.length, 0) /
    (documents.length || 1);
  return documents
    .map(document => {
      const words = tokens(document.text);
      const score = terms.reduce((sum, term) => {
        const frequency = words.filter(word => word === term).length;
        const count = tokenized.filter(words => words.includes(term)).length;
        const idf = Math.log(
          1 + (documents.length - count + 0.5) / (count + 0.5),
        );
        return (
          sum +
          (idf * (frequency * 2.2)) /
            (frequency +
              1.2 * (0.25 + (0.75 * words.length) / (averageLength || 1)))
        );
      }, 0);
      return {document, score};
    })
    .filter(hit => hit.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function cosine(a: number[], b: number[]): number {
  if (
    a.length !== b.length ||
    a.length === 0 ||
    !a.every(Number.isFinite) ||
    !b.every(Number.isFinite)
  )
    throw new Error('Invalid embedding dimensions or values.');
  const dot = a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
  const norm = Math.sqrt(
    a.reduce((sum, value) => sum + value * value, 0) *
      b.reduce((sum, value) => sum + value * value, 0),
  );
  if (norm === 0) throw new Error('The model returned a zero embedding.');
  return dot / norm;
}

export function semanticSearch(
  documents: DocumentChunk[],
  vectors: number[][],
): SearchHit[] {
  if (vectors.length !== documents.length + 1)
    throw new Error('Missing model embeddings.');
  const query = vectors[0];
  if (!query) throw new Error('Missing query embedding.');
  return documents
    .map((document, index) => {
      const vector = vectors[index + 1];
      if (!vector) throw new Error('Missing document embedding.');
      return {document, score: cosine(query, vector)};
    })
    .sort((a, b) => b.score - a.score);
}

export function hybridSearch(
  lexical: SearchHit[],
  semantic: SearchHit[],
): SearchHit[] {
  const combined = new Map<string, SearchHit>();
  for (const list of [lexical, semantic])
    list.forEach((hit, index) => {
      const prior = combined.get(hit.document.id);
      combined.set(hit.document.id, {
        document: hit.document,
        score: (prior?.score ?? 0) + 1 / (60 + index + 1),
      });
    });
  return [...combined.values()].sort((a, b) => b.score - a.score);
}
