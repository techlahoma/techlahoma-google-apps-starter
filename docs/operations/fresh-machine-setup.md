# Fresh-Machine Setup

- `Tease:` Start the workshop on native Windows or macOS without reconstructing a developer workstation.
- `Lede:` The basic local path needs Git, Bun `1.3.14`, the locked repository dependencies, and a Playwright browser only for browser verification.
- `Why it matters:` New developers and Antigravity should not guess at package managers, require WSL or Homebrew, or weaken machine security to run one static app.
- `Go deeper:` Run `bun run setup:doctor` after Bun is available, then follow the exact next action it reports.

## Supported workshop path

| Platform | Effective minimum | Native shell | Not required |
|---|---|---|---|
| Windows | Windows 10 64-bit, version 1809 or later | PowerShell | WSL, Git Bash, Node, npm |
| macOS | Apple Silicon with macOS 13 or later | zsh or the Antigravity terminal | Homebrew, Node, npm |

These requirements combine [Antigravity's supported platforms](https://antigravity.google/docs/ide-getting-started) with [Bun's runtime requirements](https://bun.sh/docs/installation). Linux remains supported for development and CI, but it is not the primary workshop onboarding path in this guide.

## Authority and safety

Checking versions is read-only. Installing Git or Bun, accepting an administrator prompt, changing `PATH`, or changing PowerShell policy mutates the machine and requires explicit user authority unless the user has specifically asked to bootstrap it.

- Prefer official, user-local installers.
- Do not install WSL or Homebrew solely for this repository.
- Do not install a global Firebase CLI; the repository owns its pinned CLI.
- Do not disable TLS validation, certificates, antivirus, firewall, or corporate proxy controls.
- Do not use `Set-ExecutionPolicy Unrestricted`.
- Do not set global Git name or email merely to clone and run the project.

## Native Windows with PowerShell

Open a normal, non-administrator PowerShell window.

### 1. Install Git only if it is missing

```powershell
git --version
```

If that fails, use the [official Git for Windows installer](https://git-scm.com/install/windows). On Windows installations that already provide WinGet, this official package is also available:

```powershell
winget install --id Git.Git -e --source winget
```

WinGet is delivered through Windows App Installer on supported Windows versions. Do not install another package manager just to obtain Git. Restart PowerShell after installation and rerun `git --version`.

### 2. Install the exact Bun version only if it is missing or different

```powershell
bun --version
```

When machine bootstrap is authorized, Bun's official versioned PowerShell installer is:

```powershell
iex "& {$(irm https://bun.com/install.ps1)} -Version 1.3.14"
```

Restart PowerShell or Antigravity, then verify `bun --version` prints `1.3.14`. If the binary works by its full path but not by name, follow Bun's [Windows PATH guidance](https://bun.sh/docs/installation) rather than changing system-wide variables blindly.

### 3. Clone into a short user-owned path

```powershell
New-Item -ItemType Directory -Force C:\src
Set-Location C:\src
git clone https://github.com/techlahoma/techlahoma-google-apps-starter.git
Set-Location techlahoma-google-apps-starter
bun run setup:doctor
bun install --frozen-lockfile
bun run setup:doctor
bun run dev
```

A short path reduces the chance of Windows tooling encountering legacy path-length limits. Downloading a ZIP can run the welcome app, but Git-backed changed-app discovery and the normal contribution workflow will be unavailable.

## Apple Silicon macOS without Homebrew

Open Terminal or Antigravity's terminal.

### 1. Install Git only if it is missing

```sh
git --version
```

macOS may offer to install Apple's Command Line Tools. Complete that system prompt and rerun the command. Git also documents an [official macOS installer path](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git). Homebrew is optional, not a prerequisite.

### 2. Install the exact Bun version only if needed

```sh
bun --version
```

When machine bootstrap is authorized, use Bun's official versioned installer:

```sh
curl -fsSL https://bun.com/install | bash -s "bun-v1.3.14"
```

Open a new terminal and confirm `bun --version` prints `1.3.14`. Follow Bun's official PATH instructions if the new terminal still cannot find it.

### 3. Clone and start

```sh
git clone https://github.com/techlahoma/techlahoma-google-apps-starter.git
cd techlahoma-google-apps-starter
bun run setup:doctor
bun install --frozen-lockfile
bun run setup:doctor
bun run dev
```

## Browser verification

The basic welcome app does not require Playwright. Before running an app completion check, install the browser owned by the pinned local Playwright package:

```sh
bun run browser:install
bun run app:verify --app numeronym-generator
```

Playwright browser downloads use network access and several hundred megabytes of cache. See [Playwright's browser documentation](https://playwright.dev/docs/browsers) for supported proxy environment variables. Do not replace the pinned command with a global or unpinned `npx`/`bunx` install.

## Optional contributor tools

`mise.toml` pins actionlint, Gitleaks, prek, and shellcheck and retains a seven-day minimum release age. Mise is optional for starting the app. Contributors who want the complete local toolchain can follow [mise's native installation guide](https://mise.jdx.dev/installing-mise.html), trust this repository deliberately, run `mise install`, and then rerun `bun run setup:doctor`.

On native Windows, mise uses Windows shims; WSL is not required. Unix shell syntax remains enforced in Linux CI even when Bash and shellcheck are not installed locally.

## Troubleshooting boundaries

- Use `bun run setup:doctor --json` for machine-readable results.
- Use `bun run setup:doctor --network` only when diagnosing GitHub or npm-registry access.
- If a corporate proxy intercepts browser downloads, configure the documented proxy and certificate variables. Do not disable certificate validation.
- If an installer requires administrator elevation, stop and obtain approval rather than silently elevating.
- Firebase authentication, project creation, billing, and deployment are not part of local setup. Read [`google-cloud.md`](google-cloud.md) only after that separate effect is authorized.
