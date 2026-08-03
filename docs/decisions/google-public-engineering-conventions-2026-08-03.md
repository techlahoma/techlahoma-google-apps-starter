# ADR: Adopt Public Google Engineering Conventions Selectively

- `Tease:` Make the starter recognizably Google-aligned while preserving a tiny Level 0.
- `Lede:` Use GTS as the TypeScript style authority and adopt Google's public guidance on semantic
  web code, small changes, tests, and docs-with-code. Keep the existing Bun, Vite, Firebase Hosting,
  and agent-safe lifecycle rather than imitating Google's internal monorepo infrastructure.
- `Why it matters:`
  - The repo gains a coherent, maintained style profile without inventing a “Google internal” one.
  - The baseline remains understandable and disposable for a one-app experiment.
- `Go deeper:`
  - Read the [supporting research](../research/google-public-engineering-conventions-2026-08-03.md).
  - Follow [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## Status

Accepted — 2026-08-03

## Context

Google publishes multiple language guides, engineering-practice documents, samples, and product
templates. They are not one universal application scaffold. The internal Google build environment
also differs materially from an external GitHub repository, so copying surface details could add
complexity without reproducing the system that makes them useful.

The starter already has a small Bun and Vite application, a pinned Firebase CLI, one project per
environment, and explicit plan/apply lifecycle commands. The new convention layer must improve
consistency without weakening those boundaries.

## Decision

1. GTS 7.0.0 is the authoritative TypeScript linter and formatter.
2. The project uses GTS's published Prettier configuration and extends its TypeScript base.
3. Vite-specific module, DOM-library, Bun-type, and no-emit settings remain explicit overrides.
4. Biome is retained only for JSON, JSONC, HTML, and CSS so two tools do not compete over
   TypeScript.
5. Static page structure remains semantic HTML. CSS owns presentation, and TypeScript adds only
   required behavior.
6. Contributions should be small and self-contained, with tests and documentation included when
   behavior or interfaces change.
7. Dependencies remain exact and lockfile-backed; the configured release-age control remains in
   force.
8. The repository may be a private GitHub template, but it will not use Google copyright,
   official-product language, or a Google open-source release process.
9. Bazel, additional cloud services, and enterprise GCP foundations require their own adoption
   evidence and decision.

## Consequences

### Positive

- TypeScript style is grounded in a maintained Google-owned repository.
- One command runs the same verification locally and in CI.
- Public Google guidance is traceable to sources and explicit about its limits.
- The starter stays small enough to understand, generate, and tear down.

### Negative

- GTS and Biome are both installed because GTS does not own the non-TypeScript files.
- The GTS TypeScript base needs documented Vite and Bun overrides.
- This profile can be described as public-Google-aligned, not internally identical.

## Reconsideration triggers

Revisit this decision when GTS is no longer maintained, the project adds another implementation
language, the build graph grows enough to justify a different build system, or a framework-specific
style tool provides stronger and non-overlapping checks.
