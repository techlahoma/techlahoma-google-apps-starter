# Rust demo sources and proof

- **Tease:** Real editable Rust training in the browser.
- **Lede:** The demo compiles a dependency-free microGPT Rust program to WASI and executes its actual training loop in a worker.
- **Why it matters:** Displayed losses and samples are stdout from the edited program; no prerecorded curves or simulated training are substituted.
- **Go deeper:** See the pinned sources, reproducible asset preparation and verification below.

## Sources

Retrieved September 15, 2026:

| Component | Source | License and changes |
| --- | --- | --- |
| Compiler execution worker and bundled WASI shim | [Weblings d0cd7a9](https://github.com/AngelOnFira/weblings/tree/d0cd7a9f3af7d8249b3948ac0e19d2afc0d01633) | MIT Weblings license retained in `public/rust/LICENSE-weblings`. `worker.js` gains batched streaming stdout messages and a hard 256 KiB combined stdout/stderr budget that aborts overproducing programs. Shim JS copied unchanged; Apache 2.0 license retained in `LICENSE-wasi-shim`. |
| Complete scalar autograd, attention and Adam implementation | [microgpt Rust 370bf31](https://github.com/k-arindam/microgpt/blob/370bf31972a76b08c62c7422db72e2dd0bc14d9c/microgpt.rs) | MIT license retained in `public/rust/LICENSE-microgpt`. Synthetic topics embedded instead of filesystem input; embedding width 8, 2 heads, 30 training steps, 5 generated samples. Unused input imports removed. |
| Browser compiler and WASI standard library | [wasm-rustc artifacts-test-7](https://github.com/AngelOnFira/wasm-rustc/releases/tag/artifacts-test-7) | Release archive SHA-256 values from Weblings `artifacts.lock`; extracted bytes independently hashed. Rust MIT license and COPYRIGHT retained; upstream compiler is Rust-derived. Compiler build attribution remains with the linked release and builder sources. |

The synthetic dataset was authored for this demo. It contains 12 fictional workshop topic strings, not meetup records, attendee data or scheduled events. Generated fragments are explicitly labeled synthetic and usually incoherent at this small training budget.

## Compiler assets

Large compiler files are ignored by Git. Run these commands from this app before dev/build:

```sh
bun scripts/rust/prepare-assets.ts plan
bun scripts/rust/prepare-assets.ts apply
```

The plan reads and verifies existing assets. Apply downloads missing/corrupt assets, validates the archives before decompression, extracts only exact members using Bun's built-in zstd and archive APIs, checks extracted size and SHA-256, and atomically stages the files. No global packages, native Rust or system tar are needed for preparation. Repeated apply runs verify and reuse valid files.

| File | Expanded bytes | SHA-256 |
| --- | ---: | --- |
| rustc.wasm | 87,871,387 | `41412081eefc3e08ec5664ed0748902a7e575e1f267898dcc64d412702df7e83` |
| sysroot-wasip1.bundle | 71,313,335 | `6dba13d6077cb7936ed6661cd1087bc9e92dc1d8b35903ecf22881c97ac3980b` |

Archive hashes and exact release URLs are in `scripts/rust/prepare-assets.ts` and upstream `scripts/rust/artifacts.lock`. The browser retrieves same-origin deployed files on explicit Run. It may reuse the browser HTTP cache. Runtime stdout and stderr share a hard 256 KiB byte budget, checked before decoding or retaining each write. Exceeding it aborts WASI execution with an explicit diagnostic. Stdout messages are batched at most once per 50 ms plus one final flush. A five-minute deadline and Cancel terminate the active worker. Leaving the demo aborts the request and terminates the worker. Source edits and trained state are disposable; download source before navigating away. This implementation exports source, not a serialized trained checkpoint.

## Verification

Local macOS Apple Silicon, Bun 1.3.14, pinned Playwright 1.62.1 Chromium, headed browser, September 15, 2026:

- Actual edited source compiled in the browser and trained successfully: 1,280 parameters, 30 gradient updates, 5 generated samples.
- Measured compiler 1,068 ms, linker 27 ms, training plus inference 1,236.4 ms; these are one local observation, not a performance guarantee.
- Actual first/last step losses: 3.1943 / 2.7936. They concern different training documents and do not establish generalization or production model quality.
- Invalid edited Rust produced real compiler diagnostics. Cancel returned control immediately.
- Follow-up output-budget regression used the shared windowless Chromium helper: normal 30-step training still completed (compiler 1,037.5 ms, training plus inference 1,250.8 ms). An actual infinite `println!` plus `eprintln!` loop aborted with the explicit 256 KiB budget diagnostic in 335 ms including compile/startup. No browser window was opened for this follow-up.
- Native `rustc` 1.69 parsed/typechecked the source, but linking failed because this Mac has not accepted the Xcode license. No license agreement or machine configuration was changed.
- The preferred portable Bun CLI was subsequently execution-verified using the same pinned WASM compiler, source and output-capped worker: 30 actual steps, 5 samples, exit 0 (compiler 1,102.5 ms; training plus inference 936 ms in one local run). Invalid Rust exits 1 with compiler diagnostics; infinite mixed stdout/stderr exits 1 with the 256 KiB output-budget diagnostic. No Xcode, native linker or browser is involved. The worker accepts compiler bytes for Bun while retaining its existing browser WebAssembly.Module path.
- The PowerShell wrapper now invokes the same Bun CLI; it has not been tested on Windows.

Reproduce the browser test with an app Vite server running:

```sh
RUST_DEMO_URL=http://127.0.0.1:5190 bun scripts/rust/verify-browser.mjs
```

The script uses the shared windowless Chromium launch helper and verifies actual training output, invalid source diagnostics, and cancellation. Local browser proof does not establish deployment or Google AI Studio import compatibility.
