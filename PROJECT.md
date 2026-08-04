# Project Contract

- `Tease:` One operational source of truth for Google App Starter.
- `Lede:` The project is an active, static-first Bun monorepo with generated app workspaces,
  public-Google-aligned engineering conventions, and an app-scoped Firebase lifecycle; no Google
  Cloud project has been created or deployed.
- `Why it matters:`
  - Humans and agents can begin locally without reconstructing Google Cloud dashboard state.
  - Local edits, authentication, provisioning, deployment, deletion, and live verification remain
    distinct effects.
- `Go deeper:`
  - Start with [`README.md`](README.md).
  - Use [`docs/operations/google-cloud.md`](docs/operations/google-cloud.md) for cloud work.
  - Revisit the architecture decision before adding paid or stateful services.

## Status

- Lifecycle: `active`
- Current objective: let Antigravity create and launch isolated demo apps under `apps/` from one prompt
- Next decision or action: review and publish the verified monorepo refactor when explicitly authorized
- Last verified revision: local monorepo worktree based on public revision `f3f6036`
- Last verified at: 2026-08-04

## User and problem

- Primary user: developers and coding agents building several small Google-hosted app experiments
- Problem: Firebase and Google Cloud are powerful, but dashboard setup, global CLI state, billing,
  and premature infrastructure code make a new experiment harder to start and remove.
- Desired outcome: clone once, generate independent apps with one shared toolchain, and use explicit
  app-scoped plan/apply commands without dashboard configuration

## Current scope

### In scope

- Bun workspaces with Vite and strict TypeScript static apps under `apps/<slug>`
- Safe additive app generator and reusable app template
- GTS TypeScript style, semantic HTML, and public Google change-review practices
- Firebase Hosting configuration on the no-billing Spark path
- Project-local, exact-version Firebase CLI
- Ignored app-local project configuration with one project per app environment
- Read-only doctor and plan commands
- Exact project-ID confirmation for provision, deploy, and whole-project deletion
- Source-backed research, operating guide, tests, and production build

### Non-goals

- Firebase Auth, Firestore, Cloud Functions, Cloud Run, or other runtime services
- Billing account creation or linkage
- Terraform, OpenTofu, Pulumi, or remote infrastructure state
- Creating a cloud project, app registration, or deployment
- Hiding Google Cloud costs or destructive effects behind a generic command

### Success proof

- `bun install --frozen-lockfile` resolves the pinned toolchain.
- `bash scripts/verify.sh` validates the starter contract, format, lint, types, tests, and build.
- `bun run app:create plan` names the exact new app path without writing it.
- `bun run google:doctor --app welcome` reports app-scoped readiness without a cloud request.
- Lifecycle plan commands name their effect, exact target, commands, and limitations.
- Apply commands refuse a missing or mismatched `--confirm` value before a remote call.

## Known unknowns

| Question | Why it matters | Resolution path | Blocking? |
|---|---|---|---|
| Which Google account, organization, and real project ID will own an environment? | Ownership and policy differ by account | Choose them when provisioning is explicitly authorized | No for local work; yes for provisioning |
| Does a future product need identity, durable records, or trusted server code? | The answer determines the next Firebase or Cloud Run service | Make a product-level decision before moving up the complexity ladder | No |
| Will a team or CI manage multiple Google resources? | This is the adoption trigger for remote IaC state and federated CI auth | Re-evaluate Terraform/OpenTofu and Workload Identity Federation at that point | No |

## Architecture contract

- Scale-to-zero: satisfied; the default deployment is static Firebase Hosting with no application
  compute
- Durable state: the starter has no runtime application state
- Authoritative inputs: Git-tracked app source, app-local `firebase.json`, root lockfile, and project docs
- Durable state stores: Git for source; a future Google Cloud project only after provisioning
- Reproducible or disposable state: `node_modules/`, `dist/`, Firebase emulator state, and the entire
  development cloud project unless the product later declares durable data
- Last-known-good output: a prior Git revision rebuilt and redeployed to Hosting
- Documented exceptions: none

See
[`docs/decisions/project-per-environment-google-starter-2026-08-03.md`](docs/decisions/project-per-environment-google-starter-2026-08-03.md).

## Source-of-truth map

| Concern | Canonical location |
|---|---|
| Product intent and operational status | `PROJECT.md` |
| Human onboarding | `README.md` |
| Agent rules | `AGENTS.md` and `.starter/addenda/` |
| One-prompt local demo workflow | `.agents/skills/build-and-launch-demo/` |
| Runnable apps | `apps/<slug>/` |
| App seed | `templates/vite-app/` |
| App generator | `scripts/create-app.ts` and `scripts/create-app-lib.ts` |
| Contribution workflow | `CONTRIBUTING.md` |
| Hosting configuration | `apps/<slug>/firebase.json` |
| Local target project | ignored `apps/<slug>/google.project.json` |
| Project-config schema example | `apps/<slug>/google.project.example.json` |
| Cloud lifecycle implementation | `scripts/google-cloud.ts` and `scripts/google-cloud-lib.ts` |
| Engineering-convention research | `docs/research/google-public-engineering-conventions-2026-08-03.md` |
| Cloud lifecycle research | `docs/research/firebase-gcp-agent-provisioning-2026-08-03.md` |
| Engineering-convention decision | `docs/decisions/google-public-engineering-conventions-2026-08-03.md` |
| Operations | `docs/operations/google-cloud.md` |
| Verification evidence | `docs/verification/google-app-starter-2026-08-03.md` |
| Monorepo verification evidence | `docs/verification/app-workspace-monorepo-2026-08-04.md` |
| Runtime data | none in the starter |

## Commands and effects

| Command | Effect | Target | Required authority | Proof |
|---|---|---|---|---|
| `bun run dev` | local runtime | `apps/welcome` Vite server | none | local page loads |
| `bun run app:create plan --name APP --title TITLE` | read-only | proposed `apps/APP` workspace | none | JSON plan |
| `bun run app:create apply --name APP --title TITLE` | local-write | new `apps/APP` workspace | local-edit authority | generated files and app check |
| `bun run --cwd apps/APP dev` | local runtime | selected app | none | local page loads |
| `bun run format` | local-write | TypeScript, JSON, HTML, and CSS source | local-edit authority | clean format check |
| `bun run audit:dependencies` | read-only network query | locked dependency graph | none | current advisory report |
| `bash scripts/verify.sh` | read-only except disposable build output | local checkout | none | exit status and output |
| `bun run google:doctor --app APP` | read-only | selected app, local tools, and ignored config | none | JSON report |
| `bun run google:config plan --app APP --project-id ID --display-name NAME` | read-only | proposed app config | none | JSON plan |
| `bun run google:config apply --app APP --project-id ID --display-name NAME` | local-write | ignored app config | local-edit authority | written and validated file |
| `bun run firebase:login` | local auth plus browser flow | Firebase CLI credential store | explicit authentication intent | CLI login result |
| `bun run google:provision plan --app APP` | read-only | app's named Google/Firebase project | none | JSON plan |
| `bun run google:provision apply --app APP --confirm ID` | remote-write | app's named Google/Firebase project | explicit provisioning authority | CLI result plus project query |
| `bun run google:deploy plan --app APP` | read-only | selected app and Firebase Hosting site | none | JSON plan |
| `bun run google:deploy apply --app APP --confirm ID` | deploy | selected app and Firebase Hosting site | explicit deployment authority | CLI result plus live URL check |
| `bun run google:destroy plan --app APP` | read-only | entire app environment project | none | JSON plan |
| `bun run google:destroy apply --app APP --confirm ID` | destructive remote-write | entire app environment project | explicit deletion authority | gcloud result plus project-state query |

## Environments and publication

| Environment | Host or account | Deploy command | Rollback | Live verification |
|---|---|---|---|---|
| local | developer machine | `bun run --cwd apps/APP dev` | stop process | local browser or HTTP check |
| development | not provisioned | `bun run google:deploy apply --app APP --confirm ID` | rebuild and redeploy a prior Git revision | Firebase Hosting URL check |

There is no deploy-on-push workflow in the starter.

The source host is the public GitHub template repository
`Techlahoma/google-app-starter`. Repository publication is separate from Firebase Hosting or Google
Cloud deployment.

## Sensitive-data boundary

- Data categories handled: public static source and generated assets only
- Data that must remain local: Firebase CLI authentication, ADC credentials, and any future secrets
- Safe publication surface: built static assets that contain no secret material
- Retention and deletion contract: generated output is disposable; future runtime data requires a
  documented export and retention contract before service adoption

## Active profiles

The machine-readable active-profile list is `.starter/project.json`.

- `bun-typescript`

## Handoff

- Changed locally: yes
- Committed locally: no
- Pushed: no
- Deployed: no
- Live-verified: no
- Remaining risk or gap: authenticated provisioning, deployment, and deletion are intentionally
  untested because no cloud-side effects were authorized; the verified refactor is not committed or
  pushed
