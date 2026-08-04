# App-Workspace Monorepo Verification

- `Tease:` The repository can now generate, protect, verify, and launch independent apps under `apps/`.
- `Lede:` On 2026-08-04, the local monorepo worktree generated a disposable app from the committed template, passed that app's typecheck/test/build, refused an overwrite, passed the full root and welcome-app verification, and served the moved welcome app over HTTP.
- `Why it matters:` The Antigravity prompts now have executable proof for their expected workspace lifecycle rather than relying only on documentation.
- `Go deeper:` Review the evidence table and the remaining remote-publication boundary below.

## Scope

- Base Git revision: `f3f6036`
- Environment: local macOS checkout
- Remote effects: none
- Firebase authentication, provisioning, deployment, and deletion: not attempted

## Evidence

| Check | Command or method | Observed result |
|---|---|---|
| App generator plan | `bun run app:create plan --name test-demo --title "Test Demo"` | Named only `apps/test-demo`; no files written |
| App generator apply | `bun run app:create apply --name generator-smoke --title "Generator Smoke"` | Created one rendered workspace and printed its launch command |
| Generated app verification | `bun run --cwd apps/generator-smoke check` | Typecheck, one behavioral test, and Vite production build passed |
| Overwrite protection | Repeated the same generator apply command | Refused the existing `apps/generator-smoke` target with a nonzero exit |
| Smoke-artifact cleanup | Moved the generated workspace to `/private/tmp/google-app-starter-generator-smoke-20260804` | Test artifact preserved outside the repository rather than deleted |
| Root verification | `bash scripts/verify.sh` | Starter contract, format, lint, types, 12 root tests, welcome-app test, and welcome build passed |
| Skill validation | Skill Creator `quick_validate.py` against `.agents/skills/build-and-launch-demo` | `Skill is valid!` |
| Runtime smoke test | Served `apps/welcome` on `127.0.0.1:5173` and fetched it over HTTP | Response contained the monorepo heading and `apps/` workflow copy |

## Remaining boundary

The worktree changes are local. They have not been staged, committed, pushed, or deployed. Public
GitHub verification must occur only after an explicitly authorized commit and push. Cloud lifecycle
tests cover plans and confirmation behavior; no authenticated Google-side effect was authorized.
