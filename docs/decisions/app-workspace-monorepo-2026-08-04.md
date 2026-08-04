# App-Workspace Monorepo

- `Tease:` Clone once, then let each prompt create one isolated app.
- `Lede:` Techlahoma Google Apps Starter uses a Bun workspace monorepo whose root owns policy and tooling while every independently runnable artifact lives under `apps/<slug>/` with app-local build and Firebase configuration.
- `Why it matters:` Antigravity can execute multiple one-shot demo prompts in one checkout without overwriting the starter, duplicating repository infrastructure, or confusing deployment targets.
- `Go deeper:` Use `bun run app:create plan` and `app:create apply`; launch and verify the generated app with its app-scoped commands.

**Status:** Accepted  
**Date:** 2026-08-04

## Context

The first repository revision declared a Bun workspace but kept its only Vite application at the
root. Repeated demo prompts would either overwrite that app or clone a complete repository per
artifact. The GDG workshop needs one clone in which Antigravity can create several independent,
usable apps.

## Decision

The repository root is a control plane containing shared instructions, exact dependencies, one
lockfile, validation, templates, and cloud lifecycle commands. `apps/welcome` preserves the original
starter interface. Every new demo is generated from `templates/vite-app` into a previously unused
`apps/<slug>` directory.

Each app owns its `package.json`, `tsconfig.json`, `firebase.json`, source, tests, and README. Google
Cloud lifecycle commands require `--app <slug>` and use that app's ignored
`google.project.json`. The root verifier checks every app sequentially without adding a monorepo
orchestrator.

## Consequences

- A single clone can retain multiple independent workshop results.
- Prompts become shorter because the embedded skill owns app generation and verification.
- Firebase targets are explicit per app, reducing accidental cross-app deployment.
- Root verification duration grows linearly with the number of demo apps.
- Shared packages are deferred until at least two apps demonstrate a real reuse need.

## Alternatives considered

- Rebuild the root app for every prompt: rejected because it destroys comparison artifacts.
- Clone the full repository once per prompt: rejected because it duplicates tooling and makes the
  workshop harder to navigate.
- Add Turborepo, Nx, or Bazel: rejected because the current build graph does not justify another
  orchestration layer.
