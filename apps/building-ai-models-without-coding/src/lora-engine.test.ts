import {describe, expect, test} from 'bun:test';
import {
  initialLoraWeights,
  softmaxCrossEntropy,
  validateLoraOptions,
} from './lora-engine';
import {referenceLora, referenceLoraBatch} from './lora-test-reference';

describe('output-head LoRA numerical reference', () => {
  test('analytic gradients of both factors match central finite differences', () => {
    const hidden = [0.7, -0.2, 1.1];
    const base = [0.2, -0.5, 0.1, 0.7, -0.3];
    const a = [0.1, -0.3, 0.2, 0.4, -0.2, 0.1];
    const b = [0.3, -0.2, 0.1, -0.4, 0.2, 0.1, -0.5, 0.2, 0.3, -0.1];
    const reference = referenceLora(hidden, base, a, b, 2, 0.5, 3);
    const epsilon = 1e-5;
    for (const [weights, derivatives] of [
      [a, reference.da],
      [b, reference.db],
    ]) {
      for (let i = 0; i < weights!.length; i++) {
        const old = weights![i]!;
        weights![i] = old + epsilon;
        const plus = referenceLora(hidden, base, a, b, 2, 0.5, 3).loss;
        weights![i] = old - epsilon;
        const minus = referenceLora(hidden, base, a, b, 2, 0.5, 3).loss;
        weights![i] = old;
        expect(derivatives![i]!).toBeCloseTo((plus - minus) / (2 * epsilon), 7);
      }
    }
  });

  test('softmax handles extreme finite logits and gives the full vocabulary derivative', () => {
    const {loss, gradient} = softmaxCrossEntropy(
      new Float32Array([10000, 9999, -10000]),
      1,
    );
    expect(loss).toBeCloseTo(1.3132616875, 8);
    expect(gradient[0]).toBeCloseTo(0.73105858, 6);
    expect(gradient[1]).toBeCloseTo(-0.73105858, 6);
    expect(gradient[2]).toBe(0);
    expect(() =>
      softmaxCrossEntropy(new Float32Array([Infinity]), 0),
    ).toThrow();
    expect(() => softmaxCrossEntropy(new Float32Array([0]), 1)).toThrow();
  });

  test('initialization is deterministic, small A and exactly zero B', () => {
    const config = {hiddenSize: 3, vocabSize: 5, rank: 2, learningRate: 0.1};
    const first = initialLoraWeights(config);
    expect(first).toEqual(initialLoraWeights(config));
    expect(first.a.some(x => x !== 0)).toBe(true);
    expect(first.a.every(x => Math.abs(x) < 0.01)).toBe(true);
    expect(first.b.every(x => x === 0)).toBe(true);
    expect(() => validateLoraOptions({...config, rank: 0})).toThrow();
    expect(() => validateLoraOptions({...config, learningRate: NaN})).toThrow();
  });
});

test('full-batch gradients match finite differences of fixed-parameter mean loss', () => {
  const features = [
    {hidden: [0.7, -0.2, 1.1], logits: [0.2, -0.5, 0.1], target: 2},
    {hidden: [-0.1, 0.8, -0.6], logits: [0.9, -0.3, 0.4], target: 0},
    {hidden: [0.3, 0.4, 0.2], logits: [-0.2, 0.1, 0.5], target: 1},
  ];
  const a = [0.1, -0.3, 0.2, 0.4, -0.2, 0.1];
  const b = [0.3, -0.2, 0.1, -0.4, 0.2, 0.1];
  const reference = referenceLoraBatch(features, a, b, 2, 0.5);
  const epsilon = 1e-5;
  for (const [weights, derivatives] of [
    [a, reference.da],
    [b, reference.db],
  ]) {
    for (let i = 0; i < weights!.length; i++) {
      const old = weights![i]!;
      weights![i] = old + epsilon;
      const plus = referenceLoraBatch(features, a, b, 2, 0.5).loss;
      weights![i] = old - epsilon;
      const minus = referenceLoraBatch(features, a, b, 2, 0.5).loss;
      weights![i] = old;
      expect(derivatives![i]!).toBeCloseTo((plus - minus) / (2 * epsilon), 7);
    }
  }
});
