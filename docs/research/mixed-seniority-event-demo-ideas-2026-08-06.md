# Mixed-Seniority Demo Ideas for Intro to GDG

- `Tease:` The best next demo is a hand-controlled Gravity Lab, followed by a short Prompt-to-Proof teardown of Gargantua's first pass.
- `Lede:` Use a three-step ladder: Numeronym gives everyone an instant win, Gravity Lab creates a room-scale spectacle, and Prompt-to-Proof reveals the engineering discipline behind a trustworthy agent-built result.
- `Why it matters:`
  - Beginners need an obvious action and immediate feedback before they need architecture.
  - Senior engineers are more likely to respect visible constraints, failure handling, performance tradeoffs, and proof than another polished CRUD screen.
  - The existing demo set already covers practical software, shared interaction, and a camera game; the missing piece is a spectacle whose internals are worth inspecting.
- `Go deeper:` Build Gravity Lab as the next flagship, use the archived Gargantua attempt as an honest case study, and use the second research slate for six distinct follow-up concepts spanning safe AI execution, on-device embeddings, authentication, audio, reliability, and event replay.

**Date:** 2026-08-06 (America/Chicago)

**Research question:** Which demos can impress experienced engineers without making beginners feel that the event is not for them?

**Decision state:** `recommend` — ideas and run-of-show guidance only. No app build, cloud mutation, deployment, commit, or publication is authorized by this memo.

## Short Answer

The strongest sequence is:

1. **Numeronym Generator — “I can use this.”** Give the room a 60–90 second QR-code interaction.
2. **Gravity Lab — “I did not know a browser could do this.”** Let a hand, pointer, or phone tilt bend a live particle field.
3. **Prompt-to-Proof — “I understand why engineering still matters.”** Use Gargantua's first-pass miss to show the difference between generated code, passing checks, and a verified visual outcome.

Do not try to make one demo equally deep at every instant. Give every demo a simple surface and an optional engineering reveal.

## What the Local Workspace Already Establishes

The public event materials already cover these lanes:

- [Numeronym Generator](../events/README.md) supplies a low-friction phone interaction.
- [Bison Byte Dash](../events/antigravity-one-shot-prompts.md#one-shot-prompt-3--bison-byte-dash) supplies motion/camera spectacle with keyboard and touch fallbacks.
- [Example CRM](../events/antigravity-one-shot-prompts.md#one-shot-prompt-1--example-crm) supplies practical business value.
- [Room Pulse](../events/antigravity-one-shot-prompts.md#one-shot-prompt-2--room-pulse) supplies shared audience interaction, but the current public prompt is intentionally local-only and does not claim separate-device synchronization.
- Gargantua supplies a useful failure case: its first pass built and deployed, yet did not make lensing, motion, scale, or zoom legible enough. That is evidence that source checks and a build are not substitutes for a visual acceptance contract.

The workspace's durable lesson is therefore not “generate more apps.” It is “show different kinds of capability, then show how the result is proved.”

## Ranked Ideas

| Rank | Demo | Beginner moment | Senior-engineer hook | Stage risk | Recommendation |
| ---: | --- | --- | --- | --- | --- |
| 1 | **Gravity Lab** | Move a hand or pointer and bend a field of light/particles | MediaPipe backpressure, WebGPU compute, adaptive quality, deterministic replay, fallback renderer | Medium | Build next |
| 2 | **Prompt-to-Proof: Gargantua** | Spot what looks wrong and vote on the most important fix | Visual contracts, before/after capture, performance budget, browser evidence, honest failed attempt | Low if the improved result is prebuilt | Put in the main talk |
| 3 | **The Wi-Fi Will Fail** | Edit two “devices” offline and watch them converge | Event log, conflict resolution, idempotency, deterministic simulation, property tests | Low–medium | Best non-AI engineering demo |
| 4 | **Local/Cloud AI Switchboard** | Watch a task continue when the network is disabled | Capability detection, model routing, privacy boundary, cold start, fallback semantics | High | Rehearse for a later advanced session |
| 5 | **Tulsa in 3D** | Fly from the room to local landmarks | Camera state, 3D map primitives, performance and key restrictions | Medium–high | Visually strong, operationally secondary |
| 6 | **Room Pulse: Fault-Injection Edition** | Vote and see the projector update | Firestore rules, offline queueing, delayed writes, synthetic failure mode, teardown | Medium | Upgrade only if a real multi-device poll is needed |

## 1. Gravity Lab

### Audience experience

A full-screen field of tens or hundreds of thousands of particles behaves like dust, stars, or light. A volunteer raises a hand; the field bends around their palm. Pinching changes gravity strength. Opening a hand creates a repulsive wave. Keyboard, pointer, and touch controls always work.

Keep the explanation beginner-safe:

> The camera finds a few hand landmarks. Those numbers become forces. The browser's GPU moves and draws the field.

### Why experienced engineers may care

- MediaPipe live-stream inference is asynchronous and may drop input frames to keep latency low. The app should treat that as backpressure, not as an error.
- GPU compute and rendering can be visibly separated from the CPU-side input pipeline.
- The app can expose a small live diagnostics strip: input FPS, accepted inference frames, render scale, particle count, and active fallback.
- A deterministic recorded-landmark trace can replay the exact demo without the camera. That makes failures reproducible and gives the stage operator a rescue path.
- WebGPU should be capability-detected. A smaller WebGL2 or Canvas path must remain attractive and interactive.

### Definition of done

- The visual responds within one obvious gesture or pointer movement.
- Camera permission is requested only after explanation and user activation.
- No camera frame is stored or transmitted.
- Keyboard/pointer/touch play is complete without the camera.
- A deterministic trace can replay at least three gestures.
- Adaptive quality maintains responsiveness without inventing an FPS claim.
- The UI names whether WebGPU, WebGL2, or Canvas is active.
- Reduced-motion mode begins in a calm, manually controlled state.

### What to avoid

- Do not turn it into another generic particle wallpaper.
- Do not hide dropped inference frames or quality changes.
- Do not make a working camera the only successful path.
- Do not let an unsafe particle count freeze the presenter's machine; cap it and expose a deliberate stress-test mode separately.

## 2. Prompt-to-Proof: Gargantua

This should be a demo of engineering judgment, not a public postmortem of the agent.

### Stage sequence (about five minutes)

1. Show the first pass for 15 seconds with no commentary.
2. Ask the room: “What promise did this miss?” Collect three observations: lensing, motion, scale/zoom, or discoverability.
3. Reveal the original prompt beside a six-item visual acceptance contract.
4. Show the improved prebuilt version and its browser evidence: before/after frames, interaction recording, forced fallback, reduced motion, console/network check, and measured render behavior.
5. End on the distinction: **built**, **checked**, **deployed**, and **visually verified** are four different states.

### Acceptance checks worth making visible

- The far side of the disk is visibly wrapped above and below the shadow.
- The black-hole shadow occupies a bounded fraction of the viewport at desktop and phone sizes.
- Motion is visible within one second but reduced-motion mode is initially still.
- Zoom and drag affordances are discoverable without reading documentation.
- A forced fallback query produces a usable non-WebGL result.
- A reference screenshot or simple image metric catches a return to an oversized, static ring.

Antigravity's official workflow supports implementation plans, task lists, code diffs, walkthroughs, screenshots, and browser recordings. Showing those artifacts turns “the agent says it worked” into a reviewable claim.

## 3. The Wi-Fi Will Fail

Render two phone-shaped panes and a small network switch. Both panes edit the same simple artifact—perhaps a checklist, pixel mural, or ranked list. Turn the network off, make conflicting edits, turn it back on, and animate the event log until both sides converge.

The beginner story is “your work does not disappear when Wi-Fi fails.” The advanced story is:

- immutable operations rather than last-write-wins blobs;
- explicit conflict policy;
- duplicate-delivery and out-of-order simulation;
- deterministic seeded network faults;
- convergence and idempotency tests;
- durable local state with a separately explained shared-cloud upgrade.

This is less visually spectacular than Gravity Lab but may earn more respect from distributed-systems engineers because the hard part is visible rather than hidden behind an API.

## 4. Local/Cloud AI Switchboard

Let attendees paste a short note and choose translate, summarize, or rewrite. The UI visualizes the route:

```text
Browser capability check -> on-device model when ready -> protected cloud fallback -> deterministic non-AI fallback
```

This is a strong later workshop because Chrome's built-in AI APIs expose genuinely interesting constraints: availability varies by API and platform, model download and warm-up are real user states, and some foundation-model APIs require substantial local storage. It is not the safest primary stage demo because current availability is still uneven. A cloud fallback through Firebase AI Logic also introduces project configuration, App Check, quotas, and an explicit data boundary.

If built, the UI must tell the truth about which route ran, whether text left the device, and why a fallback occurred.

## 5. Tulsa in 3D

Create a short, cinematic fly-through from Gradient to two or three Tulsa landmarks. Let the audience choose the next stop and overlay one community fact or upcoming event at each location.

The senior hook is not merely the 3D map. It is disciplined camera-state interpolation, abortable transitions, constrained coverage, key restrictions, and accessible non-map content. Current Maps JavaScript 3D APIs include camera position, field of view, animated fly-to/fly-around behavior, and newer route primitives, but they require a Google Maps API key and careful billing/key setup. Keep a recorded fallback and never make this the first live build.

## 6. Room Pulse: Fault-Injection Edition

If Room Pulse becomes a real cross-device Firebase app, add a presenter-only reliability panel:

- normal network;
- delayed writes;
- display temporarily offline;
- synthetic votes clearly labeled;
- rules-denied invalid vote;
- frozen last-known-good display.

That turns a familiar realtime demo into an engineering story about rules, eventual delivery, privacy, and graceful degradation. Do not expose attendee identifiers or imply one-person/one-vote security beyond the actual anonymous-auth and storage model.

## Six More Ideas — Second Research Pass

These deliberately avoid duplicating the first slate's particle spectacle, visual-verification case study, offline convergence, local/cloud routing, 3D map, and realtime poll.

| New rank | Demo | Ten-second beginner interaction | Senior-engineer reveal | Stage risk | Verdict |
| ---: | --- | --- | --- | --- | --- |
| 1 | **Tiny Universe Compiler** | Describe a world and watch it appear | Constrained DSL, JSON Schema, semantic validation, capability sandbox, deterministic replay | Medium | Best new AI demo |
| 2 | **Keep Tulsa Online** | Create a traffic spike and choose how the service responds | Retry budgets, load shedding, backpressure, idempotency, degraded service | Low | Best architecture game |
| 3 | **Semantic Constellation** | Add a drawing or image and see where it lands | On-device embeddings, cosine similarity, quantization, uncertainty, worker boundary | Medium | Best on-device ML demo |
| 4 | **Passkey Phishing Escape Room** | Use a device unlock to open the real door; watch the fake door fail | WebAuthn ceremony, origin/RP binding, challenges, public-key verification, recovery | Medium–high | Best security demo |
| 5 | **Clap-to-Color Sound Reactor** | Clap and launch a visible wave across the screen | AudioWorklet timing, render-thread separation, onset detection, ring buffers, privacy | Low–medium | Best no-account spectacle |
| 6 | **Time Machine Editor** | Draw, scrub backward, branch, and replay | Event sourcing, projections, schema evolution, deterministic replay, temporal queries | Low | Best pure-software demo |

## 7. Tiny Universe Compiler

### Audience experience

Ask the room for three constrained ingredients:

- a world shape: `vortex`, `orbit`, `rain`, or `swarm`;
- a mood: `calm`, `electric`, `solar`, or `midnight`;
- one interaction: `attract`, `repel`, `split`, or `freeze`.

Gemini converts the description into a small versioned scene document. The browser validates it, displays the accepted instructions, and renders the world. One audience revision—“make it colder and split when I click”—updates the scene without replacing the application.

### Senior-engineer hook

The model never writes or executes JavaScript, shader source, HTML, URLs, or arbitrary expressions. It can emit only a capability-limited scene DSL such as:

```json
{
  "version": 1,
  "system": "orbit",
  "palette": "solar",
  "particleCount": 40000,
  "interaction": "repel",
  "force": 0.42
}
```

The application then applies two validation layers:

1. **Schema validation:** required keys, enums, types, and numeric ranges.
2. **Semantic validation:** resource budgets, compatible combinations, accessibility limits, and safe defaults.

Google's structured-output guidance explicitly warns that syntactically valid JSON is not necessarily semantically correct. That is the lesson: structured output narrows uncertainty; application code still owns meaning and execution.

### Rescue and proof

- Ship six prepared scene documents and a deterministic replay of the live API response.
- Show rejected unknown keys and an out-of-budget particle count.
- Display `MODEL PROPOSAL`, `VALIDATED SCENE`, and `RENDERER STATE` as three separate states.
- If the API is unavailable, use the same interpreter with a prepared scene rather than faking a live model response.

### What to avoid

- Do not evaluate model-produced code or shader text.
- Do not hide validation failures behind silent coercion.
- Do not claim JSON Schema removes prompt-injection or semantic risk.
- Do not make a Gemini call necessary for the finished artifact to remain demonstrable.

## 8. Keep Tulsa Online

### Audience experience

Render a cheerful fictional community service—event registration, weather alerts, or taco ordering—as a small animated system. Audience taps or a QR-controlled facilitator button create traffic. Queues grow, latency rises, and servers change color. The room must choose among:

- add capacity;
- shed low-priority work;
- serve stale but useful data;
- retry immediately;
- retry with budget and jitter;
- open a circuit and recover.

The system either survives or enters a visible retry storm.

### Senior-engineer hook

This is a deterministic simulator grounded in real reliability ideas, not a cartoon claiming to reproduce production infrastructure:

- per-request and per-client retry budgets;
- retries increasing offered load;
- idempotent versus non-idempotent work;
- queue depth, service rate, and backpressure;
- degraded responses and last-known-good state;
- load shedding before total failure;
- seeded incident replay and post-incident timeline.

Google's SRE guidance emphasizes graceful overload handling, degraded results, bounded retries, and preventing retry amplification. Current Google Cloud guidance also says retry safety depends on idempotency.

### Definition of done

- Normal, burst, slow dependency, and retry-storm scenarios use fixed seeds.
- The presenter can pause and inspect every queue and retry decision.
- An accessibility-friendly table presents the same state without depending on color or animation.
- The simulation clearly labels its assumptions and does not present generated capacity numbers as measurements.
- One invariant test proves accepted + rejected + queued requests reconcile with arrivals.

## 9. Semantic Constellation

### Audience experience

Start with a prepared set of harmless drawings or public-domain object images. A volunteer adds one local image or draws a rough symbol. The app produces an on-device embedding, compares it with the collection, and animates the item into a constellation near its closest neighbors.

Ask the room why a sketch of a mug may land near a bowl, or why two visually similar objects may remain far apart. That makes model behavior discussable without turning the app into a magical classifier.

### Senior-engineer hook

- MediaPipe's Image Embedder produces numerical feature vectors suitable for cosine-similarity comparison.
- The UI can switch between floating-point and quantized embeddings when supported and show size/precision tradeoffs.
- Similarity search, projection into two dimensions, and rendering should be separate, deterministic stages.
- Inference belongs off the interaction path when possible; the UI needs explicit model-loading and unsupported states.
- The result should expose nearest-neighbor scores and an abstention threshold rather than inventing labels.

### Privacy and honesty

- Prefer drawings and a prepared safe image pack.
- Local uploads remain in memory unless the user explicitly exports a project.
- Do not run face identification, infer sensitive traits, or describe similarity as identity.
- Say “near in this model's embedding space,” not “the AI understands these are the same.”

### Rescue path

Precompute the prepared pack's embeddings and keep a deterministic fallback constellation. A live-added image is the stretch moment, not the only working moment.

## 10. Passkey Phishing Escape Room

### Audience experience

Show two nearly identical vault doors on two deliberately distinct HTTPS origins:

- the legitimate relying-party origin;
- a visibly labeled training-only lookalike origin.

A volunteer registers a disposable demo passkey on the legitimate door using their device unlock. The legitimate door accepts the later signed challenge. The lookalike cannot request that credential for its different relying-party identity.

### Senior-engineer hook

Peel back the ceremony as a short sequence diagram:

```text
server challenge -> browser/origin check -> authenticator signature -> server verification
```

Then show what is—and is not—stored:

- the authenticator retains the private key;
- the relying party stores a public key and credential metadata;
- the biometric material does not go to the site;
- the server must verify the challenge, signature, origin, and relying-party identity;
- account recovery and authenticator/server synchronization still need product design.

Google's passkey documentation describes passkeys as bound to a website or app identity and therefore resistant to phishing. MDN's WebAuthn documentation confirms the server-challenge and signed-response flow.

### Stage-safety requirements

- Use disposable demo accounts and never ask for a personal password.
- Explain the device prompt before triggering it.
- Build the full server-side verification path; a client-only ceremony is not an authentication proof.
- Use two controlled origins and make the fake origin unmistakably educational.
- Provide a recorded ceremony and a security-key/passkey capability check.
- Do not store attestation or credential data longer than the demo requires.

## 11. Clap-to-Color Sound Reactor

### Audience experience

The screen begins as a quiet field. One clap launches a ring. Sustained room sound adds texture. Three claps in rhythm change the palette or pattern. A keyboard and touch pad generate identical events without microphone access.

This is more inclusive than asking someone to perform a full-body camera gesture, works as an arrival activity, and makes the whole room feel connected to the display.

### Senior-engineer hook

- AudioWorklet runs custom audio processing on the Web Audio rendering thread rather than the main UI thread.
- The demo can show the boundary between raw audio frames, a small onset/energy event stream, and GPU/Canvas rendering.
- A bounded ring buffer, zero-allocation hot path, render decimation, and explicit overrun counter are inspectable engineering decisions.
- The visualizer should consume compact events, not copy raw audio continuously into UI state.

### Stage-safety requirements

- Request microphone access only after explanation and user activation.
- Process audio locally; do not record, retain, or transmit it.
- Avoid routing microphone input to speakers, which can create feedback.
- Use a calibrated noise floor and manual sensitivity control for the venue.
- Offer a deterministic synthetic clap track, keyboard/touch input, reduced motion, and a high-contrast nonanimated event counter.

AudioWorklet is widely available and uses a separate rendering thread, but its real-time constraints are exactly why the hot path must remain small and allocation-conscious.

## 12. Time Machine Editor

### Audience experience

Use an attractive shared artifact—a pixel mural, route map, constellation, or tiny stage layout. Every action becomes a visible card in a timeline. The presenter scrubs backward, branches from an earlier moment, changes one decision, and replays to a different outcome.

Then introduce a bug in the projection logic, fix the projector, and rebuild the current view from the unchanged event log.

### Senior-engineer hook

- immutable, versioned domain events;
- pure projections from events to current state;
- temporal queries and branch comparison;
- deterministic replay from a fixed log;
- schema evolution and upcasting of an older event;
- snapshot optimization presented as optional, not foundational;
- explicit warning that event sourcing adds modeling and operational complexity.

Martin Fowler's foundational description identifies complete rebuild, temporal query, and event replay as the characteristic benefits. Practitioner reports also warn that modeling and event-schema evolution require real upfront work, so this should be presented as a useful bounded pattern—not a default architecture.

### Definition of done

- Replaying the same versioned event log produces the same digest.
- A bad or unknown event version fails visibly without corrupting the log.
- Branches share history without mutating it.
- Keyboard controls and a textual event table expose the entire experience.
- Import/export uses fictional, versioned demo data.

## Second-Slate Recommendation

If choosing only one of these six, build **Tiny Universe Compiler**. It is the clearest Google-AI demo because it shows both the magic and the boundary: Gemini proposes a constrained artifact, but typed application code decides what is safe and meaningful.

If choosing two, add **Keep Tulsa Online**. Together they make a compelling pair:

1. AI under a capability boundary.
2. Distributed systems under failure pressure.

That pairing is more credible to experienced engineers than two generative interfaces, while both remain playable by someone who has never written code.

## Recommended Run of Show

| Time | Beat | Purpose |
| ---: | --- | --- |
| 0:00–0:02 | Numeronym QR | Immediate success; lower the confidence barrier |
| 0:02–0:06 | Gravity Lab | Spectacle with one volunteer and a pointer fallback |
| 0:06–0:08 | Peel back the diagnostics | Show inference, GPU, quality, and replay without a code lecture |
| 0:08–0:13 | Prompt-to-Proof Gargantua | Make verification and human judgment the main lesson |
| 0:13–0:15 | QR to prompts/repository | Give beginners a next step and seniors an inspectable artifact |

If there is time for only one new artifact, build Gravity Lab. If there is time for no new artifact, run Prompt-to-Proof with Gargantua and the existing numeronym demo.

## Rehearsal Contract

Every stage demo should have:

1. A **one-sentence promise** the audience can judge.
2. A **10-second first interaction** with no setup explanation.
3. A **rescue artifact** that is already built and locally available.
4. A **deterministic replay** for camera, network, or model-dependent input.
5. A **visible fallback**, not a blank canvas or frozen spinner.
6. A **proof packet**: tests, browser flow, console/network check, and one honest limitation.
7. A **scope boundary** stating what is local, shared, deployed, private, or simulated.

## Current Evidence and Caveats

### Confirmed

- Google's Antigravity codelab describes plan, task-list, diff, walkthrough, screenshot, and browser-recording artifacts as review surfaces.
- Google's Gemini prompting guidance recommends precise, direct instructions, consistent structure, defined parameters, and critical constraints early.
- MediaPipe Gesture Recognizer supports live streams and may drop frames while busy to reduce latency.
- Current WebGPU practitioner demos show that browser GPU compute can be spectacular, but also demonstrate that unconstrained stress tests can freeze hardware.
- Chrome built-in AI API availability and hardware requirements are not uniform enough to make the Local/Cloud Switchboard the main beginner demo.
- Firebase AI Logic can protect client-side Gemini access through App Check, but that is real infrastructure rather than a free static-demo detail.

### Inference

- Gravity Lab is likely to bridge the room better than another dashboard because its first action is physical and obvious while its internal tradeoffs are inspectable.
- Turning Gargantua's miss into a verification case study is likely to increase credibility with experienced engineers more than hiding the miss and showing only a polished replacement.

### Unknown until rehearsal

- Venue lighting and camera framing for hand recognition.
- GPU/browser support on the exact presentation machine.
- Projector visibility of fine particle detail and diagnostic text.
- Whether generic Firebase Hosting names such as `gravity-lab.web.app` are globally available.

## Sources

### Primary and implementation sources

- [Google Codelabs: Getting Started with Antigravity IDE](https://codelabs.developers.google.com/getting-started-agy-ide) — artifacts, review flow, browser verification, screenshots, and recordings.
- [Gemini API: Prompt design strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies) — current Gemini 3 prompt structure and constraint guidance.
- [Gemini 3.6 Flash model page](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash) — current model capabilities and unsupported Live API boundary.
- [Google AI Edge: MediaPipe Gesture Recognizer](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/GestureRecognizer) — live-stream behavior and frame dropping.
- [Google AI Edge: official MediaPipe samples](https://github.com/google-ai-edge/mediapipe-samples) — implementation validation layer.
- [Chrome for Developers: WebGPU](https://developer.chrome.com/docs/web-platform/webgpu/) — browser GPU API guidance.
- [WebGPU samples](https://github.com/webgpu/webgpu-samples) — active reference implementations and compatibility issues.
- [Chrome built-in AI](https://developer.chrome.com/docs/ai/built-in) and [Prompt API](https://developer.chrome.com/docs/ai/prompt-api) — availability, model lifecycle, platform, and storage constraints.
- [Firebase AI Logic](https://firebase.google.com/docs/ai-logic) and [App Check guidance](https://firebase.google.com/docs/ai-logic/app-check) — client-side Gemini gateway and abuse protection.
- [Maps JavaScript 3D reference](https://developers.google.com/maps/documentation/javascript/reference/3d-map) and [release notes](https://developers.google.com/maps/documentation/javascript/releases) — current 3D camera and route primitives.
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output) — JSON Schema support plus the requirement for application-level semantic validation.
- [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling) — the model proposes structured calls while the application remains responsible for execution.
- [Google AI Edge Image Embedder](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/ImageEmbedder) — feature-vector extraction and cosine-similarity support.
- [Google AI Edge organization and browser samples](https://github.com/google-ai-edge) — active on-device ML implementation validation.
- [Google passkeys](https://developers.google.com/identity/passkeys) — phishing resistance, relying-party identity, public-key storage, and biometric privacy.
- [MDN WebAuthn](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API) and [passkey security](https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Passkeys) — challenge/signature flow, origin binding, and server synchronization boundary.
- [Chrome AudioWorklet introduction](https://developer.chrome.com/blog/audio-worklet/) and [design patterns](https://developer.chrome.com/blog/audio-worklet-design-pattern) — rendering-thread processing, worklet/worker boundaries, buffers, and glitch risks.
- [MDN AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet) — current secure-context and cross-browser availability baseline.
- [Google SRE: Handling Overload](https://sre.google/sre-book/handling-overload/) and [Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/) — degraded service, load shedding, retry budgets, and retry amplification.
- [Google Cloud retry strategy](https://docs.cloud.google.com/storage/docs/retry-strategy) — idempotency as a prerequisite for safe retries.
- [Martin Fowler: Event Sourcing](https://www.martinfowler.com/eaaDev/EventSourcing.html) — complete rebuild, temporal queries, and event replay.

### Practitioner signal

- [Hacker News: WebGPU benchmark with millions of moving nodes](https://news.ycombinator.com/item?id=45935117) — concrete GPU-compute spectacle plus an explicit hardware-freeze warning at unsafe counts.

## Verification Checkpoint

- `Goal:` Recommend twelve distinct demo concepts that serve beginners and experienced engineers at the same event.
- `Local evidence reviewed:` Public event hub, one-shot prompt library, current project contract, relevant prior task summaries, and the parked Gargantua first-pass state.
- `External evidence reviewed:` Current Google/Chrome/Firebase/Identity documentation, official GitHub samples, Google SRE guidance, foundational event-sourcing guidance, and concrete practitioner implementation discussions.
- `Files changed:` This memo only.
- `Not performed:` No app creation, format rewrite, dependency installation, test run, cloud query, deployment, commit, push, or publication.
