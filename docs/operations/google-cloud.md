# Google Cloud Operations

- `Tease:` Build locally in two commands; touch Google only through an explicit plan and confirmed
  apply.
- `Lede:` Firebase Hosting is the only enabled surface. A real project ID is kept in an ignored
  local file, passed to every cloud command, and used as the confirmation phrase for mutation.
- `Why it matters:`
  - No dashboard setup or ambient CLI project is required.
  - Provisioning, deployment, billing, and deletion remain distinct effects.
- `Go deeper:`
  - Read [`PROJECT.md`](../../PROJECT.md) for the authority table.
  - Read the [architecture decision](../decisions/project-per-environment-google-starter-2026-08-03.md)
    before adding services.

## Effect map

```text
bun install / dev / verify        local only
google:config plan                read-only
google:config apply               writes ignored local config
firebase:login                    changes local Firebase authentication
google:provision plan             read-only
google:provision apply            creates a Google Cloud project and adds Firebase
google:deploy plan                read-only
google:deploy apply               publishes static assets to Firebase Hosting
google:destroy plan               read-only
google:destroy apply              deletes the entire Google Cloud project
```

No command links billing. There is no deploy-on-push workflow.

## 1. Local development

```sh
bun install --frozen-lockfile
bun run dev
```

Production-equivalent build and full repository verification:

```sh
bun run build
bash scripts/verify.sh
```

The static app does not need Firebase emulation. To serve the built Hosting configuration through
Firebase's local Hosting emulator:

```sh
bun run build
bun run firebase:serve
```

The emulator uses the fake, local-only `demo-google-app-starter` ID and does not call a real project.

## 2. Choose one environment

Google Cloud project IDs are globally unique and immutable. Use a lowercase ID that visibly names
the application and environment, such as a real app slug followed by `-dev`. Do not put an account
number, email address, customer name, or secret in it.

Preview the local file first, replacing both TODO values before running the command:

```sh
bun run google:config plan \
  --project-id TODO-replace-with-real-unique-id \
  --display-name "TODO Replace With Real Name"
```

Write the ignored local config only after the preview is correct:

```sh
bun run google:config apply \
  --project-id TODO-replace-with-real-unique-id \
  --display-name "TODO Replace With Real Name"
```

Use `--environment preview` or `--environment production` when applicable. The default is
`development`. `google.project.json` contains no credential, but remains ignored so a reusable
starter never ships a default real target.

The command refuses to replace a different existing config. Review and remove that ignored file
manually before retargeting the checkout.

## 3. Authenticate

The shortest interactive path uses the pinned local Firebase CLI:

```sh
bun run firebase:login
```

This opens Google's browser authentication flow and changes Firebase CLI state outside the repo.
For a headless machine, use the local binary's `login --no-localhost` flow. Do not put a legacy
`FIREBASE_TOKEN`, service-account JSON key, or copied browser credential in the repository.

For future CI, configure Workload Identity Federation and a narrowly scoped deploy identity. The
starter intentionally does not guess an organization, identity provider, repository, or production
project.

## 4. Provision without the dashboard

```sh
bun run google:doctor
bun run google:provision plan
```

The plan should say:

- effect: `remote-write`;
- target: the exact configured project;
- command: the pinned local Firebase CLI's `projects:create`; and
- no billing account linkage.

With explicit project-creation authority, run the plan's exact project ID as confirmation:

```sh
bun run google:provision apply --confirm TODO-replace-with-real-unique-id
```

This creates a Google Cloud project and adds Firebase. It does not register a web app because static
Hosting does not need a Firebase client SDK configuration.

If an organization requires a parent folder, labels, a billing account, or policy setup, stop here.
Those are organization-specific infrastructure decisions and are not safe defaults for the starter.

## 5. Deploy Hosting only

```sh
bun run google:deploy plan
bun run google:deploy apply --confirm TODO-replace-with-real-unique-id
```

The apply builds `dist/`, then runs Firebase deploy with both `--only hosting` and the explicit
project ID. After an authorized deployment, retain the CLI output and verify the reported Hosting
URL independently. A successful local build is not a live deployment proof.

Rollback means checking out or rebuilding a known-good Git revision and performing another
explicit Hosting deploy. The starter does not make a mutable dashboard release the source of truth.

## 6. Delete the environment

Whole-project deletion uses the
[Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install). Authenticate gcloud as the same
authorized human before deletion; gcloud authentication and Firebase authentication are separate
local states.

Before deletion:

- confirm the project ID and account;
- confirm the project contains no production or shared resources;
- export any state that must survive;
- inspect the plan; and
- obtain explicit deletion authority.

```sh
bun run google:destroy plan
bun run google:destroy apply --confirm TODO-replace-with-real-unique-id
```

The apply calls `gcloud projects delete` for the configured project and nothing broader. Google
Cloud usually holds a deleted project for a limited recovery period, but quotas, names, services,
and data recovery have caveats. Treat deletion as destructive rather than as reversible cleanup.

## Adding complexity intentionally

### Auth or Firestore

Add only the chosen Firebase service, its local emulator, security rules, and behavioral tests. The
Firebase web configuration is not a secret, but security rules are the actual data boundary. Record
an export and deletion contract before storing important data.

### Cloud Run or other Google APIs

Create a new decision that names the billing account, region, APIs, IAM principals, secrets,
scale-to-zero behavior, logs, cost boundary, deployment, rollback, and deletion path. Do not hide
billing linkage inside the Level 0 provision command.

### Terraform or OpenTofu

Adopt it as a separate platform slice with:

- reviewed reusable modules rather than app-specific copy/paste;
- a bootstrapped, versioned remote state bucket;
- state locking and access boundaries;
- `plan` artifacts reviewed before `apply`;
- Workload Identity Federation for CI; and
- a documented state-bucket and project teardown order.

Firebase's Terraform support is Preview and incomplete, so verify the specific resource coverage
before declaring the CLI path obsolete.

## Optional agent integrations

Firebase's official MCP server is included in the pinned CLI. If an agent client needs it, invoke
`./node_modules/.bin/firebase mcp --dir .` and restrict discovery with `--only` or `--tools` to the
smallest useful set. Do not give it a broader identity or effect authority than the equivalent CLI
command.

Google also publishes official Firebase agent skills, including a Codex plugin. Installing those
skills changes the developer's agent configuration and is intentionally not part of `bun install`.
