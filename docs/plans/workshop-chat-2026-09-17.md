# Model Workshop conversations

- `Tease:` Four experiments, one familiar chat interface.
- `Lede:` Move each demo into a conversation with a bottom composer and a floating context inspector, preserving real computations and the existing visual explanations.
- `Why it matters:` Attendees can attach files, run training, inspect results, and ask follow-up questions without switching interaction patterns.
- `Go deeper:` The app is `apps/building-ai-models-without-coding`; verification below records the actual tested revision and remaining limits.

## Scope and decisions

- Keep the four existing route URLs and left navigation. Use the user's Linear and Codex screenshots as layout references.
- Put retrieval tables, training curves, comparison outputs, and logs in conversation turns. Preserve completed turns when another operation starts.
- Keep sample file toggles and uploads by the composer; show live source state in a floating right inspector.
- Scratch prompting must reload the weights from the successful training run and produce real character continuations. Label its limited vocabulary and context clearly.
- Fine-tuning already uses WebGPU for frozen-model inference and adapter matrix operations. Measure model preparation, feature extraction, training, reload, and evaluation separately. Cache only unchanged computations; do not lower the training or quality gates to claim a speedup.
- Model state remains local to the mounted demo and is disposable on reload or navigation; downloaded adapters and source are the existing durable exports.

## Work and proof

- Initial checkout clean at `4d5bb7bd752682596b7c8f78f1d1c827ce995b27`.
- Git 2.50.0 and exact Bun 1.3.14 verified. Setup doctor: zero failures and warnings.
- Implemented: shared conversation scrolling with a composer below the messages, Context/Retrieval messages, Fine-tuning training and prediction turns, per-stage timing, and Rust checkpoint prompting. The reader can scroll up without source edits pulling them back to the newest message.
- App verification passed: contract, dependency policy, typecheck, 13 tests/75 assertions, build, desktop 1440×900 and phone 390×844. Includes composer overlap regression checks and retained retrieval turns.
- Real Context/Retrieval proof passed in windowless hardware Chromium: actual Gemma output, three-method embedding evaluation, ranked results in chat, clean console/network. The small Context model still gives an incomplete answer about bringing a cup; RAG finds the laptop/power-adapter evidence. UI success is not a model-quality claim.
- Actual Rust proof passed after the final cancellation fix: 30 training steps, real checkpoint, distinct `build` and `learn` continuations with zero compile time, repeat training/history, invalid source, unsupported characters, output cap, raw clipboard equality, and cancellation during compilation. Compiler preparation now happens inside the terminable worker.
- Two full FunctionGemma runs passed on Apple Metal 3, fallback adapter false, Chromium 151. Each performed 200 updates and exported/reloaded a fresh adapter. Both loss traces went from 19.15222 to 0.44719; held-out result remained 2/3 and training-set result 6/9. Test artifacts: `apps/building-ai-models-without-coding/test-results/training-1789684605491/`.
- The first measured training operation, after a separate baseline model-load action, took 101.76 s; the repeat took 100.53 s. Updates alone took 100.57 s and 100.23 s. Reused frozen features saved about 0.37 s and default predictions about 0.51 s in this observation. Caching is a small saving, not a large training speedup. The current lesson retains 18 feature records, 18,920,448 bytes. CPU full-vocabulary softmax and per-example GPU readbacks remain optimization candidates; Rust alone would not remove them.
- Timing receipt wording was subsequently corrected to report partial baseline reuse counts and already-loaded model preparation. Training and inference math were unchanged. Keyboard handling preserves IME composition.
- An earlier Vite training attempt was interrupted by source hot reload and is not counted as passed. The two completed runs used frozen runtime files.
- Read-only review covered checkpoint scope, cancellation, cache identity, per-run history, and timing accuracy. Material findings were addressed; edited Rust source remains the authoritative vocabulary/context validator.
- Git publication and deployment are tracked below after exact target verification.

## Delivery

- Target verified: existing public `techlahoma/techlahoma-google-apps-starter`, `origin/main`; no deploy-on-push workflow.
- Hosting plan verified with host credentials: reuse `gdg-model-workshop` in `sam-carlton-creative`, protect the default site. The sandbox-only plan could not query the inventory; it was superseded by the host-verified plan.
- Pending: task-scoped commit, remote SHA proof, selected-app deployment, and live route/interaction verification.

## Performance references

- [ONNX Runtime WebGPU](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html): GPU execution and keeping tensors on GPU.
- [ONNX Runtime performance diagnosis](https://onnxruntime.ai/docs/tutorials/web/performance-diagnosis.html): investigate execution, transfers, and preparation separately.

Rust/Wasm and GPU execution can coexist. Rewriting the JavaScript controller in Rust alone does not accelerate GPU kernels; use measured bottlenecks to decide further work.
