# Data Automation Profile

- `Tease:` Unattended jobs should fail safely without creating an inbox.
- `Lede:` This profile adds a durable run-ledger schema, a dependency-free
  validator, and an operations contract for provenance, idempotency,
  last-known-good publication, and bounded recovery.
- `Why it matters:`
  - A fresh fetch does not prove a healthy publication.
  - Partial or ambiguous data should not silently replace stronger known-good
    output.
- `Go deeper:`
  - Choose the real durable store before implementation.
  - Define automatic suppression and reconsideration before scheduling.

## Adds

- `schemas/run-ledger.schema.json`
- `scripts/validate-run-ledger.py`
- `docs/operations/data-automation.md`
- active agent guidance under `.starter/addenda/`

The schema defines evidence, not sample results. No fabricated run record is
included.
