import {afterEach, expect, test} from 'bun:test';
import {
  addSampleDocument,
  getCorpus,
  importCorpus,
  removeCorpusDocument,
  restoreExampleCorpus,
  sampleCorpus,
} from './corpus';
import {lexicalSearch} from './retrieval';

afterEach(restoreExampleCorpus);

test('sample documents can be removed and restored without duplicates', () => {
  restoreExampleCorpus();
  const before = getCorpus().length;
  removeCorpusDocument('equipment');
  expect(getCorpus().some(document => document.id === 'equipment')).toBe(false);
  addSampleDocument('equipment');
  addSampleDocument('equipment');
  expect(getCorpus()).toHaveLength(before);
  expect(
    getCorpus().filter(document => document.id === 'equipment'),
  ).toHaveLength(1);
});

test('an imported source remains available to later route readers until explicitly restored', () => {
  importCorpus([
    {name: 'my-notes.md', text: 'The telescope is stored in the observatory.'},
  ]);
  const contextSources = getCorpus();
  const retrievalSources = getCorpus();
  expect(contextSources).toEqual(retrievalSources);
  expect(lexicalSearch('telescope', retrievalSources)[0]?.document.source).toBe(
    'local file',
  );
  expect(
    retrievalSources.some(document => document.source === 'synthetic'),
  ).toBe(false);
  contextSources.splice(0);
  expect(getCorpus()).toHaveLength(1);
  restoreExampleCorpus();
  expect(getCorpus()).toEqual(sampleCorpus);
  expect(lexicalSearch('telescope', getCorpus())).toEqual([]);
});

test('a rejected multi-file import preserves the previously loaded corpus', () => {
  importCorpus([{name: 'keep.txt', text: 'Preserve this source.'}]);
  const prior = getCorpus();
  expect(() =>
    importCorpus([
      {name: 'good.txt', text: 'New source'},
      {name: 'bad.exe', text: 'No'},
    ]),
  ).toThrow();
  expect(getCorpus()).toEqual(prior);
  expect(() =>
    importCorpus(
      Array.from({length: 9}, () => ({name: 'note.txt', text: 'One'})),
    ),
  ).toThrow();
  expect(() =>
    importCorpus([{name: 'big.txt', text: 'x'.repeat(65537)}]),
  ).toThrow();
  expect(() =>
    importCorpus(
      Array.from({length: 8}, () => ({
        name: 'many.txt',
        text: 'x'.repeat(5000),
      })),
    ),
  ).toThrow('48 chunks');
  expect(getCorpus()).toEqual(prior);
});
