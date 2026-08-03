# Bun Library Profile

- `Tease:` A small pure-ESM package inside the repository.
- `Lede:` This profile creates an independently runnable Bun library package
  with strict TypeScript, tsdown packaging, explicit exports, tests, and no
  release automation.
- `Why it matters:`
  - A package can be added to an app-oriented repository without nesting a
    second monorepo or taking over the root toolchain.
  - The package stays private until publication is separately designed and
    authorized.
- `Go deeper:`
  - Apply the profile after initialization.
  - Replace the generated package-identity export with the first real public
    API.

## Adds

- `packages/library/package.json` with pure-ESM exports and explicit scripts;
- local isolated/global-store Bun configuration;
- strict TypeScript and tsdown configuration;
- a real smoke test for the generated package identity;
- scoped agent guidance copied to `.starter/addenda/bun-library.md`.

## Commands

```sh
bun install --cwd packages/library
bun run --cwd packages/library verify
```

After the first trusted install writes `bun.lock`, use
`bun install --frozen-lockfile` in CI.

## Boundary

This profile does not add npm credentials, make the package public, create a
release workflow, tag a version, or publish an artifact.
