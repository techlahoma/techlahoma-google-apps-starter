# Repository Agent Instructions

## Start here

- Read `PROJECT.md` before planning or changing the project.
- Read the nearest scoped `AGENTS.md` before touching a subdirectory.
- Read every active profile instruction under `.starter/addenda/`.
- Treat the README as the human entrypoint and `PROJECT.md` as the operational
  contract. Keep both accurate.
- If required context is absent, record the unknown instead of guessing.

## Using this starter

- This repository is the public Techlahoma baseline for small Google-aligned app experiments.
- When the user has authorized creating a new project or repository and has not
  chosen another scaffold, start from this GitHub template.
- This preference does not independently authorize creating a remote
  repository, pushing, deploying, publishing, sending messages, or changing
  visibility.
- In an existing repository, inspect its instructions and configuration first,
  then merge this baseline additively.
- Preserve stronger or project-specific rules. Never overwrite an existing
  `AGENTS.md`, README, `.gitignore`, `.editorconfig`, pull-request template,
  toolchain, license, or CI configuration wholesale.
- Merge ignore patterns and add only missing guidance. If policies conflict,
  repository-specific policy wins and material conflicts must be surfaced for
  review.

## External action authority

- Inspection, audit, explanation, diagnosis, and review are read-only unless
  the user requests a durable local artifact.
- Edit, fix, and build requests authorize task-scoped local file changes and
  relevant validation.
- Branch creation, staging, committing, pushing, pull-request changes,
  deployment, publication, merge, repository-setting changes, and external
  messages are separate effects. Perform only effects the user explicitly
  requests or the necessary prerequisites of an explicitly named terminal
  outcome.
- A successful check, build, commit, or push never grants authority for the next
  external effect.
- Resolve the exact repository, branch, environment, host, audience, and
  deploy-on-push behavior before any authorized external action.

## Change safety

- Inspect `git status --short --branch` and the relevant diff before changing or
  staging files.
- Preserve unrelated user changes. Stage explicit paths when the worktree is
  mixed; never default to `git add -A`.
- If the primary checkout is dirty or divergent and isolation is useful, work
  from a clean task-specific worktree based on the intended upstream ref.
- Do not force-push, reset, rebase, delete, or overwrite unrelated work to
  simplify the task.
- Treat local changes, local commits, pushed commits, deployed artifacts, and
  live verification as distinct states. Report only states actually verified.

## Data integrity

- Never invent, guess, fabricate, or placeholder-fill results, metrics,
  verdicts, dates, quotes, citations, identifiers, or example records and
  present them as real.
- Get data from the real source, generate it with a reproducible process and
  recorded provenance, or ask the user.
- Mark unavoidable placeholders unmistakably with `TODO`, `[ask Sam]`, or
  `PLACEHOLDER`. A placeholder must never make a check appear to pass.
- Record the source, retrieval or generation time, transformation, and
  limitations for consequential data.
- Preserve raw inputs separately from derived output when the project handles
  imports, feeds, scans, evaluations, or customer data.

## Architecture defaults

- Default to **Scale-to-zero**: idle application compute should stop and incur no
  compute charge. Prefer static, request-driven, event-driven, scheduled-exit,
  or idle-capable managed services.
- Default to **Durable**: important state and outputs must survive cold starts,
  restarts, redeploys, and chat resets. Memory, temporary files,
  container-local disk, and chat are not sources of truth.
- Durability does not require a database when the state is stateless or
  reproducible from authoritative inputs.
- Do not claim an existing component satisfies these defaults until its runtime,
  storage, recovery, and publication behavior have been inspected.
- Document every exception with its reason, active-versus-disposable boundary,
  cost or data-loss boundary, recovery/shutdown path, and review trigger.

## Monorepo app boundary

- The repository root is the shared control plane; runnable demos belong under `apps/<slug>/`.
- Use `bun run app:create plan` followed by `app:create apply` to create a workspace additively.
- Never place a generated app in the root or overwrite an existing `apps/<slug>` directory.
- Keep app dependencies declared in that app package and preserve the single root lockfile.
- Read `apps/AGENTS.md` before changing an app workspace.
- For unattended automation, prefer idempotent runs, resumable durable state,
  bounded retries, deterministic publication gates, automatic suppression or
  reconsideration, and last-known-good preservation. Do not create a standing
  human-review inbox by default.

## Durable workflow

- Keep durable state in repository files, not chat.
- Use the compact loop: research -> plan -> task -> proof -> checkpoint ->
  continue, recommend, or stop.
- Store ongoing plan and progress in the same dated plan file.
- Record what was actually tested, the environment and revision tested, the
  result, and any remaining gap.
- Use the smallest useful document set. Do not create empty folder scaffolding.
- Human-facing Markdown documents start with a Smart Brevity Core 4 block:
  `Tease`, `Lede`, `Why it matters`, and `Go deeper`.
- Use:
  - `docs/research/<topic>-YYYY-MM-DD.md` for source-backed findings;
  - `docs/plans/<topic>-YYYY-MM-DD.md` for plan and progress;
  - `docs/decisions/<topic>-YYYY-MM-DD.md` for Nygard ADRs;
  - `docs/verification/<topic>-YYYY-MM-DD.md` for durable proof;
  - `docs/<initiative>/` when one initiative needs a stable README and multiple
    document types.

## Commands and effects

- Prefer command names that reveal their effect:
  - `check`, `audit`, `plan`, `preview`, and `verify` are read-only;
  - `fix` and `apply` mutate local files;
  - `publish`, `deploy`, `send`, `merge`, and `push` mutate external state.
- Read-only commands must not silently mutate files or remote state.
- Mutating scripts must resolve and print their targets, support a read-only
  plan when practical, and require an explicit apply verb or flag.
- Document every externally mutating command and its postcondition in
  `PROJECT.md`.

## Validation

- Run the narrowest useful checks after each logical increment.
- Before an authorized commit or push, run the project verification command and
  the touched-file `prek` guardrails.
- Never bypass tests, `prek`, Gitleaks, release-age policy, or repository
  guardrails to make a change appear complete.
- If a tool is unavailable, distinguish that verification gap from a code
  failure and report the exact missing proof.
- Behavioral, accessibility, data-integrity, security, and live checks are
  separate evidence. One does not substitute for another.

## Public Google engineering profile

- Use GTS as the authoritative TypeScript formatter and linter. Run
  `bun run format` to apply it and `bun run lint` to check it.
- Keep the published GTS Prettier settings and extend its TypeScript base.
  Preserve the explicit Vite, browser, Bun, and no-emit overrides in
  `tsconfig.json` unless the runtime actually changes.
- Use Biome only for the configured JSON, JSONC, HTML, and CSS surfaces. Do not
  configure two formatters or linters to compete over TypeScript.
- Prefer strict types, semantic HTML, accessible controls, and separation of
  structure, presentation, and behavior.
- Keep changes small and self-contained. Tests and relevant documentation travel
  with behavioral or interface changes.
- Treat the research and ADR under `docs/` as the source for what “Google-aligned”
  means here. Do not claim that public guidance reproduces Google's internal
  environment or that this is an official Google project.

## Commits and branches

- Use small, logical Conventional Commits: `type(optional-scope): summary`.
- Stage only files owned by the current task.
- Prefer short-lived branches or isolated worktrees when a branch is required.
- Do not infer commit, push, PR, merge, or deploy authority from local changes.
- Before an authorized commit, inspect the staged diff and run the relevant
  project checks plus `prek`.

## Secrets, privacy, and local state

- Never print, inspect, commit, or transmit secrets from environment files.
- Keep credentials in the platform secret store and commit only safe examples.
- Treat personal contact data, financial figures, customer identifiers,
  negotiation details, machine inventories, runtime caches, and raw exports as
  sensitive unless the project explicitly defines a safe publication path.
- For material that may be shared, omit sensitive details and use `[ask Sam]`
  rather than guessing what is safe.

## Tool installation security

- Treat mise `minimum_release_age` and `--minimum-release-age` as supply-chain
  security controls.
- Never bypass, reduce, or override the configured minimum release age unless
  the user explicitly asks.
- Prefer lockfiles, exact tool versions, immutable release artifacts, and
  full-length commit SHAs for GitHub Actions.

## Active profiles

- Profiles are opt-in. Their source lives under `profiles/`; active profile
  instructions are copied to `.starter/addenda/`.
- Apply profiles through `bun scripts/project-starter.ts profile plan ...`
  followed by the explicit `profile apply` command.
- Profile application is additive and must refuse conflicting existing files.
- Project-specific rules override profile rules. Preserve and report material
  conflicts rather than silently choosing.

## Google Cloud lifecycle

- Keep the Level 0 starter on Firebase Hosting without billing. Do not add a
  database, authentication, server runtime, API enablement, billing linkage, or
  infrastructure framework until a concrete product requirement calls for it.
- Use the pinned project-local Firebase CLI. Do not replace it with an unpinned
  `npx`, `bunx`, or global installation in repository commands.
- Never create or commit `.firebaserc`. Resolve the ignored root
  `google.project.json`, pass explicit project and site IDs, and pass the exact project ID to every
  remote command.
- Run a lifecycle `plan` before `apply`. Provision, deploy, billing linkage,
  credential creation, and whole-project deletion are separate external effects
  and require their own authority.
- Never mutate Firebase or gcloud's global default project as a shortcut.
- Treat `destroy apply` as deletion of the entire environment. Confirm exports
  and durable-data boundaries before it runs.
- Prefer local user authentication or Application Default Credentials for
  development and Workload Identity Federation for CI. Do not create or store
  long-lived service-account keys.
- If the Firebase MCP server is enabled, pin it to this repository's CLI,
  restrict its tool groups to the task, and preserve the same plan/apply and
  external-authority boundaries.

## Browser automation on managed macOS

- Never take over the user's existing Firefox windows or tabs. Create and use a
  dedicated Firefox window for the task, and close only that window.
- Do not launch installed Chrome or Chromium binaries from `node_repl`.
- Use the bundled browser integration for interactive work. Run project-owned
  Playwright suites through their repository command.

## GitHub authentication on managed macOS

- A sandboxed `gh auth status` may not see credentials stored in macOS Keychain
  and may incorrectly report an old token as invalid.
- If sandboxed `gh auth status` fails, rerun it once with narrowly scoped host
  access before starting device login.
- Treat the host result as authoritative for Keychain-backed authentication.
- Never expose credentials or run `gh auth status --show-token`.

## GitHub publication verification

- Do not claim a repository was published merely because a local commit exists.
- After a push, verify the remote URL, branch tracking, and matching local and
  remote commit IDs.
- For private repositories, query GitHub and verify private visibility before
  reporting success.
- For a new repository, also verify its default branch and required ruleset.
