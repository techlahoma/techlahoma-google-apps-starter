# Data Automation Operations

- `Tease:` Publish complete evidence or preserve the last-known-good output.
- `Lede:` __PROJECT_NAME__ automation must be resumable, idempotent,
  provenance-preserving, and able to suppress bad inputs without creating a
  standing review queue.
- `Why it matters:`
  - Successful retrieval does not prove valid normalization or publication.
  - Unattended failures need deterministic recovery.
- `Go deeper:`
  - Complete the contract before enabling a schedule.
  - Validate every durable run ledger.

## Trigger and exit

- Trigger: `PLACEHOLDER`
- Maximum runtime: `PLACEHOLDER`
- Scale-to-zero exit: `PLACEHOLDER`

## Durable state

- Run-ledger store: `PLACEHOLDER`
- Resume checkpoint: `PLACEHOLDER`
- Authoritative output: `PLACEHOLDER`
- Last-known-good output: `PLACEHOLDER`
- Reproducible scratch state: `PLACEHOLDER`

## Publication

- Candidate validation: `PLACEHOLDER`
- Atomic publication: `PLACEHOLDER`
- Whole-publication rejection rule: `PLACEHOLDER`
- Suppression and reconsideration: `PLACEHOLDER`
- Rollback or recovery: `PLACEHOLDER`

## Verification

```sh
python3 scripts/validate-run-ledger.py PATH_TO_REAL_LEDGER.json
```

Do not add an illustrative ledger that could be mistaken for a real run.
