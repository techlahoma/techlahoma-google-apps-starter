# Workshop UX audit and simplification

- `Tease:` Give the conversation room to breathe.
- `Lede:` Start Context and Retrieval without files, preview and attach sources intentionally, and protect the chat viewport from expanding controls.
- `Why it matters:` The audience needs to see what each added capability changes. Preselected sources hide that comparison; cramped transcripts hide the result.
- `Go deeper:` [Before measurements](geometry-before.json), [skill versions](skill-versions.json), and verification below.

## Scope and evidence

Sam requested an audit and implementation for the first four demos, preserving chat and teaching visuals. Inspected base: `c231fd156d660fed10c5aee60046b289acf23885`. Sources include the two supplied screenshots, current code, and an interactive capture of the live site on September 22 at 1440×900, 1280×720, and 390×844. Captured screenshots are local ignored artifacts under `apps/building-ai-models-without-coding/test-results/ux-before/`.

The audit uses the locked Sam UX Audit methods. Accessibility and hierarchy lenses cover keyboard, modal focus, task order, disclosure, and layout. Motion review is limited to preserving reduced-motion behavior; no decorative animation is added. Performance/CWV are outside this scoped density audit: model inference is unchanged, and prior timings are not new performance measurements. This is not a complete WCAG conformance audit or a user study.

## Constraints inventory

| Area | First useful action | Reveal when needed | Must preserve |
| --- | --- | --- | --- |
| Context | Ask the unchanged model with no files | Preview a named sample in a modal; add one file; ask again | Plain-input baseline, exact prompt copy, per-message receipts, local uploads, remove controls, live file counts |
| Retrieval | Ask the unchanged model with retrieval off | Attach files, enable retrieval, choose keyword/semantic/hybrid; inspect rankings | Real BM25/embeddings/fusion, ranked table and raw scores, source receipts, no-evidence state, evaluation |
| Fine-tuning | Try the default model, then train | Example inputs, training configuration/details, export, logs | Actual adapter updates, live loss curve, unchanged/adapted comparisons, retained runs, cancellation, model limitations |
| From scratch | Compile and train | Once trained: prefix input; optional examples, source and logs | Actual Rust compilation/training, loss curve, checkpoint-based continuations, raw-copy logs, cancellation and output limits |
| Shared | Clear primary action and readable conversation | Supporting model details in the right inspector; advanced disclosures | Four visible routes, chat metaphor, Heroicons, adapted shadcn tables, bounded Xterm, keyboard access, mobile reflow, reduced motion |
| Boundaries | On-device interaction | Explicit model download and export actions | No backend or private-file upload; selected-site deployment only; hidden Local Jev remains separate |

Conversation and trained state remain disposable on leaving a demo or reloading. Context and Retrieval begin independently empty when mounted. Previewing a sample does not attach it. Adding one file must preserve already selected files. Disclosures cannot change model inputs merely by opening.

## Findings

| Priority / confidence | Evidence and user impact | Change / acceptance check |
| --- | --- | --- |
| High / high | At 1280×720, live Retrieval chat is 140 px tall and Rust chat 91 px. Their composers are 322 px and 297 px. The fixed parent height leaves the transcript as the shrinking flex item. | Protect a substantial conversation viewport, prevent turn compression, compact controls. Measure after changes and test completed messages, not just empty frames. |
| High / high | Both file demos start with 5 selected chunks. The presenter cannot begin with a clean model baseline without removing them first. | Start empty; Context's empty prompt is the plain question. Retrieval starts off. Verify independent route entry and supplied-source receipts. |
| Medium / high | File buttons add content before users can inspect it. Uploading replaces existing selections. | Named preview buttons open a native dialog without mutation. Explicit add/remove actions; additive validated uploads. Check keyboard, Escape, focus return, and content preservation. |
| Medium / high | Latest prompt/evaluation controls take vertical space between transcript and composer. Rust shows controls for unavailable post-training behavior. | Move inspection to the right rail; show prefix controls after successful training. Keep secondary actions discoverable in disclosures. |
| Medium / high | Duplicate introductions, empty result panels, repeated status and expanded logs compete with the task. | Keep one short welcome; show actual results when available, preserve curves, collapse technical details. No fake before/after results. |

## Strengths retained

The live site already has useful per-request evidence, local execution, real training curves, a visible system flow, and raw diagnostic copying. The four-stage navigation is familiar and consistent. The changes reduce how much is visible at once without removing those teaching tools.

## Verification and delivery

Implemented and checked locally:

- [After measurements](geometry-after.json) repeat the same three viewport sizes. At 1280×720, Retrieval and Rust now each have 420 px of conversation height, up from 140 px and 91 px. Their initial composers are 175 px and 95 px, down from 322 px and 297 px. At 1440×900, all four conversations are 560 px tall. Larger history and expanded details remain scrollable instead of compressing message cards.
- Preview dialog opens without attaching anything. Enter/Tab/Escape, background inertness, and focus return passed in desktop and phone-sized Chromium. Removing a previewed uploaded file returns focus to Attachments after the native close event. Native Chromium can briefly transfer focus to browser chrome while tabbing; the test checks that background app controls cannot receive focus rather than overriding browser behavior.
- Atomic additive imports, same-file retry, live counts, preserved previous receipts, and empty retrieval passed. Two new corpus tests bring the app total to 15 passing tests.
- A real hardware-GPU proof ran Context and Retrieval first with the exact plain question and no files, then with one explicitly added file. The selected file entered the second prompt; the first receipt stayed unchanged; navigating between demos did not carry attachments. No model or embedding results were mocked.
- Real Rust compilation/training, checkpoint continuations, clipboard equality, invalid-source behavior, output limits, and cancellation passed with the smaller composer and collapsed diagnostics.
- One real FunctionGemma run passed all 200 updates, default-versus-adapted outputs, adapter export/reload, and retained training history. Loss remained 19.15222 → 0.44719, with 2/3 held-out matches. The comparison table and timing/log details now collapse so they do not displace the curve by default. Model math and fixture definitions did not change.
- `bun run verify` and final `bun run app:verify --app building-ai-models-without-coding` passed. The hidden Local Jev route remains covered by smoke checks but its model implementation was not changed. Optional local actionlint/shellcheck are unavailable; those remain CI checks.
- The audit skill preflight was repeated. Wrapper, lock, and dependency integrity values match the starting receipt; local installation paths are redacted from the published JSON. Reduced-motion layout checks passed. No Lighthouse or full assistive-technology conformance result is claimed.

## Publication and live verification

- Runtime commit `78e5589277e8cb05e1ef3002cd049ab575b20abb` was pushed to the existing public repository's `main`; the remote SHA matched. Staged `prek` and Gitleaks passed.
- Deployed only `building-ai-models-without-coding` to the existing [workshop site](https://gdg-model-workshop.web.app/). Other sites and the protected default site were preserved.
- Live desktop/phone smoke passed: the original four routes, modal preview/add/remove, keyboard dismissal/background inertness/focus return, readable chat geometry, baseline empty states, and hidden Local Jev regression checks. Live receipt/file tests also passed, including additive uploads and focus return after deleting a previewed upload.
- Revision-specific CI is [35751346418](https://github.com/techlahoma/techlahoma-google-apps-starter/actions/runs/35751346418); remote CI is separate from the passing local and live checks. The previously documented full-history secret finding was not altered or suppressed by this UX work.
- Task-owned servers and proof browsers were closed; personal browser windows were untouched.
