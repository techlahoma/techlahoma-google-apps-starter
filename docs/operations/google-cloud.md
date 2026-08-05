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
bun run deploy                         interactive deployment & guided setup
bun run deploy <APP>                   deploy single app workspace
bun run deploy --all                   deploy all app workspaces sequentially
bun run deploy <APP> --dry-run         read-only deployment plan
bun run deploy <APP> --yes             unattended deployment
bun run deploy <APP> --json            structured JSON deployment receipt
google:doctor                          read-only environment check
google:config plan                     read-only
google:config apply                    writes ignored root google.project.json
firebase:login                         changes local Firebase authentication
google:sites:destroy plan --app APP    read-only
google:sites:destroy apply --app APP   deletes one app's Hosting site without touching project
google:destroy plan                    read-only
google:destroy apply                   deletes the entire shared Google Cloud project
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

## 2. Deploying to Firebase Hosting

Deploy your app workspace with one simple command:

```sh
bun run deploy
```

Running `bun run deploy` without arguments opens an interactive terminal picker showing discovered apps, project settings, and destination URLs.

You can also deploy directly by specifying an app slug or workspace path:

```sh
bun run deploy numeronym-generator
bun run deploy apps/numeronym-generator
bun run deploy ./apps/numeronym-generator
```

Additional options:

- `bun run deploy --all`: Build all apps first, then deploy each app to its dedicated site.
- `bun run deploy APP --dry-run`: Perform all local preflight and site resolution without mutating any remote resources.
- `bun run deploy APP --yes`: Accept confirmations automatically for unattended deployment.
- `bun run deploy APP --json`: Output machine-readable JSON deployment receipts.

### Automatic Preflight & Protections

1. **Default Site Protection**: Deployments unconditionally protect your primary default site (`projectId.web.app`). Each app is deployed to a dedicated secondary Hosting site.
2. **First-Run Setup**: Interactive execution guides Firebase authentication, project selection, and provisions secondary sites automatically.
3. **Build Preflight**: `bun run deploy` builds the target app workspace locally before initiating any remote deployment. For `--all`, every app is built before any deployment occurs.
4. **Temporary Target Configuration**: Deployments bind targets in a task-scoped temporary deployment workspace without modifying tracked files or committing `.firebaserc`.
5. **Live Verification**: Post-deployment, the CLI queries site metadata, reads authoritative `defaultUrl`, verifies HTTP responsiveness, and returns public & console URLs.

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
