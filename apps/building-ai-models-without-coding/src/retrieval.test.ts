import {describe, expect, test} from 'bun:test';
import {chunkDocument, groundingPrompt, sampleCorpus} from './corpus';
import {cosine, hybridSearch, lexicalSearch, semanticSearch} from './retrieval';

describe('local document and retrieval behavior', () => {
  test('keyword query retrieves the document containing the evidence', () => {
    expect(lexicalSearch('charged laptop', sampleCorpus)[0]?.document.id).toBe(
      'equipment',
    );
    expect(lexicalSearch('unfindableword', sampleCorpus)).toEqual([]);
    expect(lexicalSearch('🦬', sampleCorpus)[0]?.document.id).toBe('emoji');
  });
  test('cosine ranking uses supplied numeric model vectors', () => {
    const docs = sampleCorpus.slice(0, 2);
    const hits = semanticSearch(docs, [
      [1, 0],
      [0, 1],
      [1, 0],
    ]);
    expect(hits[0]?.document.id).toBe('access');
    expect(hits[0]?.score).toBe(1);
    expect(() => cosine([0], [0])).toThrow('zero');
    expect(() => cosine([1], [1, 2])).toThrow('dimensions');
    expect(() => semanticSearch(docs, [[1]])).toThrow('Missing');
  });
  test('rank fusion combines evidence without treating unlike scores as probabilities', () => {
    const first = sampleCorpus[0];
    const second = sampleCorpus[1];
    if (!first || !second) throw new Error('Fixture missing.');
    const a = {document: first, score: 100};
    const b = {document: second, score: 0.5};
    expect(hybridSearch([a, b], [b])[0]?.document.id).toBe(b.document.id);
  });
  test('imports reject binary, oversized and unsupported inputs', () => {
    expect(() => chunkDocument('bad.exe', 'text')).toThrow();
    expect(() => chunkDocument('bad.txt', 'a\0b')).toThrow();
    expect(() => chunkDocument('big.md', 'a'.repeat(65537))).toThrow();
    expect(chunkDocument('emoji.eml', 'Subject: 🦬\nReady')[0]?.text).toContain(
      '🦬',
    );
  });
  test('chunk overlap preserves evidence across boundaries and prompt numbering follows supplied sources', () => {
    const chunks = chunkDocument('notes.txt', 'a'.repeat(900));
    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.text).toHaveLength(800);
    expect(chunks[1]?.text).toHaveLength(200);
    expect(groundingPrompt('where?', sampleCorpus.slice(1, 2))).toContain(
      '[1] Synthetic document: access',
    );
    expect(groundingPrompt('where?', [])).toContain('(No sources supplied.)');
  });
});
