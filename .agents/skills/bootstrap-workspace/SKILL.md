---
name: bootstrap-workspace
description: Diagnose and prepare a fresh native Windows or Apple Silicon macOS machine to run this repository when Git, Bun, project dependencies, or the Playwright browser are missing. Use for first-time setup, command-not-found failures, PATH problems, clean-machine workshop onboarding, or requests to bootstrap the workspace without assuming WSL or Homebrew.
---

# Bootstrap the Workspace

Prepare only the tools required for the user's requested local outcome. Read [`docs/operations/fresh-machine-setup.md`](../../../docs/operations/fresh-machine-setup.md) before installing anything.

## Diagnose before changing the machine

1. Identify the native OS version, architecture, active shell, repository path, and whether `.git` exists.
2. Check `git --version` and `bun --version`. Read the required Bun version from root `package.json`; do not guess or install `latest`.
3. If Bun works, run `bun run setup:doctor` before installing dependencies. Use `--json` when machine-readable output helps. Do not use `--network` unless a network diagnosis is needed.
4. Separate missing required tools from optional contributor tools. The basic local path needs Git, the pinned Bun version, locked dependencies, and optionally the pinned Playwright Chromium browser.

## Installation authority

- A normal app-build prompt authorizes repository-local dependency installation from `bun.lock`; it does not authorize machine-wide software installation, administrator elevation, `PATH` mutation, or execution-policy changes.
- If the user explicitly authorizes machine bootstrap, prefer official user-local installers. Explain the target and effect before any administrator prompt or machine-wide change.
- Never install WSL, Homebrew, Chocolatey, Scoop, Node, npm, a global Firebase CLI, or a global Playwright package solely for this repository.
- Never use `Set-ExecutionPolicy Unrestricted`, disable security software, bypass TLS or certificate validation, or weaken a corporate proxy. Report a policy blocker instead.
- Do not configure global Git identity unless the user intends to commit and supplies or confirms the identity.

## Native platform paths

- **Windows:** Stay in PowerShell. Use the official Git for Windows installer or the documented WinGet package when authorized. Use Bun's official versioned PowerShell installer. Do not route `bash` to WSL.
- **macOS:** This Antigravity workshop path requires Apple Silicon and macOS 13 or later. `git --version` may offer Apple's Command Line Tools. Use Bun's official versioned installer without installing Homebrew.
- Restart the terminal or Antigravity after an installer changes the user `PATH`, then verify the executable and exact version.

## Finish the repository setup

1. Prefer a short, user-owned Windows path such as `C:\src\techlahoma-google-apps-starter`.
2. Run `bun install --frozen-lockfile` from the repository root.
3. Run `bun run setup:doctor` again and resolve required failures.
4. Run `bun run browser:install` only when the task needs browser verification; disclose that it downloads a browser and uses additional disk space.
5. Run `bun run verify`. On native Windows, Unix-only shell checks may be reported as CI-enforced gaps, but all cross-platform application checks must run.
6. Report what was installed, whether it was user-local or system-wide, version evidence, any terminal restart, checks completed, and remaining optional tools or blocked proof.
