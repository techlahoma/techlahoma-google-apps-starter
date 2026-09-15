#!/usr/bin/env bun
import {browserLaunchOptions} from './browser-runtime';
/** Run against a local Vite server; headed Chromium and actual WebGPU required. */
import {chromium} from 'playwright';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const origin = Bun.argv[2] ?? 'http://127.0.0.1:5197';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error('Proof requires an explicit loopback Vite origin');
}
const browser = await chromium.launch(browserLaunchOptions);
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  const result = await page.evaluate(async root => {
    const {OutputLora} = (await import(
      `${root}/src/lora-engine.ts`
    )) as typeof import('../apps/building-ai-models-without-coding/src/lora-engine');
    const {referenceLora, referenceLoraBatch} = (await import(
      `${root}/src/lora-test-reference.ts`
    )) as typeof import('../apps/building-ai-models-without-coding/src/lora-test-reference');
    if (!navigator.gpu) throw new Error('Actual WebGPU is unavailable');
    const hardware = await navigator.gpu.requestAdapter();
    if (!hardware) throw new Error('No GPU adapter');
    const options = {
      hiddenSize: 3,
      vocabSize: 5,
      rank: 2,
      learningRate: 0.1,
      scale: 0.5,
    };
    const engine = await OutputLora.create(options);
    let maxError = 0;
    const close = (actual: number[], expected: number[]) => {
      for (let i = 0; i < expected.length; i++) {
        const error = Math.abs(actual[i]! - expected[i]!);
        maxError = Math.max(maxError, error);
        if (error > 2e-6)
          throw new Error(
            `GPU/CPU mismatch at ${i}: ${actual[i]} vs ${expected[i]}`,
          );
      }
    };
    let snapshot = await engine.export();
    snapshot.a = [0.1, -0.3, 0.2, 0.4, -0.2, 0.1];
    snapshot.b = [0.3, -0.2, 0.1, -0.4, 0.2, 0.1, -0.5, 0.2, 0.3, -0.1];
    await engine.import(snapshot);
    const hidden = [0.7, -0.2, 1.1];
    const base = [0.2, -0.5, 0.1, 0.7, -0.3];
    for (let step = 0; step < 5; step++) {
      const expected = referenceLora(
        hidden,
        base,
        snapshot.a,
        snapshot.b,
        2,
        0.5,
        3,
      );
      close(
        Array.from(
          await engine.forward(
            new Float32Array(hidden),
            new Float32Array(base),
          ),
        ),
        expected.logits,
      );
      const trained = await engine.train(
        new Float32Array(hidden),
        new Float32Array(base),
        3,
      );
      close([trained.loss], [expected.loss]);
      const after = await engine.export();
      close(
        after.a,
        snapshot.a.map(
          (value, i) => value - options.learningRate * expected.da[i]!,
        ),
      );
      close(
        after.b,
        snapshot.b.map(
          (value, i) => value - options.learningRate * expected.db[i]!,
        ),
      );
      snapshot = after;
    }
    const features = [
      {hidden, logits: base, target: 3},
      {
        hidden: [-0.1, 0.8, -0.6],
        logits: [0.9, -0.3, 0.4, 0.2, -0.1],
        target: 0,
      },
      {hidden: [0.3, 0.4, 0.2], logits: [-0.2, 0.1, 0.5, -0.7, 0.3], target: 4},
    ];
    const gpuFeatures = features.map(feature => ({
      hidden: new Float32Array(feature.hidden),
      logits: new Float32Array(feature.logits),
      target: feature.target,
    }));
    for (let step = 0; step < 5; step++) {
      const expected = referenceLoraBatch(
        features,
        snapshot.a,
        snapshot.b,
        2,
        0.5,
      );
      const reverse = await OutputLora.create(options);
      await reverse.import(snapshot);
      const trained = await engine.trainBatch(gpuFeatures);
      const reversed = await reverse.trainBatch([...gpuFeatures].reverse());
      close([trained.loss, reversed.loss], [expected.loss, expected.loss]);
      const after = await engine.export();
      const afterReverse = await reverse.export();
      close(
        after.a,
        snapshot.a.map(
          (value, i) => value - options.learningRate * expected.da[i]!,
        ),
      );
      close(
        after.b,
        snapshot.b.map(
          (value, i) => value - options.learningRate * expected.db[i]!,
        ),
      );
      close(after.a, afterReverse.a);
      close(after.b, afterReverse.b);
      reverse.dispose();
      snapshot = after;
    }
    let rejectedBatch = false;
    try {
      await engine.trainBatch([]);
    } catch {
      rejectedBatch = true;
    }
    if (!rejectedBatch) throw new Error('Empty batch accepted');
    const restored = await OutputLora.create(options);
    await restored.import(JSON.parse(JSON.stringify(snapshot)));
    close(
      Array.from(
        await restored.forward(
          new Float32Array(hidden),
          new Float32Array(base),
        ),
      ),
      Array.from(
        await engine.forward(new Float32Array(hidden), new Float32Array(base)),
      ),
    );
    let rejected = false;
    try {
      await restored.import({...snapshot, a: [NaN]});
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error('Invalid snapshot accepted');
    restored.dispose();
    engine.dispose();

    // Exercise the actual FunctionGemma output dimensions, including last token.
    const full = await OutputLora.create({
      hiddenSize: 640,
      vocabSize: 262144,
      rank: 4,
      learningRate: 0.1,
    });
    const fullHidden = Float32Array.from(
      {length: 640},
      (_, i) => Math.sin(i) * 0.1,
    );
    const fullBase = new Float32Array(262144);
    const first = await full.train(fullHidden, fullBase, 262143);
    let last = first;
    for (let i = 0; i < 4; i++)
      last = await full.train(fullHidden, fullBase, 262143);
    if (!(last.loss < first.loss))
      throw new Error('Full-vocabulary SGD did not lower loss');
    const predicted = await full.predict(fullHidden, fullBase);
    if (predicted.token !== 262143)
      throw new Error('Last-vocabulary-token update failed');
    full.dispose();
    return {
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent,
      adapter: {
        vendor: hardware.info.vendor,
        architecture: hardware.info.architecture,
        device: hardware.info.device,
        description: hardware.info.description,
      },
      maxAbsoluteGpuCpuError: maxError,
      paritySteps: 5,
      batchParitySteps: 5,
      batchOrderInvariant: true,
      fullDimensions: {hidden: 640, vocabulary: 262144, rank: 4},
      fullVocabularyInitialLoss: first.loss,
      fullVocabularyFinalLoss: last.loss,
      fullVocabularyPredictedToken: predicted.token,
      actualModelUsed: false,
      note: 'Synthetic numerical test only; not the real-model 12-run training gate. CPU softmax/CE; GPU matrix products, backprop, SGD.',
    };
  }, origin);
  if (errors.length) throw new Error(errors.join('\n'));
  const directory = resolve(
    import.meta.dir,
    '../apps/building-ai-models-without-coding/test-results',
  );
  mkdirSync(directory, {recursive: true});
  writeFileSync(
    resolve(directory, 'lora-numerical-proof.json'),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
