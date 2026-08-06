# Relationship Workbench Prompt Publication Plan

- `Tease:` Publish the tested transcript-conditioned CRM prompt without touching unrelated work.
- `Lede:` A generated `apps/relationship-workbench` scaffold will own the canonical prompt, with
  supporting research, evaluation evidence, and public discovery links.
- `Why it matters:` A clean branch from current `origin/main` keeps the prompt reviewable and keeps
  the shared dirty checkout out of the commit.
- `Go deeper:` The app remains explicitly `scaffold` until Antigravity runs the prompt and proves the
  completed database and browser contract.

- **Date:** 2026-08-06 (America/Chicago)
- **Branch:** `codex/relationship-workbench-prompt`
- **Base:** `origin/main` at `68637bc534795271de62789d38f61b7ef1b7c526`
- **Status:** published to GitHub review branch
- **App commit:** `861c3f5bbedfc7ca1c9e24038388cadfa5401333`
- **Remote receipt:** `git ls-remote` matched the app commit on
  `refs/heads/codex/relationship-workbench-prompt` at 2026-08-06 17:21 CDT

## Scope

- Generate `apps/relationship-workbench` through the repository's plan/apply workflow.
- Make its `PROMPT.md` the canonical paste-ready artifact.
- Keep generated starter source and `app.contract.json` at `scaffold` for the future build.
- Add source-backed design research, low-reasoning evaluation evidence, and README links.
- Validate the scaffold, documentation, repository, staged diff, commit, and exact remote branch.

## Progress

- [x] Baseline setup doctor passed before and after locked dependency installation.
- [x] Baseline `bun run verify` passed with pre-existing non-failing CSS warnings.
- [x] App creation plan resolved only `apps/relationship-workbench`.
- [x] App scaffold generated additively.
- [x] Canonical prompt and supporting documents added.
- [x] App check and desktop/phone scaffold browser verification passed after the changes.
- [x] Repository `bun run verify` passed after one app-local formatting correction.
- [x] Touched-file `prek` guardrails and staged Gitleaks review passed.
- [x] Exact branch push and remote app-commit verification passed.
