# Data Automation Profile Instructions

- A fetch, normalization, validation, publication, and live consumer check are
  separate states.
- Store run state, checkpoints, input provenance, output hashes, and publication
  decisions durably.
- Make runs idempotent and resumable. Bound retries and record terminal failure.
- Validate the complete candidate before publication. Prefer rejecting one bad
  publication over partially replacing a stronger last-known-good artifact.
- Preserve stronger source provenance when sources disagree.
- Suppress bad or ambiguous inputs automatically and reconsider them when their
  source evidence changes. Do not create a default human-review queue.
- Never generate plausible records, verdicts, dates, or metrics to fill missing
  inputs.
- Scheduled work must exit when complete and scale to zero between runs.
- Record the actual run ledger and validation output before calling automation
  healthy.
