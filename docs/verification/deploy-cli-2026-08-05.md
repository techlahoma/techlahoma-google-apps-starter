# Verification Record: Simplified Deploy CLI Implementation & Incident Fix

- `Tease:` Verification evidence for single-command `bun run deploy` deployment interface, site readiness polling, and error diagnostic evidence preservation.
- `Lede:` Full monorepo verification, regression tests, and CLI dry-run checks passed cleanly for the simplified deployment workflow.
- `Why it matters:`
  - Resolves incident where failed Firebase deployment subprocesses hid error evidence and wiped debug logs.
  - Adds bounded site-readiness polling after site creation, sanitized evidence persistence to `.starter/tmp/deploy-errors/`, site status calculation in app picker, and automatic reuse of existing secondary sites.
  - Ensures TypeScript strictness, Biome formatting, GTS linting, and app checks remain 100% clean.
- `Go deeper:`
  - Review automated tests in [`tests/deploy.test.ts`](../../tests/deploy.test.ts).
  - Inspect implementation in [`scripts/deploy-lib.ts`](../../scripts/deploy-lib.ts), [`scripts/deploy-tui.ts`](../../scripts/deploy-tui.ts), and [`scripts/deploy.ts`](../../scripts/deploy.ts).

## Test & Build Proof

Environment: macOS (Darwin 25.0.0), Bun 1.3.14, TypeScript 5.9.3, Biome 2.4.15, GTS 7.0.0.

### 1. Verification Script (`bash scripts/verify.sh`)

Output:
```text
Checked 49 files in 9ms. No fixes applied.
$ tsc --noEmit
$ bun test tests
bun test v1.3.14 (0d9b296a)

tests/deploy.test.ts:
(pass) 29 unit & integration tests passed [192ms]

tests/google-cloud.test.ts:
(pass) 16 unit tests passed [14ms]

tests/create-app.test.ts:
(pass) 3 unit tests passed [7ms]

apps:check: bison-byte-dash, example-crm, numeronym-generator, room-pulse, welcome
✓ All 5 workspace app checks passed
```

### 2. Regression & Behavioral Test Proof (`tests/deploy.test.ts`)

- `sanitizeFirebaseErrorOutput`: Verifies redaction of bearer tokens, API keys (`AIza`), `FIREBASE_TOKEN`, and `access_token`, ANSI sequence removal, and line bounding.
- `pollSiteReadiness`: Verifies readiness succeeds after transient 404 responses (with 0ms sleep in tests), times out with `SITE_NOT_READY`, and fails immediately without retrying non-transient errors (403 Forbidden).
- `ensureSiteExists`: Verifies existing secondary sites (e.g. `numeronym-generator-ef4ba1`) skip site creation and readiness polling.
- `determineAppStatuses`: Verifies app picker distinguishes `not_configured`, `site_missing`, `site_exists`, and `deployed`.
- `REGRESSION TEST (eb995e4 fix)`: Verifies that when `firebase deploy` fails:
  1. Sanitized error output is surfaced in terminal output and error payload.
  2. Diagnostic receipt file is saved on disk under `.starter/tmp/deploy-errors/deploy-error-<app>-<timestamp>.json` with safe command, exit code, and sanitized stderr (no process environment dump).
  3. Temporary deploy workspace directory is cleaned up reliably.

### 3. Manual CLI Verification Commands

```sh
bun run deploy --help
bun run deploy numeronym-generator --dry-run
bun run deploy apps/numeronym-generator --dry-run
bun run deploy --all --dry-run
```

Result:
All dry-run commands printed target project, site IDs, and planned execution steps without mutating local configuration or remote Firebase resources.

## Limitations & Authority Boundary

- Local unit and integration tests use an injectable `CommandExecutor` and mock prompt harness.
- Live Firebase mutations were not performed in compliance with repository authority boundaries.
