# Opinionated Starter Kernel

- `Tease:` Project discipline without a framework choice.
- `Lede:` The starter supplies contracts, safety rules, guardrails, durable-doc
  patterns, repository settings, and opt-in profiles while leaving product
  runtime decisions to each project.
- `Why it matters:`
  - The durable defaults are the valuable shared layer across otherwise
    different projects.
  - Profiles prevent stack-specific assumptions from bloating every new repo.
- `Go deeper:`
  - Read the accepted architecture decision.
  - Use the plan for implementation and verification history.

## Start here

- Plan and progress:
  [`plans/opinionated-repository-kernel-2026-07-29.md`](plans/opinionated-repository-kernel-2026-07-29.md)
- Architecture defaults:
  [`decisions/scale-to-zero-and-durable-defaults-2026-07-29.md`](decisions/scale-to-zero-and-durable-defaults-2026-07-29.md)
- Baseline updates:
  [`baseline-updates.md`](baseline-updates.md)
- Bun, Anthony Fu, and community-template research:
  [`research/bun-anthony-fu-community-templates-2026-07-30.md`](research/bun-anthony-fu-community-templates-2026-07-30.md)
- Bun control-plane implementation:
  [`plans/bun-control-plane-and-community-templates-2026-07-30.md`](plans/bun-control-plane-and-community-templates-2026-07-30.md)
- Repository settings:
  [`../operations/repository-settings.md`](../operations/repository-settings.md)
- Project contract: [`../../PROJECT.md`](../../PROJECT.md)
- Profile catalog: [`../../profiles/README.md`](../../profiles/README.md)

## Boundary

The kernel owns repository-operating behavior. Profiles own runtime- or
platform-specific guidance. Product code remains project-specific.
