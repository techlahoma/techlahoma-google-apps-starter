# ADR: Simplified Single-Command Firebase Deployment

- `Tease:` Replace plan/apply-heavy Firebase deployment commands with one safe `bun run deploy` command.
- `Lede:` Techlahoma monorepo developers and coding agents can now build and deploy app workspaces using `bun run deploy`, featuring interactive app selection, first-run guided connection, default site protection, and temporary target binding without committing `.firebaserc`.
- `Why it matters:`
  - Routine deployments no longer require manual plan/apply steps or multi-command lifecycle knowledge.
  - Default Hosting sites equal to project IDs remain protected from accidental overwrites.
  - Deployment target bindings are resolved cleanly via temporary workspaces without polluting repository state.
- `Go deeper:`
  - Read the [Google Cloud operations guide](../operations/google-cloud.md).
  - Inspect the deployment CLI implementation in [`scripts/deploy-lib.ts`](../../scripts/deploy-lib.ts) and [`scripts/deploy.ts`](../../scripts/deploy.ts).
  - Review automated tests in [`tests/deploy.test.ts`](../../tests/deploy.test.ts).

## Context

The previous monorepo deployment experience required developers to run multi-step plan and apply commands (`google:config`, `google:provision`, `google:sites`, `google:deploy`). Additionally, multi-site Firebase deployments attempted to execute `firebase deploy --only hosting:SITE_ID` without proper deploy-target bindings or a `.firebaserc` file, leading to Firebase CLI deployment failures.

`bun deploy` is reserved by Bun 1.3.14 for future Bun features. The supported public interface must be `bun run deploy`.

## Decision

1. **Primary Interface**: Establish `bun run deploy` as the primary deployment interface.
   - Interactive mode (`bun run deploy`) opens a terminal picker showing discovered apps, active project, and destination URLs.
   - Direct positional argument (`bun run deploy numeronym-generator`, `apps/numeronym-generator`, `./apps/numeronym-generator`) deploys a specific app workspace.
   - Support `--all`, `--dry-run`, `--yes`, `--json`, and `--help`.

2. **First-Run Connection**:
   - Automatically detect missing or placeholder configuration (`google.project.json`).
   - Guide authentication check (`bun run firebase:login`), list visible Firebase projects, let user choose a project, protect the default site, and assign deterministic secondary Hosting sites.

3. **Protection & Target Binding**:
   - Protect default Hosting sites (where site ID equals project ID or marked `DEFAULT_SITE`).
   - Generate task-scoped temporary deployment workspaces containing `.firebaserc` and matching `firebase.json` for target binding (`hosting:APP_SLUG`).
   - Reliably clean up temporary configuration files on exit.

4. **Receipt & Verification**:
   - After deployment, query site metadata (`firebase hosting:sites:get SITE_ID --project PROJECT_ID --json`), read `defaultUrl`, and verify HTTP responsiveness.
   - Return structured deployment receipts for `--json` and user-friendly summary for TUI.

## Status

Accepted.

## Consequences

- Routine app deployment requires a single command (`bun run deploy`).
- Multi-site Firebase deployments work reliably using temporary target bindings without committing `.firebaserc`.
- Legacy `google:*` commands remain available for advanced compatibility.
