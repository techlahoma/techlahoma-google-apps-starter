# Project Contract

- `Tease:` One operational source of truth for Google App Starter.
- `Lede:` The project is an active, static-first Firebase starter with a locally verified app,
  public-Google-aligned engineering conventions, and a guarded cloud lifecycle; no Google Cloud
  project has been created or deployed.
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
- Current objective: provide the smallest reproducible Google-hosted web-app starting point
- Next decision or action: choose a real project ID only when a cloud environment is needed
- Last verified revision: initial GitHub publication pending
- Last verified at: 2026-08-03

## User and problem

- Primary user: developers and coding agents starting a small Google-hosted web app
- Problem: Firebase and Google Cloud are powerful, but dashboard setup, global CLI state, billing,
  and premature infrastructure code make a new experiment harder to start and remove.
- Desired outcome: one local install and build path, followed by explicit plan/apply commands that
  can create, deploy, and delete a named environment without dashboard configuration

## Current scope

### In scope

- Vite and strict TypeScript static app
- GTS TypeScript style, semantic HTML, and public Google change-review practices
- Firebase Hosting configuration on the no-billing Spark path
- Project-local, exact-version Firebase CLI
- Ignored local project configuration with one project per environment
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
- `bun run google:doctor` reports readiness without a cloud request.
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
- Authoritative inputs: Git-tracked source, `firebase.json`, lockfile, and project docs
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
| Contribution workflow | `CONTRIBUTING.md` |
| Hosting configuration | `firebase.json` |
| Local target project | ignored `google.project.json` |
| Project-config schema example | `google.project.example.json` |
| Cloud lifecycle implementation | `scripts/google-cloud.ts` and `scripts/google-cloud-lib.ts` |
| Engineering-convention research | `docs/research/google-public-engineering-conventions-2026-08-03.md` |
| Cloud lifecycle research | `docs/research/firebase-gcp-agent-provisioning-2026-08-03.md` |
| Engineering-convention decision | `docs/decisions/google-public-engineering-conventions-2026-08-03.md` |
| Operations | `docs/operations/google-cloud.md` |
| Verification evidence | `docs/verification/google-app-starter-2026-08-03.md` |
| Runtime data | none in the starter |

## Commands and effects

| Command | Effect | Target | Required authority | Proof |
|---|---|---|---|---|
| `bun run dev` | local runtime | Vite development server | none | local page loads |
| `bun run format` | local-write | TypeScript, JSON, HTML, and CSS source | local-edit authority | clean format check |
| `bun run audit:dependencies` | read-only network query | locked dependency graph | none | current advisory report |
| `bash scripts/verify.sh` | read-only except disposable build output | local checkout | none | exit status and output |
| `bun run google:doctor` | read-only | local tools and ignored config | none | JSON report |
| `bun run google:config plan --project-id ID --display-name NAME` | read-only | proposed local config | none | JSON plan |
| `bun run google:config apply --project-id ID --display-name NAME` | local-write | ignored `google.project.json` | local-edit authority | written and validated file |
| `bun run firebase:login` | local auth plus browser flow | Firebase CLI credential store | explicit authentication intent | CLI login result |
| `bun run google:provision plan` | read-only | named Google/Firebase project | none | JSON plan |
| `bun run google:provision apply --confirm ID` | remote-write | named Google/Firebase project | explicit provisioning authority | CLI result plus project query |
| `bun run google:deploy plan` | read-only | named Firebase Hosting site | none | JSON plan |
| `bun run google:deploy apply --confirm ID` | deploy | named Firebase Hosting site | explicit deployment authority | CLI result plus live URL check |
| `bun run google:destroy plan` | read-only | entire named Google Cloud project | none | JSON plan |
| `bun run google:destroy apply --confirm ID` | destructive remote-write | entire named Google Cloud project | explicit deletion authority | gcloud result plus project-state query |

## Environments and publication

| Environment | Host or account | Deploy command | Rollback | Live verification |
|---|---|---|---|---|
| local | developer machine | `bun run dev` | stop process | local browser or HTTP check |
| development | not provisioned | `bun run google:deploy apply --confirm ID` | rebuild and redeploy a prior Git revision | Firebase Hosting URL check |

There is no deploy-on-push workflow in the starter.

The intended source host is the private GitHub template repository
`ThatGuySam/google-app-starter`. Repository publication is separate from Firebase Hosting or Google
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
  untested because no cloud-side effects were authorized
