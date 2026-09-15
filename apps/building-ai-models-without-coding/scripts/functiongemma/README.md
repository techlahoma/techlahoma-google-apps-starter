# FunctionGemma CLI fallback

- `Tease:` Train and reload a real FunctionGemma adapter.
- `Lede:` The local MLX experiment compares an unchanged model with a saved and reloaded attention adapter on held-out examples.
- `Why it matters:` The recorded outputs distinguish successful training from actual task quality; six of nine held-out cases still fail.
- `Go deeper:` Follow the isolated-environment commands below and inspect the evidence files.

- **Tease:** Train an actual small model on your computer.
- **Lede:** This Apple Silicon fallback trains a FunctionGemma adapter, saves it, reloads it in another process, and compares nine held-out examples against the base model.
- **Why it matters:** You can inspect the data and generated tool calls instead of relying on a simulated training animation.
- **Go deeper:** Read [fixtures.py](fixtures.py), [config.yaml](config.yaml), and the [measured receipt](evidence/summary.json).

## Reproduce

Requires Apple Silicon macOS with working Metal GPU access and Python 3.12. This is a native CLI fallback; it does not establish browser training or Windows compatibility. Run from the repository root:

```sh
python3.12 -m venv .venv/functiongemma
.venv/functiongemma/bin/python -m pip install -r apps/building-ai-models-without-coding/scripts/functiongemma/requirements.txt
.venv/functiongemma/bin/python apps/building-ai-models-without-coding/scripts/functiongemma/run.py experiment --output .starter/cache/functiongemma/run-001
```

Use a new output directory for each run. The command downloads the pinned public model, creates fixed synthetic splits, runs the base evaluation, trains for 80 steps, reloads the saved adapter in a separate process, runs the adapted evaluation, and writes comparison receipts. It does not upload anything or execute generated tool calls. The training subprocess has a 15-minute timeout; its progress is written to `training.log` in the chosen output directory.

The runtime needs GPU access. A sandboxed agent process may report `No Metal device available`; use the host's normal terminal or a narrowly approved GPU-capable process. No global Python packages are required. Runtime and model files remain outside Git.

For individual stages, use `prepare`, `evaluate --variant base`, `train`, `evaluate --variant adapted`, and `verify` with the same `--output`. Refusals protect existing evaluation results and adapters from accidental overwrites.

## What is trained

- Public checkpoint: `mlx-community/functiongemma-270m-it-4bit`, immutable revision `95c30bf2f45a0145d555808900312ac92a061a2f`.
- Base weights: 150,939,130 bytes; tokenizer JSON: 33,378,493 bytes. These are local file sizes, not measured network transfer or peak memory.
- MLX affine 4-bit quantization, group size 64; 81,920 trainable adapter parameters on query/value projections in the last four transformer blocks.
- Rank 8, scale 16, Adam, learning rate 0.0002, batch size 1, 80 steps, seed 42, completion-only loss, maximum sequence length 768.
- 36 synthetic training cases, nine validation cases, nine separate held-out cases. The examples cover one task from a voice note, notification priority, and choosing a standard workflow. They are a small workshop demonstration, not complete action-plan generation.

The generated function calls are displayed only. They cannot send messages, change calendars, or perform actions.

## Measured September 15, 2026

The verified run used Python 3.12.13, MLX-LM 0.28.4, MLX/MLX-Metal 0.32.2, and Transformers 4.57.3. The complete dependency set is pinned in [requirements.txt](requirements.txt).

| Evidence | Result |
| --- | --- |
| Training subprocess | Completed, exit 0, 14.413 seconds |
| Adapter saved and reloaded | Yes; 329,376 bytes |
| Held-out exact tool/argument matches | Base 0/9; adapted 3/9 |
| Generated outputs changed | 9/9 |
| Nonzero saved adapter updates | Verified |
| Browser training / 12-run reliability gate | Not verified by this CLI experiment |

The result proves functioning local training and adapter reload. **Six of nine held-out answers still fail exact comparison.** One failure omits an article from an otherwise similar task; others select the wrong tool or workflow. Do not present this adapter as reliable for real tasks. No tuning was performed against these held-out outcomes.

Raw generated text, expected answers, and the sampled stop token are retained in [base.json](evidence/base.json) and [adapted.json](evidence/adapted.json). MLX omits stop tokens from its rendered stream, so evaluation restores the **actually sampled** stop token for protocol parsing: FunctionGemma token 49 is `<end_function_call>`. The evaluator does not invent a missing closing marker. Matching requires exactly one complete call and exact serialized arguments; any surrounding text is retained for review.

The earlier dependency attempt used Transformers 5.17.0 and failed before training because MLX-LM 0.28.4 received `tokenizers.Encoding` objects instead of integer token IDs. It was preserved locally and excluded from results. Pinning the checkpoint's declared Transformers 4.57.3 resolves that API mismatch.

Transformers 4.57.3 also emits a Mistral-regex warning for this local Gemma checkpoint. Inspection of its `_patch_mistral_regex` implementation shows the non-Mistral exclusion applies only when the saved version is at most 4.57.2; this checkpoint declares 4.57.3 and falls through to the warning. No Mistral tokenizer patch was applied to Gemma. Base, training, and adapted evaluation use the same pinned tokenizer bytes.

## Provenance and limits

The [provenance manifest](evidence/provenance.json) preserves model/data hashes, versions, source hashes at preparation, and split counts. A later convenience `train`/`experiment` wrapper was added to `run.py` before training; fixture, configuration, and evaluation logic were unchanged. Training metrics are extracted from the raw local log into [training-metrics.json](evidence/training-metrics.json); raw logs and weights are retained locally, not published.

Adapter SHA256: `07536fad6089d40a148d49085f2d6aadc766e48b30340c94cff9ff38fc32566d`.

Sources: [official MLX-LM LoRA workflow](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md), [Google FunctionGemma training guide](https://ai.google.dev/gemma/docs/functiongemma/finetuning-with-functiongemma), [pinned MLX model](https://huggingface.co/mlx-community/functiongemma-270m-it-4bit/tree/95c30bf2f45a0145d555808900312ac92a061a2f).
