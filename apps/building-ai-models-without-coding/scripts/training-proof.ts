/// <reference types="@webgpu/types" />
/** Actual default-lesson UI training. Unified headless hardware GPU only. */
import {chromium} from 'playwright';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {browserLaunchOptions} from '../../../scripts/browser-runtime';

const origin = Bun.argv[2] ?? 'http://127.0.0.1:5201';
const runCount = Number(Bun.argv[3] ?? '1');
const learningRate = Number(Bun.argv[4] ?? '0.003');
const diagnostics = Bun.argv[5] === 'diagnostics';
const epochs = Number(Bun.argv[6] ?? '200');
const lessonIndex = Number(Bun.argv[7] ?? '0');
const instructions = [
  'Classify the notification. Reply with exactly now, later, or ignore. Urgent problems are now. Useful nonurgent information is later. Spam is ignore.',
  'Extract the one action from the voice note. Reply with only the short action, without filler.',
  'Choose one workflow. Reply meeting for agendas or team discussions, event for venues or RSVPs, document for writing or proofreading. Reply with only that word.',
];
if (
  !Number.isInteger(lessonIndex) ||
  lessonIndex < 0 ||
  lessonIndex >= instructions.length
)
  throw new Error('Invalid lesson index');
const instruction = instructions[lessonIndex]!;
if (!Number.isInteger(epochs) || epochs < 1 || epochs > 1000)
  throw new Error('Invalid expected epoch count');
if (!Number.isFinite(learningRate) || learningRate <= 0 || learningRate > 1)
  throw new Error('Invalid expected snapshot learning rate');
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)) {
  throw new Error('Provide the loopback Vite origin, without trailing slash');
}
if (!Number.isInteger(runCount) || runCount < 1 || runCount > 12) {
  throw new Error('Request 1 to 12 consecutive complete runs');
}
const directory = resolve(
  import.meta.dir,
  '../test-results',
  `training-${Date.now()}`,
);
await mkdir(directory, {recursive: true});
const browser = await chromium.launch(browserLaunchOptions);
const context = await browser.newContext({acceptDownloads: true});
const page = await context.newPage();
const errors: string[] = [];
const requests: Array<{url: string; status: number}> = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => {
  if (message.type() === 'error')
    errors.push(`${message.text()} (${message.location().url})`);
});
page.on('response', response => {
  if (
    response.url().includes('/functiongemma/') ||
    response.url().includes('model_q4f16')
  ) {
    const url = new URL(response.url());
    requests.push({
      url: `${url.origin}${url.pathname}`,
      status: response.status(),
    });
  }
});
page.on('requestfailed', request =>
  errors.push(`${request.url()}: ${request.failure()?.errorText}`),
);
let completed = 0;
let currentStatus = '';
const started = Date.now();
try {
  await page.goto(`${origin}/#fine-tuning`);
  const gpu = await page.evaluate(async () => {
    const adapter = await navigator.gpu?.requestAdapter();
    if (!adapter || adapter.info.isFallbackAdapter) {
      throw new Error('Nonfallback hardware WebGPU adapter is required');
    }
    return {
      vendor: adapter.info.vendor,
      architecture: adapter.info.architecture,
      fallback: adapter.info.isFallbackAdapter,
      browser: navigator.userAgent,
    };
  });
  console.log(JSON.stringify({stage: 'hardware', ...gpu, output: directory}));
  if (diagnostics) {
    console.log(JSON.stringify({stage: 'diagnostics-loading-real-model'}));
    const measured = await page.evaluate(async root => {
      const {loadFunctionGemma} = (await import(
        `${root}/src/functiongemma-inference.ts`
      )) as typeof import('../src/functiongemma-inference');
      const model = await loadFunctionGemma();
      const stats = (values: Float32Array) => {
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;
        let sumSquares = 0;
        for (const value of values) {
          min = Math.min(min, value);
          max = Math.max(max, value);
          sum += value;
          sumSquares += value * value;
        }
        return {
          length: values.length,
          min,
          max,
          mean: sum / values.length,
          rms: Math.sqrt(sumSquares / values.length),
          l2: Math.sqrt(sumSquares),
        };
      };
      const samples = [];
      for (const input of [
        'Urgent: attendees cannot join the call.',
        'An optional article for next weekend.',
        'Spam offer for a miracle cure.',
      ]) {
        const values = await model.evaluatePrompt(
          `<bos><start_of_turn>user\nClassify the notification. Reply with exactly now, later, or ignore. Urgent problems are now. Useful nonurgent information is later. Spam is ignore.\n\n${input}<end_of_turn>\n<start_of_turn>model\n`,
        );
        samples.push({
          input,
          hidden: stats(values.hidden),
          logits: stats(values.logits),
        });
      }
      return samples;
    }, origin);
    await writeFile(
      resolve(directory, 'hidden-diagnostics.json'),
      JSON.stringify(measured, null, 2),
    );
    console.log(
      JSON.stringify({stage: 'hidden-diagnostics', learningRate, measured}),
    );
  }
  for (let run = 1; run <= runCount; run++) {
    const runStart = Date.now();
    const initialErrors = run === 1 ? 0 : errors.length;
    await page.locator('#tuning-lesson').selectOption(String(lessonIndex));
    await page.locator('#tuning-run').click();
    // Observe real UI state; do not intercept model requests or replace computations.
    let previous = '';
    for (;;) {
      currentStatus =
        (await page.locator('#tuning-status').textContent()) ?? '';
      if (currentStatus !== previous) {
        console.log(
          JSON.stringify({
            run,
            seconds: Math.round((Date.now() - runStart) / 1000),
            status: currentStatus,
          }),
        );
        previous = currentStatus;
      }
      if (await page.locator('#tuning-run').isEnabled()) break;
      if (Date.now() - runStart > 20 * 60 * 1000)
        throw new Error('Training run exceeded 20 minutes');
      await new Promise<void>(done => setTimeout(done, 1000));
    }
    if (!currentStatus.startsWith('Training and reload complete.')) {
      throw new Error(`Run ${run} did not complete: ${currentStatus}`);
    }
    const lossText =
      (await page
        .locator('#tuning-loss [data-terminal-plain]')
        .textContent()) ?? '';
    const losses = Array.from(
      lossText.matchAll(/mean pre-update batch loss ([\d.eE+-]+)/g),
      match => Number(match[1]),
    );
    if (losses.length !== epochs || !losses.every(Number.isFinite)) {
      throw new Error(
        `Expected ${epochs} finite epoch losses, received ${losses.length}`,
      );
    }
    const rows = await page
      .locator('#tuning-results tbody tr')
      .evaluateAll(elements =>
        elements.map(row =>
          Array.from(
            row.querySelectorAll('td'),
            cell => cell.textContent ?? '',
          ),
        ),
      );
    if (
      rows.length !== 3 ||
      rows.some(row => row.length !== 4 || row.some(cell => !cell))
    ) {
      throw new Error('Missing actual held-out baseline/adapted result rows');
    }
    await writeFile(
      resolve(directory, `run-${run}-observations.json`),
      JSON.stringify(
        {run, learningRate, status: currentStatus, losses, rows},
        null,
        2,
      ),
    );
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#tuning-save').click();
    const download = await downloadPromise;
    const adapterPath = resolve(directory, `run-${run}-adapter.json`);
    await download.saveAs(adapterPath);
    const source = await readFile(adapterPath, 'utf8');
    const snapshot: unknown = JSON.parse(source);
    // Load the actual downloaded JSON into a fresh GPU adapter, then use real
    // FunctionGemma features. No synthetic feature or logit substitution.
    const trainingText =
      (await page.locator('#tuning-data').textContent()) ?? '';
    const reloaded = await page.evaluate(
      async ({
        root,
        snapshot,
        learningRate,
        trainingText,
        instruction,
        epochs,
        probeInput,
      }) => {
        const {OutputLora, softmaxCrossEntropy} = (await import(
          `${root}/src/lora-engine.ts`
        )) as typeof import('../src/lora-engine');
        const {loadFunctionGemma, FUNCTIONGEMMA_MODEL, FUNCTIONGEMMA_REVISION} =
          (await import(
            `${root}/src/functiongemma-inference.ts`
          )) as typeof import('../src/functiongemma-inference');
        const engine = await OutputLora.create({
          hiddenSize: 640,
          vocabSize: 262144,
          rank: 4,
          learningRate,
          seed: 137,
        });
        try {
          await engine.import(snapshot);
          const weights = await engine.export();
          if (weights.steps !== epochs || !weights.b.some(value => value !== 0))
            throw new Error(
              'Saved adapter does not contain the expected full-batch updates',
            );
          const frozen = await loadFunctionGemma();
          const values = await frozen.evaluatePrompt(
            `<bos><start_of_turn>user\n${instruction}\n\n${probeInput}<end_of_turn>\n<start_of_turn>model\n`,
          );
          const prediction = await engine.predict(values.hidden, values.logits);
          const trainingRows = trainingText
            .split('\n\nTEST')[0]!
            .split('\n')
            .slice(1)
            .map(line => {
              const [input, expected] = line.split(' → ');
              if (!input || !expected)
                throw new Error('Could not read displayed training example');
              return {input, expected};
            });
          const end = frozen.encode('<end_of_turn>');
          const trainingPredictions = [];
          let finalLoss = 0;
          let finalTokens = 0;
          for (const row of trainingRows) {
            const ids = frozen.encode(
              `<bos><start_of_turn>user\n${instruction}\n\n${row.input}<end_of_turn>\n<start_of_turn>model\n`,
            );
            const output: number[] = [];
            for (let step = 0; step < 12; step++) {
              const value = await frozen.evaluateTokens(ids.concat(output));
              const {token} = await engine.predict(value.hidden, value.logits);
              if (end.includes(token) || token === 1) break;
              output.push(token);
            }
            trainingPredictions.push({
              ...row,
              actual: frozen.decode(output).trim(),
            });
            const targets = frozen.encode(row.expected).concat(end);
            for (let i = 0; i < targets.length; i++) {
              const value = await frozen.evaluateTokens(
                ids.concat(targets.slice(0, i)),
              );
              const logits = await engine.forward(value.hidden, value.logits);
              finalLoss += softmaxCrossEntropy(logits, targets[i]!).loss;
              finalTokens++;
            }
          }
          return {
            trainingPredictions,
            finalTrainingLoss: finalLoss / finalTokens,
            finalTrainingCorrect: trainingPredictions.filter(
              row => row.actual === row.expected,
            ).length,
            steps: weights.steps,
            hiddenSize: values.hidden.length,
            vocabularySize: values.logits.length,
            nextToken: prediction.token,
            nextTokenText: frozen.decode([prediction.token]),
            model: FUNCTIONGEMMA_MODEL,
            revision: FUNCTIONGEMMA_REVISION,
          };
        } finally {
          engine.dispose();
        }
      },
      {
        root: origin,
        snapshot,
        learningRate,
        trainingText,
        instruction,
        epochs,
        probeInput: rows[0]![0]!,
      },
    );
    const receipt = {
      run,
      origin,
      epochs,
      lessonIndex,
      passed: errors.length === initialErrors,
      learningRate,
      started: new Date(runStart).toISOString(),
      elapsedMs: Date.now() - runStart,
      status: currentStatus,
      gpu,
      losses,
      rows,
      reloaded,
      adapterSha256: new Bun.CryptoHasher('sha256')
        .update(source)
        .digest('hex'),
      errors: errors.slice(initialErrors),
    };
    await writeFile(
      resolve(directory, `run-${run}.json`),
      JSON.stringify(receipt, null, 2),
    );
    if (errors.length !== initialErrors)
      throw new Error(errors.slice(initialErrors).join('\n'));
    completed++;
    console.log(
      JSON.stringify({
        run,
        passed: true,
        elapsedMs: receipt.elapsedMs,
        status: currentStatus,
        firstLoss: losses[0],
        lastLoss: losses.at(-1),
        reloaded,
      }),
    );
    await page.screenshot({
      path: resolve(directory, `run-${run}.png`),
      fullPage: true,
    });
  }
  await writeFile(
    resolve(directory, 'summary.json'),
    JSON.stringify(
      {
        passed: true,
        requested: runCount,
        completed,
        elapsedMs: Date.now() - started,
        requests,
        errors,
        mode: 'unified-headless-hardware-gpu',
        gate:
          runCount === 12
            ? '12 consecutive real training runs'
            : 'initial real training smoke',
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({passed: true, completed, directory}));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  await page
    .screenshot({path: resolve(directory, 'failure.png'), fullPage: true})
    .catch(() => undefined);
  await writeFile(
    resolve(directory, 'summary.json'),
    JSON.stringify(
      {
        passed: false,
        requested: runCount,
        completed,
        elapsedMs: Date.now() - started,
        currentStatus,
        requests,
        errors,
        failure: message,
      },
      null,
      2,
    ),
  );
  console.error(
    JSON.stringify({passed: false, completed, failure: message, directory}),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
