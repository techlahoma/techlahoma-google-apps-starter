import {
  AutoModel,
  AutoTokenizer,
  pipeline,
  TextStreamer,
  env,
} from '@huggingface/transformers';
import type {ModelRequest, WorkerReply} from './model-client';
env.allowLocalModels = false;
if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
const generationId = 'onnx-community/gemma-3-270m-it-ONNX';
const embeddingId = 'onnx-community/embeddinggemma-300m-ONNX';
const generationRevision = '2dbbfdb1b59bd034eb959428c6a7da9dd7ea27f0';
const embeddingRevision = '5090578d9565bb06545b4552f76e6bc2c93e4a66';
const send = (reply: WorkerReply) => self.postMessage(reply);
const progress = (value: unknown) => {
  if (typeof value !== 'object' || value === null || !('status' in value))
    return;
  let message = String(value.status);
  if ('file' in value) message += ` · ${String(value.file)}`;
  if ('progress' in value && typeof value.progress === 'number')
    message += ` · ${value.progress.toFixed(0)}%`;
  send({kind: 'progress', message});
};
const createGenerator = () =>
  pipeline('text-generation', generationId, {
    revision: generationRevision,
    dtype: 'q4',
    device: 'webgpu',
    progress_callback: progress,
  });
let generator: ReturnType<typeof createGenerator> | undefined;
let embeddingModel: ReturnType<typeof AutoModel.from_pretrained> | undefined;
let embeddingTokenizer:
  ReturnType<typeof AutoTokenizer.from_pretrained> | undefined;

self.onmessage = async (event: MessageEvent<ModelRequest>) => {
  try {
    const request = event.data;
    if (request.kind === 'generate') {
      if (!('gpu' in navigator))
        throw new Error(
          'Gemma generation requires WebGPU. Open this demo in a current Chromium browser with hardware acceleration enabled.',
        );
      generator ??= createGenerator();
      const model = await generator;
      let text = '';
      send({
        kind: 'progress',
        message: 'Generating locally with Gemma 3 270M (WebGPU)…',
      });
      await model([{role: 'user', content: request.prompt}], {
        max_new_tokens: 160,
        do_sample: false,
        streamer: new TextStreamer(model.tokenizer, {
          skip_prompt: true,
          skip_special_tokens: true,
          callback_function: (part: string) => {
            text += part;
            send({kind: 'progress', message: `Generating… ${text}`});
          },
        }),
      });
      send({kind: 'result', result: {kind: 'text', text}});
    } else {
      const options = {
        revision: embeddingRevision,
        progress_callback: progress,
      };
      embeddingTokenizer ??= AutoTokenizer.from_pretrained(
        embeddingId,
        options,
      );
      embeddingModel ??= AutoModel.from_pretrained(embeddingId, {
        ...options,
        dtype: 'q8',
        device: 'wasm',
      });
      const tokenizer = await embeddingTokenizer;
      const model = await embeddingModel;
      const vectors: number[][] = [];
      // Serial short inputs bound activation memory on workshop laptops.
      for (const [index, text] of request.texts.entries()) {
        send({
          kind: 'progress',
          message: `Embedding text ${index + 1} of ${request.texts.length} locally…`,
        });
        const inputs = await tokenizer(text, {
          truncation: true,
          max_length: 512,
        });
        const output = await model(inputs);
        const raw: unknown = output.sentence_embedding.tolist();
        if (
          !Array.isArray(raw) ||
          !Array.isArray(raw[0]) ||
          !raw[0].every(
            (value: unknown) =>
              typeof value === 'number' && Number.isFinite(value),
          )
        )
          throw new Error('EmbeddingGemma returned invalid vectors.');
        vectors.push(raw[0]);
      }
      send({kind: 'result', result: {kind: 'vectors', vectors}});
    }
  } catch (error) {
    generator = undefined;
    embeddingModel = undefined;
    embeddingTokenizer = undefined;
    send({
      kind: 'error',
      message: `Model run failed: ${error instanceof Error ? error.message : String(error)}. Cancel and retry; check connectivity and available memory.`,
    });
  }
};
