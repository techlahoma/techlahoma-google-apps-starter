# CUT/LOCAL

- `Tease:` A local-first nonlinear browser video editor with real in-browser export.
- `Lede:` CUT/LOCAL began with a bounded generated-scene editing core, then received a second prompt for imported media, source monitoring, multitrack editing, audio, and export.
- `Why it matters:` The two-prompt sequence records how the app moved from a credible vertical slice toward a practical editor without replacing the verified compositor and export architecture.
- `Go deeper:` Open the [live app](https://launchcut.web.app), then read the prompt sequence below in order.

## Deployment

Live app: [launchcut.web.app](https://launchcut.web.app) returned HTTP 200 on 2026-08-06 and served the page title “CUT/LOCAL — Browser Video Editor.”

The URL proves a static release is present. It does not prove that every capability requested by the second prompt is implemented or that the deployed build matches the source committed here byte-for-byte.

## Commands

```sh
bun run dev
bun run check
bun run app:browser:verify --app cut-local
bun run app:verify --app cut-local
```

Firebase Hosting configuration is app-local. Root cloud commands must receive
`--app cut-local` so they cannot deploy another workspace accidentally.

## Prompt sequence

CUT/LOCAL was produced through more than one supplied prompt. Prompt 1 establishes and verifies the editor engine around deterministic generated media. Prompt 2 continues from that working implementation and expands it into a real-media nonlinear editor. They must be read as a sequence; Prompt 2 is not a standalone scaffold request.

### Prompt 1 — verified editor core

```text
# Build CUT/LOCAL completely in one run

Execute this task autonomously. Do not stop at a plan and do not ask routine questions. Build, debug, test, run the browser proof, and polish the result before reporting. This is a focused vertical slice: finish every item below before adding anything else.

## Outcome

Create `apps/cut-local`, a polished local-first browser video editor for a deterministic project called **Launch Cut**. The complete flow must work:

**preview a 9-second edited timeline → make real edits → export that edited timeline locally → load and play the real exported video inside the app.**

Read `AGENTS.md`, `PROJECT.md`, `apps/AGENTS.md`, `.agents/skills/build-and-launch-demo/SKILL.md`, the app generator, and the browser verifier first. Follow the repository conventions. Keep all implementation in `apps/cut-local`; outside it, change only the root lockfile if dependency installation requires it. No backend, cloud, auth, upload, remote API, telemetry, or deployment.

## Scope freeze

The initial project has three animated Canvas 2D scenes, each 3 seconds:

- BUILD: warm construction grid and moving lines
- CUT: cool kinetic split composition
- SHIP: green orbital/launch composition

Use a dark professional editor layout with project header, generated scene thumbnails, aspect-aware preview, transport/timecode, scene timeline with ruler/clip blocks/playhead/title track, selected-clip inspector, and export/output panel. Phone layout must retain preview, timeline, play/pause, scrubber, split, four trim buttons, reorder, delete, title, aspect, undo/redo, and export without a keyboard.

Required editing operations:

1. select and scrub;
2. play/pause in real elapsed time;
3. split the selected scene exactly at the current playhead;
4. trim start earlier/later and trim end earlier/later by 0.25s, minimum clip length 0.5s;
5. move selected scene earlier/later;
6. ripple delete with no gaps/overlaps;
7. edit the title overlay;
8. switch 16:9 (1280×720), 1:1 (720×720), and 9:16 (720×1280);
9. undo/redo every edit and reset the demo.

Trim labels and semantics are exact—wire each button explicitly rather than deriving an ambiguous action from label fragments:

- **Trim start − / earlier:** `sourceIn -= 0.25`; duration grows by 0.25 when source media permits.
- **Trim start + / later:** `sourceIn += 0.25`; duration shrinks by 0.25.
- **Trim end − / earlier:** `sourceOut -= 0.25`; duration shrinks by 0.25.
- **Trim end + / later:** `sourceOut += 0.25`; duration grows by 0.25 when source media permits.

Clamp at source bounds and the 0.5-second minimum. Do not accept a test that merely proves a value changed; prove the correct boundary changed by exactly 0.25 in the correct direction while the other boundary stayed unchanged.

Use one typed edit-decision-list model. Store source in/out plus normalized timeline start/end. Preview, timeline, persistence, undo/redo, and export must all use that model. Persist a versioned validated payload; catch JSON parsing errors and reject malformed history/projects. Save undo and redo results. Do not record playback ticks in history.

## Non-negotiable interaction architecture

Mount the editor DOM and attach event listeners once. **Never replace the app root or control subtree with `innerHTML` during playback, scrubbing, export progress, or normal state updates.** Controls must remain stable for users and Playwright.

- During each animation frame update only the preview canvas, timecode text/data, playhead transform/position, and necessary button text/state.
- Use the animation callback timestamp or `performance.now()` delta. Never add a fixed frame duration per callback.
- Put elapsed-time math in a pure unit-tested function.
- Pause/resume must reset the last timestamp without drift.
- Ordinary edits may call focused render/update functions, but must not destroy and recreate focused controls.
- Avoid animations on buttons or control geometry. Honor `prefers-reduced-motion`.

Create readable modules for model/history, persistence, compositor, exporter, and UI entrypoint. Do not minify or pack many statements onto single lines. Preview and export must call the same deterministic `renderFrame(project, canvas, timelineSeconds)` compositor.

The preview canvas intrinsic `width`/`height`, CSS aspect ratio, and stable `data-render-width`/`data-render-height` must all change with aspect. Expose clip `data-start`, `data-end`, `data-source-in`, and `data-source-out`, and numeric playhead `data-seconds` so the smoke test can prove behavior.

## Direct Mediabunny export only

Encode directly with Mediabunny. **Do not use `MediaRecorder`, `canvas.captureStream`, direct WebCodecs, a simulated timer, a GIF, or a prebuilt/sample file.** Merely calling a Mediabunny capability helper before another export path does not count.

Use this pipeline:

1. Get dimensions from the selected aspect.
2. Call Mediabunny `getFirstEncodableVideoCodec(['avc', 'vp9', 'vp8'], {width, height, bitrate})`.
3. Use `Mp4OutputFormat` for `avc`; use `WebMOutputFormat` for `vp9` or `vp8`.
4. Create `Output` with `BufferTarget`, create `CanvasSource` with the negotiated codec, add its video track, and `await output.start()`.
5. For every frame at 30 fps: check the abort signal, call the shared compositor, then **await** `source.add(timestampSeconds, durationSeconds)` for backpressure and update progress from completed frames.
6. On cancellation, cancel/clean up the partial output and enter `cancelled`. A retry must work without reload.
7. Otherwise `await output.finalize()`, create a Blob with the output MIME type, and enter `verifying`.

Use an explicit UI state machine: `idle → negotiating → encoding → finalizing → verifying → verified`, plus `cancelled` and `failed`. The exporter returns bytes/codec/container but must not declare them verified.

Only show **EXPORT VERIFIED** after the UI loads the Blob into its own muted `<video>`, proves exact dimensions, proves duration within one frame plus normal container tolerance, calls `play()`, waits, and proves `currentTime` advanced. Then pause it. Show codec/container, dimensions, duration, byte size, download, and replay. Revoke replaced object URLs. If no codec works, show a useful error.

## Proof, not button invocation

Write focused Bun tests that assert:

- elapsed-time playback including pause and end;
- exact split/source-range preservation;
- all trim bounds;
- reorder and ripple contiguity;
- aspect/title mutation;
- undo/redo and persistence validation/fallback.

Implement `apps/cut-local/e2e/smoke.spec.ts` with the exact exported function expected by the repository verifier. It must load and run; do not accept the verifier's generic screenshot fallback. Add explicit timeouts around export so a failure throws instead of hanging.

The custom smoke must assert observable results:

1. no page/console errors and initial duration exactly 9.0s;
2. after 500–600ms of playback, numeric playhead delta is between 0.25s and 1.1s; after Pause it remains stable;
3. scrub to 1.50s and Split; clip count becomes 4 and adjacent source/timeline boundary attributes equal 1.50s; Undo returns to 3 clips and Redo returns to 4;
4. exercise all four trim buttons from a clip with room on both boundaries; for each, assert the exact `sourceIn` or `sourceOut` delta from the table above and assert the other boundary is unchanged; then assert reorder and ripple delete produce the intended order and a contiguous timeline;
5. title changes the preview-visible overlay/state;
6. selecting 1:1 changes the real canvas properties and data attributes to 720×720 and changes its bounding-box ratio from the initial 16:9 ratio;
7. start export, wait until Cancel is enabled, cancel, and assert `cancelled`; start again and wait up to 120 seconds for success;
8. independently inspect the output `<video>`: 720×720, edited-project duration within tolerance, `play()` succeeds muted, and `currentTime` advances before `EXPORT VERIFIED` appears;
9. at phone viewport, assert every required touch control and the preview/timeline are visible and reachable;
10. save desktop and phone screenshots to `apps/cut-local/test-results/smoke-desktop.png` and `smoke-phone.png`.

Do not implement a smoke that only clicks controls, checks only that a number changed, reads the app's own success label, or omits export. When waiting for Cancel, use an enabled assertion or poll rather than inventing an unsupported locator wait state. Fix the app if Playwright cannot stably click Pause or Cancel.

Before running the verifier, reopen your completed smoke source and enforce this acceptance lock. The desktop flow must visibly contain, in this order:

1. the first Export click;
2. an enabled Cancel wait, Cancel click, and assertion of `cancelled`;
3. a **second** Export click and bounded wait for `verified`;
4. independent reads of `videoWidth`, `videoHeight`, and `duration` from the output video;
5. `const before = video.currentTime`, `await video.play()`, a 250–500ms wait, and an assertion that `video.currentTime > before`, followed by `pause()`;
6. the desktop screenshot only after all those assertions pass.

If any item is absent, the smoke is incomplete—add it before executing proof. Delete or overwrite old app-local smoke screenshots before the proof run, then confirm their modification times belong to the current run and visually contain CUT/LOCAL. If the shared verifier reaches an unrelated stale localhost page, reports success without current CUT/LOCAL screenshots, or stalls before the custom smoke, do not count it: run the unchanged custom smoke with a fresh isolated localhost port/browser context and report both the harness problem and the isolated result.

## Finish honestly

Run the app check and `bun run app:verify --app cut-local`. Confirm from logs that the custom desktop and phone smoke ran and that both screenshots exist. Inspect both screenshots for clipping, hidden controls, broken aspect, and generic/unfinished styling; fix defects and rerun proof.

Set `app.contract.json` to `complete` only after all proof passes. In the final report list exact command outcomes, exported codec/container/dimensions/duration/bytes/playback result, screenshot paths, root files changed, actual runtime/model provenance, and honest limitations. Do not claim Gemini/Flash/Antigravity unless this run actually used it. Do not claim production readiness or unrun proof.
```

### Prompt 2 — real-media nonlinear editor upgrade

```text
# Upgrade CUT/LOCAL into a real-media nonlinear video editor

Continue from the existing working CUT/LOCAL application. Do not scaffold a replacement, rewrite the application from scratch, or discard the working edit-decision-list, stable-DOM playback architecture, Canvas compositor, undo/redo, responsive UI, direct Mediabunny export, or browser verification.

First inspect:

- the current project model and command functions;
- compositor and playback clock;
- Mediabunny exporter;
- persistence;
- custom browser smoke;
- screenshots from the last successful verification.

Then extend those components additively.

The generated BUILD/CUT/SHIP project may remain available as “Demo Project,” but imported user media must become the primary editing workflow.

## Target outcome

A user must be able to:

1. Import multiple real video or audio files from their computer.
2. Inspect imported media in a project/media bin.
3. Open an asset in a source monitor.
4. Set source In and Out points.
5. Insert it into a multitrack timeline.
6. Trim, move, split, copy, paste, duplicate, reorder, and delete clips.
7. Edit linked video and audio.
8. Add titles and basic visual/audio adjustments.
9. Preview the edited sequence.
10. Export the actual edited video and audio locally.
11. Download and replay the verified result.

This is a real browser NLE core, not a visual imitation of Adobe Premiere. Every control must mutate the actual project model and affect preview and export.

Do not begin optional effects until the real-media import, editing, preview, audio, and export loop passes its browser proof.

## Preserve the working architecture

Keep these existing correctness requirements:

- Mount stable controls once; never replace the entire control tree during playback.
- Advance playback using elapsed high-resolution time.
- Keep one typed project model as the source of truth.
- Preview and export must use the same timeline/source-time mapping and compositor.
- Every edit must be undoable and redoable.
- Direct Mediabunny export only; no MediaRecorder or captureStream substitute.
- Never display EXPORT VERIFIED until the resulting file has been independently loaded and played.
- Keep project model state separate from runtime File, Input, decoder, sink, object URL, and AudioContext objects.

## Real media ingestion

Add a prominent Import Media button, native file picker, and drag-and-drop target.

Support multiple files in one import. Initially accept:

- MP4 and M4V
- MOV/QuickTime when Mediabunny can read and decode its tracks
- WebM
- MP3, WAV, AAC/M4A, Ogg, and FLAC audio where supported

Do not trust filename extensions alone.

For each browser File, use current Mediabunny APIs following this shape:

- `new Input({formats: ALL_FORMATS, source: new BlobSource(file)})`
- `await input.canRead()`
- `await input.computeDuration()`
- `await input.getPrimaryVideoTrack()`
- `await input.getPrimaryAudioTrack()`
- `await track.canDecode()`

Consult the installed Mediabunny types and current official documentation before coding:

- https://mediabunny.dev/guide/reading-media-files
- https://mediabunny.dev/guide/media-sinks
- https://mediabunny.dev/guide/media-sources
- https://mediabunny.dev/guide/supported-formats-and-codecs

Show a useful per-file error if the container is unreadable or its primary track cannot be decoded. Do not create a fake asset for a rejected file.

## Asset registry and project persistence

Create separate serializable and runtime structures.

Serializable media asset metadata should contain approximately:

- asset ID
- original filename
- MIME type
- byte size
- lastModified
- duration
- width and height
- rotation
- video codec
- audio codec
- audio channel count/sample rate
- whether video/audio tracks are decodable
- relink fingerprint

Runtime media resources should contain approximately:

- File or Blob
- Mediabunny Input
- primary video/audio tracks
- VideoSampleSink or CanvasSink
- AudioSampleSink or AudioBufferSink
- object URL
- decoder/cache state

Never put runtime objects into undo history or localStorage.

Persist project structure and asset fingerprints. If browser file handles can be retained safely with user permission, store them in IndexedDB. Otherwise mark media offline after reload and provide Relink Media. Never pretend localStorage can preserve a File.

Revoke object URLs and dispose Inputs/samples when assets are removed or replaced.

## Project/media bin

Add a real media bin with list and thumbnail views.

Each imported item must show:

- filename
- duration
- dimensions
- video/audio badges
- file size
- offline/unsupported status
- generated thumbnail for video
- waveform preview for audio when available

Generate several thumbnail frames using `VideoSampleSink.samplesAtTimestamps(...)` or the current equivalent. Close every returned sample after drawing it.

Generate waveform data from decoded audio samples rather than decorative random bars. Cache derived thumbnails/waveforms by asset fingerprint.

Support:

- rename project item without renaming the disk file;
- remove asset, with confirmation if timeline clips reference it;
- relink offline asset;
- reveal asset usage count;
- double-click to open in Source Monitor;
- drag asset into the timeline.

## Source monitor

Add a Source Monitor separate from the Program Monitor.

The Source Monitor must support:

- selected media asset;
- play/pause;
- source scrubber and source timecode;
- frame stepping;
- set In with `I`;
- set Out with `O`;
- clear In/Out;
- visible marked source range;
- Insert edit;
- Overwrite edit;
- drag marked range to timeline.

Use a normal media element for responsive source playback if helpful, but its displayed source time must match the same source timestamps used by timeline clips and export.

The default marked range is the complete asset.

## Typed multitrack model

Upgrade the project model to support:

- V2: overlay video
- V1: primary video
- T1: titles/graphics
- A1 and A2: audio

Use explicit types similar to:

`MediaAsset`
`Track`
`TimelineClip`
`TitleClip`
`Transition`
`Project`
`Selection`
`HistoryEntry`

Each timeline clip must contain at least:

- clip ID
- asset ID
- track ID
- timeline start
- source in
- source out
- playback rate
- linked group ID
- enabled state
- video transform
- opacity
- audio gain
- mute
- fade-in and fade-out duration

The derived timeline duration of a media clip is:

`(sourceOut - sourceIn) / playbackRate`

Enforce:

- sourceIn >= 0
- sourceOut <= asset duration
- sourceOut > sourceIn
- minimum duration of at least one project frame
- no accidental overlap on the same ordinary track
- locked tracks cannot be mutated
- ripple operations leave no unintended gaps
- linked audio/video preserve synchronization unless explicitly unlinked

Keep project commands pure and unit-testable.

## Timeline interaction

Create a desktop-first multitrack timeline with:

- track headers
- track names
- video visibility
- audio mute/solo
- track lock
- track targeting
- horizontal scrolling
- timeline zoom
- ruler and timecode
- visible playhead
- clip labels
- video thumbnail filmstrips
- audio waveforms
- selection outlines
- trim handles
- snapping indicator
- drag preview
- empty-drop state

Required tools and operations:

### Selection

- Click selects one clip.
- Shift-click adds/removes clips from the selection.
- Clicking empty timeline clears selection.
- Linked video/audio select together by default.
- Provide Link/Unlink.

### Move and drag

- Drag clips horizontally.
- Drag to compatible tracks.
- Preserve source ranges while moving.
- Snap to playhead, clip boundaries, markers, and sequence start.
- Allow holding a modifier to disable snapping.
- Reject illegal drops on locked or incompatible tracks.

### Split and razor

- Split selected clips at the actual playhead.
- Razor tool splits the clicked clip at the clicked timeline time.
- Linked clips split at the same timeline time.
- Preserve exact source ranges.

### Trim

- Drag left and right clip handles.
- Left trim changes sourceIn and timeline start.
- Right trim changes sourceOut.
- Enforce source bounds and minimum duration.
- Add normal trim and ripple trim modes.
- Display source and timeline delta while dragging.
- Escape cancels the active trim.

### Delete

- Lift Delete removes selected clips and leaves the gap.
- Ripple Delete removes selected clips and closes the resulting gap.
- Deleting one linked component asks whether to delete linked media or unlink it.

### Clipboard and duplication

Implement real application clipboard commands:

- Copy: Cmd/Ctrl+C
- Cut: Cmd/Ctrl+X
- Paste at playhead: Cmd/Ctrl+V
- Duplicate: Cmd/Ctrl+D
- Alt/Option-drag duplicates

Copied clips must receive new stable IDs while preserving their asset references, source ranges, transforms, volume, and linked relationships.

### Other required commands

- Undo: Cmd/Ctrl+Z
- Redo: Cmd/Ctrl+Shift+Z
- Split at playhead
- Select all
- Deselect all
- Nudge selected clips one frame left/right
- Jump to previous/next edit
- Home/End for sequence boundaries
- Space for play/pause
- J/K/L shuttle controls at minimum for reverse, pause, and forward preview
- `+`/`-` timeline zoom

Do not hijack shortcuts while the user is typing into an input.

## Program monitor and real imported frames

The Program Monitor must render imported media rather than colored placeholders.

For each active video clip at timeline time `t`, calculate:

`sourceTime = sourceIn + (t - timelineStart) * playbackRate`

Use Mediabunny `VideoSampleSink.getSample(sourceTime)`, `CanvasSink`, or an efficient sequential sample iterator to decode the correct frame.

For every decoded sample:

- draw it using the shared compositor;
- respect source rotation and pixel/display dimensions;
- apply fit/fill, position, scale, rotation, crop, and opacity;
- composite video tracks from bottom to top;
- close samples promptly;
- discard stale asynchronous decode responses using a generation/request token.

Cache or prefetch enough nearby frames for usable playback. Scrubbing must favor the newest requested timestamp and must not display an older response after a newer seek.

The generated BUILD/CUT/SHIP scene renderer may remain supported as another asset type, but imported media frames are mandatory.

## Basic visual editing

Add an inspector for selected video clips:

- Fit, Fill, and Stretch
- Position X/Y
- Scale
- Rotation
- Crop left/right/top/bottom
- Opacity
- Horizontal/vertical flip
- Reset transform

These adjustments must affect both preview and export.

Add title clips with:

- editable text
- font size
- weight
- alignment
- color
- background
- position
- duration

Title clips belong on T1 or a video overlay track and can be moved, trimmed, copied, and deleted like other clips.

## Audio

When imported video contains audio, create a linked audio clip on A1 by default.

Required audio functionality:

- synchronized preview
- waveform
- clip gain
- mute
- track mute and solo
- fade in
- fade out
- linked/unlinked editing
- audio-only imports on A1/A2
- audio included in final export

Use Mediabunny AudioSampleSink or AudioBufferSink for decoded media.

For preview, use Web Audio scheduling while preserving project time and linked synchronization.

For export, render the complete edited audio mix into an OfflineAudioContext or another deterministic project-length mix:

- schedule each clip at its timeline start;
- apply source offset and source duration;
- apply playback rate;
- apply clip gain;
- apply mute/solo;
- apply fades;
- mix to stereo at 48 kHz.

Feed the resulting project audio into Mediabunny with AudioBufferSource or AudioSampleSource.

Prefer:

- MP4 with AVC video and AAC audio when both are encodable;
- WebM with VP9/VP8 video and Opus audio as fallback.

Use the output format’s supported-codec lists and Mediabunny’s current `getFirstEncodableVideoCodec` and `getFirstEncodableAudioCodec` helpers. Do not hard-code a combination the browser cannot encode.

If the sequence contains no audible audio, video-only export is valid.

## Basic transitions and speed

Only after the preceding editing/export loop passes:

- Add a Cross Dissolve between adjacent video clips.
- Add Constant Power or equal-power audio crossfade.
- Add playback-rate presets: 0.5×, 1×, and 2×.
- Update sequence duration and source-time mapping when speed changes.

Transitions must have model data and affect preview/export. A CSS fade on the timeline block does not count.

Do not implement reverse playback-rate export in this phase unless the existing architecture supports it cleanly.

## Export

Retain direct Mediabunny export and extend it to imported media.

For every output video frame at the project frame rate:

1. Determine all active timeline clips.
2. Map timeline time to each source timestamp.
3. Decode the correct imported frame.
4. Composite tracks, transforms, titles, opacity, and transitions.
5. Await CanvasSource frame ingestion for backpressure.
6. Update progress from completed frames.

Mix and add audio before finalization.

Maintain:

`idle → negotiating → decoding → encoding → mixing-audio → finalizing → verifying → verified`

with `cancelled` and `failed`.

Cancellation must:

- stop future decode/encode work;
- cancel partial output;
- close samples;
- dispose temporary resources;
- preserve the project;
- permit retry without reload.

After export:

1. Load the Blob into the result video.
2. Parse the Blob through a new Mediabunny Input.
3. Verify output width, height, and duration.
4. If the sequence contained audible audio, verify the output has an audio track.
5. Play the muted output and prove currentTime advances.
6. Only then show EXPORT VERIFIED.
7. Show codec, container, dimensions, duration, audio codec, and byte size.
8. Provide Replay and Download.

## Responsive behavior

Desktop is the primary editing experience.

At phone width, keep these operations reachable:

- import
- media bin
- preview
- play/pause
- scrub
- select clip
- split
- trim start/end
- copy/duplicate
- delete/ripple delete
- undo/redo
- title
- volume/mute
- export

The complete multitrack surface may use horizontal scrolling or focused track views, but controls may not disappear.

## Verification fixtures

Do not rely on a private file from the developer’s computer.

Generate deterministic test media for browser verification at test time:

- at least two short, visually distinct video files;
- different durations;
- at least one with an audio tone;
- real MP4 or WebM Blobs generated through Mediabunny;
- identifiable frame colors/text so source-time and ordering can be proven.

Import those generated Files through the same file-input/drop ingestion path used by users. Do not bypass the importer by injecting asset model records.

## Unit proof

Add focused tests for:

- imported asset validation and metadata mapping;
- source In/Out insertion;
- overwrite editing;
- linked video/audio;
- split source-range preservation;
- all trim directions;
- normal versus ripple delete;
- move between tracks;
- overlap rejection;
- copy/cut/paste;
- duplicate IDs and linked relationships;
- snapping calculations;
- transform mutations;
- gain/fade mutations;
- playback-rate duration;
- undo/redo;
- missing/offline asset behavior;
- timeline-to-source timestamp mapping;
- export active-clip selection.

## Browser proof

Expand the custom smoke to prove the complete real-media workflow.

It must:

1. Generate two real media fixtures.
2. Import both through the file input.
3. Assert both appear with real metadata and thumbnails.
4. Open one in Source Monitor.
5. Mark a nontrivial In/Out range.
6. Insert linked video/audio into V1/A1.
7. Add a second clip.
8. Play and prove the imported frames visibly change.
9. Split at the playhead and assert exact source boundaries.
10. Trim both sides and assert exact source/timeline deltas.
11. Move a clip.
12. Copy and paste it at the playhead.
13. Duplicate another clip.
14. Undo and redo.
15. Ripple delete and assert timeline contiguity.
16. Change position/scale/opacity and prove preview state changes.
17. Change audio gain and add fades.
18. Add and edit a title clip.
19. Cancel one export.
20. Retry and complete export.
21. Parse the resulting Blob and assert dimensions, edited duration, video track, and audio track.
22. Call play(), wait, and prove currentTime advances.
23. Save fresh desktop and phone screenshots only after all assertions pass.

Do not accept a test that only clicks controls or trusts status text.

## Completion gates

Work in these increments:

1. Real file ingestion and media bin.
2. Source Monitor and source ranges.
3. Multitrack model and timeline commands.
4. Imported-frame Program Monitor.
5. Linked audio preview.
6. Direct video/audio export.
7. Transforms, titles, transitions, and polish.
8. Full browser proof.

Run focused tests after each increment.

Do not mark `app.contract.json` complete until:

- app check passes;
- custom desktop and phone smoke passes;
- current screenshots visibly show imported-media editing;
- exported media has been parsed and replayed;
- the output contains audio when the sequence contains audio.

If a later increment fails, keep the last working vertical slice intact and report the exact gap. Do not replace working media editing with mocked placeholders to make completion appear green.

In the final report provide:

- exact imported fixture metadata;
- editing operations proven;
- exported container/video codec/audio codec;
- dimensions, duration, and bytes;
- output playback result;
- screenshot paths;
- tests and commands run;
- files changed outside the app;
- actual remaining limitations.

Do not claim parity with Adobe Premiere or production readiness.
```
