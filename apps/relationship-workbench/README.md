# Relationship Workbench

- `Tease:` One business interview becomes one thoughtful, browser-local CRM.
- `Lede:` This scaffold owns the tested [Antigravity build prompt](PROMPT.md); append a Granola
  transcript and submit the complete prompt to build the customized app in this directory.
- `Why it matters:` The prompt fixes persistence and proof while deriving the operator's language,
  workflow, fields, next actions, and visual character from the interview.
- `Go deeper:` Read the [design research](../../docs/research/transcript-crm-design-2026-08-06.md)
  and [low-reasoning evaluation](../../docs/verification/transcript-crm-prompt-evaluation-2026-08-06.md).

## Build from an interview

1. Record a business-discovery conversation in Granola.
2. Open [PROMPT.md](PROMPT.md) and replace only the transcript placeholder between its source
   markers.
3. Paste the entire resulting prompt into Antigravity with this repository open.
4. Let the agent build, verify, inspect, and launch the app without intermediate prompting.

Install the optional Antigravity skill pack before the timed session, not during it. The exact
commands and authority boundaries are included in the prompt.

## Current state

This directory is intentionally a generated `scaffold`, not a completed CRM. Its starter source
exists only so the repository recognizes a valid app workspace. The prompt tells Antigravity to
replace that source, keep the contract at `scaffold` while building, and set it to `complete` only
after the database, browser, visual, and source receipts pass.

## Verification after the build

```sh
bun run --cwd apps/relationship-workbench check
bun run app:browser:verify --app relationship-workbench
bun run app:verify --app relationship-workbench
```

The demo stores fictional records in PGlite's browser IndexedDB. Firebase Hosting may later serve
the static bundle, but it does not make those records shared or authenticated. Neither this prompt
kit nor a local build authorizes commit, push, deployment, provisioning, or real customer data.
