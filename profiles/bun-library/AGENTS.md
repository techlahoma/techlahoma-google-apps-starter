# Bun Library Profile

- Keep the package pure ESM and expose public entry points explicitly.
- Prefer explicit relative imports; do not add path aliases or auto-imports by
  default.
- Keep focused source files, extract shared types, and comment on why rather
  than narrating code.
- Treat changes to `exports`, generated declarations, and package files as
  public-API changes even while the package is private.
- Run install and verification from `packages/library` unless a root Bun
  workspace has adopted the package.
- Keep `private: true` until publication has separate explicit approval,
  provenance, and release verification.
