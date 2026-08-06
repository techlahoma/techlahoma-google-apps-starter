# App Workspace Instructions

## Boundary

- Put each independently runnable demo in exactly one `apps/<slug>/` directory.
- Never implement a demo in the repository root or modify another app to share a shortcut.
- Create a workspace with root `app:create plan` and `app:create apply` before adding features.
- Every completed app owns its `app.contract.json` (status: `complete`) and its browser smoke test (`e2e/smoke.spec.ts`).
- Keep the generated package name, app-local `tsconfig.json`, `firebase.json`, and README accurate.

## Commands

- From the root, run `bun run --cwd apps/<slug> dev` to launch one app.
- Run `bun run --cwd apps/<slug> check` for its types, tests, and production build.
- Run `bun run app:browser:verify --app <slug>` to run browser verification.
- Run `bun run app:verify --app <slug>` to run full completion verification.
- Run `bash scripts/verify.sh` before declaring the whole repository healthy.

## Dependencies and shared code

- Add a dependency to the app that imports it; keep one root lockfile.
- Do not introduce a shared package until at least two apps need the same stable behavior.
- Do not read runtime state from another app's directory.

## Cloud boundary

- Local builds do not require Firebase authentication or provisioning.
- Treat each app's `firebase.json` and its assigned Hosting site in root `google.project.json` as one deployment boundary.
- Pass `--app <slug>` to single-app Google lifecycle commands (`google:deploy`, `google:sites:destroy`).
