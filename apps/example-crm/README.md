# Example CRM — Fictional Demo

- `Tease:` A generated app workspace ready for one focused vertical slice.
- `Lede:` This app lives at `apps/example-crm` and inherits the Techlahoma Google Apps Starter's shared toolchain and agent contract.
- `Why it matters:` It can be built, tested, and launched independently without changing another demo app.
- `Go deeper:` Run `bun run dev` here, or `bun run --cwd apps/example-crm dev` from the repository root.

## Commands

```sh
bun run dev
bun run check
```

Firebase Hosting configuration is app-local. Root cloud commands must receive
`--app example-crm` so they cannot deploy a different workspace accidentally.

## Deployment

No live Firebase Hosting deployment was verified on 2026-08-06. The derived target `https://example-crm-73238a.web.app` returned HTTP 404 and no matching secondary Hosting site was registered.

## Generation prompt

This is the canonical one-shot prompt used for the app. The durable source is the [event prompt library](../../docs/events/antigravity-one-shot-prompts.md#one-shot-prompt-1--example-crm).

```text
# Critical constraints

Complete this as one autonomous local build. Do not ask follow-up questions or stop
for a spec, plan, or intermediate approval. Do not commit, push, deploy, provision
cloud resources, authenticate an external account, or use real customer data.

# Workspace

Run inside an existing clone of https://github.com/techlahoma/techlahoma-google-apps-starter.
Confirm its root package is techlahoma-google-apps-starter; do not clone another repository.
Read its AGENTS.md, PROJECT.md, apps/AGENTS.md, active starter addenda, and embedded
build-and-launch-demo skill. Follow that skill for the rest of this request.

Create this artifact as a new apps/example-crm workspace using the root app:create
plan and apply commands. If that path exists, use the first unused numeric suffix.
Never overwrite or delete an existing app. Install the locked root dependencies and
run the baseline verification before editing the new app.

# Outcome

Build and launch "Example CRM — Fictional Demo," a polished browser-only mini CRM
for a fictional bike-repair business. It must feel usable rather than like a static
mockup.

# Requirements

- Today view: overdue and upcoming follow-ups with a one-click complete action.
- Contacts view: create, edit, search, and archive contacts.
- Pipeline view: move opportunities through Lead, Estimate, Scheduled, and Complete.
- First-run setup can change the fictional business name and one custom field.
- Persist configuration and records in localStorage behind a typed adapter.
- Import and export versioned JSON; invalid imports must not replace existing data.
- Include no more than six unmistakable records such as "Demo Contact 01" and mark
  the UI and exports "FICTIONAL DEMO DATA."
- Provide understandable empty, duplicate, invalid, reset, and storage-failure states.
- No backend, login, analytics, AI runtime, HubSpot API, or copied HubSpot branding.

# Design direction

Use a warm repair-shop visual language: cream canvas, ink typography, safety orange,
deep navy, compact work-order cards, and subtle tool-tag motifs. Avoid generic purple
gradients, excessive rounded cards, glassmorphism, and dashboard-template styling.
Make it excellent at phone and desktop widths, keyboard accessible, and reduced-motion
safe.

# Verification

Add behavioral tests for persistence, pipeline movement, JSON round-trip, and invalid
imports. Run the complete repository verification. In a browser, finish setup, add a
contact and opportunity, move it, reload to prove persistence, export data, exercise
an invalid import, inspect console/network failures, and check phone width.

# Finish

Start the development server on an available local port and keep it running. Return
the exact local URL first, followed by a concise list of working features, checks
actually run, browser evidence, files changed, and one honest limitation.
```
