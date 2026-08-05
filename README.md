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
  - Use the [Intro to GDG event hub](docs/events/README.md) and
    [one-shot Antigravity prompts](docs/events/antigravity-one-shot-prompts.md).
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

## Intro to GDG event materials

This starter is the public build workspace for Techlahoma's **Intro to Google Developer Group**
workshop with GDG Tulsa. These attendee-safe resources are public:

- [Event handout and resource hub](docs/events/README.md)
- [Copy-ready Antigravity demo prompts](docs/events/antigravity-one-shot-prompts.md)
- [Live event page](https://luma.com/j0vrcn5h)
- [GDG Tulsa chapter](https://gdg.community.dev/gdg-tulsa/)
- [Techlahoma Code of Conduct](https://www.techlahoma.org/code-of-conduct/)

The working presentation is intentionally not linked here until its Google Drive sharing setting is
public. A public repository link should work for attendees without requesting access.

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

Create another app without touching the existing workspaces:

```sh
bun run app:create plan --name example-crm --title "Example CRM"
bun run app:create apply --name example-crm --title "Example CRM"
bun run --cwd apps/example-crm dev
```

`plan` is read-only. `apply` refuses an existing target and creates the app from
`templates/vite-app`. The repository keeps one lockfile while each app owns its source, tests,
package metadata, TypeScript config, and Firebase Hosting config.

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

Choose the app workspace and a globally unique Google Cloud project ID. Keep `-dev`, `-preview`, or
`-prod` in the ID so the environment is obvious. The commands below use `example-crm`; replace it
and every TODO value before running a command.

```sh
# 1. Option A: Copy .env.example to .env and configure environment variables:
#    cp .env.example .env
#    (Set FIREBASE_PROJECT_ID & FIREBASE_DISPLAY_NAME in .env)
#
# Option B: Or pass flags explicitly:
bun run google:config plan \
  --app example-crm \
  --project-id TODO-your-unique-project-id \
  --display-name "TODO Your App Name"

# 2. Write the local app configuration file.
bun run google:config apply \
  --app example-crm \
  --project-id TODO-your-unique-project-id \
  --display-name "TODO Your App Name"

# 3. Authenticate once. This opens Google's login flow and changes local CLI auth state.
bun run firebase:login

# 4. Preview the exact remote creation operation.
bun run google:provision plan --app example-crm

# 5. Create the project only after reviewing the plan.
bun run google:provision apply --app example-crm --confirm TODO-your-unique-project-id

# 6. Preview and then perform a Hosting-only deployment.
bun run google:deploy plan --app example-crm
bun run google:deploy apply --app example-crm --confirm TODO-your-unique-project-id
```

The commands do not create or link a billing account. Each `apps/<slug>/google.project.json` is
ignored, no `.firebaserc` is used, and every Firebase command receives an explicit app and project.

## Tear the environment down

The cleanest starter environment boundary is the whole Google Cloud project. Teardown therefore
requires the Google Cloud CLI and deletes that exact project:

```sh
bun run google:destroy plan --app example-crm
bun run google:destroy apply --app example-crm --confirm TODO-your-unique-project-id
```

Deletion is destructive. Export anything durable first. Google may provide a limited recovery
window, but the starter does not treat that window as a backup.

## Complexity ladder

| Level | Add when | Google products | Infrastructure approach |
|---|---|---|---|
| 0 — generated app | A static site or SPA is enough | Firebase Hosting | App-local config plus pinned root Firebase CLI |
| 1 — app data | The product needs identity or shared records | Firebase Auth, Firestore, Emulator Suite | Add only the selected Firebase features and rules |
| 2 — server work | A trusted API, job, or long-running request is necessary | Cloud Run, Cloud Tasks, Secret Manager | Billing and explicit service enablement become required |
| 3 — platform | Multiple environments or services drift across a team | Google Cloud resources | Terraform/OpenTofu modules plus remote state and CI federation |

Do not pre-install the next level. Each level has a real operational cost and a separate decision
boundary.

## Agent contract

- Run `bun run google:doctor --app <slug>` for a local, read-only readiness report.
- Run `plan` before every `apply`.
- Pass `--app <slug>` to every Google lifecycle command.
- Never infer a project from Firebase or gcloud's global defaults.
- Never link billing, enable APIs, create credentials, deploy, or delete a project without explicit
  authority for that effect.
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
