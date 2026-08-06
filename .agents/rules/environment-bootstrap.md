# Environment Bootstrap Rule

Before invoking project commands, confirm that the workspace has the exact Bun version declared in `package.json` and that Git is available. If either prerequisite is missing or the machine appears newly configured, follow [the bootstrap skill](../skills/bootstrap-workspace/SKILL.md) and the [fresh-machine guide](../../docs/operations/fresh-machine-setup.md).

- Use native PowerShell on Windows and the built-in terminal on macOS. Never require WSL, Git Bash, Homebrew, Node, npm, or a global Firebase CLI for the basic local path.
- Diagnose first. Installing a system tool, using administrator elevation, changing `PATH`, or changing a PowerShell execution policy requires explicit authority unless the user's prompt specifically authorizes machine bootstrap.
- Prefer official, user-local installers and the repository's exact versions. Preserve the mise `minimum_release_age` policy when mise manages optional contributor tools.
- Never weaken TLS, certificate validation, antivirus, firewall, proxy, or execution-policy protections to make setup pass.
- After Bun is available, run `bun run setup:doctor`, then `bun install --frozen-lockfile`. Install the pinned Playwright browser with `bun run browser:install` only when browser verification is needed.
- If setup remains blocked, report the OS, architecture, missing prerequisite, attempted official path, and exact error without printing secrets or machine inventories.
