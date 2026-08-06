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

2. **First-Run Connection & Setup Modes**:
   - Automatically detect missing or placeholder configuration (`google.project.json`).
   - Offer interactive setup options: `1) Use an existing Firebase project`, `2) Create a new Firebase project`, `3) Cancel`.
   - In greenfield mode, prompt for display name and project ID, validate format, confirm effect, execute `firebase projects:create`, and write root config.
   - In adoption mode, query visible projects, list Hosting sites, classify secondary sites (`mapped` vs `unclaimed`), protect default site unconditionally, require adoption confirmation for unclaimed sites, and write root config.

3. **Protection & Self-Contained Deployment Bundle**:
   - Protect default Hosting sites (where site ID equals project ID or marked `DEFAULT_SITE`).
   - Create self-contained deployment bundle directories under `.starter/tmp/.firebase-deploy-tmp-<slug>-<rand>/` containing `.firebaserc`, bundle-local `firebase.json` (`hosting.target = APP_SLUG`, `hosting.public = "public"`), and staged build output in `public/`.
   - Preserve custom source app hosting configuration (`rewrites`, `headers`, `redirects`, `cleanUrls`, `trailingSlash`, `i18n`, `ignore`).
   - Assert staged public directory is strictly bundle-local to prevent `outside of project directory` Firebase CLI errors.
   - Reliably clean up temporary bundle workspaces on exit.

4. **Receipt & Verification**:
   - After deployment, query site metadata (`firebase hosting:sites:get SITE_ID --project PROJECT_ID --json`), read `defaultUrl`, and verify HTTP responsiveness.
   - On deployment failure, write sanitized diagnostic error receipt to `.starter/tmp/deploy-errors/` with bundle metadata (`hostingConfigSummary`, `sourcePublicDir`, `stagedPublicDir`).
   - Return structured deployment receipts for `--json` and user-friendly summary for TUI.

## Status

Accepted.

## Consequences

- Routine app deployment requires a single command (`bun run deploy`).
- Multi-site Firebase deployments work reliably using temporary target bindings without committing `.firebaserc`.
- Legacy `google:*` commands remain available for advanced compatibility.
