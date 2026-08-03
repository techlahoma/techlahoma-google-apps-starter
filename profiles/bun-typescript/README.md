# Bun and TypeScript Profile

- `Tease:` Strict, boring TypeScript with fast feedback.
- `Lede:` This profile adds a minimal Bun package, strict TypeScript, Biome
  formatting/linting, and Oxlint correctness checks without choosing an
  application framework.
- `Why it matters:`
  - Agents perform better when the repository gives fast deterministic
    feedback.
  - Framework selection remains a project decision.
- `Go deeper:`
  - Add real development, test, and build commands when the product stack is
    chosen.
  - Keep the lockfile and use frozen installs.

## Adds

- `bunfig.toml` with disabled implicit installs, isolated linking, and Bun's
  global virtual store;
- `package.json`
- `tsconfig.json`
- `biome.json`
- `.oxlintrc.json`
- active agent guidance under `.starter/addenda/`

The package deliberately has no fake `dev`, `test`, or `build` script. Add each
only when it runs a real project check.

The root package declares `apps/*` and `packages/*` workspaces so additional
packages can share one lockfile and one repository owner. A nested tool that
must be independently runnable should also carry its own `bunfig.toml`; do not
give it a competing workspace lockfile.

## Verification

```sh
bun install
bun run verify
```

After the first real lockfile exists, use `bun install --frozen-lockfile`.
