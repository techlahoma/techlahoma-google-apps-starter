# Tulsa Gravity Rally repair prompt

- `Tease:` The continuation prompt that converted the failed first pass into an evidence-driven multiplayer repair.
- `Lede:` This prompt authorized an in-place repair, bounded Firebase activation, and live verification while explicitly protecting the default Hosting site and unrelated cloud resources.
- `Why it matters:` The prompt records the failure evidence, safety boundaries, implementation gates, and proof standard that shaped the repaired app.
- `Go deeper:` Read the current app README for the verified result and deployment URL; this file preserves historical build provenance rather than current operational instructions.

## Prompt

```text
# Outcome

Repair the existing `apps/tulsa-gravity-rally` implementation in place and deploy a genuinely working Tulsa Gravity Rally to Firebase.

This is a continuation of a failed first pass. Do not create another app workspace. Do not treat the current passing unit tests or screenshots as evidence that the product works.

The completed experience must have:

1. A visibly rendered, full-window 3D downtown Tulsa scene centered on Gradient.
2. Giant controllable cars with visibly functioning four-wheel suspension.
3. A projector/host page that owns physics and displays every car.
4. A working QR code leading to a publicly hosted phone controller.
5. Anonymous multiplayer through Firebase Realtime Database.
6. A live, verified Firebase Hosting deployment.
7. Gemini course generation only after the deterministic game is proven.

# Authority and boundaries

You are authorized to:

- Modify the existing `apps/tulsa-gravity-rally` workspace and the minimum necessary root configuration/docs.
- Configure a scoped Java 21 runtime for Firebase Emulator Suite testing, honoring repository supply-chain and minimum-release-age controls.
- In Firebase project `sam-carlton-creative`:
  - Re-enable the existing default Realtime Database instance if it is still disabled.
  - Register exactly one Firebase Web App named `Tulsa Gravity Rally` if none exists.
  - Enable only Anonymous Authentication.
  - Deploy Realtime Database rules.
  - Create the Hosting site `tulsa-gravity-rally-e4f71f` if it is still absent.
  - Deploy this app to that site’s live channel.
  - Enable Firebase AI Logic with the Gemini Developer API only if it requires no billing linkage.
- Use the pinned repository Firebase CLI, current authenticated account, and explicit project IDs.

You are not authorized to:

- Enable billing.
- Change or deploy another app or Hosting site.
- Deploy to or overwrite the default Hosting site.
- Delete Firebase resources or existing database data.
- Enable other authentication providers.
- Create or commit `.firebaserc`.
- Change Firebase or gcloud global defaults.
- Commit, push, open a PR, or merge.
- Conceal a failed cloud action behind local or synthetic behavior.

Before every remote mutation, print the exact project, service, resource, command, and expected effect. The effects listed above are explicitly authorized and do not require another approval loop. If authentication, IAM, an existing database conflict, or billing blocks them, stop that effect and report the exact blocker.

# Workspace safety

Read `AGENTS.md`, `PROJECT.md`, `apps/AGENTS.md`, active `.starter/addenda/`, and `.agents/skills/build-and-launch-demo/SKILL.md`.

Run `git status --short --branch` and inspect all relevant diffs first. This is a dirty, concurrently changing checkout. Preserve every unrelated change. Do not reset, revert, overwrite, or broadly reformat other work.

Continue inside `apps/tulsa-gravity-rally`; do not run `app:create`.

If the root-level `scripts/verify-browser.ts` and added root Playwright/Firebase dependencies belong only to this failed app, move the verification into the app workspace and remove only those app-owned root changes. Confirm ownership before doing so.

# Known failures to fix

Treat these as reproduced facts:

- `#webgl-canvas` currently has a 2560×1800 drawing buffer but a displayed height of exactly 0.
- The host console reports `FirebaseError: auth/network-request-failed`.
- Firebase configuration is fake and hardcoded to `127.0.0.1:9099` and `127.0.0.1:9000`.
- The QR image never receives a source because room creation fails first.
- `/room/:code` cannot sign in and never exposes the controller.
- The proposed live Hosting URL currently returns 404.
- Remote preflight found:
  - no Tulsa Hosting site;
  - one default RTDB instance, `sam-carlton-creative`, in `us-central1`, state `DISABLED`;
  - zero registered Firebase Web Apps.
- Current rules deny the pre-join room read performed by `joinRoom()`.
- Current rules tests do not execute Firebase rules.
- Wheels are decorative; there is no raycast suspension.
- `generateAICourse()` is a preset-returning stub.
- The alleged OSM-derived map has no checked-in raw source or reproducible transformer.
- The current browser script takes screenshots without asserting visual or multiplayer success.

# Gate 1: visible 3D scene

Complete and verify this before touching multiplayer.

- Give `html`, `body`, `#app`, `#host-app`, `#canvas-container`, and the canvas an explicit full-viewport sizing chain.
- Use a `ResizeObserver` or equivalent to size the renderer and update the camera from the canvas’s real nonzero bounds.
- Cap pixel ratio reasonably for projector performance.
- Remove deprecated Three.js shadow-map configuration and the Rapier initialization warning.
- Initialize and display the scene independently of Firebase. A network failure must not produce a blank screen.
- At 1440×900, assert that the canvas bounding rectangle is at least 1200×650.
- The first lobby frame must visibly contain:
  - streets and multiple downtown buildings;
  - the Gradient building near the visual center;
  - a large, readable `GRADIENT` sign;
  - ramps/checkpoint beacons;
  - at least one clearly visible giant car in attract mode.
- Add an explicit WebGL failure state and retain the accessible 2D view as a real fallback.
- Show Firebase readiness as visible UI. Disable multiplayer Start until a room exists; do not silently continue as though the QR works.

Use an Oklahoma retro-futurist, blue-hour stunt-racing direction—not generic glass-dashboard styling. Keep the HUD secondary to the actual game.

# Gate 2: real driving and suspension

Complete and verify deterministic motion before networking it.

- Use Rapier’s current raycast vehicle controller if compatible, or implement four actual suspension raycasts.
- Each wheel must have contact, rest length, compression, damping, steering, and visible independent wheel travel.
- Do not call fixed decorative wheels “suspension.”
- Use a fixed-step accumulator driven by elapsed time; do not run one 1/60 step per animation frame regardless of display refresh rate.
- Tune low gravity and boost so cars can cross ramps and roofs but remain observable and recoverable. They must not launch uncontrollably outside the camera.
- Add reset/recovery for flips and out-of-bounds cars.
- Provide useful projector cameras: overview plus car-follow/spectator switching.
- Synthetic cars must follow checkpoint targets rather than steering in arbitrary sine waves.
- Add meaningful tests that prove:
  - forward input changes position;
  - steering changes heading;
  - suspension ray lengths respond to terrain;
  - boost has bounded vertical motion;
  - fixed-step results are stable at simulated 30, 60, and 120 Hz.

# Gate 3: Firebase architecture

Use Firebase Hosting + Anonymous Auth + Realtime Database. Do not add Cloud Functions.

Configuration:

- Register/reuse the real Firebase Web App and obtain its official SDK config.
- Production must use the real HTTPS database URL and real Firebase project/app identifiers.
- Emulator connections must happen only behind an explicit development flag.
- For LAN emulator testing, derive the emulator host from `window.location.hostname`; never make a phone connect to its own `127.0.0.1`.
- Route-split with dynamic imports so `/room/:code` does not download Three.js, Rapier, or the host renderer.

Use a namespaced database path such as:

`demos/tulsaGravityRally/v1/rooms/{roomCode}`

Data and authority:

- The projector host is authoritative for physics, scores, race state, and snapshots.
- A host creates a room atomically only when the room code is unused.
- Room codes are collision-checked.
- Store only a safe emoji ID from the fixed allowlist; derive the emoji glyph and color locally. Do not accept arbitrary HTML or CSS strings from clients.
- Limit rooms to 12 players and enforce this in rules/transactions, not only client code.
- Make emoji claims atomic so two players cannot claim the same emoji.
- Inputs contain bounded steering, throttle, brake, boost, and monotonic sequence only.
- Do not trust client clocks for stale-input decisions. Record arrival time on the host.
- Phones publish while controls are held at no more than 10–12 Hz, send an immediate neutral state on release, and also neutralize on pointer cancel, touch cancel, blur, page hide, or disconnect.
- The host neutralizes any input not received for 500 ms.
- Publish compact host snapshots around 10 Hz.
- Use `onDisconnect` for presence/input cleanup and an `expiresAt` room TTL.
- Provide an explicit End Session action.
- Never show “connected,” a player count, or a usable QR unless the backend action succeeded.

Rules:

- Default deny.
- Permit the authenticated host to create the initial room only when `hostUid === auth.uid`, status is `lobby`, and required fields/types are valid.
- Permit an authenticated user who knows a valid, unexpired room code to read the limited room data necessary to join.
- Permit each user to create/update only their own player and input records.
- Permit only the host to write status, course, snapshots, scoring, and results.
- Validate the exact emoji allowlist, input ranges, allowed keys, maximum player count, room status, and expiry.
- Reject non-host snapshot writes, invalid emojis, duplicate claims, a thirteenth player, oversized/extra payload fields, and joins after racing starts.

Replace the handwritten rule imitation with real `@firebase/rules-unit-testing` tests against the Realtime Database emulator. Configure Java 21 and run these tests with `firebase emulators:exec` using a `demo-` project ID. Do not claim rules are tested unless the actual emulator executes them.

# Gate 4: QR and phone controller

- Generate the public join URL from `window.location.origin` plus `/room/{code}`.
- On Firebase Hosting it must resolve to:
  `https://tulsa-gravity-rally-e4f71f.web.app/room/{code}`
- Use a high-contrast black-on-white QR with a proper quiet zone.
- Display the room code and join URL as text beside it.
- Programmatically decode the generated QR in a test and assert exact URL equality.
- Open that decoded URL in a separate browser context and complete a real join.
- At 390×844 portrait and 844×390 landscape:
  - no horizontal overflow;
  - all controls visible;
  - safe-area insets respected;
  - touch targets at least 48 px;
  - controls remain usable with thumbs.
- Use semantic buttons with accessible labels and visible focus.
- Remove `user-scalable=no`.
- Use pointer events with pointer capture instead of separate fragile mouse/touch handlers.
- Pressing Gas on the phone must visibly move that player’s emoji car on the projector within 500 ms under local test conditions.
- Show connection/reconnecting/offline states honestly.

# Gate 5: Tulsa and Gradient data integrity

Do not continue claiming hardcoded invented geometry is OSM-derived.

- Retrieve a bounded OpenStreetMap/Overpass dataset around 12 N Cheyenne Ave.
- Check in the raw source separately from derived geometry.
- Record source URL/query, retrieval timestamp, bounding box, transformation, attribution, and limitations.
- Provide a reproducible transformation script that converts footprints to the local Three/Rapier coordinate system.
- Use OSM levels/heights when present and deterministic, documented estimates otherwise.
- Do not invent real-sounding building names. Use verified names or clearly generic labels.
- Keep collision proxies simpler than display meshes but derived from the same coordinates.
- Hand-author Gradient as an explicitly artistic game proxy at the correct location.
- Give it five legible levels and a prominent `GRADIENT` sign. If using an official logo asset, record its source and usage basis; otherwise use a clearly labeled typographic sign and do not call it the official logo.
- Preserve visible OSM attribution.
- Do not add Google Photorealistic 3D Tiles to this version; they introduce billing, key, attribution, runtime-network, and collision-mesh problems that are unnecessary for this repair.

# Gate 6: Gemini, last

The game must remain fully playable without Gemini.

After Gates 1–5 pass:

- Replace the fake `generateAICourse()` implementation with a real, host-triggered Firebase AI Logic adapter using the Gemini Developer API.
- Check current official Firebase AI Logic docs and use a currently supported stable model; use `gemini-3.6-flash` only if it is still documented as supported.
- Request structured JSON output matching a narrow `CoursePlan` schema.
- Give the model only approved checkpoint IDs, reachability tags, and fixed style choices.
- Validate every returned ID, count, duplicate, bound, and reachability condition before applying it.
- Never let the model generate executable code, database paths, arbitrary coordinates, physics values, HTML, or Firebase writes.
- Always retain a deterministic preset fallback.
- Label a course “Gemini generated” only after a successful real model response.
- For local tests, use a clearly labeled deterministic adapter fixture.
- Enable and enforce App Check before enabling the public AI call.
- If AI Logic or App Check requires billing or cannot be safely configured, leave the deterministic game live, show “Gemini unavailable,” and report the exact remaining setup. Do not fake AI.

Firebase AI Logic supports client SDK access and structured response schemas, while App Check is the recommended abuse boundary for public clients:
https://firebase.google.com/docs/ai-logic
https://firebase.google.com/docs/ai-logic/generate-structured-output
https://firebase.google.com/docs/ai-logic/app-check

# Cloud activation and deployment

Re-query remote state before acting because it may have changed.

1. Run read-only preflight with explicit project ID:
   - Hosting sites list.
   - Realtime Database instances list with JSON.
   - Firebase Web Apps list with JSON.
   - `bun run deploy tulsa-gravity-rally --dry-run`.

2. Database:
   - If the default `sam-carlton-creative` instance is still `DISABLED`, re-enable that exact instance through the documented Realtime Database Management API or Firebase console, using the authenticated account without printing access tokens.
   - Verify its state becomes `ACTIVE`.
   - Inspect existing data and rules before deployment. If there is non-demo data or nontrivial existing rules, do not overwrite them; stop and report the shared-database conflict.
   - Otherwise merge the app under its namespaced path and preserve default deny elsewhere.

3. Firebase Web App:
   - If the project still has no Web App, create exactly one named `Tulsa Gravity Rally`.
   - Retrieve its SDK config using the pinned Firebase CLI.
   - Do not expose credentials or tokens in logs. Treat the ordinary Firebase web config as client configuration and document how production builds obtain it.

4. Authentication:
   - Add only `"auth": {"providers": {"anonymous": true}}` to the app-local Firebase configuration.
   - Deploy only Auth configuration to `sam-carlton-creative`.
   - Verify anonymous sign-in from the live site.

5. Database rules:
   - Deploy only the tested Realtime Database rules to the exact project.
   - Remember that CLI rules deployment replaces console rules; do not deploy until the current rules were inspected and the real emulator suite passed.

6. Hosting:
   - Run the repository’s site lifecycle plan for `tulsa-gravity-rally`.
   - Create only site `tulsa-gravity-rally-e4f71f` if absent.
   - Preserve the default site and all other sites.
   - Use the repository’s ignored `google.project.json` workflow; never create `.firebaserc`.
   - Build and deploy only `tulsa-gravity-rally`.
   - Expected live host URL:
     `https://tulsa-gravity-rally-e4f71f.web.app/host`

Do not enable billing.

# Required verification

Automated:

- App typecheck, unit tests, real emulator rules tests, and production build.
- Repository verification plus touched-file guardrails.
- No root/app formatting or lint failures.
- Browser tests must assert outcomes, not merely save screenshots.
- Keep browser tests and artifacts app-scoped; remove hardcoded paths into a prior agent’s home directory.

Local browser:

- Canvas bounds are nonzero and meet the minimum size.
- A screenshot contains substantial non-background 3D pixels.
- Two frames one second apart differ when cars are active.
- Gradient and its sign are visually legible.
- Synthetic and player cars visibly move.
- Host plus independent phone browser context complete create → QR decode → join → emoji claim → drive → telemetry → finish.
- Invalid room and offline Firebase states are exercised.
- 390×844 and 844×390 layouts have no overflow.
- Console has zero errors and zero actionable warnings.
- No failed Firebase requests.

Live Firebase:

- Host URL returns HTTP 200.
- A deep `/room/{code}` URL returns the app through the Hosting rewrite.
- Live page uses cloud Firebase endpoints, never localhost.
- Create a fresh live room.
- Decode the live QR and open it in a second clean browser context.
- Anonymous player joins, appears on the projector, drives a visible car, and receives telemetry.
- A disallowed write is rejected by deployed rules.
- Reload/reconnect behavior is honest and recoverable.
- Inspect console and failed requests on both host and phone views.

Do not declare completion if the live two-client flow fails.

# Finish

Leave the useful local server running.

Report separately:

- Files changed.
- Checks passed and their exact commands.
- Local browser evidence.
- Firebase resources created or modified.
- Auth, database, rules, Hosting, and Gemini status.
- Exact local and live URLs.
- One honest remaining limitation.
- Local-only, deployed, and live-verified states.
- Confirmation that no commit, push, PR, billing change, default-site deployment, or unrelated Firebase mutation occurred.

Do not use compilation, unit-test counts, or screenshots as substitutes for visible gameplay and a live phone-to-projector multiplayer proof.
```
