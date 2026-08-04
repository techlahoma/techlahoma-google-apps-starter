---
name: build-and-launch-demo
description: Build, complete, verify, and launch a small usable browser demo from one prompt. Use for GDG demos, workshop take-home builds, interactive prototypes, polls, games, fictional business tools, and requests that explicitly ask the agent to build and run an app without pausing for intermediate approval.
---

# Build and Launch a Demo

Complete the requested local demo in one uninterrupted pass. Do not turn the request into a questionnaire, staged tutorial, or approval loop.

## Work autonomously

1. Confirm the current working directory is the Techlahoma Google Apps Starter root. Read `AGENTS.md`, `PROJECT.md`, `apps/AGENTS.md`, the active `.starter/addenda/`, and relevant scripts before editing.
2. Treat the user's prompt as the acceptance contract. Resolve minor ambiguity with the smallest reversible interpretation and state it in the final report.
3. Install the locked root dependencies when needed and run the existing repository verification before editing. Record failures without weakening checks.
4. Choose a short lowercase app slug from the requested artifact. If `apps/<slug>` exists, add the first unused numeric suffix; never overwrite an existing app.
5. Run `bun run app:create plan --name <slug> --title "<title>"`, inspect its target, then run the matching `app:create apply` command. Continue without asking for an intermediate approval because the one-shot prompt authorizes this local app creation.
6. Make all artifact-specific edits inside that new `apps/<slug>/` workspace. Change root files only when the prompt explicitly requests a shared monorepo capability.
7. Build the smallest complete vertical slice that delivers the requested meaningful interaction. Keep Level 0 demos static and local-first unless shared state is essential.
8. Use red-green-refactor for meaningful behavior and keep application logic independently testable.
9. Run `bun run --cwd apps/<slug> check`, then the repository verification, and fix failures within scope.
10. Launch `bun run --cwd apps/<slug> dev -- --host 127.0.0.1` on an available local port and keep it running.
11. Use available browser or computer-use tools to exercise the main flow, a second meaningful input, and an empty or failure state. Check the console and responsive layout.
12. Return the app path and local URL, what works, tests and browser checks actually completed, evidence paths, and one honest limitation.

## Build constraints

- Use clearly labeled fictional or reproducibly generated demo data. Never make synthetic records look real.
- Preserve keyboard operation, visible focus, semantic controls, readable contrast, reduced motion, and phone-width usability.
- Give visual work explicit art direction. Avoid generic dashboard styling, copied product branding, and unnecessary dependencies.
- Prefer the repository's existing toolchain and patterns. Do not replace them for convenience.
- Keep one root lockfile. Add dependencies to the generated app package rather than creating a nested lockfile.
- Inspect current official documentation when a framework, API, model, or install command may have changed.
- Do not expose secrets or place credentials in client code, logs, screenshots, fixtures, or Git.

## Gemini 3 prompting behavior

- Interpret structured Markdown sections consistently: `Outcome`, `Workspace`, `Requirements`, `Design direction`, `Verification`, and `Finish`.
- Prioritize constraints near the start of the prompt and define ambiguous parameters explicitly.
- Prefer direct instructions over persuasive prose, elaborate personas, chain-of-thought requests, or repeated reminders.
- For large supplied context, inspect the context first and apply the task stated after it.
- Use tools for current facts and executable checks; do not rely on model memory for changing APIs.
- Do not add deprecated Gemini sampling parameters or prefilled model turns. If the app calls a current Gemini model, use the current Google SDK and documented structured-output or system-instruction surfaces.

Read [references/completion-contract.md](references/completion-contract.md) when preparing the final verification pass.

## Authority boundary

A one-shot build authorizes local inspection, dependency installation from the committed lockfile, creating one new `apps/<slug>` workspace, app-scoped edits, tests, browser verification, and launching a local server. It does not authorize committing, pushing, opening a pull request, provisioning cloud resources, authenticating external accounts, deploying, publishing, or deleting anything unless the prompt explicitly names that exact effect.
