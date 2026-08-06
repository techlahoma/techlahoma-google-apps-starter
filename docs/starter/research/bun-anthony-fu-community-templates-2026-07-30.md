# Bun, Anthony Fu, and Community Template Research

- `Tease:` Keep the starter configurable, strict, and cheap to hydrate.
- `Lede:` Port the control plane to dependency-free Bun, explicitly select
  isolated installs with Bun's global virtual store, and adopt Anthony Fu's
  strongest intake and library conventions without inheriting floating CI
  references or a pnpm-only architecture.
- `Why it matters:`
  - One Bun runtime can drive the starter, its tests, and generated TypeScript
    projects while reducing repeated package materialization in Codespaces.
  - Better issue intake makes a report actionable before it becomes a standing
    human-review obligation.
- `Go deeper:`
  - Implement the bounded slices in the companion plan.
  - Keep public-library packaging optional rather than forcing it into every
    project.

Date: 2026-07-30

## Scope

Research the current Bun install model, Anthony Fu's current personal projects
and boilerplates, and relevant issue-template conventions. Select durable
patterns for `techlahoma/techlahoma-google-apps-starter`; do not copy floating workflow
references, pnpm-specific choices, or public-release automation into the core.

## Local evidence

- The starter already has a plan-first Python control plane with ten behavioral
  tests, additive profiles, baseline provenance, and a Bun/TypeScript profile.
- The Bun profile creates a root `package.json` but did not create a local
  `bunfig.toml`.
- The guardrail workflow invokes the Python CLI without installing Bun.
- Repository policy already requires full-length GitHub Action SHAs,
  least-privilege permissions, narrow verification, and separate authority for
  publication.
- The installed local Bun is 1.3.14.

## Findings

### Confirmed

- Bun recommends project-local configuration in `bunfig.toml`; the dot-prefixed
  `.bunfig.toml` name is for global user configuration.
- Bun's isolated linker prevents phantom dependencies and is the current default
  for new workspaces. A single-package project still defaults to hoisted unless
  it explicitly selects isolated linking.
- With isolated linking, `install.globalStore` materializes a package version
  once under Bun's cache and links project stores to it. Current Bun docs say the
  setting defaults to true, but explicit configuration makes the starter's
  intent stable and reviewable.
- `bun install --frozen-lockfile` remains the reproducible CI install command.
- Anthony Fu's current `starter-ts` is a small pure-ESM TypeScript library
  template using explicit package scripts, tsdown, declarations, package
  exports, Publint, Vitest, release preparation, and public-API drift guards.
- His newer `skills` repository separates always-needed agent instructions from
  on-demand, shareable knowledge. Its hand-maintained guidance favors explicit
  imports, relative paths by default, focused files, strict TypeScript, and
  optional monorepo orchestration only when build duration justifies it.
- `node-modules-inspector` keeps root orchestration explicit and runs lint,
  typecheck, build, tests, and end-to-end tests as separate proof layers.
- Current Vite+ and tsdown issue forms require a minimal reproduction for bugs,
  distinguish expected from actual behavior, request machine-readable
  environment output and text logs, and ask reporters to confirm scope and
  duplicates.
- Deno's own CLI repository currently uses deliberately tiny Markdown templates:
  the bug template asks for the exact Deno version and the feature template
  leaves the proposal open-ended. Its chooser routes support elsewhere.

### Inference

- Confidence: high. The core starter should stay smaller than a framework
  generator. Its reusable unit should be a profile or recipe that owns one
  coherent root, not a nested monorepo.
- Confidence: high. A generated monorepo can contain multiple apps and packages;
  a "monorepo of monorepos" is usually a signal that independent repositories or
  separately invoked generators should remain separate. Nested workspace roots
  can exist technically, but overlapping package-manager ownership and lockfiles
  make their lifecycle ambiguous.
- Confidence: high. Issue forms should combine Deno's brevity with the
  Anthony/VoidZero requirement for reproduction and evidence. Blank issues
  should be disabled so intake stays structured.
- Confidence: medium. Anthony's pure-ESM tsdown package shape is useful as an
  optional Bun library profile. It is too publication-specific for the neutral
  core and should not enable releases automatically.

## Disagreements and uncertainty

- No relevant public repository or tooling named exactly `DenoRM` was found
  through GitHub repository search or web search. This research therefore
  inspected `denoland/deno` literally and also inspected `rolldown/tsdown`, the
  Anthony Fu-adjacent library whose issue forms best match the request's
  surrounding context.
- Anthony's starter delegates CI and release work to reusable workflows using a
  floating `@main` reference. That is convenient for his ecosystem but conflicts
  with this starter's immutable-action requirement, so the pattern is not copied.
- Anthony primarily uses pnpm. This starter adopts the project-shape opinions,
  not the package manager.
- A global store reduces repeated materialization inside a Codespace, but it does
  not persist after the Codespace itself is deleted unless the cache directory is
  separately persisted.

## Recommendation

1. Replace `scripts/project_starter.py` and its unittest suite with a
   dependency-free Bun/TypeScript module and Bun tests.
2. Add a root `bunfig.toml`; explicitly set `auto = "disable"`,
   `linker = "isolated"`, and `globalStore = true`. The dependency-free control
   plane does not need a root package manifest.
3. Put the same `bunfig.toml` in every generated Bun package root, because a
   parent repository configuration is not a safe assumption for separately
   invoked nested package roots.
4. Install a pinned Bun runtime in CI and keep every third-party Action pinned to
   a full commit SHA.
5. Add concise structured bug and feature issue forms. Require reproduction,
   expected/actual behavior, environment, and duplicate/scope confirmation for
   bugs; require problem, users, success, alternatives, and non-goals for
   features.
6. Add pure-ESM library packaging as an opt-in profile only. Do not add release
   credentials, tag publishing, autofix commits, or dependency-review inboxes.

## Sources

- [Bun isolated installs](https://bun.sh/docs/pm/isolated-installs), Bun, checked
  2026-07-30.
- [Bun configuration](https://bun.sh/docs/runtime/bunfig), Bun, checked
  2026-07-30.
- [Bun install CLI](https://bun.sh/docs/pm/cli/install), Bun, checked 2026-07-30.
- [antfu/starter-ts package](https://github.com/antfu/starter-ts/blob/main/package.json),
  Anthony Fu, checked 2026-07-30.
- [antfu/starter-ts tsdown configuration](https://github.com/antfu/starter-ts/blob/main/tsdown.config.ts),
  Anthony Fu, checked 2026-07-30.
- [Anthony Fu's agent preferences](https://github.com/antfu/skills/blob/main/skills/antfu/SKILL.md),
  Anthony Fu, checked 2026-07-30.
- [Anthony Fu's library guidance](https://github.com/antfu/skills/blob/main/skills/antfu/references/library-development.md),
  Anthony Fu, checked 2026-07-30.
- [node-modules-inspector CI](https://github.com/antfu/node-modules-inspector/blob/main/.github/workflows/ci.yml),
  Anthony Fu, checked 2026-07-30.
- [Vite+ bug form](https://github.com/voidzero-dev/vite-plus/blob/main/.github/ISSUE_TEMPLATE/bug_report.yml),
  VoidZero, checked 2026-07-30.
- [tsdown bug form](https://github.com/rolldown/tsdown/blob/main/.github/ISSUE_TEMPLATE/bug_report.yml),
  Rolldown, checked 2026-07-30.
- [Deno bug template](https://github.com/denoland/deno/blob/main/.github/ISSUE_TEMPLATE/bug_report.md),
  Deno, checked 2026-07-30.
- [Deno issue chooser configuration](https://github.com/denoland/deno/blob/main/.github/ISSUE_TEMPLATE/config.yml),
  Deno, checked 2026-07-30.
