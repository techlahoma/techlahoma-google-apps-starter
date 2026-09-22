# SemIf browser assets

- `Tease:` Direct allowed-token scoring in a local browser worker.
- `Lede:` The worker follows SemIf's pinned wllama 3.6.1 setup and returns normalized Slop/Clear scores without generating a prose answer.
- `Why it matters:` Text and criteria stay in the browser. Only model and runtime files are downloaded.
- `Go deeper:` See `public/semif/NOTICE.txt` for revisions and licenses, and `src/semif-client.ts` for the client contract.

From the app directory, run `bun scripts/semif/prepare-assets.ts plan` to inspect the asset target and `bun scripts/semif/prepare-assets.ts apply` to download the pinned runtime. The script verifies SHA-256 checksums and skips files that already match. Generated runtime files live in ignored `public/semif/vendor/` and are included in the static build. Model weights remain external at immutable Hugging Face revisions.

`new SemifClient()` performs no download. `load(modelId, onProgress)` creates a module worker and loads the selected model. `score(text, criterion)` runs one grammar-constrained A/B readout, obtains both token log-probabilities, and normalizes them over the two allowed options. It discards the sampled token. These scores are conditional on the displayed choices and are not calibrated measures of authorship or truth.

The UI must serialize scoring requests. `dispose()` terminates the worker and rejects pending work. It is the cancellation path for both downloads and scoring; create a new client before loading again.

The pinned native runtime requires hardware WebGPU, WebAssembly JSPI, and memory64. The worker checks these before downloading model weights and refuses a compatibility/CPU fallback. It sets `n_threads: 1`, so SharedArrayBuffer and cross-origin isolation headers are not required. A first score includes shader compilation, so its elapsed time is not steady-state latency. macOS runtime compatibility must be established by an actual browser proof, not inferred from upstream's NVIDIA test.

Upstream source: <https://github.com/TheoLeeCJ/SemIf/tree/1f2dea3e25379f9dfc98cb83c324f00ab5deda37/webgpu-demo>.
