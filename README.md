# Techlahoma Google Apps Starter

- `Tease:` Oklahoma's public launchpad for building small Google-powered apps with agents.
- `Lede:` [Techlahoma](https://www.techlahoma.org/) maintains this Bun and TypeScript monorepo so
  Antigravity can turn one prompt into one isolated, runnable `apps/<slug>` project with a
  Google-aligned control plane and app-scoped Firebase Hosting configuration.
- `Why it matters:`
  - The default path needs no billing account, database, Terraform state, or dashboard setup.
  - Agents can preserve several demo results in one checkout instead of rebuilding the root app.
  - Cloud commands must name both the exact app and project before a mutation.
- `Go deeper:`
  - Follow the five-minute local start below.
  - Open the [GDG Tulsa Builder Kit in Notion](https://app.notion.com/p/samcarltoncreative/GDG-Tulsa-Builder-Kit-3b2012b9b02081eebdc7dea8c5cbd69f),
    use the [public event handout](docs/events/README.md), or jump to the
    [complete resource directory](#gdg-tulsa-builder-kit) at the bottom of this README.
  - Read the [cloud operations guide](docs/operations/google-cloud.md) before creating a project.
  - Read the [research](docs/research/firebase-gcp-agent-provisioning-2026-08-03.md) and
    [architecture decision](docs/decisions/project-per-environment-google-starter-2026-08-03.md)
    before adding infrastructure.
  - Read the [Google engineering profile](docs/research/google-public-engineering-conventions-2026-08-03.md)
    before changing repository conventions.

<p align="center">
  <a href="https://www.techlahoma.org/">
    <img src="apps/welcome/public/techlahoma-logo-black-transparent.png" alt="Techlahoma" width="360" />
  </a>
</p>

## Table of contents

- [Intro to GDG workshop links](#intro-to-gdg-workshop-links)
- [Clone and start](#clone-and-start)
- [Fork setup](#fork-setup)
- [One-prompt demo builds](#one-prompt-demo-builds)
- [What Google-aligned means](#what-google-aligned-means)
- [Put it on Firebase Hosting](#put-it-on-firebase-hosting)
  - [Protection and safety](#protection-and-safety)
  - [Advanced lifecycle commands](#advanced-lifecycle-commands)
- [Tear the environment down](#tear-the-environment-down)
- [Complexity ladder](#complexity-ladder)
- [Agent contract](#agent-contract)
- [About Techlahoma](#about-techlahoma)
- [GDG Tulsa Builder Kit](#gdg-tulsa-builder-kit)

## Intro to GDG workshop links

This starter is the public build workspace for Techlahoma's **Intro to Google Developer Group**
workshop with GDG Tulsa. Start with the public repository handout or directory; the linked Notion
kit may require a Notion session:

- [GDG Tulsa Builder Kit in Notion](https://app.notion.com/p/samcarltoncreative/GDG-Tulsa-Builder-Kit-3b2012b9b02081eebdc7dea8c5cbd69f)
- [Public event handout in this repository](docs/events/README.md)
- [Complete README resource directory](#gdg-tulsa-builder-kit)

The working presentation is intentionally not linked here until its Google Drive sharing setting is
public. The resource directory at the bottom preserves its attendee-relevant links and safety
guidance without exposing the private deck.

## Clone and start

Prerequisite: [Bun](https://bun.sh/) 1.3.14, or use the tools pinned in `mise.toml`.

```sh
git clone https://github.com/techlahoma/techlahoma-google-apps-starter.git
cd techlahoma-google-apps-starter
bun install --frozen-lockfile
bun run dev
```

The root `dev` command launches the known-good `apps/welcome` workspace. It runs without a Google
account.

## Fork setup

Local development works without changing any account-specific values. Before enabling repository
ownership or Firebase deployment in a fork, replace these examples with values owned by that fork:

1. Update the repository identity and expected branch-ruleset name in `.starter/project.json`.
2. Replace `@YOUR-GITHUB-USERNAME` in `.github/CODEOWNERS` with a GitHub user or organization team
   that has write access, then uncomment the ownership rules you want GitHub to enforce.
3. Create the ignored local Firebase binding with the fork's immutable project ID and display name:

   ```sh
   bun run google:config plan --project-id YOUR_PROJECT_ID --display-name "Your Project Name"
   bun run google:config apply --project-id YOUR_PROJECT_ID --display-name "Your Project Name"
   ```

4. Run `bun run google:doctor` and a deployment `--dry-run` before any remote change. After an
   authorized deployment, replace the app README's unconfigured live-demo note with the verified
   Hosting URL.

The tracked `.env.example` and `google.project.example.json` files are templates. Their uppercase
`REPLACE_WITH_*` values are deliberately invalid so setup fails until they are replaced. Do not
commit the real `.env`, `google.project.json`, Firebase CLI authentication, ADC credentials, or
service-account keys.

Create another app without touching the existing workspaces:

```sh
bun run app:create plan --name example-crm --title "Example CRM"
bun run app:create apply --name example-crm --title "Example CRM"
bun run --cwd apps/example-crm dev
```

`plan` is read-only. `apply` refuses an existing target and creates the app from
`templates/vite-app`. The repository keeps one lockfile while each app owns its source, tests,
package metadata, TypeScript config, `app.contract.json`, and Firebase Hosting config.

### App verification workflow

Distinguish between app compilation (`check`) and app completion (`verify`):

```sh
bun run --cwd apps/example-crm check            # App typecheck, unit tests, and production build
bun run app:browser:verify --app example-crm   # Shared Playwright browser verification
bun run app:verify --app example-crm           # Full completion check (contract, markers, policy, tests, browser)
bun run agent:finish --changed                 # Verify all changed app workspaces
```

## One-prompt demo builds

Open the cloned repository as the Antigravity workspace, then paste one of the demo prompts. The
repository includes the workspace skill
[`build-and-launch-demo`](.agents/skills/build-and-launch-demo/SKILL.md). Compatible coding agents
should use it automatically to create one unused `apps/<slug>` workspace, build the complete local
artifact, verify it in the browser, launch its development server, and return the app path plus usable
local URL without stopping for intermediate approval.

The skill permits local work only. A one-prompt build does not authorize GitHub changes, Google
Cloud provisioning, authentication, deployment, publication, or deletion.

Verify the production build, tests, formatting, lint, types, starter contract, and shell scripts:

```sh
bash scripts/verify.sh
```

Use `bun run format` to apply GTS to TypeScript and Biome to JSON, HTML, and CSS.
Run `bun run audit:dependencies` for the current registry-backed vulnerability report; its known
upstream Firebase CLI exception is documented in the verification record.

## What “Google-aligned” means

- TypeScript uses [GTS](https://github.com/google/gts), maintained by Google's Node.js team, with
  its published Prettier settings and strict compiler base.
- HTML and CSS follow Google's public guidance on semantics, accessibility, and separating
  structure, presentation, and behavior.
- The contribution workflow favors small self-contained changes, tests with behavior, and concise
  documentation beside the code.
- Exact dependency versions, a committed lockfile, and one local/CI verification command preserve
  reproducibility.

It does not claim to reproduce Google's internal monorepo or build environment, and GTS itself is
not an official Google product. Bazel, enterprise cloud foundations, and Google open-source legal
boilerplate are intentionally outside this Level 0 starter. The complete rationale is in
the [research](docs/research/google-public-engineering-conventions-2026-08-03.md) and
[decision](docs/decisions/google-public-engineering-conventions-2026-08-03.md).

## Put it on Firebase Hosting

Deploy your app workspace to Firebase Hosting with one simple command:

```sh
bun run deploy
```

Running without arguments opens an interactive terminal picker showing discovered app workspaces, active project settings, and destination URLs.

You can also deploy directly by specifying an app slug or workspace directory:

```sh
bun run deploy numeronym-generator
bun run deploy apps/numeronym-generator
bun run deploy ./apps/numeronym-generator
```

Additional options:

```sh
bun run deploy --all                    # Build and deploy all discovered apps sequentially
bun run deploy numeronym-generator --dry-run  # Preview deployment targets without mutating
bun run deploy numeronym-generator --yes      # Deploy unattended without interactive confirmation
bun run deploy numeronym-generator --json     # Output machine-readable JSON deployment receipts
```

### Protection and Safety

- **Default Site Protection**: Deployments will never modify your primary default Hosting site (`projectId.web.app`). Each app is automatically assigned a dedicated secondary Hosting site.
- **First-Run Setup**: Interactive execution guides login, connects an existing Firebase project, provisions secondary sites, and updates local configuration.
- **Build Preflight**: Local builds run before remote deployment. For `--all`, every app is built before the first site is updated.
- **Receipt & Live Verification**: Successful deployments query Firebase Hosting metadata, display the public URL and console links, and verify HTTP responsiveness.

### Advanced lifecycle commands

For advanced granular control or project teardown, low-level lifecycle commands remain available:

```sh
# Destroy a single Hosting site without touching the project
bun run google:sites:destroy plan --app welcome

# Destroy the whole shared project (destructive operation)
bun run google:destroy plan
```

## Tear the environment down

Delete a single Hosting site without deleting the shared project:

```sh
bun run google:sites:destroy plan --app welcome
bun run google:sites:destroy apply --app welcome --confirm YOUR_PROJECT_ID
```

To delete the entire shared Google Cloud project:

```sh
bun run google:destroy plan
bun run google:destroy apply --confirm YOUR_PROJECT_ID
```

Deletion is destructive. Export anything durable first. Google may provide a limited recovery window, but the starter does not treat that window as a backup.

## Complexity ladder

| Level | Add when | Google products | Infrastructure approach |
|---|---|---|---|
| 0 — generated app | A static site or SPA is enough | Firebase Hosting | Root shared config plus pinned root Firebase CLI |
| 1 — app data | The product needs identity or shared records | Firebase Auth, Firestore, Emulator Suite | Add only the selected Firebase features and rules |
| 2 — server work | A trusted API, job, or long-running request is necessary | Cloud Run, Cloud Tasks, Secret Manager | Billing and explicit service enablement become required |
| 3 — platform | Multiple environments or services drift across a team | Google Cloud resources | Terraform/OpenTofu modules plus remote state and CI federation |

Do not pre-install the next level. Each level has a real operational cost and a separate decision boundary.

## Agent contract

- Run `bun run google:doctor` for a local, read-only readiness report.
- Run `plan` before every `apply`.
- Never infer a project from Firebase or gcloud's global defaults.
- Never link billing, enable APIs, create credentials, deploy, or delete a project without explicit authority for that effect.
- Prefer Application Default Credentials locally and Workload Identity Federation in CI; do not
  create long-lived service-account keys.

The complete command/effect table and current proof live in [`PROJECT.md`](PROJECT.md).

## About Techlahoma

[Techlahoma](https://www.techlahoma.org/) is an Oklahoma technology community nonprofit. Find a
[user group](https://www.techlahoma.org/user-groups/), join the
[Techlahoma Slack](https://www.techlahoma.org/techlahoma-slack/), or
[contact the organization](https://www.techlahoma.org/contact-us/) to get involved.

This is a Techlahoma community project, not an official Google product. GDG Tulsa is an independent
Google Developer Group; its activities and opinions are not affiliated with or endorsed by Google.

## GDG Tulsa Builder Kit

This is the complete public resource directory for the Intro to Google Developer Group workshop.
The same links are maintained in the
[GDG Tulsa Builder Kit in Notion](https://app.notion.com/p/samcarltoncreative/GDG-Tulsa-Builder-Kit-3b2012b9b02081eebdc7dea8c5cbd69f).

### Start here

- [Techlahoma Google Apps Starter repository](https://github.com/techlahoma/techlahoma-google-apps-starter)
- [Public event handout and resource hub](docs/events/README.md)
- [Download Google Antigravity for macOS or Windows](https://antigravity.google/download)
- [Copy-ready Antigravity demo prompts](docs/events/antigravity-one-shot-prompts.md)
- [Intro to Google Developer Group event page](https://luma.com/j0vrcn5h)
- [Follow Techlahoma Events on Luma for future events, newsletters, and reminders](https://luma.com/calendar/cal-CNuOfIVzrRIe4AC)
- [Official GDG Tulsa chapter](https://gdg.community.dev/gdg-tulsa/)

### Build with Google

- [Open Google AI Studio](https://aistudio.google.com/)
- [AI Studio Build mode guide](https://ai.google.dev/gemini-api/docs/aistudio-build-mode)
- [Deploy an app from AI Studio](https://ai.google.dev/gemini-api/docs/aistudio-deploying)
- [Google Cloud Starter Tier](https://docs.cloud.google.com/docs/starter-tier)
- [Cloud Run Button](https://github.com/GoogleCloudPlatform/cloud-run-button)

### Stay connected

- [GDG Tulsa community website](https://gdgtulsa.com/) — browse community information here; use the
  [official GDG Tulsa chapter](https://gdg.community.dev/gdg-tulsa/) for official membership and
  event registration
- [GDG Tulsa on Instagram](https://www.instagram.com/gdgtulsa/)
- [Techlahoma](https://www.techlahoma.org/)
- [Techlahoma user groups](https://www.techlahoma.org/user-groups/)
- [Techlahoma on LinkedIn](https://www.linkedin.com/company/techlahoma-foundation/)
- [Techlahoma on GitHub](https://github.com/techlahoma)
- [Techlahoma membership and Slack access](https://www.techlahoma.org/memberships/)
- [Join Techlahoma Slack directly](https://www.techlahoma.org/techlahoma-slack/) and open
  `#ug-google` for GDG Tulsa questions, event links, and follow-up
- [Techlahoma talks on YouTube](https://www.youtube.com/@Techlahoma)

### Community standards

- [Techlahoma Code of Conduct](https://www.techlahoma.org/code-of-conduct/)
- [Google Event Community Guidelines and Anti-Harassment Policy](https://developers.google.com/community-guidelines)

Both standards apply. Talk to a volunteer immediately when it is safe to do so if you experience or
observe a problem.

### Build responsibly

- Use invented demo data. Do not paste private customer, employee, donor, health, financial, or
  personal records into a live build.
- A working first version is not automatically production-ready. Real use may require
  authentication, authorization, privacy review, accessibility checks, tests, cost controls,
  monitoring, backups, and maintenance ownership.
- Take one artifact from the workshop, show it to one person, and try a second version within seven
  days. Bring back what worked, what broke, and what assumption changed.

### Coming next

The August 2026 workshop slide plan lists **OklahomAI Google Edition** as planned for September 23,
2026 at 6 PM. The public [Techlahoma Events calendar](https://luma.com/calendar/cal-CNuOfIVzrRIe4AC)
does not yet confirm the event, so treat the date as planned and follow the calendar for the
authoritative registration link, schedule, and venue when they are published.

[Luma documents calendar Follow](https://help.luma.com/p/discovering-events) as the public signup for
a calendar's events, newsletters, and reminders, so this directory does not invent a second “blast
signup” URL.
