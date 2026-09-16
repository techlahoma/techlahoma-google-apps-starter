# Workshop live state and comparison

- `Tease:` Make the process follow the user and explain each result.
- `Lede:` Replace the overlapping horizontal diagram with a vertical sticky state panel, keep source receipts for each request, and make baseline-versus-adapter comparisons usable before and after training.
- `Why it matters:` File toggles, empty context, loading, and training outcomes must reflect actual computation rather than decorative state.
- `Go deeper:` Changes are scoped to Model Workshop, with desktop/phone and real-model proof before delivery to the existing Firebase site.

## Acceptance and progress

- Implemented: vertical sticky Context/Retrieval panel with live attached files, counts, empty state, immutable prompt source receipts, and reset on each request.
- Implemented: baseline FunctionGemma inference before training, compact before/after columns, example inputs, readable emoji classifications, and loading states.
- Implemented locally: bound Xterm viewport height to stop ResizeObserver/FitAddon height growth; distinguish warnings, failures, training lines, and successful completion using display-only emoji annotations.
- Investigated: active SVG CSS transform overwrote positional transform, explaining the overlap in the supplied screenshot. File toggles updated corpus but the old diagram had no source inventory props.
- Verified provenance: the locally adapted table matches shadcn's basic Table composition. Source checked at https://ui.shadcn.com/r/styles/new-york-v4/table.json on 2026-09-16. Other custom controls should not be described as unmodified registry components.
- Passed: repository verification and 13 app tests; desktop/phone app completion checks including 0/1/0 attachment toggles, sticky scroll, compact prediction cards, and bounded Xterm; independent receipt history and uploaded-document removal proof.
- Passed: default FunctionGemma prediction before training, 200 Apple Metal GPU updates, adapter export/reload, and custom comparison. Default refusal changed to `now` for the same urgent notification; held-out result remains 2/3. Loss 19.15222 to 0.44719, 146.154 seconds including baseline and comparison.
- Passed: real Rust train, invalid source, output limit, cancellation, and raw clipboard equality. Display emoji are separate from copied output.
- Passed: final Context/RAG inference on production build in 101.942 seconds, with clean console and requests; hybrid/evaluation ranks and actual grounded answer preserved. Earlier Vite proof was interrupted by hot reload and is superseded by this built-app proof.
- Delivered: runtime revision `dea5b0f21d7dc93823421b38690d0de83b60c055` committed, pushed to existing `origin/main`, and deployed only to `gdg-model-workshop` in project `sam-carlton-creative`. All four public routes passed desktop/phone live checks for source toggles, sticky behavior, baseline controls, compact outputs, bounded Xterm, console, and requests.
- CI: [run 35116361068](https://github.com/techlahoma/techlahoma-google-apps-starter/actions/runs/35116361068) passed Linux, macOS, and Windows build/browser jobs for that runtime revision. The historical Google-key finding keeps the separate secret job red; no shared credential was changed or finding suppressed.

## Interpretation boundaries

Receipts describe sources searched and text supplied in the prompt. They cannot establish which passage caused the model's answer. Loss is full-vocabulary training cross-entropy, not held-out accuracy. The Rust `dead_code` warning reports unused methods and did not stop the supplied run.
