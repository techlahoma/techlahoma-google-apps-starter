# Bun and TypeScript Profile Instructions

- Read `package.json`, `tsconfig.json`, `eslint.config.cjs`, `biome.json`, and
  `.prettierrc.json` before changing TypeScript or JavaScript.
- Prefer strict, straightforward TypeScript over clever type machinery.
- Validate untrusted inputs at boundaries and use `unknown` plus narrowing
  instead of `any`.
- Keep exported interfaces explicit about inputs, outputs, and failures.
- Isolate side effects at the edge and keep domain decisions in small,
  independently testable functions where practical.
- Prefer behavioral tests over mock-heavy tests. Never weaken a real test to
  make generated code pass.
- GTS is the TypeScript style authority. Biome owns only the configured JSON,
  JSONC, HTML, and CSS surfaces; do not configure the tools to overlap.
- Run `bun run verify` after touched TypeScript, JavaScript, JSON, HTML, or CSS.
- Add real `test` and `build` scripts when the project has those capabilities;
  never add a no-op script to satisfy a checklist.
- Install from the lockfile with `bun install --frozen-lockfile` after the
  lockfile has been established.
- Keep `[install].linker = "isolated"` and `globalStore = true` in the
  project-local `bunfig.toml` unless a documented compatibility problem
  requires a project-specific exception.
