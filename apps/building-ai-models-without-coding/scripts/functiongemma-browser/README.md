# FunctionGemma browser model preparation

- `Tease:` Expose the frozen FunctionGemma output head input for real browser LoRA.
- `Lede:` `prepare.py` downloads a pinned q4f16 model, verifies SHA-256 checksums, selects the last token before the output head, and adds a float32 hidden-state output without changing model weights.
- `Why it matters:` The browser can train low-rank matrices over the actual model's full vocabulary while keeping the body frozen.
- `Go deeper:` See the script's source revision and the generated `manifest.json` for provenance.

The small modified graph, its manifest, and notices are included in `public/functiongemma/`. Runtime downloads weights directly from the immutable source URL, so AI Studio imports do not need Python. For maintainer regeneration, use an isolated Python environment with `onnx==1.19.1`, then run from the app directory:

```sh
python scripts/functiongemma-browser/prepare.py --output ../../.starter/cache/functiongemma-model
```

Copy only `model_hidden.onnx` and `manifest.json` from that temporary directory into `public/functiongemma/` after verification. Never copy the large weight file into public assets.

This is a local write and public network download. The output directory is disposable. Do not commit model weights. The q4f16 weights are 425,724,416 bytes, plus a roughly 519 KB graph. The model and its modified graph remain subject to the [Gemma terms](https://ai.google.dev/gemma/terms). Source: [pinned ONNX community export](https://huggingface.co/onnx-community/functiongemma-270m-it-ONNX/tree/ba3c872ede162a5c4ab753f509b2260af5587143).

The added `hidden_states` output has shape `[batch, 1, 640]`. Existing `logits` has shape `[batch, 1, 262144]`. Both outputs are float32; the internal head input and KV tensors remain float16. The graph uses ONNX Runtime fused operators, so the generic ONNX checker cannot validate its existing `SimplifiedLayerNormalization` operator. Actual ONNX Runtime execution is the compatibility check.

The inference bridge limits input to 256 tokens and returns only the final position. Teacher-forced completion training must evaluate each prefix and use the actual next token as its label. Generation must apply the learned delta to all 262,144 logits before choosing a token. A reduced-label classifier or hidden-state lookup is not a replacement for this full-vocabulary operation.

To compare the optimized graph with the unmodified checkpoint, install `onnxruntime==1.23.2` in the same isolated environment and run:

```sh
python scripts/functiongemma-browser/verify.py --model-directory ../../.starter/cache/functiongemma-model
```

The test requires finite outputs, expected dimensions, equal top-token choice, and float16-compatible numerical tolerance. It does not prove generated tool-call quality or successful fine-tuning. The graph keeps all layer KV outputs, although this bridge intentionally recomputes each prefix for simple teacher-forced training.

ONNX Runtime uses WebGPU for supported compute and may assign shape operations to CPU. Session severity 3 suppresses its known placement warnings while retaining errors. This is hardware GPU inference with some CPU operations, not a claim that every graph node runs on the GPU.

Verified locally on 2026-09-15: the exact app bridge with Transformers.js 4.2.0 and ONNX Runtime Web 1.26.0-dev.20260416-b7804b056c returned 640 finite hidden values and 262,144 finite logits in windowless Chromium. The tokenizer encoded `now` as token 2998 and produced a 34-token FunctionGemma template for the proof prompt. The isolated proof used the same computation graph before metadata-only source/license notices were added. Numerical compatibility is also covered by `verify.py`; this is inference evidence, not a fine-tuning reliability result.
