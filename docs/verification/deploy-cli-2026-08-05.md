# Verification Record: Simplified Deploy CLI Implementation, Incident Fix & Staging Hardening

- `Tease:` Verification evidence for single-command `bun run deploy` deployment interface, self-contained deployment bundle staging, hosting config preservation, greenfield/adoption setup flows, site readiness polling, and error diagnostic evidence preservation.
- `Lede:` Full monorepo verification, regression tests, and CLI dry-run checks passed 100% cleanly for the simplified deployment workflow.
- `Why it matters:`
  - Resolves incident where Firebase CLI rejected deployments due to public directory escaping the temporary project directory (`Error: ../apps/.../dist is outside of project directory`).
  - Implements self-contained deployment bundles (`.starter/tmp/.firebase-deploy-tmp-<slug>-<rand>/`) with bundle-local `public` directory while preserving custom rewrites, headers, redirects, cleanUrls, and trailingSlash settings.
  - Adds greenfield ("Create a new Firebase project") and adoption ("Use an existing Firebase project") interactive setup flows.
  - Hardens deployment system to work generically across any authenticated account using account-independent test fixtures.
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
(pass) 38 unit & integration tests passed [218ms]

tests/google-cloud.test.ts:
(pass) 16 unit tests passed [17ms]

tests/create-app.test.ts:
(pass) 3 unit tests passed [7ms]

apps:check: bison-byte-dash, example-crm, numeronym-generator, room-pulse, welcome
✓ All 5 workspace app checks passed
```

### 2. Regression & Behavioral Test Proof (`tests/deploy.test.ts`)

- `RED-GREEN REGRESSION TEST (self-contained deployment bundle)`: Verifies that staged `firebase.json` specifies `"public": "public"` inside the bundle directory (never containing `..`), and preserves app's custom `rewrites`, `cleanUrls`, `trailingSlash`, and `headers`. Verified with `StrictMockCommandExecutor` that rejects any escaping `public` path.
- `App Hosting Config Resolution`: Verifies object-form, array-form matching, and throws `AMBIGUOUS_HOSTING_CONFIG` when multiple hosting blocks exist without explicit target match.
- `Path Traversal & Symlink Safety`: Verifies validation throws `PUBLIC_DIRECTORY_MISSING`, `PUBLIC_DIRECTORY_OUTSIDE_REPOSITORY`, or `UNSAFE_PUBLIC_SYMLINK` before any process execution.
- `Greenfield & Adoption Flows`: Verifies project creation command generation (`projects:create`), input validation (`INVALID_PROJECT_ID`), site classification (`mapped` vs `unclaimed`), and dry-run non-mutative guarantee.
- `sanitizeFirebaseErrorOutput`: Verifies redaction of bearer tokens, API keys (`AIza`), `FIREBASE_TOKEN`, and `access_token`, ANSI sequence removal, and line bounding.
- `pollSiteReadiness`: Verifies readiness succeeds after transient 404 responses (with 0ms sleep in tests), times out with `SITE_NOT_READY`, and fails immediately without retrying non-transient errors (403 Forbidden).
- `ensureSiteExists`: Verifies existing secondary sites skip site creation and readiness polling.
- `determineAppStatuses`: Verifies app picker distinguishes `not_configured`, `site_missing`, `site_exists`, and `deployed`.

### 3. Manual CLI Verification Commands

```sh
bun run deploy --help
bun run deploy numeronym-generator --dry-run
bun run deploy apps/numeronym-generator --dry-run
bun run deploy --all --dry-run
```

Result:
All dry-run commands printed target project, site IDs, resolved public paths, hosting config summaries, site actions, and planned execution steps without mutating local configuration or remote Firebase resources.

## Limitations & Authority Boundary

- Local unit and integration tests use an injectable `CommandExecutor` and mock prompt harness.
- Live Firebase mutations were not performed in compliance with repository authority boundaries.
