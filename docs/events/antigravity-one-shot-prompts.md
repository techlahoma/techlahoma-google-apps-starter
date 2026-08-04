# Antigravity One-Shot Demo Prompts

## SBC4

- `Tease:` One paste should produce one running demo.
- `Lede:` Clone the public Techlahoma Google Apps Starter once and open it in Antigravity. Each prompt then uses the embedded `build-and-launch-demo` skill to create a new `apps/<slug>` workspace, complete it without conversational checkpoints, verify it, and leave a local URL running.
- `Why it matters:` Current Gemini 3 guidance favors concise, direct, consistently structured instructions over elaborate older prompt-engineering rituals. The reusable workflow belongs in the repository skill, while each prompt should describe the artifact and its observable definition of done.
- `Go deeper:` Start with the CRM for practical value, Bison Byte Dash for spectacle, Room Pulse for audience interaction, or Neighborhood Quest Studio to demonstrate Addy Osmani's agent-skills pack.

- **Prepared:** 2026-08-04 (America/Chicago)
- **Target:** Gemini 3.6 Flash through Antigravity
- **Starter:** `https://github.com/techlahoma/techlahoma-google-apps-starter.git`

## Current Gemini prompt decisions

Google's current Gemini guidance changes several older defaults:

- Use direct, precise instructions and consistent Markdown sections.
- Put critical constraints first and define ambiguous values.
- Give explicit visual direction because Gemini 3.6 Flash favors function over styling without it.
- Let the model reason with its configured thinking level; do not request hidden chain-of-thought.
- Do not use deprecated `temperature`, `top_p`, or `top_k` parameters with Gemini 3.6 Flash or 3.5 Flash-Lite.
- Use tools and current official sources for changing APIs instead of relying on model memory.
- Require runtime and browser evidence because generation is not verification.

Sources: [Google Gemini prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies), [Gemini 3 developer guide](https://ai.google.dev/gemini-api/docs/gemini-3), and [latest Gemini models](https://ai.google.dev/gemini-api/docs/latest-model).

## One-shot Prompt 1 — Example CRM

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

## One-shot Prompt 2 — Room Pulse

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

## One-shot Prompt 3 — Bison Byte Dash

```text
# Critical constraints

Complete this as one autonomous local build. Do not ask questions or pause for a
plan. Do not commit, push, deploy, provision cloud services, or copy Chrome Dino,
Google product artwork, or another game's exact mechanics.

# Workspace

Run inside an existing clone of https://github.com/techlahoma/techlahoma-google-apps-starter.
Confirm its root package is techlahoma-google-apps-starter; do not clone another repository.
Read the root and apps instructions and use the embedded build-and-launch-demo skill.

Create this artifact as a new apps/bison-byte-dash workspace using the root app:create
plan and apply commands. If that path exists, use the first unused numeric suffix.
Never overwrite or delete an existing app. Install locked root dependencies and run
the baseline verification before editing the new app.

# Outcome

Build and launch "Bison Byte Dash," an original 45-second browser arcade game. A
geometric bison crosses a stylized Oklahoma plain, collects colorful code brackets,
and avoids tumbleweed-like neutral obstacles.

# Requirements

- Space, ArrowUp, a large touch button, and pointer input trigger the same jump.
- Score pickups, collisions, remaining time, high score, restart, pause on blur, and
  a clear end-of-round result.
- Include a camera mode using MediaPipe Pose Landmarker when it can be implemented
  safely with current official documentation; map one clear physical jump gesture to
  the same game action.
- Explain camera use before permission, keep frames on-device, expose a stop-camera
  control, and fall back immediately to keyboard/touch if permission or loading fails.
- The game must be completely playable without a camera or network after assets load.
- Keep rules and collision logic in pure testable functions.

# Design direction

Use a bold screen-print poster style: sunset red, prairie gold, midnight blue, rough
geometric silhouettes, chunky score typography, and lively but restrained motion.
Create original shapes in CSS or canvas. Support reduced motion, strong focus states,
sound-off play, phone widths, and readable projector-scale text.

# Verification

Test scoring, collision, round timing, pause, high-score persistence, and restart.
Run full verification. Browser-test an entire keyboard round, touch layout, restart,
reduced motion, reload persistence, and camera-denied fallback. Inspect console and
failed requests and capture a short recording or screenshots. Report the real camera
path as unverified unless it was rehearsed with a human.

# Finish

Keep the local server running. Return the exact URL first, followed by controls,
verified behavior, tests and browser evidence, files changed, and one honest limitation.
```

## One-shot Prompt 4 — Addy Osmani Skills Demo

```text
# Critical constraints

Complete this as one autonomous local build. This prompt explicitly authorizes
installing Addy Osmani's public agent-skills plugin into the current Antigravity user
configuration and using its relevant skills for this build. Do not use any flag that
skips permission or sandbox protections. Do not commit, push, deploy, provision cloud
resources, or modify unrelated global configuration.

# Workspace and skills

Run inside an existing clone of https://github.com/techlahoma/techlahoma-google-apps-starter.
Confirm its root package is techlahoma-google-apps-starter; do not clone another repository.
Read the root and apps instructions and its embedded build-and-launch-demo skill.

Create this artifact as a new apps/neighborhood-quest-studio workspace using the root
app:create plan and apply commands. If that path exists, use the first unused numeric
suffix. Never overwrite or delete an existing app. Install locked root dependencies
and run the baseline verification before editing the new app.

Check current official instructions at https://github.com/addyosmani/agent-skills.
Install its Antigravity plugin with the documented command:
agy plugin install https://github.com/addyosmani/agent-skills.git
Then verify it with `agy plugin list`. Use its spec-driven-development,
frontend-ui-engineering, test-driven-development, browser-testing-with-devtools, and
code-review-and-quality skills internally. Do not stop for their usual conversational
checkpoints; the requirements below are the approved acceptance contract. If plugin
installation cannot activate in the current session, report that honestly and still
complete the app using the starter's embedded skill.

# Outcome

Build and launch "Neighborhood Quest Studio," an interactive tool that turns a few
choices into a playable, printable community scavenger hunt.

# Requirements

- Inputs: fictional event name, audience age band, indoor/outdoor, 15/30/45 minutes,
  accessibility needs, and three to eight organizer-selected challenge types.
- Produce a deterministic quest with an intro, safety note, ordered challenge cards,
  points, optional hints, completion tracking, and a final celebration.
- Include Organizer and Play modes plus print-friendly output.
- Allow reordering, editing, disabling, and regenerating challenges without losing the
  event settings.
- Persist locally and support versioned JSON import/export.
- Ship at least twelve clearly authored challenge templates; never imply that any
  location, organizer, attendee, or outcome is real.
- Handle insufficient choices, empty names, impossible duration combinations, invalid
  imports, reset, and reload.

# Design direction

Make it feel like an illustrated field notebook: recycled-paper tones, cobalt ink,
map-red accents, stamp-like icons, hand-drawn route lines, and excellent printable
contrast. Avoid generic SaaS cards, glassmorphism, and AI sparkle decoration. Make
Organizer mode efficient and Play mode joyful at phone width.

# Verification

Test deterministic generation, duration constraints, editing/reordering, persistence,
completion scoring, and JSON round-trip. Run full verification. In the browser create
two meaningfully different quests, play one through completion, exercise an invalid
configuration and invalid import, reload, inspect print view, keyboard navigation,
phone width, console, and failed requests. Perform the Addy code-quality review and
fix in-scope findings.

# Finish

Keep the local server running. Return the exact URL first. Then list the Addy skills
actually activated, plugin verification result, working features, tests and browser
evidence, files changed, and one honest limitation. Never claim a skill ran if it did
not activate.
```

## Usage note

Clone the monorepo once, open that root in Antigravity, and paste any prompt above. These are one-shot build prompts, not one-command public deployments. Their guaranteed finish line is a new `apps/<slug>` workspace plus a verified local app with a running localhost URL. Publishing or provisioning remains a separate, explicit effect because it can create accounts, quota usage, public exposure, or cost.
