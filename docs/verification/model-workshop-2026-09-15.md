# Model Workshop verification

- `Tease:` Real computations, separate delivery gates.
- `Lede:` The four-demo app has executable local proofs for retrieval, generation, browser Rust training, and FunctionGemma adaptation. Repeat-run, deployment, and AI Studio import states are tracked independently below.
- `Why it matters:` A screenshot, decreasing online loss, or successful Git push cannot substitute for actual learning, a live demo, or a working import.
- `Go deeper:` Use the app README and the reproduction commands below.

## Source and environment

Local Apple Silicon macOS, Bun 1.3.14, Playwright 1.62.1 and Chromium 151.0.7922.34. Browser tests use the full Chromium binary in unified headless mode with browser sandboxing enabled. The GPU probe identifies Apple metal-3, and the training runs used hardware rather than a software fallback. The final shared launcher also removes Playwright’s default unsafe SwiftShader opt-in. Tests create no new visible Chrome window.

Initial code release: `bbc110bf5db59e87eaedc249736928bc880c59d8`. Subsequent verification and CI repairs are recorded in Git. Model and compiler revisions are pinned in the app's provenance files. Synthetic fixtures are explicitly labeled and contain no attendee records.

## Evidence

| Gate | Observed result | Scope and limitations |
| --- | --- | --- |
| Repository check | `bun run verify` passed during integration | Optional actionlint/shellcheck unavailable locally; their Linux CI gates remain configured |
| App types and units | Typecheck passed; 11 tests, 70 assertions | Numerical derivatives, batch gradients, retrieval math, input limits, shared local corpus |
| Browser smoke | Desktop 1440×900 and phone-width 390×844 passed | Four routes, lexical retrieval, no match, kit link, overflow, clean console/network; phone-sized Chromium is not physical iPhone/Safari proof |
| Context | Real Gemma WebGPU generation completed | Answer was grounded but incomplete with the full synthetic corpus |
| RAG | EmbeddingGemma WASM ranked expected source first for three fixtures; Gemma generated the equipment answer | Small authored fixtures, not a benchmark. Literal bike/bicycle mismatch demonstrated actual semantic retrieval |
| Rust | Edited source compiled and ran 30 actual updates plus five samples in the browser | Tiny synthetic topic model produces fragments; not a general language model |
| Rust robustness | Compiler errors, cancellation, and infinite-print budget tested | Combined stdout/stderr capped at 256 KiB; streamed messages batched |
| Rust CLI | Same WASM compiler ran under Bun, valid source exit 0, invalid source/output flood exit 1 | No Xcode/native linker required. Native Rust remains optional |
| FunctionGemma frozen inference | Real hidden state length 640 and logits length 262144, all finite | Patched graph selects last token, otherwise frozen model weights; float16-compatible parity measured |
| GPU adapter numerics | Independent CPU/GPU batch parity maximum error 3.71×10⁻⁸ | Synthetic numerical proof, separate from real-model training |
| Browser adaptation, initial viable trial | Full-batch SGD, rank 4, rate 0.003, 200 updates; held-out exact matches 0/3 → 2/3 | Final training fit 6/9 and CE 0.4558; optional-article held-out example remains wrong. Saved adapter reloaded into fresh engine |
| Native MLX adaptation | 80 updates, saved/reloaded adapter, held-out 0/9 → 3/9 | Different attention-adapter method and dataset; six failures remain. Measured training subprocess 14.413 seconds, not a general performance estimate |
| Browser repeatability | 12/12 consecutive real runs passed | Fresh adapter, actual features/baseline, 200 updates, export/reload, clean console. All saved adapters had SHA-256 `0a21ad3647dc55c2ac6b8b1fabb1d7143a8be57b8138cd06b6eefbde51e8b0c9`; all runs scored 2/3 held-out. |
| Firebase deployment | Deployed and live-tested | `https://gdg-model-workshop.web.app`; all four routes, real Context/RAG generation, real Rust compilation/training, and one real 200-update FunctionGemma run passed. |
| AI Studio import | Pending account connection | Import from GitHub confirmed in the UI. No imported demo is claimed verified |
| Notion kit | Published | [Public attendee kit](https://samcarltoncreative.notion.site/GDG-Tulsa-Model-Workshop-Kit-3dc012b9b020817e93b7dac0365ca614); all four live links and reciprocal GitHub link. A separate unauthenticated browser displayed the full kit with all four demo links and GitHub links; no sign-in was required. |

## What failed and changed

- The first sequential browser SGD rate 0.02 diverged. Rate 0.00001 remained finite but preserved refusals. Rate 0.001 fitted the last class and predicted ignore for every held-out case.
- Shuffling examples reduced class-order effects but did not solve held-out behavior. Full-batch gradients now accumulate against unchanged factors before one averaged update.
- Old browser runtime bundles could not execute the quantized embedding operation or loaded mismatched WASM glue. The app pins Transformers.js 4.2.0 and its matching ONNX runtimes; FunctionGemma uses matching asyncify JavaScript/WASM assets.
- Browser smoke imports previously swallowed errors. The shared verifier now fails on broken modules/missing complete-app runners.
- New headed browser windows stole macOS focus. All proof scripts now use the shared windowless launcher. The earlier node_repl LaunchServices crash path remains prohibited.
- A source reload interrupted initial long-running model tests. Reliability runs use a frozen source snapshot with an input hash manifest.

## Reproduce

From the repository root:

```sh
bun install --frozen-lockfile
bun run verify
bun run app:verify --app building-ai-models-without-coding
bun scripts/browser-runtime-proof.ts
bun scripts/lora-proof.ts
```

The model and training proof scripts require an already-running local workshop app or frozen snapshot. See their argument validation before running. They create disposable receipts under app `test-results/` or `.starter/cache/`; those are not public source files.

See [app instructions](../../apps/building-ai-models-without-coding/README.md), [Rust provenance](../../apps/building-ai-models-without-coding/THIRD_PARTY_RUST.md), [native MLX proof](../../apps/building-ai-models-without-coding/THIRD_PARTY_MODELS.md), and [FunctionGemma graph proof](../../apps/building-ai-models-without-coding/scripts/functiongemma-browser/README.md).

## CI follow-through

The first pushed revision exposed three CI failures: the existing reference app depended on an undeclared Playwright Test runner, Windows package linking failed, and the secret-action wrapper required an unavailable organization license. The reference smoke now exports the actual runner directly and checks every original interaction; its missing favicon request is also fixed. Workflow repairs preserve checks and use the pinned open-source Gitleaks scanner.

The full-history scan now identifies one existing Google API-key finding in the Gravity Rally client configuration from commit `89080f455bf38ab6ab926b4a6f833558d0672062`. Read-only key metadata confirmed browser restrictions and a broad API allowlist beyond Firebase. No value was printed, no allowlist was added, and no shared credential was changed. This is an unresolved historical finding, not a secret introduced by the Model Workshop. Do not report the remote secret check green.

The [compact twelve-run receipt](../../apps/building-ai-models-without-coding/scripts/functiongemma-browser/reliability.json) preserves source hashes, actual losses, exact adapter hashes, and held-out outputs without local paths or weights.
