# Fresh-machine bootstrap verification

- `Tease:` A first-time contributor can diagnose this repository before changing their machine.
- `Lede:` The candidate setup patch passed the full repository check and a real Playwright app verification from a clean Apple Silicon macOS clone using the exact pinned Bun and lockfile.
- `Why it matters:` Native Windows and macOS paths now share one read-only doctor and one Bun-based verification command instead of relying on an agent to invent WSL, Homebrew, Bash, or global-tool prerequisites.
- `Go deeper:` Local macOS proof is complete below. Native Windows and macOS CI jobs are the revision-specific remote proof after publication; they are not represented here as already run.

## Scope

- Source checkout: clean local clone of committed `main` at `65e804c627c34e3aaeceeab8775e902a9372000f`, with only the fresh-machine bootstrap candidate patch applied.
- Host: Apple Silicon macOS, Darwin kernel `25.5.0`.
- Runtime: Bun `1.3.14` and the committed root lockfile.
- Date: 2026-08-06 (America/Chicago).
- Windows evidence: pure platform-policy tests plus the committed `windows-latest` CI job. No local Windows execution is claimed.

## Evidence

| Command | Result | What it proved |
|---|---|---|
| `bun install --frozen-lockfile` | Pass; no lockfile changes | A clean clone installs from the committed dependency graph. |
| `bun run setup:doctor` | Pass; 0 failures, 0 warnings, 2 optional notes, 12 passes | Required macOS platform, Git, Bun, checkout, write access, dependencies, line endings, and browser checks are usable; absent optional contributor tools do not block onboarding. |
| `bun run verify` | Pass | Starter contract, formatting, lint, strict types, 68 root tests, and every committed app check/build passed through the cross-platform Bun entrypoint. Existing CSS lint warnings remained warnings. |
| `bun run app:verify --app numeronym-generator` | Pass | The reference app passed its contract, scaffold, dependency, type, unit, build, and Playwright checks at desktop `1440x900` and phone `390x844`, with clean console and requests. |
| `bun test tests/setup-doctor.test.ts` | Pass; 4 tests | Windows 10 build and 64-bit policy, no-WSL behavior, exact Bun parsing, and Apple Silicon macOS policy are covered as pure logic. |
| `mise exec -- actionlint` | Pass | The expanded GitHub Actions workflow is structurally valid before publication. |
| `mise exec -- shellcheck scripts/verify.sh scripts/hooks/gitleaks-staged` | Pass | The optional Unix wrapper and existing staged-secret hook remain shellcheck-clean. |

## Remote proof boundary

Pushing the patch triggers GitHub Actions jobs on Linux plus a portability matrix on `windows-latest` and `macos-latest`. Those runs will execute the locked install, environment doctor, cross-platform repository verification, pinned Chromium install, and reference-app browser verifier. A successful local push does not by itself prove those remote jobs passed, and this record must not be read as a deployment or live-site verification.

## Known limits

- The local Windows policy test cannot substitute for execution on a real Windows runner.
- Network reachability is opt-in through `bun run setup:doctor --network`; the default doctor stays local and deterministic.
- Playwright browser installation writes to the local browser cache and may require network access. It is an explicit command, not a side effect of the read-only doctor.
- A primary worktree containing unrelated in-progress app edits may fail whole-repository formatting. The clean-clone result above isolates this patch from those unrelated edits.
