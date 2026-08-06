# Room Pulse

- `Tease:` A generated app workspace ready for one focused vertical slice.
- `Lede:` This app lives at `apps/room-pulse` and inherits the Techlahoma Google Apps Starter's shared toolchain and agent contract.
- `Why it matters:` It can be built, tested, and launched independently without changing another demo app.
- `Go deeper:` Run `bun run dev` here, or `bun run --cwd apps/room-pulse dev` from the repository root.

## Commands

```sh
bun run dev
bun run check
```

Firebase Hosting configuration is app-local. Root cloud commands must receive
`--app room-pulse` so they cannot deploy a different workspace accidentally.

## Deployment

No live Firebase Hosting deployment was verified on 2026-08-06. The derived target `https://room-pulse-b5b598.web.app` returned HTTP 404 and no matching secondary Hosting site was registered.

## Generation prompt

This is the canonical one-shot prompt used for the app. The durable source is the [event prompt library](../../docs/events/antigravity-one-shot-prompts.md#one-shot-prompt-2--room-pulse).

```text
# Critical constraints

Complete this as one autonomous local build. Do not ask questions or pause for an
intermediate plan. Do not commit, push, deploy, provision Firebase, authenticate an
account, or imply that a local demo is a public multi-device service.

# Workspace

Run inside an existing clone of https://github.com/techlahoma/techlahoma-google-apps-starter.
Confirm its root package is techlahoma-google-apps-starter; do not clone another repository.
Read the root and apps instructions and use the embedded build-and-launch-demo skill.

Create this artifact as a new apps/room-pulse workspace using the root app:create plan
and apply commands. If that path exists, use the first unused numeric suffix. Never
overwrite or delete an existing app. Install locked root dependencies and run the
baseline verification before editing the new app.

# Outcome

Build and launch "Room Pulse," a facilitator-ready local audience poll with a phone
vote route and a projector display route. The running local version must work across
multiple tabs without any cloud account.

# Requirements

- /vote shows: "Which fictional business should tonight's CRM become?" with Bike
  repair, Home services, Food truck, and Community events.
- /display shows live totals, percentages, total votes, and a restrained celebration
  when a leader becomes clear.
- Synchronize tabs with BroadcastChannel and persist state in localStorage.
- Generate a QR code for the current /vote URL and label it "LOCAL DEMO URL."
- Provide a facilitator panel to reset votes and add deterministic synthetic demo
  votes, always labeled "SYNTHETIC DEMO VOTES."
- Handle no votes, ties, duplicate voting in one browser profile, unsupported
  BroadcastChannel, reset, and stale-tab reconciliation.
- Include a visible note that this local build does not synchronize separate devices;
  Firebase is the later shared-room upgrade.

# Design direction

Make /vote bright, immediate, and thumb-friendly. Make /display theatrical at 16:9:
black field, Google-inspired primary accents without product logos, oversized type,
animated bars, and reduced-motion support. Avoid a corporate analytics dashboard.

# Verification

Test tallying, one-vote behavior, reset, tie handling, persistence, and fallback
synchronization. Run full verification. Open /vote and /display in separate browser
tabs, cast votes, prove live updates and reload persistence, exercise reset and no-vote
states, inspect console/network failures, and check phone plus projector widths.

# Finish

Keep the local server running. Return the /vote and /display URLs first, then the
verified behaviors, tests, browser evidence, files changed, and one honest limitation.
```
