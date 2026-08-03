# Opinionated Repository Kernel

- `Tease:` Encode Sam's working style as defaults and checks.
- `Lede:` Build a language-neutral core with explicit authority, data integrity,
  durable workflow, executable guardrails, additive profiles, and a safe
  baseline-update path.
- `Why it matters:`
  - Mature projects should not have to rediscover the same boundaries after
    every scaffold.
  - Executable checks reduce reliance on prompt memory.
- `Go deeper:`
  - The implementation is divided into independently verifiable slices.
  - Publication remains a separate effect.

Date: 2026-07-29

## Goal

A generated repository should answer, without chat:

1. What are we building and for whom?
2. What is in scope, not in scope, and still unknown?
3. Where does important state live?
4. Which commands prove the project?
5. Which commands mutate local or external state?
6. What has actually been changed, committed, pushed, deployed, and
   live-verified?

## Scope

- P0 project and authority contracts;
- Scale-to-zero and Durable architecture defaults;
- local and CI guardrails;
- PR evidence, CODEOWNERS, security policy, and repository settings recipe;
- P1 durable-doc templates, automation contract, and baseline provenance;
- P2 opt-in Bun/TypeScript, Cloudflare, data-automation, docs-spec, UI/browser,
  and WordPress profiles.

## Non-goals

- choosing an application framework in the core;
- automatically pushing, deploying, or mutating repository settings;
- auto-applying baseline updates over project-specific changes;
- creating fake machine capability endpoints;
- creating a standing dependency-PR or human-review inbox.

## Progress

### Slice 1: Core contracts and durable docs

- Status: complete
- Proof required: document structure review and `git diff --check`
- Evidence: required contracts, workflow, ADR, conventions, and templates are
  present; `git diff --check` passed.

### Slice 2: Guardrails and repository settings

- Status: complete
- Proof required: local verification, control-plane tests, shell syntax, workflow
  validation, and settings-plan dry run
- Evidence: local verification and ten unit tests passed. The read-only settings
  plan correctly resolved the target and exposed that private repository
  rulesets are unavailable on the current GitHub plan; the tooling now treats
  that as a documented capability gap while preserving independent
  least-privilege Actions settings.

### Slice 3: Provenance and profile framework

- Status: complete
- Proof required: idempotency and conflict tests
- Evidence: profile application is plan-first, refuses collisions, applies
  atomically, and is idempotent. Baseline audit distinguishes safe additions and
  updates from project-owned changes and refuses dirty sources and conflicts.

### Slice 4: Runtime profiles

- Status: complete
- Proof required: manifest validation and profile-application tests for every
  profile
- Evidence: Bun/TypeScript, Cloudflare, data-automation, docs-spec, UI/browser,
  and WordPress profiles all apply to a temporary initialized project, pass
  structural verification, and reapply without changes.

### Slice 5: Final review

- Status: complete
- Proof required: full verification, complete diff review, and explicit local
  handoff
- Evidence: the initial 72-path baseline passed structural verification, ten unit
  tests, the complete `prek` hook suite, Actionlint, ShellCheck, a whole-tree
  Gitleaks scan, provenance self-audit, and `git diff --check`. Review confirmed
  that only task-scoped local files changed; nothing was staged, committed,
  pushed, deployed, or applied to repository settings.
