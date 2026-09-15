import {AutoTokenizer} from '@huggingface/transformers';
import * as ort from 'onnxruntime-web/webgpu';
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import ortWasmModuleUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';

export const FUNCTIONGEMMA_REVISION =
  'ba3c872ede162a5c4ab753f509b2260af5587143';
export const FUNCTIONGEMMA_MODEL = 'onnx-community/functiongemma-270m-it-ONNX';
export const FUNCTIONGEMMA_HIDDEN_SIZE = 640;
export const FUNCTIONGEMMA_VOCABULARY_SIZE = 262144;

export interface FunctionGemmaEvaluation {
  hidden: Float32Array;
  logits: Float32Array;
}

export interface FunctionGemmaInference {
  formatPrompt(userText: string, tools?: object[]): string;
  encode(text: string): number[];
  decode(ids: number[]): string;
  evaluatePrompt(text: string): Promise<FunctionGemmaEvaluation>;
  evaluateTokens(ids: number[]): Promise<FunctionGemmaEvaluation>;
}

let loaded: Promise<FunctionGemmaInference> | undefined;

async function cachedBytes(
  url: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const cache = await caches
    .open(`functiongemma-${FUNCTIONGEMMA_REVISION}-last-token-v1`)
    .catch(() => null);
  const hit = await cache?.match(url).catch(() => undefined);
  if (hit) return new Uint8Array(await hit.arrayBuffer());
  const response = await fetch(url, signal ? {signal} : undefined);
  if (!response.ok)
    throw new Error(`Model download failed: ${response.status}`);
  // Cache storage can be unavailable when browser storage is full. Inference can continue.
  await cache?.put(url, response.clone()).catch(() => undefined);
  return new Uint8Array(await response.arrayBuffer());
}

export function loadFunctionGemma(
  onProgress: (message: string) => void = () => undefined,
  signal?: AbortSignal,
): Promise<FunctionGemmaInference> {
  loaded ??= initialize(onProgress, signal).catch(error => {
    loaded = undefined;
    throw error;
  });
  return loaded;
}

async function initialize(
  onProgress: (message: string) => void,
  signal?: AbortSignal,
): Promise<FunctionGemmaInference> {
  onProgress(
    'Loading FunctionGemma tokenizer and frozen model (426 MB first download).',
  );
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = {wasm: ortWasmUrl, mjs: ortWasmModuleUrl};
  const base = new URL('functiongemma/', document.baseURI).pathname;
  const tokenizer = await AutoTokenizer.from_pretrained(FUNCTIONGEMMA_MODEL, {
    revision: FUNCTIONGEMMA_REVISION,
  });
  const [graph, weights] = await Promise.all([
    cachedBytes(`${base}model_hidden.onnx`, signal),
    cachedBytes(
      `https://huggingface.co/${FUNCTIONGEMMA_MODEL}/resolve/${FUNCTIONGEMMA_REVISION}/onnx/model_q4f16.onnx_data`,
      signal,
    ),
  ]);
  onProgress('Preparing frozen FunctionGemma inference.');
  const session = await ort.InferenceSession.create(graph, {
    executionProviders: ['webgpu'],
    logSeverityLevel: 3,
    externalData: [{path: 'model_q4f16.onnx_data', data: weights}],
  });
  const encode = (text: string): number[] =>
    tokenizer.encode(text, {add_special_tokens: false});
  const decode = (ids: number[]): string =>
    tokenizer.decode(ids, {skip_special_tokens: false});
  const evaluateTokens = async (
    ids: number[],
  ): Promise<FunctionGemmaEvaluation> => {
    if (ids.length < 1 || ids.length > 256) {
      throw new Error(
        'FunctionGemma demonstration requires 1 to 256 input tokens.',
      );
    }
    const feeds: Record<string, ort.Tensor> = {
      input_ids: new ort.Tensor('int64', BigInt64Array.from(ids, BigInt), [
        1,
        ids.length,
      ]),
      attention_mask: new ort.Tensor(
        'int64',
        new BigInt64Array(ids.length).fill(1n),
        [1, ids.length],
      ),
      position_ids: new ort.Tensor(
        'int64',
        BigInt64Array.from(ids, (_, i) => BigInt(i)),
        [1, ids.length],
      ),
    };
    for (const name of session.inputNames) {
      if (name.startsWith('past_key_values.')) {
        feeds[name] = new ort.Tensor(
          'float16',
          new Uint16Array(0),
          [1, 1, 0, 256],
        );
      }
    }
    const outputs = await session.run(feeds, ['logits', 'hidden_states']);
    try {
      if (!outputs.logits || !outputs.hidden_states) {
        throw new Error('FunctionGemma graph is missing required outputs.');
      }
      const logits = await outputs.logits.getData();
      const hidden = await outputs.hidden_states.getData();
      if (
        !(logits instanceof Float32Array) ||
        !(hidden instanceof Float32Array)
      ) {
        throw new Error(
          'FunctionGemma graph must expose float32 logits and hidden states.',
        );
      }
      return {
        logits: logits.slice(-FUNCTIONGEMMA_VOCABULARY_SIZE),
        hidden: hidden.slice(-FUNCTIONGEMMA_HIDDEN_SIZE),
      };
    } finally {
      Object.values(outputs).forEach(tensor => tensor.dispose());
      Object.values(feeds).forEach(tensor => tensor.dispose());
    }
  };
  onProgress('FunctionGemma ready. Base model weights remain frozen.');
  return {
    formatPrompt: (userText, tools = []) => {
      const prompt = tokenizer.apply_chat_template(
        [
          {
            role: 'developer',
            content:
              'You are a model that can do function calling with the following functions',
          },
          {role: 'user', content: userText},
        ],
        {tools, tokenize: false, add_generation_prompt: true},
      );
      if (typeof prompt !== 'string')
        throw new Error('Expected a text chat template.');
      return prompt;
    },
    encode,
    decode,
    evaluateTokens,
    evaluatePrompt: text => evaluateTokens(encode(text)),
  };
}
