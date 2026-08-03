# Default Projects to Scale-to-zero and Durable

- `Tease:` Stop idle compute; preserve important state.
- `Lede:` New projects default to Scale-to-zero compute and Durable state, with
  explicit documented exceptions when always-on or disposable behavior is
  genuinely required.
- `Why it matters:`
  - Unnecessary always-on infrastructure creates recurring cost and operational
    work.
  - Ephemeral state silently disappears during the exact restart, redeploy, or
    unattended run where it matters.
- `Go deeper:`
  - Existing components remain unverified until inspected.
  - Exceptions must expose their cost, loss, and recovery boundaries.

Date: 2026-07-29

## Status

Accepted

## Context

Projects range from static sites and request-driven services to scheduled data
automation and stateful applications. Without a default, agents may select
always-on infrastructure for convenience or treat memory, temporary disk, or
chat as durable state. Both choices create hidden operational risk.

## Decision

We will default application compute to Scale-to-zero and important project state
to Durable.

Scale-to-zero means idle application compute stops and incurs no compute charge.
Static delivery, request-driven functions, event-driven workers, scheduled jobs
that exit, and managed idle-capable services satisfy the intent.

Durable means important inputs, state, outputs, provenance, and recovery
checkpoints survive cold starts, restarts, redeploys, and chat resets. A
stateless or reproducible component can satisfy this decision without a
database.

We will not claim an existing component complies until its actual runtime,
storage, failure, and recovery behavior are inspected.

Every exception must document:

- why the component cannot use the default;
- which parts are always active and which are disposable;
- the idle-cost boundary;
- the data-loss boundary;
- recovery, shutdown, and rollback behavior;
- the trigger and owner for reconsidering the exception.

Unattended automation must also be idempotent where practical, preserve the
last-known-good publication, record durable run state and provenance, bound
retries, and automatically suppress or reconsider bad inputs without creating a
default human-review queue.

## Consequences

- Infrastructure choices require an explicit operational contract.
- Ephemeral storage can still be used for reproducible scratch work.
- Some always-on systems will need accepted exceptions.
- Validation must distinguish policy intent from verified implementation.
- New projects begin with lower recurring cost and clearer recovery behavior.
