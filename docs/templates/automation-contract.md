# TODO: Automation Contract

- `Tease:` TODO: unattended job and the decision it supports.
- `Lede:` TODO: inputs, durable outputs, and publication boundary.
- `Why it matters:`
  - TODO: cost, reliability, or data-integrity consequence.
- `Go deeper:`
  - TODO: runbook, implementation, or verification link.

Date: YYYY-MM-DD

## Trigger and exit

- Trigger: TODO: event or schedule
- Scale-to-zero behavior: TODO: how the process exits when idle or complete
- Maximum runtime: TODO

## Inputs and provenance

| Input | Authority | Retrieval | Freshness | Failure behavior |
|---|---|---|---|---|
| TODO | TODO | TODO | TODO | TODO |

## Durable state

- Run ledger: TODO
- Checkpoint or resume key: TODO
- Authoritative output: TODO
- Last-known-good output: TODO
- Scratch or disposable state: TODO

## Idempotency and retries

- Idempotency key: TODO
- Retry budget and backoff: TODO
- Duplicate-run behavior: TODO
- Partial-failure recovery: TODO

## Publication gate

- Validation: TODO
- Atomic publication method: TODO
- Bad-input suppression or reconsideration: TODO
- Rollback: TODO

The default must not create a standing human-review queue. If human review is
an accepted exception, document the trigger, owner, expiry, and fallback.

## Observability

- Success signal: TODO
- Failure signal: TODO
- Provenance recorded: TODO
- Sensitive-data redaction: TODO
