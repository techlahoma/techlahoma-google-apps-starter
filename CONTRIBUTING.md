# Contributing

- `Tease:` Keep changes small, tested, and easy to understand.
- `Lede:` This starter adapts Google's public engineering guidance to a small Bun and Firebase
  repository. Read the project contract, make one self-contained change, and run the complete local
  verification before requesting review.
- `Why it matters:`
  - Small changes are faster to review and safer to revert.
  - Tests and documentation should travel with the code they explain.
- `Go deeper:`
  - Start with [`PROJECT.md`](PROJECT.md) and [`AGENTS.md`](AGENTS.md).
  - Read the [Google alignment research](docs/research/google-public-engineering-conventions-2026-08-03.md).

## Local workflow

If Git or Bun may be missing, begin with the
[fresh-machine setup guide](docs/operations/fresh-machine-setup.md). The basic Windows path uses
native PowerShell without WSL; the macOS path does not require Homebrew.

```sh
bun run setup:doctor
bun install --frozen-lockfile
bun run setup:doctor
bun run dev
```

Before committing:

```sh
bun run verify
bun run prek run --all-files
```

Use `bun run format` to apply the repository's formatters. TypeScript is checked by GTS; JSON,
JSONC, HTML, and CSS are checked by Biome.

## Change expectations

- Make one self-contained change at a time. Include tests when behavior changes.
- Keep the build green and update the README or operational docs when the interface changes.
- Use Conventional Commits: `type(optional-scope): summary`.
- Prefer semantic HTML, accessible controls, strict TypeScript, and explicit data boundaries.
- Keep dependency versions exact and preserve the configured seven-day minimum release age.
- Never add credentials, service-account keys, `.firebaserc`, or a real `google.project.json`.
- Plan a cloud operation before applying it. Creating a GitHub repository does not authorize
  Firebase provisioning, billing, deployment, or project deletion.

## Public Google references

- [Google Engineering Practices: small changes](https://google.github.io/eng-practices/review/developer/small-cls.html)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html)
- [Google documentation best practices](https://google.github.io/styleguide/docguide/best_practices.html)

These are public references, not evidence that this repository reproduces Google's internal build
environment or is an official Google project.
