# Gargantua

- `Tease:` Real-time WebGL2 gravitational ray tracer visualizing a Schwarzschild black hole.
- `Lede:` `apps/gargantua` renders realistic light bending, a Keplerian accretion disk, and relativistic Doppler shifts in interactive 3D WebGL2.
- `Why it matters:` Demonstrates high-performance WebGL2 physics visualization and interactive shader computation within the monorepo workspace.
- `Go deeper:` Explore the shader implementation in [`src/shaders.ts`](./src/shaders.ts); add the verified live-demo URL after deployment setup.

Real-time WebGL2 gravitational ray tracer visualizing a Schwarzschild black hole with realistic light bending, Keplerian accretion disk, and relativistic effects. 

Live demo: not configured in the reusable starter. After an authorized deployment, replace this
note with the verified Firebase Hosting URL.

---

## 🌟 Generation Prompt

Below is the prompt used to generate this application:

```markdown
<!-- PROMPT_START -->
# Outcome

Rebuild Gargantua from scratch as a technically credible, visually exceptional, interactive HTML5 black-hole experience.

The result must be impressive to senior software and graphics engineers. That means:

- the gravitational lensing must be visually obvious;
- the rendering architecture must be defensible;
- animation, zoom, camera motion, and comparison controls must genuinely work;
- verification must test rendered behavior rather than only TypeScript state helpers;
- the default first frame must already be an excellent composition.

Build and verify it in one uninterrupted pass. Deployment is a separate effect and requires explicit authorization for the exact Firebase project and Hosting site.

# Optional previous experiment

If the fork has an earlier attempt, record its branch or commit and deployed URL in local notes.
Inspect it explicitly with `git show YOUR_REFERENCE:apps/gargantua/PATH` and the fork's own live URL.
Do not assume a reference from another clone exists, and do not copy an archived implementation wholesale.

Treat it as a negative reference. Confirm these known defects before designing the replacement:

1. Default camera pitch is coplanar with the disk, so the initial disk-plane intersection is skipped.
2. The initial frame has no visible time-dependent pixels.
3. “Lensing” is implemented as a one-step direction offset.
4. Background stars are shifted with a non-radial scalar-vector addition.
5. Camera distance exists in state but is unused by the renderer.
6. No wheel, pinch, slider, or button zoom exists.
7. The shadow consumes roughly 85–90% of viewport height.
8. Tests validate state helpers but not rendered output.
9. The mobile composition is mostly black and does not expose the intended scene.

Do not repeat these implementation patterns.

# Repository boundaries

Before changing files:

1. Read `AGENTS.md`, `PROJECT.md`, `apps/AGENTS.md`, active `.starter/addenda/*`, root `package.json`, and the `build-and-launch-demo` skill.
2. Inspect `git status --short --branch`.
3. Preserve every unrelated change, including any untracked research documents.
4. Remain on `main`.
5. Do not modify the archived branch.
6. Do not commit, push, open a pull request, or merge.
7. Do not modify other apps.
8. Do not add authentication, databases, server runtimes, analytics, secrets, or AI APIs.

On `main`, `apps/gargantua` should not exist. Create it through:

- `bun run app:create plan --name gargantua --title "Gargantua"`
- Inspect the proposed target.
- `bun run app:create apply --name gargantua --title "Gargantua"`

If `apps/gargantua` has reappeared because of concurrent work, do not overwrite it. Stop and report that conflict.

# Research before implementation

Use these primary references:

- Interstellar DNGR paper:
  https://arxiv.org/abs/1502.03808
- Real-time WebGL2 black-hole rendering paper:
  https://arxiv.org/abs/2010.08735
- BSD-licensed reference implementation:
  https://github.com/ebruneton/black_hole_shader
- Event Horizon Telescope explanation:
  https://eventhorizontelescope.org/faq/how-realistic-are-movie-depictions-black-holes-eg-interstellar
- NASA anatomy:
  https://science.nasa.gov/universe/black-holes/anatomy/

Record the exact rendering model chosen and its limitations.

Prefer adapting the architecture of Bruneton’s WebGL2 beam-tracing method over inventing another screen-space approximation. It uses precomputed deflection/intersection tables to find curved-beam scene intersections efficiently.

If adapting any BSD-licensed implementation code or generated assets:

- identify the exact upstream repository and commit;
- include the required license and attribution;
- document which portions were adapted;
- vendor only the minimum required runtime material;
- do not load code or textures from third-party hosts at runtime.

If the reference implementation cannot be cleanly adapted to this Vite/TypeScript workspace, implement bounded backward null-geodesic integration in the fragment shader. Do not fall back to a one-step direction offset.

# Rendering architecture

Use WebGL2 and backward ray or beam tracing.

For every visible pixel, the renderer must determine whether the light beam:

- falls through the event horizon;
- intersects the thin accretion disk directly;
- intersects the disk after gravitational deflection;
- escapes to the celestial background in a bent direction.

The background must be sampled using the final escaped beam direction. Do not render an unwarped star layer over the result.

The renderer must naturally produce:

- a black-hole shadow;
- a narrow photon-ring region;
- direct accretion-disk emission;
- at least one secondary lensed disk image;
- visible star-field or dust-band distortion around the shadow;
- asymmetric Doppler brightness in physical mode.

A ray may contribute more than one disk intersection. Accumulate direct and secondary disk images in physically meaningful order.

Do not claim Kerr accuracy unless Kerr geodesics are genuinely implemented. A high-quality Schwarzschild renderer with a rotating emissive disk is acceptable and should be labeled honestly.

# Default camera calibration

The initial frame is a hard requirement.

Start approximately with:

- observer distance: about `30M`;
- vertical field of view: about `48–52°`;
- disk inclination: approximately `76–80°` from face-on, close to edge-on but never exactly coplanar;
- black-hole shadow diameter: `42–50%` of viewport height on desktop;
- black-hole shadow diameter: `36–46%` of viewport width on a narrow phone;
- slight horizontal offset from exact center is allowed for composition;
- the complete shadow and both primary lensing regions must remain visible.

Do not hard-code these values blindly. Calibrate them against screenshots and retain named constants with explanations.

The initial frame must show the disk immediately. No dragging, keyboard input, or hidden preset may be required to reveal it.

# Visual result

Create a cinematic scientific visualization, not a dashboard or generic particle demo.

Required default composition:

- complete black-hole shadow surrounded by ample negative space;
- a thin, bright accretion disk crossing near the horizontal axis;
- the far side of the disk visibly wrapped into separate upper and lower arcs;
- a structured background star band or faint galactic dust band whose curvature makes lensing obvious;
- restrained isolated stars away from the lens;
- warm white, ivory, pale gold, amber, and subtle burnt orange;
- absolute black inside the shadow;
- a fine photon-ring highlight, not a thick white outline;
- controlled bloom and veiling flare;
- detailed disk filaments moving at different angular rates;
- no giant flat cream-colored plate;
- no square or polygonal “stars”;
- no purple nebula wallpaper;
- no film frames, Warner Bros. assets, copied logos, soundtrack, or proprietary fonts.

The title and controls must remain readable against every camera position. Use localized dark glass backplates or adaptive text contrast where necessary.

# Make lensing unmistakable

The principal interaction is a curvature comparison.

Add a clearly labeled control:

`Hold to flatten spacetime`

Behavior:

- Default state is full gravitational lensing.
- Pointer down, touch hold, or holding `L` transitions lensing strength toward zero.
- Releasing returns smoothly to full lensing.
- The unlensed comparison must show the same disk and background without the gravitational mapping.
- The transition must make the upper/lower disk images and warped background visibly collapse back toward ordinary geometry.
- Explain that interpolation is an educational comparison, not a physically valid continuum of metrics.

Also provide a persistent `Lensing: On/Off` toggle for keyboard and touch users who cannot hold the control.

If turning lensing off produces only a negligible visual difference, the implementation fails.

# Camera, zoom, and motion

Implement real, discoverable camera controls:

- pointer or touch drag: orbit/inclination;
- mouse wheel: zoom;
- trackpad scroll: zoom;
- two-finger pinch: zoom;
- visible zoom slider labeled `Distance`;
- `+` and `−` buttons;
- `+` and `-` keyboard shortcuts;
- arrow keys: controlled camera orbit;
- `R`: reset;
- visible Reset button.

Zoom must alter a renderer uniform that genuinely changes observer distance or focal length. Do not keep an unused distance field.

Show a small transient readout such as `Distance 30M` while zooming.

Clamp zoom so the user cannot become trapped inside a blank black frame. Reset must restore the calibrated default composition.

Motion requirements:

- disk filaments and emissive structure must visibly advect at default load;
- add extremely subtle camera drift or orbital parallax only if it improves the scene;
- motion should be obvious when comparing frames 1.5 seconds apart but not distracting;
- Pause must freeze all renderer time and camera drift;
- Resume must continue without a large time jump;
- `prefers-reduced-motion` starts from a polished stationary frame while preserving manual interaction.

Time must affect pixels visible in the default camera. A running animation loop with byte-identical default frames is a failure.

# Modes

Retain two scientifically honest color treatments:

## Cinematic

- warm, readable, comparatively symmetrical;
- reduced Doppler intensity difference;
- inspired by the visual choices described for *Interstellar*;
- default mode.

## Physical

- clearly stronger approaching-side brightness;
- hotter/whiter approaching side;
- dimmer/redder receding side;
- gravitational redshift and Doppler behavior described as an approximation unless completely modeled.

The difference must remain visible without requiring an extreme camera angle.

# Engineering presentation

Add an optional panel titled `How this renderer works`.

It should concisely show:

- rendering model: Schwarzschild, Kerr, or other;
- backward beam/ray tracing explanation;
- how disk intersections are found;
- how the background direction is obtained;
- lensing comparison explanation;
- disk emission and Doppler model;
- current observer distance, inclination, and field of view;
- current internal render resolution;
- current quality level and integration/table settings;
- average frame time and approximate FPS;
- scientific sources;
- third-party attribution if applicable;
- honest limitations.

Do not expose GPU vendor/device identifiers.

This panel should make a senior engineer feel that the visual has an inspectable technical foundation.

# Performance

Targets:

- ordinary desktop: approximately 50–60 FPS;
- recent phone: stable 24–30 FPS;
- no unbounded loops;
- no per-frame DOM allocation;
- cap device pixel ratio;
- adaptive internal render scale;
- reduce ray steps or lookup quality before destroying composition;
- pause when the page is hidden;
- handle resize and WebGL context loss;
- show a polished Canvas/CSS fallback rather than a blank page.

If using multipass bloom:

- render the primary result to an offscreen texture;
- use a bounded bright-pass blur;
- composite without washing out the black-hole shadow;
- preserve absolute black inside the shadow.

# Tests and regression guards

Add meaningful tests for:

- default camera is not coplanar with the disk;
- default distance and field of view produce bounded composition parameters;
- zoom inputs modify the renderer’s actual distance/FOV input;
- wheel, keyboard, slider, buttons, and reset converge on the same zoom model;
- distance is clamped;
- pause freezes simulation time;
- resume avoids a time jump;
- reduced motion starts paused;
- mode switching changes the renderer model;
- lensing comparison changes lensing strength;
- camera controls remain bounded;
- mobile quality selection;
- WebGL fallback activation.

Do not count the generated starter-title test as meaningful renderer coverage.

Add a development-only deterministic capture mode, for example:

`?capture=1&time=0&distance=30&inclination=78&mode=cinematic&lensing=1`

It must:

- freeze animation at a requested time;
- accept bounded documented camera parameters;
- render deterministically;
- avoid showing production debugging UI unless requested.

Use this mode for repeatable browser screenshots.

# Hard visual acceptance gates

Do not deploy until all of these pass.

At approximately 1440×900:

1. The complete shadow is visible.
2. Its diameter is between 42% and 50% of viewport height.
3. The accretion disk is visible without interaction.
4. A direct disk image is visible.
5. Separate lensed disk imagery is visible above and below the shadow.
6. The background visibly bends tangentially around the shadow.
7. The title and controls are readable.
8. No UI overlaps the principal subject.

At approximately 390×844:

1. The complete shadow remains visible.
2. The lensed disk remains recognizable.
3. Controls remain usable with 44px touch targets.
4. Zoom and reset are discoverable.
5. There is no horizontal scrolling.
6. The screen is not predominantly an undifferentiated black void.

Behavioral frame checks:

1. Capture the default running frame.
2. Wait 1.5 seconds.
3. Capture another frame.
4. Confirm visible disk pixels changed.
5. Pause.
6. Capture two frames 1.5 seconds apart.
7. Confirm they are visually identical.
8. Capture `lensing=1`.
9. Capture `lensing=0`.
10. Confirm obvious differences in the disk arcs and background mapping.
11. Zoom in and out and confirm the shadow changes size while remaining recoverable with Reset.

If Antigravity cannot confidently see these differences, treat the gate as failed and continue refining. Do not describe intended behavior as observed behavior.

# Workflow

1. Create an implementation-plan artifact.
2. In the plan, explicitly select and justify the beam/ray-tracing strategy.
3. Create the app through `app:create`.
4. Implement only the renderer and minimal calibration controls first.
5. Launch it locally.
6. Capture the first deterministic desktop frame.
7. Do not proceed to visual polish until the core lensing gates pass.
8. Add disk shading, background, bloom, interaction, accessibility, and technical explanation.
9. Run automated checks.
10. Run browser verification and capture evidence.
11. Perform up to three focused visual refinement passes.
12. Run the full repository verification.
13. Create a final walkthrough with observed evidence.

# Required checks

Run:

- `bun run --cwd apps/gargantua check`
- `bash scripts/verify.sh`
- the touched-file `prek` checks

Inspect:

- desktop browser screenshot;
- phone browser screenshot;
- running frame pair;
- paused frame pair;
- lensing-on/off comparison;
- minimum and maximum safe zoom;
- Cinematic and Physical modes;
- keyboard-only use;
- reduced-motion behavior;
- WebGL fallback;
- console errors;
- failed requests.

# Firebase deployment authority

This reusable prompt does not authorize deployment. Only after every local gate passes and the
operator explicitly authorizes the exact Firebase project and secondary Hosting site:

1. Run `bun run deploy gargantua --dry-run`.
2. Confirm the dry run resolves the project and site from the fork's ignored `google.project.json`.
3. Record the exact secondary-site ID and proposed Hosting URL.
4. Confirm the default Firebase Hosting site remains protected.
5. Confirm no other app or secondary site is targeted.

This prompt does not authorize:

- creating another Firebase or Google Cloud project;
- creating a different Hosting site;
- adopting an unrelated existing site;
- deploying all apps;
- changing authentication accounts;
- changing billing, IAM, APIs, databases, Auth, Functions, or custom domains;
- deleting any site or cloud resource;
- committing or pushing source code.

If the dry run does not identify the explicitly authorized secondary site, stop without deploying.

After deployment:

- verify the public URL;
- capture a production screenshot;
- exercise zoom;
- exercise lensing on/off;
- exercise pause/resume;
- inspect production console and failed requests;
- record the Firebase dashboard URL;
- confirm the default site and unrelated resources were untouched.

# Finish

Return:

- final app directory;
- rendering method and mathematical model;
- upstream code or assets used, exact revision, and license;
- default camera calibration;
- measured desktop and mobile shadow size;
- local verification results;
- deterministic capture URLs used;
- running-frame comparison result;
- paused-frame comparison result;
- lensing-on/off comparison result;
- zoom verification result;
- desktop and mobile screenshots;
- accessibility checks;
- measured performance;
- app check result;
- repository verification result;
- deployed URL;
- Firebase dashboard URL;
- production browser verification;
- files changed;
- git status;
- remaining limitations.

Separate:

- implemented locally;
- locally verified;
- deployed;
- live verified;
- committed;
- pushed.

Do not claim a state without evidence. 
<!-- PROMPT_END -->
```

---

## 🌌 Overview & Features

**Gargantua** is an interactive, physically-inspired black hole visualizer rendered entirely in GLSL via WebGL2.

- **Gravitational Light Deflection (Lensing):** Simulates geodesic ray bending around a Schwarzschild mass ($R_H = 2M$, Photon Sphere $R_{ph} = 3M$).
- **Keplerian Accretion Disk:** Dynamic plasma turbulence advecting with differential Keplerian velocity ($\Omega \propto r^{-3/2}$) and temperature-based blackbody coloration.
- **Relativistic Doppler & Gravitational Redshift:** Accretion disk emissions dynamically shift toward blue when approaching the observer and red when receding or deep inside the gravitational potential well.
- **Interactive Spacetime Distortion:** Features a "Hold to Flatten Spacetime" control that dynamically scales gravitational bending to $0.0$ to directly compare warped vs. flat spacetime physics.
- **Render Modes:**
  - **Full Physics (Relativistic):** Complete accretion disk, gravitational lensing, Doppler shift, and starfield distortion.
  - **Lensing Only:** Isolated gravitational light bending around the photon sphere and shadow.
  - **Disk Only:** Accretion disk rendering without spacetime curvature.
- **Performance & Controls:**
  - Orbit camera controls (drag to orbit, wheel/pinch to zoom).
  - Ray step quality levels (Draft, Balanced, Cinematic High Quality).
  - Clean capture mode for screenshots and benchmarks.

---

## 🚀 Getting Started

### Prerequisites

- Node.js & Bun runtime installed.

### Development Commands

Run commands from `apps/gargantua` directory:

```sh
# Start local development server
bun run dev

# Run full check suite (typecheck, tests, build)
bun run check

# Run unit & integration tests
bun run test

# Typecheck TypeScript code
bun run typecheck

# Build production bundle
bun run build
```

Alternatively, from the repository root:

```sh
bun run --cwd apps/gargantua dev
```

---

## 🏗 Architecture & Code Structure

- [`src/shaders.ts`](./src/shaders.ts): GLSL WebGL2 fragment shader containing ray-marching routines, Schwarzschild geodesic math, Keplerian noise functions, Doppler shift, and starfield generation.
- [`src/renderer.ts`](./src/renderer.ts): WebGL2 context manager, shader compiler, uniform update loop, and FPS frame time monitoring.
- [`src/controls.ts`](./src/controls.ts): Pointer, touch, and scroll event listeners for camera orbit and smooth distance transitions.
- [`src/ui.ts`](./src/ui.ts): Interactive control panel, mode selectors, quality switches, HUD stats, and educational modal.
- [`src/state.ts`](./src/state.ts): Central state management with subscriber dispatching for smooth UI and renderer sync.
