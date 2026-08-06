# Bison Byte Dash

- `Tease:` A generated app workspace ready for one focused vertical slice.
- `Lede:` This app lives at `apps/bison-byte-dash` and inherits the Techlahoma Google Apps Starter's shared toolchain and agent contract.
- `Why it matters:` It can be built, tested, and launched independently without changing another demo app.
- `Go deeper:` Run `bun run dev` here, or `bun run --cwd apps/bison-byte-dash dev` from the repository root.

## Commands

```sh
bun run dev
bun run check
```

Firebase Hosting configuration is app-local. Root cloud commands must receive
`--app bison-byte-dash` so they cannot deploy a different workspace accidentally.

## Deployment

The configured secondary site is [bisonbyte.web.app](https://bisonbyte.web.app), but it returned Firebase's HTTP 404 `Site Not Found` response on 2026-08-06. The site exists; no live app release was verified.

## Generation prompt

This is the canonical one-shot prompt used for the app. The durable source is the [event prompt library](../../docs/events/antigravity-one-shot-prompts.md#one-shot-prompt-3--bison-byte-dash).

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
