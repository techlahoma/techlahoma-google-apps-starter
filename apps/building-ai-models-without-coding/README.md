# Model Workshop

- `Tease:` Four ways to change what AI does.
- `Lede:` Try context, real semantic retrieval, FunctionGemma output-head LoRA, and editable Rust tiny-model training in one local-first application.
- `Why it matters:` Each experiment exposes what changed and gives you a small next step you can reproduce.
- `Go deeper:` Start with the [meetup kit](https://samcarltoncreative.notion.site/GDG-Tulsa-Model-Workshop-Kit-3dc012b9b020817e93b7dac0365ca614), or follow the local commands below.

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
| From scratch | A browser-hosted Rust compiler compiles editable source; a worker runs actual scalar autodiff and Adam training, saves the weights locally, then continues short text prefixes using those weights without retraining. |

The small models can produce incomplete or wrong answers. Inspect the supplied sources and held-out results. A successful training run does not establish general task reliability.

The chat interface keeps the four experiments in the left navigation, messages and result cards in the center, and a floating inspector on the right. Attachments and preloaded synthetic emails live in the composer. Retrieval rankings and per-request source receipts remain with the message that produced them. Training runs retain their own measured loss charts, comparisons, and bounded Xterm logs. Fine-tuning can run the default model before training and compare it with the adapter in adjacent response panels. Phone layouts stack the inspector and use a compact source panel. See the [visual-language research](../../docs/research/model-workshop-visual-language-2026-09-15.md) for the 3Blue1Brown sources and accessibility choices.

Context and Retrieval each start without attached files. Ask the plain model first, then preview a sample file and explicitly add it. Retrieval is opt-in after attachment; merely previewing or adding files does not enable it. Uploads append validated documents instead of replacing the current selection. Returning to either demo starts a fresh selection. Rankings, evaluation, prompts, logs, and technical settings are available through disclosures; the conversation keeps its own readable viewport. See the [UX audit and constraint inventory](../../docs/verification/workshop-ux-2026-09-22/report.md).

The conversation is an interaction metaphor: previous messages are not automatically included in later prompts. Conversations, frozen-feature caches, and trained state last only while that demo remains mounted. Download an adapter or edited Rust source to keep it. The scratch model is a tiny character continuation model, not a question-answering assistant; its default vocabulary and 16-position context limit what you can type.

Fine-tuning already uses WebGPU for FunctionGemma inference and adapter matrix operations. Repeat training reuses exact frozen features and unchanged default predictions for the current lesson, but initializes a fresh adapter and performs all 200 updates. Each run reports measured stage timings. Rust/Wasm can coexist with GPU work; rewriting the controller alone would not accelerate the GPU kernels.

The table source is adapted from the official [shadcn/ui Table registry](https://ui.shadcn.com/r/styles/new-york-v4/table.json), with workshop colors and wrapping evidence cells. Components live in the repository, following shadcn's source distribution model. The button and chat layout are custom React components styled to match, rather than untouched registry installs.

## Secret fifth demo: Local Jev

Open [Local Jev](https://gdg-model-workshop.web.app/#local-jev) directly. It is omitted from the four-stage navigation, not access-controlled. Scroll a feed of authored examples or edit your own paragraph to test a live, local slop detector. The rule is editable; the results describe writing style, not AI authorship.

The independent demo adapts [SemIf](https://github.com/TheoLeeCJ/SemIf)'s browser setup, using pinned wllama 3.6.1 and a quantized model to read scores for two allowed labels. It is not Jev's hosted service and is not affiliated with Jev or TypeSafe. The model downloads only after clicking Load: MiniCPM5 2B is 1.56 GB; the smaller Qwen3 0.6B is 639 MB. WebGPU, WebAssembly JSPI, and memory64 are required. Text travels only to the local worker. Scores are uncalibrated and normalized over the displayed options.

See [runtime provenance and reproduction](scripts/semif/README.md). Asset preparation downloads checksum-verified runtime files; model weights remain external and are fetched by the browser. The explicit real-model proof is `bun apps/building-ai-models-without-coding/scripts/semif/prove-browser.ts http://127.0.0.1:5201` from the repository root.

## Make your own version

The repository is public, so anyone can clone it without an invitation or write access. To save changes to GitHub, [fork it](https://github.com/techlahoma/techlahoma-google-apps-starter/fork) into your own account and clone the fork instead.

- **Antigravity (no terminal):** [download Antigravity](https://antigravity.google/download), open an empty folder, and ask the agent to clone `https://github.com/techlahoma/techlahoma-google-apps-starter.git`, install Bun 1.3.14 if it is missing, then run the two commands in [Start locally](#start-locally).
- **Terminal:** `git clone https://github.com/techlahoma/techlahoma-google-apps-starter.git`, `cd` into it, then run the commands in [Start locally](#start-locally).
- **No install:** the [workshop kit](https://samcarltoncreative.notion.site/GDG-Tulsa-Model-Workshop-Kit-3dc012b9b020817e93b7dac0365ca614) has a from-scratch Google AI Studio prompt that needs only a Google account. Don't import this repository into AI Studio: the import lists repositories your connected GitHub account can access, and AI Studio's documented React-and-Node runtime does not cover this Bun workspace or its asset-preparation step.

Each demo page includes a copyable Antigravity instruction for changing one behavior and checking the result. It assumes the repository is already cloned. The [native FunctionGemma CLI experiment](scripts/functiongemma/README.md) provides real training, saved adapter, reload, and held-out evaluation commands.

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

The [live workshop](https://gdg-model-workshop.web.app) has passed real browser checks and twelve consecutive default training runs. Model quality remains limited: the default browser fixture scored 2/3 held-out, while the other two task fixtures scored 1/3 each. These are teaching experiments. Google AI Studio import verification remains pending the account connection; do not equate local/live browser proof with a verified import.
