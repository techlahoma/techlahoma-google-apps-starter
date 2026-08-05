# Google Cloud Operations

- `Tease:` Build locally in two commands; touch Google only through an explicit plan and confirmed apply.
- `Lede:` Firebase Hosting is the default deployment target using one shared Google Cloud project with one independent Firebase Hosting site per app workspace. The shared configuration lives in an ignored root `google.project.json` file.
- `Why it matters:`
  - No dashboard setup or ambient CLI project is required.
  - Apps deploy to dedicated Hosting sites without overwriting each other.
  - Provisioning, deployment, site deletion, and project deletion remain distinct effects.
- `Go deeper:`
  - Read [`PROJECT.md`](../../PROJECT.md) for the authority table.
  - Read the [architecture decision](../decisions/project-per-environment-google-starter-2026-08-03.md) before adding services.

## Effect map

```text
bun install / app:create / dev     local only
google:config plan                 read-only
google:config apply                writes ignored root google.project.json
firebase:login                     changes local Firebase authentication
google:provision plan              read-only
google:provision apply             creates the shared Google Cloud project and adds Firebase
google:sites plan [--app APP]      read-only
google:sites apply [--app APP]     provisions Firebase Hosting sites for apps
google:deploy plan --app APP       read-only
google:deploy apply --app APP      publishes one app to its designated Hosting site
google:deploy-all plan             read-only
google:deploy-all apply            builds and publishes all apps to their Hosting sites
google:sites:destroy plan --app APP read-only
google:sites:destroy apply --app APP deletes one app's Hosting site without touching the project
google:destroy plan                read-only
google:destroy apply               deletes the entire shared Google Cloud project
```

No command links billing. There is no deploy-on-push workflow.

## 1. Local development

```sh
bun install --frozen-lockfile
bun run --cwd apps/welcome dev
```

Production-equivalent build and full repository verification:

```sh
bun run --cwd apps/welcome build
bash scripts/verify.sh
```

The static app does not need Firebase emulation. To serve the built Hosting configuration through Firebase's local Hosting emulator:

```sh
bun run --cwd apps/welcome build
bun run firebase:serve
```

The emulator uses the fake, local-only `demo-techlahoma-google-apps` ID and does not call a real project.

## 2. Configure the shared project and environment

Google Cloud project IDs are globally unique and immutable. Use a lowercase ID that visibly names the environment, such as `techlahoma-apps-dev`. Do not put an account number, email address, customer name, or secret in it.

Preview the local root configuration file first:

```sh
bun run google:config plan \
  --project-id TODO-replace-with-real-unique-id \
  --display-name "TODO Replace With Real Name"
```

Write the ignored root config (`google.project.json`) only after the preview is correct:

```sh
bun run google:config apply \
  --project-id TODO-replace-with-real-unique-id \
  --display-name "TODO Replace With Real Name"
```

The configuration automatically maps discovered `apps/<slug>` workspaces to deterministic Hosting site IDs (e.g. `welcome-9b9408`).

## 3. Authenticate

The shortest interactive path uses the pinned local Firebase CLI:

```sh
bun run firebase:login
```

This opens Google's browser authentication flow and changes Firebase CLI state outside the repo. For a headless machine, use the local binary's `login --no-localhost` flow. Do not put a legacy `FIREBASE_TOKEN`, service-account JSON key, or copied browser credential in the repository.

For future CI, configure Workload Identity Federation and a narrowly scoped deploy identity.

## 4. Provision shared project and Hosting sites

```sh
bun run google:doctor
bun run google:provision plan
```

With explicit project-creation authority, create the project:

```sh
bun run google:provision apply --confirm TODO-replace-with-real-unique-id
```

Next, plan and create the Firebase Hosting sites for your apps:

```sh
bun run google:sites plan
bun run google:sites apply --confirm TODO-replace-with-real-unique-id
```

## 5. Deploy Hosting sites

To deploy a single app:

```sh
bun run google:deploy plan --app welcome
bun run google:deploy apply --app welcome --confirm TODO-replace-with-real-unique-id
```

To build and deploy all discovered apps to their respective Hosting sites in one pass:

```sh
bun run google:deploy-all plan
bun run google:deploy-all apply --confirm TODO-replace-with-real-unique-id
```

Each app is deployed to its explicit site target (`hosting:<site-id>`) on the shared project, preventing any app from overwriting another.

## 6. Teardown options

To delete one Hosting site without deleting the shared project:

```sh
bun run google:sites:destroy plan --app welcome
bun run google:sites:destroy apply --app welcome --confirm TODO-replace-with-real-unique-id
```

To delete the entire shared Google Cloud project:

```sh
bun run google:destroy plan
bun run google:destroy apply --confirm TODO-replace-with-real-unique-id
```

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
`./node_modules/.bin/firebase mcp --dir apps/<slug>` and restrict discovery with `--only` or
`--tools` to the smallest useful set. Do not give it a broader identity or effect authority than
the equivalent CLI command.

Google also publishes official Firebase agent skills, including a Codex plugin. Installing those
skills changes the developer's agent configuration and is intentionally not part of `bun install`.
