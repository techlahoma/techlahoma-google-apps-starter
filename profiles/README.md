# Opt-in Profiles

- `Tease:` Stack guidance without bloating the core.
- `Lede:` Profiles add bounded configuration, operations docs, and agent
  instructions only after the project has been initialized and the profile is
  explicitly applied.
- `Why it matters:`
  - A language-neutral repository kernel remains useful across different
    products.
  - Collision refusal preserves project-specific files and makes adoption
    auditable.
- `Go deeper:`
  - List profiles with `bun scripts/project-starter.ts profile list`.
  - Plan before applying.

## Contract

Each profile contains:

- `profile.json` with its ID, purpose, and file mappings;
- `AGENTS.md` with scoped operational instructions;
- `files/` with additive files rendered during application;
- a README describing prerequisites, boundaries, and verification.

Profile application:

1. requires an initialized project;
2. renders project-name, slug, description, and current-date tokens;
3. preflights every target;
4. refuses any differing existing target;
5. writes only after the full preflight passes;
6. records the profile in `.starter/project.json`;
7. copies its agent instructions to `.starter/addenda/`.

## Commands

```sh
bun scripts/project-starter.ts profile list
bun scripts/project-starter.ts profile plan bun-typescript
bun scripts/project-starter.ts profile apply bun-typescript
```

`list` and `plan` are read-only. `apply` changes local files only.

## Catalog

| Profile | Adds |
|---|---|
| `bun-library` | Private pure-ESM package, tsdown build, tests, and explicit exports |
| `bun-typescript` | Strict TypeScript, Biome, Oxlint, and real verification scripts |
| `cloudflare` | Wrangler baseline, deploy contract, and read-only live probe |
| `data-automation` | Durable run ledger, provenance, and last-known-good publication |
| `docs-spec` | Open questions, progressive retrieval, privacy, and route proof |
| `ui-browser` | UX framing, accessibility, browser isolation, and visual evidence |
| `wordpress` | WPCS, PHP verification, managed-host safety, and release evidence |
