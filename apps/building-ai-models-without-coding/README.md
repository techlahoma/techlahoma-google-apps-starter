# Model Workshop

- `Tease:` Four ways to change what AI does.
- `Lede:` Try context, real semantic retrieval, FunctionGemma output-head LoRA, and editable Rust tiny-model training in one local-first application.
- `Why it matters:` Each experiment exposes what changed and gives you a small next step you can reproduce.
- `Go deeper:` Start with the [meetup kit](https://app.notion.com/p/3dc012b9b020817e93b7dac0365ca614), or follow the local commands below.

## Start locally

From the repository root:

```sh
bun install --frozen-lockfile
bun run --cwd apps/building-ai-models-without-coding dev
```

The app prepares checksum-pinned browser Rust compiler assets before Vite starts. This downloads disposable compiler files when needed; it does not install a system Rust toolchain. Model weights download on an explicit model action and may remain in browser cache. The application never uploads imported text.

Open the printed local URL. The four direct destinations are `#context`, `#retrieval`, `#fine-tuning`, and `#train`.

## Experiments

| Demo | What actually happens |
| --- | --- |
| Context | A local Gemma model answers with or without supplied text. The original model weights stay unchanged. |
| Retrieval | BM25 matches words, EmbeddingGemma calculates vectors, and reciprocal-rank fusion combines the rankings. Selected sources can be passed to Gemma for an answer. |
| Fine-tuning | Browser GPU shaders update a low-rank output projection over frozen FunctionGemma features and all vocabulary logits. A fresh adapter instance reloads the exported weights before comparison. This is distinct from the attention adapters in the CLI experiment. |
| From scratch | A browser-hosted Rust compiler compiles editable source; a worker runs actual scalar autodiff and Adam training, then generates synthetic topic fragments. |

The small models can produce incomplete or wrong answers. Inspect the supplied sources and held-out results. A successful training run does not establish general task reliability.

## Make your own version

The [Google AI Studio Build documentation](https://ai.google.dev/gemini-api/docs/aistudio-build-mode) describes Add files → Import from GitHub. Select `techlahoma/techlahoma-google-apps-starter` and ask it to run this app workspace. Browser import verification is tracked separately in the delivery plan; do not assume the default repository welcome app is this workshop.

Each demo page includes a copyable Antigravity/AI Studio instruction for changing one behavior and checking the result. The [native FunctionGemma CLI experiment](scripts/functiongemma/README.md) provides real training, saved adapter, reload, and held-out evaluation commands.

## Rust CLI fallback

Run the same Rust source through the same pinned WASM compiler under Bun, without Xcode, a native Rust installation or a browser. From this app directory:

```sh
bun scripts/rust/prepare-assets.ts plan
bun scripts/rust/prepare-assets.ts apply
bun scripts/rust/run-cli.ts
# Or compile your downloaded/edited source:
bun scripts/rust/run-cli.ts /path/to/tiny-gpt.rs
```

The CLI validates compiler checksums, streams actual training stdout, preserves compiler errors and exits nonzero on failure. Runtime stdout/stderr share a 256 KiB cap; a five-minute deadline terminates the worker. `scripts/rust/train.sh` and `train.ps1` wrap this Bun command. Native `rustc --edition 2021 -O tiny-gpt.rs -o tiny-gpt` remains an optional alternative where a native toolchain and linker already work.

## Verification and provenance

```sh
bun run --cwd apps/building-ai-models-without-coding check
bun run app:verify --app building-ai-models-without-coding
```

The ordinary smoke gate checks routes, basic controls, lexical retrieval, no-match handling, phone width, and console/network failures. Real model and training checks are separate, explicit commands in `scripts/model-proof.ts`, `scripts/training-proof.ts`, and `scripts/rust/verify-browser.mjs`. All browser tests use full Chromium in unified headless mode to avoid macOS focus changes, with real hardware GPU verification where needed.

- [Rust sources and actual browser proof](THIRD_PARTY_RUST.md)
- [MLX fallback and measured results](THIRD_PARTY_MODELS.md)
- [Browser FunctionGemma model preparation](scripts/functiongemma-browser/README.md)
- [FunctionGemma model notice](public/functiongemma/NOTICE.txt) and [Gemma terms](public/functiongemma/TERMS.txt)

Release, deployed URLs, and AI Studio import proof are not implied by a successful local build. Until those gates pass, the app contract stays at scaffold status.
