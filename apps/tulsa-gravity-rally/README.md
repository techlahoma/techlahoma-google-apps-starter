# Tulsa Gravity Rally

- `Tease:` Scan, pick an emoji, and race a giant car through downtown Tulsa.
- `Lede:` The projector renders real OpenStreetMap building footprints around Gradient, while Firebase Anonymous Auth and Realtime Database synchronize a 12-player lobby, phone controls, and host-authoritative telemetry.
- `Why it matters:` One QR code turns a room screen into a shared GDG demo without installing an app or exposing unrestricted database writes.
- `Go deeper:` Open the live host below, read the map provenance, or reuse the recorded generation and repair prompts.

## Live demo

- **Host/projector:** [tulsa-gravity-rally.web.app/host](https://tulsa-gravity-rally.web.app/host)
- **Join:** scan the host QR code or open its generated `/room/{code}` URL on a phone.
- **Firebase boundary:** dedicated secondary Hosting site `tulsa-gravity-rally` in project `sam-carlton-creative`; the project default site and the older hashed rally site are not deployment targets.

The HTTPS host, deep room rewrite, Anonymous Auth, room creation, QR join, emoji claim, sustained phone input, host telemetry, and race start were live-verified with isolated browser contexts on 2026-08-06.

## Local demo

Start the repository-pinned Auth and Database emulators from this app directory:

```sh
../../node_modules/.bin/firebase emulators:start \
  --only auth,database \
  --project demo-tulsa-gravity-rally \
  --config firebase.json
```

In another terminal:

```sh
VITE_USE_EMULATOR=true bun run dev --host 0.0.0.0
```

Open the host through the computer's LAN address when testing with a physical phone. A `localhost` QR URL is reachable only from the same device.

## Verification

```sh
bun run check
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 bun run verify:rules
VITE_USE_EMULATOR=true bun run app:verify --app tulsa-gravity-rally
RALLY_LIVE_BASE_URL=https://tulsa-gravity-rally.web.app \
  bun apps/tulsa-gravity-rally/e2e/live-verification.ts
```

`verify:rules` bundles the Node-only Firebase rules test SDK before running official Emulator Suite assertions. The live verifier launches a host and an isolated phone context against the deployed HTTPS site.

## Map provenance and limitations

The base model is the ODbL-licensed OpenStreetMap snapshot curated for Tulsa Shadow Walk, overlaid with a focused downtown building refresh dated 2026-08-06. Polygon footprints preserve recognizable exterior outlines; tagged heights and levels are used when available, and missing heights are deterministic game estimates.

The immutable source snapshots remain under `src/data/` for provenance. `bun run generate:map` deterministically rebuilds the compact browser payload and records both source SHA-256 hashes; the full Shadow Walk export is not shipped in the runtime bundle.

Gradient is anchored to OSM way `259791849`, named `OTASCO Warehouse` in the source. The Gradient name, neon treatment, ramps, roof access, and game-scale vehicle physics are artistic demo elements, not an architectural reproduction.

## Deployment and AI boundaries

Firebase Hosting and Realtime Database rules are app-local. Root deployment commands must name `tulsa-gravity-rally` and resolve the explicit secondary site so another site cannot be overwritten.

Gemini course generation is not active in the public build. Deterministic course presets remain the reliable path until Firebase AI Logic and App Check receive a separately reviewed public configuration.

## Prompt history

The initial one-shot prompt is preserved below. The more prescriptive continuation that diagnosed the failed first implementation is preserved in [REPAIR_PROMPT.md](REPAIR_PROMPT.md). These prompts record the build's provenance; the verified implementation and current repository instructions remain authoritative.

## Generation prompt

This is the initial one-shot Antigravity prompt designed for Tulsa Gravity Rally. Subsequent diagnosis and repair passes changed the implementation, so this block records origin rather than claiming to be a complete specification of the current app.

```text
# Critical constraints

Complete this as one autonomous local build using Gemini 3.6 Flash in Antigravity.

Create the implementation-plan, task-list, screenshot or recording, and walkthrough
artifacts, but do not pause for ordinary questions or intermediate approval. Proceed
through the internal gates below in order.

Run this prompt only from a clean fresh clone or clean isolated checkout of:

https://github.com/techlahoma/techlahoma-google-apps-starter

Do not run it concurrently with another task modifying the root lockfile.

This prompt authorizes:

- reading the repository and current official documentation;
- installing locked dependencies and adding app-scoped dependencies;
- updating the root lockfile only as required by this new app;
- creating one new app workspace;
- app-scoped source, tests, configuration, data, and documentation;
- running Firebase emulators with a fake `demo-` project;
- serving the completed app over the local LAN;
- automated and browser verification.

This prompt does not authorize:

- committing, pushing, opening a pull request, or merging;
- authenticating Firebase, Google Cloud, Google Maps, or Gemini accounts;
- creating or modifying a real Firebase or Google Cloud project;
- enabling APIs, billing, Auth providers, databases, App Check, or AI Logic remotely;
- deploying, publishing, changing DNS, or creating a custom domain;
- writing to an existing live database;
- using Google Photorealistic 3D Tiles in this first build;
- exposing secrets or placing unrestricted API keys in client code.

# Workspace

Confirm the root package is `techlahoma-google-apps-starter`.

Read:

- `AGENTS.md`
- `PROJECT.md`
- `apps/AGENTS.md`
- every active file in `.starter/addenda/`
- the root `package.json`
- `.agents/skills/build-and-launch-demo/SKILL.md`
- its completion contract
- the existing one-shot prompt library

Inspect `git status --short --branch`.

If the checkout contains unrelated changes that could conflict with app generation or
the root lockfile, stop without modifying anything and report the exact conflict.

Create a new app named `tulsa-gravity-rally` through:

- `bun run app:create plan --name tulsa-gravity-rally --title "Tulsa Gravity Rally"`
- inspect the planned target;
- `bun run app:create apply --name tulsa-gravity-rally --title "Tulsa Gravity Rally"`

If that app exists, use the first unused numeric suffix. Never overwrite an app.

Run the repository baseline verification before artifact-specific editing. Record any
pre-existing failure without weakening a check.

Use the existing Bun, Vite, strict TypeScript, GTS, Biome, and pinned Firebase CLI
toolchain. Add dependencies only to the new app package and preserve one root lockfile.
Do not bypass the repository’s release-age or supply-chain controls.

Prefer:

- Three.js for rendering;
- the current compatible Rapier 3D JavaScript package for physics;
- the modular Firebase Web SDK;
- QRCode for the join code;
- `@firebase/rules-unit-testing` for database-rule tests.

Check current official documentation before choosing versions or APIs.

# Outcome

Build and launch “Tulsa Gravity Rally,” a room-scale multiplayer stunt-racing game.

The projector shows a stylized 3D model of downtown Tulsa. Giant low-gravity cars with
visible wheel suspension scramble over streets, ramps, and low-rise rooftops around a
recognizable, clearly labeled Gradient landmark.

The host creates the room from the projector. A QR code appears in the upper-right
corner. Attendees scan it, select one available safe-for-work emoji, and immediately
use their phone as a controller.

The race lasts 75 seconds. Players collect ordered checkpoint rings across streets and
rooftops. The winner is the player who completes the most checkpoints, with elapsed
time as the tie-breaker.

The ten-second promise is:

“Scan, pick an emoji, and your giant car appears in downtown Tulsa.”

# Exact user flow

## Host

Route: `/host`

1. Select `Create room`.
2. Receive a six-character room code and LAN-reachable join URL.
3. See a QR code, fallback room code, connection state, and player roster.
4. Optionally join as a keyboard or gamepad player.
5. Choose a course preset or request a bounded Gemini-generated course when a real,
   protected AI provider is configured.
6. Select `Start race`.
7. Run a visible three-second countdown.
8. See all cars, checkpoints, positions, connection state, and remaining time.
9. View final standings.
10. Select `Race again` without requiring attendees to rescan.

## Player

Route: `/room/:roomCode`

1. Join anonymously without entering a name, email, or other text.
2. Choose one unclaimed emoji from this fixed allowlist:

   - 🦬 Bison
   - 🚀 Rocket
   - 🐢 Turtle
   - 🦊 Fox
   - 🐙 Octopus
   - 🌵 Cactus
   - 🌈 Rainbow
   - 🎈 Balloon
   - 🍕 Pizza
   - 🎮 Gamepad
   - ⚡ Lightning
   - 🛰️ Satellite

3. See the emoji become reserved in the room.
4. Use large left/right steering and throttle/brake controls.
5. Use one `Gravity boost` button for jumps and rooftop traversal.
6. See speed, checkpoint progress, place, connection state, and the player’s emoji.
7. Receive clear room-full, race-started, disconnected, host-ended, and invalid-room
   states.

Do not add names, chat, voice, uploads, avatars, arbitrary text, or account creation.

# Tulsa scene and data integrity

Build a bounded six-to-eight-block downtown play area centered around Gradient at:

12 N Cheyenne Ave, Tulsa, OK 74103

Use OpenStreetMap building and street data retrieved once during the build. Do not make
runtime calls to Overpass or another public map-data endpoint.

Keep:

- the bounded raw response;
- a deterministic transformation script;
- the compact derived game geometry;
- retrieval date;
- query or bounding box;
- source URL;
- transformation notes;
- missing-data limitations;
- required OpenStreetMap and ODbL attribution.

Display `Map data © OpenStreetMap contributors` with a license link in the game.

Extrude building footprints into optimized low-poly meshes. When source heights are
missing, use deterministic, documented estimates and mark them as estimated. Do not
present the result as a survey-grade or photorealistic city model.

Create Gradient as an original, stylized warehouse-like landmark aligned to the
source footprint when available. Give it:

- a recognizable broad mass;
- five readable visual levels;
- warm illuminated windows;
- a restrained `GRADIENT` rooftop or façade label;
- a bright checkpoint beacon;
- accurate address attribution;
- an explicit note that the model is an artistic game proxy, not an architectural
  reproduction.

Do not trace, extract, or derive geometry from Google imagery or Google 3D Tiles.

Generate separate simplified physics colliders from the derived footprints. Visual
meshes and physics proxies may differ, but their alignment must be deterministic and
testable.

If the map-data retrieval fails, use a small checked-in `STYLIZED TULSA DEMO MAP`
fixture with a conspicuous label. Never silently present invented geometry as retrieved
Tulsa data.

# Rendering and art direction

Make this feel like an Oklahoma retro-futurist toy city at blue hour:

- deep cobalt sky;
- warm amber windows;
- cream concrete;
- brick-red warehouse surfaces;
- turquoise route lighting;
- chunky, toy-like cars;
- clean geometric headlights and taillights;
- restrained particles on boosts and landings;
- long readable shadows;
- atmospheric depth without fog hiding the course.

Avoid:

- generic cyberpunk purple;
- photorealistic promises;
- dashboard layouts;
- downloaded car models;
- brand-logo imitation;
- excessive bloom;
- illegible glass controls;
- a camera that clips through the car or buildings.

Create the cars procedurally from original primitives. Every car must combine its emoji
with a distinct color halo so duplicate-looking platform emoji renderings remain
distinguishable.

The projector view must work at 1440×900 and 1920×1080. Keep the QR code in the
upper-right during the lobby and shrink it during a race. Ensure Gradient and at least
one rooftop checkpoint are visible in the default lobby camera.

# Physics

Use a fixed 60 Hz physics step with render interpolation.

Implement:

- one dynamic rigid-body chassis per car;
- four raycast wheels;
- visible wheel travel;
- suspension stiffness and damping;
- engine force;
- steering;
- braking and reverse;
- traction limits;
- grounded detection;
- low-gravity tuning;
- gravity boost;
- stable landing behavior;
- reset-to-last-checkpoint.

Cars should be approximately 12–18 game meters long so they feel enormous relative to
streets and smaller buildings.

Cars may traverse rooftops through visible ramps, bridges, and sloped collision
surfaces. Do not claim they can drive straight up an ordinary vertical façade. Add
enough authored ramps around Gradient and nearby low-rise buildings to make rooftop
driving obvious within the first race.

Gravity boost may temporarily reduce downward gravity and add a bounded impulse. It
must not allow indefinite flight.

Extract independently testable logic for:

- fixed-step timing;
- input normalization;
- stale-input neutralization;
- suspension configuration;
- checkpoint order;
- reset selection;
- race scoring;
- deterministic course generation.

# Multiplayer architecture

Use Firebase Anonymous Authentication and Realtime Database against local emulators
with a fake project ID such as `demo-tulsa-gravity-rally`.

Do not use Firestore for high-frequency vehicle inputs.

The projector is the host-authoritative simulation:

- phones publish bounded control inputs;
- the host listens for those inputs;
- the host advances all Rapier bodies at 60 Hz;
- the host publishes one compact aggregate snapshot around 10 Hz;
- clients interpolate received snapshots;
- do not write physics state at 60 Hz;
- do not let a player write a transform, score, checkpoint, or race result.

Player input should include only bounded values such as:

- steering from -1 to 1;
- throttle from -1 to 1;
- brake boolean;
- boost boolean;
- monotonically increasing sequence;
- client timestamp.

Publish at no more than approximately 12 input updates per second per active player.
Neutralize an input when it is more than 500 ms stale.

Limit the room to 12 players, including the host if the host joins.

Use `/.info/connected`, `onDisconnect`, server timestamps, and explicit room status.
When a player disconnects, remove or mark that connection and neutralize its car.
When the host disconnects, mark the room ended. Do not silently elect a new authority
in this first version.

Room data must expire logically after two hours. The host should delete the room when
ending it when possible. Document that guaranteed stale-room cleanup would need an
authorized server-side scheduled operation in a public deployment.

# Security rules

Default-deny the Realtime Database.

Rules must enforce that:

- only authenticated anonymous users can participate;
- a player can create and update only their own membership and input path;
- only fixed emoji IDs are accepted;
- only the host UID can write room status, course, authoritative snapshots, scoring,
  and results;
- nonmembers cannot read private room state;
- lobby discovery exposes only the minimum data required to join;
- rooms reject joins when full, started, ended, or expired;
- numeric input fields are finite and within explicit bounds;
- arbitrary child keys and oversized payloads are rejected.

Add emulator-backed rule tests for:

- host permissions;
- player permissions;
- a second player;
- a stranger;
- invalid emoji;
- transform injection;
- score injection;
- oversized or out-of-range input;
- room-full behavior;
- expired-room behavior.

Do not describe client-side throttling as a security control.

# QR and LAN behavior

Configure the Auth, Realtime Database, Hosting, and Emulator UI ports in the app-local
`firebase.json`. Bind the emulator services to the LAN only for the running local demo.

Use the repository’s pinned Firebase CLI through an app script. Do not use `npx`,
`bunx`, a global CLI, `firebase init`, `.firebaserc`, or global project selection.

Build the app and serve it through the Hosting emulator so SPA routes work.

The QR code must use the actual LAN origin from which the projector loaded the host
page:

`http://<chosen-private-ip>:<hosting-port>/room/<roomCode>`

If the page is opened through `localhost` or `127.0.0.1`, clearly warn that the QR URL
will not work from another device and show the correct LAN URL.

Do not print a full machine network inventory. Report only the selected private LAN URL.

Programmatically decode the generated QR code during verification and confirm it equals
the visible join URL.

# Gemini boundary

Gemini is the optional course director, not the game engine.

Create a typed `CourseDirector` interface with:

1. a deterministic preset provider that always works locally;
2. a Firebase AI Logic provider that activates only when a real, protected Firebase
   AI Logic configuration is explicitly supplied later.

Use the current supported Firebase AI Logic SDK and current structured-output API. Use
`gemini-3.6-flash` only if official documentation still lists it as supported when this
build runs.

The model input may contain only:

- available checkpoint feature IDs;
- position and height metadata;
- reachability tags;
- difficulty bounds;
- desired course style chosen from fixed host controls such as:
  - `Around Gradient`
  - `More rooftop jumps`
  - `Beginner friendly`
  - `Maximum chaos`

The model must return a bounded `CoursePlan` JSON object containing:

- course title;
- seed;
- ordered checkpoint IDs;
- one short announcer line;
- difficulty enum.

Validate schema and semantics in typed application code:

- every ID exists;
- no forbidden or duplicate ID;
- checkpoint count is within bounds;
- total route length is within bounds;
- required ramps and reachability tags are satisfied;
- announcer text is short and safe;
- the plan cannot change physics constants or execute code.

The model must never write Firebase state directly.

If AI is unavailable, denied, malformed, slow, or unconfigured:

- retain the prior valid course;
- show a concise status;
- offer deterministic presets;
- never display a fake `AI generated` badge.

Do not place a raw Gemini API key in the app. Document App Check enforcement and
Remote Config model selection as requirements for a later public activation.

# Accessibility and failure behavior

Provide:

- keyboard play for the host;
- gamepad support when available;
- large phone touch targets;
- visible focus;
- high-contrast connection and race states;
- reduced-motion behavior that removes camera shake, particles, and aggressive camera
  easing without changing game timing;
- mute-by-default operation;
- no autoplay audio;
- a pause-safe host control;
- an accessible lobby, instructions, status, and final standings;
- a 2D textual checkpoint and standings representation.

Be honest that the driving scene is inherently visual.

Handle visibly:

- invalid room;
- room full;
- duplicate or claimed emoji;
- late join;
- host disconnected;
- player disconnected;
- emulator unavailable;
- stale input;
- map fixture fallback;
- WebGL unavailable;
- lost WebGL context;
- Gemini unavailable;
- denied database write;
- race with one player;
- empty lobby.

Include a deterministic prerecorded input trace that can replay three clearly labeled
`SYNTHETIC DEMO CARS` for rehearsal. Synthetic cars must never be mixed into standings
without the label.

# Internal build order and hard gates

Do not build this as one undifferentiated feature pile.

## Gate 1 — Tulsa scene

Render the derived downtown scene with Gradient visible and correctly aligned to its
collision proxy.

Capture a 1440×900 screenshot. Do not proceed until:

- the scene is recognizably urban;
- Gradient is visible without camera movement;
- streets and buildings have depth;
- attribution is visible;
- the camera is not inside geometry.

## Gate 2 — One-car physics

Implement one keyboard-controlled car before Firebase.

Record a deterministic input trace proving:

- acceleration;
- steering;
- braking;
- suspension compression over a curb or obstacle;
- climbing a ramp;
- landing on a roof;
- gravity boost;
- reset after becoming stuck.

Do not proceed if the car merely slides, hovers without suspension, falls through
buildings, or becomes unrecoverable.

## Gate 3 — Two-client room

Start Auth, RTDB, and Hosting emulators.

Using two genuinely isolated authentication sessions:

- create a room;
- join as two different emoji players;
- start the race;
- drive both cars independently;
- confirm neither can write the other’s input;
- confirm the host alone writes snapshots and scores;
- disconnect and reconnect one player.

Do not substitute BroadcastChannel or shared localStorage for this gate.

## Gate 4 — Phone controller and QR

At approximately 390×844:

- scan or decode the QR;
- join;
- reserve an emoji;
- use throttle, steering, brake, and boost;
- confirm the matching projector car responds;
- exercise room-full and invalid-room states.

## Gate 5 — Gemini adapter

Only after the game works without AI:

- prove a valid deterministic structured course;
- prove malformed, unknown, duplicate, and unreachable plans are rejected;
- make a live model call only if a real pre-existing protected configuration is
  already available and using it requires no cloud mutation;
- otherwise report the live AI path as implemented but unverified.

Perform up to three focused repair passes at a failed gate. If it still fails, stop at
the highest honestly verified vertical slice. Do not hide the failure with UI polish or
describe intended behavior as observed.

# Automated verification

Add meaningful tests for:

- data transformation determinism;
- city/collider alignment;
- Gradient landmark presence;
- fixed-step timing;
- car control bounds;
- suspension configuration;
- ramp and roof traversal using deterministic physics;
- stale input neutralization;
- room-code generation;
- emoji reservation;
- room capacity;
- host authority;
- snapshot interpolation;
- scoring and tie-breaks;
- restart;
- CoursePlan schema and semantic validation;
- deterministic preset fallback;
- reduced-motion configuration;
- WebGL fallback;
- Firebase security rules.

Run:

- `bun run --cwd apps/<slug> check`
- `bash scripts/verify.sh`
- the repository-configured touched-file `prek` guardrails

Do not weaken TypeScript, lint, format, security, or test checks.

# Browser verification

Verify with observed browser evidence:

- 1440×900 projector lobby;
- 1920×1080 race;
- 390×844 phone controller;
- two isolated players;
- host keyboard play;
- QR decode and join;
- full 75-second race;
- race restart;
- one-player race;
- invalid room;
- full room;
- disconnect and stale input;
- reduced motion;
- WebGL fallback or deterministic nearest test;
- map fixture fallback;
- Gemini fallback;
- console errors;
- failed network requests.

Performance targets on the presentation machine:

- stable approximately 50–60 FPS with four cars;
- no sustained frame worse than 33 ms with twelve cars;
- phone controller remains responsive without loading the full 3D city;
- no unbounded physics or render loops;
- no per-frame DOM allocation.

Capture:

- lobby screenshot with QR and at least two real joined players;
- default race screenshot with Gradient and multiple cars visible;
- short recording of suspension, rooftop traversal, and two-player control;
- phone controller screenshot;
- final standings;
- emulator rule-test result.

Every captured state must be observed, not staged in markup.

# Public activation plan only

In the app README, document—but do not perform—the separate effects needed for a
public version:

- choose an explicitly owned Firebase project and database boundary;
- decide whether this stateful app requires a dedicated project;
- enable Anonymous Auth;
- create Realtime Database;
- deploy reviewed database rules;
- register the web app;
- configure and enforce App Check;
- optionally configure Firebase AI Logic and Remote Config;
- deploy only the app’s explicit secondary Hosting site;
- set room-retention and abuse controls;
- verify quotas, budget boundary, and cleanup behavior;
- optionally run a separate Google Maps 3D feasibility spike.

Explain that Google Photorealistic 3D Tiles would require billing, a secured Maps
credential, live coverage verification, visible attribution, and a separate aligned
collision world.

Do not execute any of those effects.

# Finish

Keep the LAN demo and Firebase emulators running.

Return the LAN `/host` URL first.

Then report:

- app slug and absolute directory;
- host URL;
- generated join URL;
- selected emulator-only project ID;
- exact ports;
- Tulsa source and retrieval date;
- Gradient modeling limitation;
- rendering architecture;
- physics architecture;
- multiplayer authority model;
- Firebase rules proof;
- number of real isolated clients tested;
- QR verification result;
- race and restart evidence;
- Gemini provider state;
- screenshots and recording;
- measured performance;
- app-level check result;
- repository verification result;
- `prek` result;
- files changed;
- current git status;
- one honest remaining limitation.

Separate these states explicitly:

- implemented locally;
- locally verified;
- LAN multi-device verified;
- runtime Gemini live-verified;
- deployed publicly;
- live-verified publicly;
- committed;
- pushed.

Do not claim a state that was not directly observed.
```
