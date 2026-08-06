# Transcript CRM Prompt Evaluation

- `Tease:` A polished screenshot is not a passing CRM build.
- `Lede:` The live prompt was stress-tested as a blind build with GPT-5.6 Terra at low reasoning in clean local clones. Claims were rejected whenever the database, source, browser receipt, or inspected image contradicted them.
- `Why it matters:` Live-demo margin comes from removing ambiguity and verifier loopholes, not from assuming a stronger model will repair a weak prompt.
- `Go deeper:` Four independent trials converged to the full database, browser, visual, and repository receipt. Several needed audit-driven self-correction, so this supports reasonable demo confidence—not guaranteed first-shot reliability.

- **Evaluation date:** 2026-08-06 (America/Chicago)
- **Prompt under test:** [Transcript CRM Live-Demo Prompt](../../apps/relationship-workbench/PROMPT.md)
- **Research basis:** [Transcript-Conditioned CRM Design Research](../research/transcript-crm-design-2026-08-06.md)

## Evaluator configuration

- Model: `gpt-5.6-terra`
- Reasoning effort: `low`, the least reasoning exposed for this available sub-agent model
- Context: fresh sub-agent without inherited conversation
- Workspace: a clean local clone in `/private/tmp` for each trial
- Input: a different fictional business-discovery transcript per trial
- Authority: local build and verification only; no commit, push, deploy, authentication, or real customer data

GPT-5.6 Terra low is a conservative operational analogue, not a calibrated cross-vendor equivalent to Gemini 3.6 Flash low. OpenAI describes Terra as its balanced everyday tier; Google describes Flash as its speed/intelligence balance. The useful question is whether a lower-effort capable coding agent can satisfy the same observable contract.

## Acceptance rule

A trial passes only when all of these agree:

1. strict TypeScript, real PGlite/Drizzle repository tests, and production build pass;
2. application queries and transactions use Drizzle rather than an adjacent in-memory store or raw PGlite CRUD;
3. the callable custom smoke function executes the created record's complete desktop flow plus phone detail;
4. both screenshots visibly show the ready, selected application rather than loading, an empty receipt, stale detail, or hidden phone detail;
5. controls are state-correct: boundary stage actions do not no-op and Undo exists only for an actual move;
6. the scaffold contract remains `scaffold` until data, browser, visual, and source gates pass;
7. source inspection finds no placeholder surface, duplicate app mount, check suppression, positional smoke shortcut, hidden detail, unsafe dynamic HTML, or giant generated lines.

## Trial progression

| Trials | Result | Concrete finding | Prompt change |
| --- | --- | --- | --- |
| 1 | Rejected | PGlite rejected `Date.now()` milliseconds in a PostgreSQL 32-bit integer. Drizzle was initialized but CRUD used raw PGlite; selection, notes, and tasks were decorative; phone CSS hid detail. | PostgreSQL date-mode timestamps, Drizzle-only application repository, real detail/timeline, no no-op controls, reachable phone detail. |
| 2 | Rejected despite printed verifier success | The smoke module imported `@playwright/test`; the repository verifier caught the failed import and silently took screenshot-only fallback. Images showed the loading shell. | Exact exported `runSmokeTest` interface with only the installed `playwright` type import and ready-state visual inspection. |
| 3–5 | Incomplete | Broad versions of the prompt exhausted the low-reasoning run in TypeScript errors, static shells, or missing browser proof. | Reduced the product to Focus, Work, Relationships, one contextual Detail, and five mutations. |
| 6–9 | Rejected | Compact attempts still substituted arrays, direct IndexedDB, raw PGlite CRUD, or unused Drizzle and sometimes stopped at typecheck/build. | Data-first stop-line, fixed internal schema, explicit dependency authority, in-memory PGlite integration tests. |
| 10 | Diagnostic near-pass | Real Drizzle repository tests passed. Independent browser diagnosis found positional selectors mutating the wrong work item and unawaited live filtering appending duplicate shells. | Scope every mutation to the created record; use explicit Apply filter; render one active destination. |
| 11 | Rejected | Raw PGlite repository remained. | Mechanical Drizzle/PGlite source guards. |
| 12–13 | Data pass, browser incomplete | Real data cores passed, but Vite allowed the Bun symlink rather than the real cache path for PGlite WASM/data; yielded verifier sessions were mistaken for completion. | Exact app-local `realpathSync` Vite configuration and explicit same-session polling to a terminal footer. |
| 14 | First browser-complete penultimate run | Independent reruns passed app check and desktop/phone browser verification. Inspection found a sparse empty-state desktop receipt, off-screen phone detail, permanent one-line templates, and unescaped dynamic values. | Demo-state screenshot choreography, visible phone detail, source/readability and safe rendering requirements. |
| 15–16 | Incomplete | One run left the starter helper/test; another treated expected initial scaffold-guard matches as a blocker. | Exact scaffold marker command, clarification that initial matches are an edit list, and the correct scaffold → browser → complete-contract → final-verify sequence. |
| 17 | Not countable | A concurrent local port race pointed the verifier at another trial; source inspection also found incomplete smoke coverage. | Serialize final browser trials and require the actual terminal receipt. |
| 18 | Converged end-to-end pass | Four real repository tests, typecheck, build, custom desktop/phone flow, final `app:verify`, and selected-detail screenshots passed. Independent visual review caught one stale desktop detail receipt; the agent added an exact heading wait and regenerated it. Later source review found starter copy and a duplicate `#app` in `index.html`, plus state-insensitive boundary/Undo controls. | Exact final-selection assertion, index scaffold guard, one mount-point guard, movement token semantics, boundary assertions, and one scoped Undo. |
| 19 | Honest incomplete | The low-reasoning run began an in-memory array repository beside an almost-unused PGlite client, passed only shallow tests, and stopped before browser proof. | Required schema/migration/test files plus mechanical Drizzle import, fresh PGlite test, and in-memory-shortcut guards. |
| 20 | Converged strict pass | A venue CRM passed six real repository tests, the complete browser flow, visual inspection, and final verification. Reset could still race later navigation because a Playwright click did not await its asynchronous listener. | Require reset → state → render → dialog-close ordering and wait for dialog detachment. |
| 21 | Rejected despite nominal completion | A furniture CRM needed repeated corrections and still ended with shallow smoke proof, a generic receipt, and a reverted `scaffold` contract. Strict TypeScript, async no-match rendering, dialog naming, and final screenshot timing all escaped its first completion claim. | Treat the final source and screenshot audit—not the model's success message—as authoritative. |
| 22 | Incomplete | An organizing-service CRM passed the core data and browser commands but did not finish the required interaction, source, and visual contract. | Shorten and sequence the brief; write the full smoke skeleton before product UI. |
| 23 | Converged strict pass | A catering CRM passed five real PGlite/Drizzle tests, the full persisted flow, polished desktop split-view and phone-detail receipts, and final verification. | Preserve scoped selectors and exact phone-detail measurement as canonical patterns. |
| 24 | Converged compact-prompt pass | A chimney-service CRM built from the shorter prompt. The final guards exposed reset, reload, phone, no-open-task, and visual-label gaps; the agent corrected them and passed the complete receipt. | Keep the compact brief but make each high-risk behavior mechanically observable. |
| 25 | Converged final-prompt pass | A dog-boarding CRM initially declared completion with one catch-all test and partial smoke proof. The executable guards forced five focused tests and the complete flow; visual review then forced a simultaneous, allocated Work/detail layout and an unclipped phone navigation receipt before final verification. | Make the proof checklist early, keep source guards executable, and state the desktop non-overlap and phone-navigation invariants explicitly. |

## Final assessment

Trials 20, 23, 24, and 25 independently converged across venue, catering, chimney-service, and dog-boarding transcripts. Each final receipt used a real Drizzle/PGlite repository, focused integration tests, the persisted create → move/undo → note → reload → complete → filter → reset-cancel browser flow, inspected desktop/phone images, a `complete` app contract, and final repository verification. Trial 25 used the canonical prompt's executable finish guards.

This is evidence of **guarded convergence**, not a claim of clean one-shot generation. Terra low repeatedly attempted plausible shortcuts or declared success too early; the prompt's stop-lines, exact flow, executable guards, and screenshot inspection gave the same agent enough information to find and correct those failures. Trials 21 and 22 remain important counterexamples.

The published prompt is 2,364 words, about 31% shorter than the 3,406-word strict predecessor, while retaining the failure-derived acceptance contract and adding instructions for the pre-created app scaffold. Running it with a clean starter, the Antigravity skill pack preinstalled, no competing localhost demo servers, and Gemini 3.6 Flash at medium thinking should have useful margin over this low-reasoning evaluation. That is a reasoned confidence judgment, not a cross-vendor benchmark or guarantee. For a high-stakes live session, one rehearsal in the actual Antigravity environment and a known-good fallback build remain prudent.

### Final independent receipt

- **Baseline revision:** `d1ccce14d8f3930cfd2acdb2828a78352cb34bbe`
- **Trial workspace:** `/private/tmp/transcript-crm-live-v5-P13HQ3`
- **Business transcript:** fictional dog-boarding discovery interview
- **Replayed:** 2026-08-06 17:01 CDT
- **Command:** `bun run app:verify --app relationship-workbench`
- **Result:** five focused repository tests passed; typecheck and production build passed; the custom 1440×900 desktop and 390×844 phone flows passed with clean console and requests; contract, scaffold, and dependency guards passed.
- **Visual inspection:** desktop showed a populated Work board and selected detail in non-overlapping columns; phone showed a full-width selected detail and all four navigation controls without clipping.
- **Non-failing warnings:** PGlite contributed a 524 kB JavaScript chunk plus WASM/data assets, and its bundled dependency emitted Vite direct-eval warnings. Those are deployment-performance review items, not local-demo correctness failures.
