# Bun Control Plane and Community Templates

- `Tease:` Make Bun the starter's executable center.
- `Lede:` Preserve the existing safe CLI contract while porting it to Bun,
  explicitly enable space-efficient installs, and add structured issue intake
  plus an optional modern library shape.
- `Why it matters:`
  - The starter should use the runtime Sam prefers instead of carrying a Python
    control-plane dependency.
  - New project intake and package structure should arrive opinionated without
    turning every repository into the same framework.
- `Go deeper:`
  - Complete each slice with its narrow proof before moving to the next.
  - Do not publish or mutate remote settings as part of this work.

Date: 2026-07-30

## Original request

> Yeah, I like that, except I'm a big fan of Bun, so let's do the, for project
> starter.py, let's refactor that into a Bun script instead. And then also,
> let's, by default, use the Bun for any Bun tooling where we create a package,
> let's use the global store by default to save on Codespaces. Then I want you
> to research Anthony Fu's latest projects, and then his own boilerplates, and
> maybe any new stuff he's doing in his newer projects, and pull in some
> interesting templates and opinions we can pull in, like some of his GitHub
> Actions templates, some of his issue templates. Look at the issue templates
> for DenoRM. Anything that would be really good for those.

## Goal

The starter's local control plane and test suite run on Bun, every generated Bun
package root explicitly uses isolated/global-store installs, and the repository
offers evidence-oriented issue forms and an optional modern Bun library profile
without weakening current safety policy.

## Scope

### In

- behavioral port of the existing CLI and tests;
- root Bun metadata and deterministic install configuration;
- pinned Bun setup in the existing guardrail workflow;
- concise bug and feature issue forms;
- optional pure-ESM Bun library profile inspired by current Anthony Fu work;
- command/docs/baseline updates and full local verification.

### Out

- repository creation, staging, commits, pushes, pull requests, settings changes,
  releases, or deployment;
- floating reusable workflows, autofix commits, or tag-triggered publishing;
- replacing the existing WordPress or other profiles;
- forcing a frontend framework or monorepo orchestrator into the core.

## Constraints and protected boundaries

- Preserve all existing P0-P2 and WordPress work in this dirty local tree.
- Preserve command names, plan/apply boundaries, conflict refusal, and baseline
  semantics during the port.
- Do not bypass mise's release-age policy.
- Keep third-party Actions pinned by full SHA and workflow permissions minimal.
- Issue templates must not promise labels, support routes, or public resources
  that a generated repository may not have.

## Success proof

- `bun test` passes the ported behavioral suite.
- `bun scripts/project-starter.ts verify` reports zero errors.
- profile tests prove every profile applies idempotently and refuses collisions.
- a generated Bun package contains the explicit local `bunfig.toml`.
- `bash scripts/verify.sh`, `prek`, Actionlint, ShellCheck, Gitleaks, and
  `git diff --check` pass.
- final review confirms no remote or Git-index mutation occurred.

## Tasks

### 1. Record primary-source findings

- Status: complete
- Owned paths:
  `docs/starter/research/bun-anthony-fu-community-templates-2026-07-30.md`
- Proof of done: sources distinguish confirmed facts, inference, rejected
  patterns, and the unresolved `DenoRM` name.
- Escalate when: a source requires credentials or non-public material.

### 2. Port the control plane

- Status: complete
- Owned paths: `scripts/project-starter.ts`, `tests/project-starter.test.ts`,
  command references, and deletion of their Python predecessors.
- Proof of done: ported unit and integration tests pass with unchanged command
  effects.
- Escalate when: behavioral compatibility would require weakening a safety
  boundary.

### 3. Make Bun installation policy explicit

- Status: complete
- Owned paths: `bunfig.toml`, `mise.toml`, Bun profile files,
  and guardrail workflow.
- Proof of done: current Bun accepts the configuration and tests observe it in a
  generated package.
- Escalate when: the configured Bun version is blocked by release-age policy.

### 4. Add community intake and library option

- Status: complete
- Owned paths: `.github/ISSUE_TEMPLATE/` and an optional library profile.
- Proof of done: forms pass YAML/contract checks and the profile applies
  idempotently.
- Escalate when: a proposed default would trigger publication or external
  writes.

### 5. Refresh and verify the baseline

- Status: complete
- Owned paths: `.starter/baseline.json`, this plan, and routing docs.
- Proof of done: the complete verification ladder passes against the final
  managed-path set.
- Escalate when: existing task-owned changes conflict with the new slice.

## Progress checkpoints

### 2026-07-30 — Research and boundary selection

- Goal: identify durable Bun and Anthony Fu conventions.
- Changed: added a primary-source research record and bounded plan.
- Evidence: official Bun docs plus current Anthony Fu, VoidZero, tsdown, and Deno
  repository files.
- Remaining risk: the exact `DenoRM` referent remains unconfirmed.
- Decision: continue with the literal Deno template plus the contextually
  relevant tsdown forms, documenting the ambiguity.

### 2026-07-30 — Bun behavioral port

- Goal: preserve the Python control plane's effects under Bun.
- Changed: replaced the Python module and unittest suite with a dependency-free
  Bun/TypeScript module and Bun tests; updated every command entrypoint.
- Evidence: all ten ported scenarios pass, including slug/render behavior,
  atomic writes, ruleset contract, profile idempotency, collision refusal,
  WordPress verification, run-ledger validation, and baseline reconciliation.
- Remaining risk: remote settings apply was not invoked because this task did
  not authorize a GitHub mutation.
- Decision: continue to generated-project integration.

### 2026-07-30 — Generated Bun project and library proof

- Goal: prove the scaffold after profile application, dependency installation,
  and real builds.
- Changed: added explicit local global-store configuration, root workspace
  metadata in the Bun profile, and the private pure-ESM library profile.
- Evidence:
  - a fresh initialized copy applied both profiles without collisions;
  - `bun install` created one workspace lock and linked
    `node_modules/.bun/<package>` entries to Bun's global virtual store;
  - root format, lint, and TypeScript checks passed;
  - the library passed Biome, Oxlint, TypeScript, one real Bun smoke test,
    tsdown ESM/declaration generation, and Publint.
- Remaining risk: the package remains intentionally private and has no release
  automation.
- Decision: retain the package as an opt-in profile.

### 2026-07-30 — Final local verification

- Goal: prove the final managed baseline without external effects.
- Changed: added structured bug/feature intake, pinned Bun CI setup, and
  refreshed baseline provenance.
- Evidence:
  - the starter verifier and ten Bun tests passed;
  - Prek validated the new untracked YAML, JSON, TOML, TypeScript, and shell
    files plus the repository hooks;
  - Actionlint and ShellCheck passed through `scripts/verify.sh`;
  - whole-tree Gitleaks scanned about 273 KB with no findings;
  - `git diff --check` passed and no floating Action reference remained.
- Remaining risk: the exact `DenoRM` referent is still unknown and is documented
  in the research record rather than silently guessed.
- Decision: stop; the requested local implementation is complete.
