# Google App Starter

- `Tease:` Clone once; build a new runnable app with every prompt.
- `Lede:` This Bun and TypeScript monorepo gives Antigravity a shared Google-aligned control plane,
  an embedded one-shot build skill, and isolated `apps/<slug>` workspaces with app-scoped Firebase
  Hosting configuration.
- `Why it matters:`
  - The default path needs no billing account, database, Terraform state, or dashboard setup.
  - Agents can preserve several demo results in one checkout instead of rebuilding the root app.
  - Cloud commands must name both the exact app and project before a mutation.
- `Go deeper:`
  - Follow the five-minute local start below.
  - Read the [cloud operations guide](docs/operations/google-cloud.md) before creating a project.
  - Read the [research](docs/research/firebase-gcp-agent-provisioning-2026-08-03.md) and
    [architecture decision](docs/decisions/project-per-environment-google-starter-2026-08-03.md)
    before adding infrastructure.
  - Read the [Google engineering profile](docs/research/google-public-engineering-conventions-2026-08-03.md)
    before changing repository conventions.

## Clone and start

Prerequisite: [Bun](https://bun.sh/) 1.3.14, or use the tools pinned in `mise.toml`.

```sh
git clone https://github.com/techlahoma/google-app-starter.git
cd google-app-starter
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
# 1. Preview the ignored local configuration file after replacing both TODO values.
bun run google:config plan \
  --app example-crm \
  --project-id TODO-your-unique-project-id \
  --display-name "TODO Your App Name"

# 2. Write the local file using the same real values.
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
