# Techlahoma Google Apps Starter Verification

- `Tease:` The starter passes its complete local verification; no Google project was created,
  deployed, or deleted.
- `Lede:` Real frozen dependency installation, GTS and Biome checks, unit tests, strict types,
  production build, lifecycle plans, confirmation refusal, workflow lint, shell lint, and the
  starter contract passed in an isolated local repository.
- `Why it matters:`
  - Structural boilerplate alone does not prove that a generated app can install and build.
  - Local proof must remain distinct from cloud-side provisioning and live deployment proof.
- `Go deeper:`
  - Re-run `bash scripts/verify.sh` from the repository root.
  - Use [`PROJECT.md`](../../PROJECT.md) for remaining external verification gaps.

## Scope

- Revision: initial GitHub publication candidate, before its first commit
- Date: 2026-08-03
- Working repository: isolated local repository, not the source notes repository
- External effects: none; no remote repository or Google resource was created or changed

## Evidence

| Check | Command | Result |
|---|---|---|
| Exact dependency installation | `bun install` and `bun install --frozen-lockfile` | Passed; lockfile contains Firebase CLI 15.24.0, GTS 7.0.0, and Vite 8.0.16 |
| Google TypeScript profile | `bun run lint` | Passed; GTS checked TypeScript and Biome checked its non-TypeScript scope |
| Unit behavior | `bun test tests` | Passed; 8 tests, 0 failures |
| Strict TypeScript | `bun run typecheck` | Passed |
| Production app build | `bun run build` | Passed; Vite produced `dist/` |
| Read-only doctor | `bun scripts/google-cloud.ts doctor` | Passed; reported pinned Firebase CLI and no configured project |
| Config plan | `bun scripts/google-cloud.ts config plan --project-id small-google-app-dev --display-name "Small Google App"` | Passed; reported a local-write plan without writing the config |
| Lifecycle plans | `bun run google:provision plan`, `google:deploy plan`, and `google:destroy plan` | Passed; each reported its distinct effect and exact project target without a cloud call |
| Confirmation refusal | `bun scripts/google-cloud.ts provision apply --confirm wrong-project` | Passed; exited 1 before a cloud call and requested the exact configured ID |
| Frozen reinstall | `bun install --frozen-lockfile` | Passed with no changes |
| Full project verification | `mise exec -- bash scripts/verify.sh` | Passed: starter verifier, formatting, GTS and Biome lint, strict types, 8 tests, Vite build, actionlint, and shellcheck |
| Production preview | `bun run preview --host 127.0.0.1 --port 4173` plus an HTTP HEAD request | Passed; built app returned HTTP 200 on localhost |
| Firebase CLI startup | `./node_modules/.bin/firebase --version` | Passed; reported exact version 15.24.0 |
| Dependency audit | `bun audit` | Reduced from 9 advisories to one moderate upstream Firebase CLI advisory; no audited package is included in the static application bundle |

The lifecycle plans used the generated, local-only test ID `google-app-starter-test-dev`. The
ignored test configuration was deleted afterward. No command authenticated to or queried Google.

## Supply-chain result

The exact dependency is `firebase-tools` 15.24.0. On 2026-08-03, the package manager reported
15.25.1 available, but that release was newer than the repository's seven-day minimum release age.
The age control was retained; it was not reduced or bypassed. Vite moved from vulnerable 8.0.4 to
8.0.16, released 2026-06-01; exact `tmp` 0.2.7 and `uuid` 11.1.1 overrides remove their transitive
advisories.

One moderate advisory remains in the development-only path
`firebase-tools -> @google-cloud/pubsub -> @opentelemetry/core`.
`@google-cloud/pubsub` 5.3.1 requires the OpenTelemetry 1.x line while the advisory's patched
version is 2.8.0. No cross-major override was forced without upstream compatibility evidence.

## Not verified

- Firebase or Google authentication
- real project creation or organization placement
- billing state
- a Hosting deployment or live URL
- a real whole-project deletion

Those are separate external effects and require a selected account, real project ID, and explicit
authority.
