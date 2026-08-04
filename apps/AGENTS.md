# App Workspace Instructions

## Boundary

- Put each independently runnable demo in exactly one `apps/<slug>/` directory.
- Never implement a demo in the repository root or modify another app to share a shortcut.
- Create a workspace with root `app:create plan` and `app:create apply` before adding features.
- Keep the generated package name, app-local `tsconfig.json`, `firebase.json`, and README accurate.

## Commands

- From the root, run `bun run --cwd apps/<slug> dev` to launch one app.
- Run `bun run --cwd apps/<slug> check` for its types, tests, and production build.
- Run `bash scripts/verify.sh` before declaring the whole repository healthy.

## Dependencies and shared code

- Add a dependency to the app that imports it; keep one root lockfile.
- Do not introduce a shared package until at least two apps need the same stable behavior.
- Do not read runtime state from another app's directory.

## Cloud boundary

- Local builds do not require Firebase authentication or provisioning.
- Treat each app's `firebase.json` and ignored `google.project.json` as one deployment boundary.
- Pass `--app <slug>` to every root Google lifecycle command.
