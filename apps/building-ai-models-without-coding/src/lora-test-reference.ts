/** Independent CPU equations for tests/proof only; never an execution fallback. */
export function referenceLora(
  hidden: number[],
  base: number[],
  a: number[],
  b: number[],
  rank: number,
  scale: number,
  target: number,
) {
  const vocab = base.length;
  const z = Array.from({length: rank}, (_, k) =>
    hidden.reduce((sum, h, j) => sum + h * a[j * rank + k]!, 0),
  );
  const logits = base.map(
    (value, j) =>
      value +
      scale * z.reduce((sum, value, k) => sum + value * b[k * vocab + j]!, 0),
  );
  const maximum = Math.max(...logits);
  const denominator = logits.reduce(
    (sum, value) => sum + Math.exp(value - maximum),
    0,
  );
  const gradient = logits.map(
    (value, j) =>
      Math.exp(value - maximum) / denominator - Number(j === target),
  );
  const dz = z.map(
    (_, k) =>
      scale * gradient.reduce((sum, g, j) => sum + g * b[k * vocab + j]!, 0),
  );
  return {
    logits,
    loss: maximum + Math.log(denominator) - logits[target]!,
    da: a.map((_, i) => hidden[Math.floor(i / rank)]! * dz[i % rank]!),
    db: b.map(
      (_, i) => scale * z[Math.floor(i / vocab)]! * gradient[i % vocab]!,
    ),
  };
}

export function referenceLoraBatch(
  features: Array<{hidden: number[]; logits: number[]; target: number}>,
  a: number[],
  b: number[],
  rank: number,
  scale: number,
) {
  const examples = features.map(feature =>
    referenceLora(
      feature.hidden,
      feature.logits,
      a,
      b,
      rank,
      scale,
      feature.target,
    ),
  );
  return {
    loss:
      examples.reduce((sum, example) => sum + example.loss, 0) /
      examples.length,
    da: a.map(
      (_, i) =>
        examples.reduce((sum, example) => sum + example.da[i]!, 0) /
        examples.length,
    ),
    db: b.map(
      (_, i) =>
        examples.reduce((sum, example) => sum + example.db[i]!, 0) /
        examples.length,
    ),
  };
}
