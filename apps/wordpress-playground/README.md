# WordPress Agent Workshop

- `Tease:` A WordPress sandbox an agent can edit from your laptop.
- `Lede:` This app hosts the workshop controls, embeds the official PHP/WebAssembly runtime, and connects to Antigravity through the official Playground MCP bridge.
- `Why it matters:` Participants can inspect a real saved draft without Docker, a PHP installation, or a MySQL server.
- `Go deeper:` Start with [PROMPT.md](PROMPT.md), the [spec](../../docs/wordpress-workshop/SPEC.md), and the [verification record](../../docs/verification/wordpress-playground-workshop-2026-10-24.md).

**Status:** runnable source scaffold; the app contract remains `scaffold` until actual browser and workshop acceptance passes. Source/build checks, MCP protocol checks, browser checks, Antigravity checks, and deployment are separate evidence. No public demo URL is claimed yet.

## Start locally

From the repository root, use the [fresh-machine guide](../../docs/operations/fresh-machine-setup.md) if Git or Bun is missing. The repository pins Bun 1.3.14 and one root lockfile.

```sh
bun run setup:doctor
bun install --frozen-lockfile
bun run --cwd apps/wordpress-playground dev --host 127.0.0.1 --port 5173 --strictPort
```

Open `http://127.0.0.1:5173/` and choose **Start WordPress**. The runtime is downloaded from the official Playground host and can take time on the first run. A plain visit does not connect to a local MCP process.

The committed [Blueprint](public/blueprint.json) creates synthetic workshop content. Each open tab gets a separate temporary site and visible site ID. This is not a shared class blog.

## Connect Antigravity

The optional MCP lane additionally requires **Node >=24.18.0**. When installing the upstream package with npm, its manifest also requires **npm >=11.16.0**. The normal monorepo app path remains Bun-based; our launcher uses the installed dependency directly and does not run npx.

1. Open this repository in local Antigravity.
2. Merge [antigravity.mcp.example.json](antigravity.mcp.example.json) into the workspace's `.agents/mcp_config.json`, preserving other servers. The example assumes the MCP process starts from the repository root. If the client uses another working directory, use the absolute path to `scripts/mcp.mjs`.
3. For a hosted app, change the example's `--url=` to the **exact final HTTPS origin at `/`**. Keep HTTP only for local development. Do not put `mcp-port`, a token, or credentials in this configuration.
4. Enable/restart the MCP server. Ask it to call `playground_get_website_url`.
5. Open that returned URL in a top-level browser tab on the **same laptop**. Start WordPress, then click **Connect**. Grant that site loopback/device permission if prompted.
6. Call `playground_list_sites` and match the visible site ID/name before writing.

Useful prerequisite check:

```sh
node apps/wordpress-playground/scripts/mcp.mjs --check --url=http://127.0.0.1:5173/
```

`--check` proves the installed version and launch configuration, not a working MCP connection. The real protocol test is described below.

The workshop's [draft task](workshop/rubric.md) creates a post through `playground_request`, reads back the saved data, and opens its editor. The wrapper deliberately does not implement `playground_save_in_browser`; it returns an unsupported error. Use ZIP backup instead.

### A narrow upstream packaging workaround

Actual startup exposed an undeclared `ajv` import in the published `@wp-playground/mcp@3.1.58` entry. Bun's isolated global store correctly makes that missing dependency visible. This app explicitly pins Ajv 8.17.1. The Node launcher temporarily redirects only `ajv` imported by that exact MCP entry to the app's dependency using Node's module hook, then removes the hook. All other resolution and the upstream transport remain unchanged. It does not change the repo linker, modify cached packages, or weaken any browser protection.

Remove this small compatibility step only after a newer, release-buffer-eligible package declares its dependencies correctly and the real protocol test passes. A manifest/version check alone missed this defect. See the [evidence](../../docs/verification/wordpress-playground-workshop-2026-10-24.md).

## Keep or reset your work

WordPress runs in the browser tab. Reloading, closing, or resetting can discard its active database and files. The app does **not** claim OPFS autosave or durable server storage.

- **Export ZIP** downloads a supported Playground backup containing the site's WordPress data.
- **Import ZIP** restores a participant-selected supported backup. Import/reset replaces the active sandbox, so export wanted work first.
- **Reset** asks before recreating the committed starting state.

Keep personal ZIPs outside this public repository. A backup is not a static HTML website or a cloud publication. Verify export and restore during rehearsal, including the draft created through MCP. This wrapper accepts imports up to 100 MiB; larger exports may require a different restoration environment.

The host is stateless. Git and the Blueprint preserve the starter; exported ZIPs preserve participant work. This disposable active state is a deliberate workshop exception to the repository's durability default.

## AI Studio first, Firebase fallback

### Prepare an isolated AI Studio project

AI Studio documents GitHub import and Cloud Run deployment. It does not establish automatic selection of this Bun workspace. Root `dev` runs another app, so do not import the whole monorepo and assume it will choose WordPress.

```sh
node apps/wordpress-playground/scripts/export-aistudio.mjs plan
node apps/wordpress-playground/scripts/export-aistudio.mjs apply
```

This creates `dist/wordpress-playground-aistudio/`, outside tracked source, and refuses to overwrite an existing export. It contains the browser app, Blueprint, independent TypeScript/package configuration, a dependency-free static server, and [AI_STUDIO_PROMPT.md](AI_STUDIO_PROMPT.md). It excludes local MCP settings, credentials, tests, and participant data. Inspect the export before importing it.

The generated project needs its **own reviewed npm lockfile** before deployment. Exact top-level versions alone do not freeze its transitive dependencies. The monorepo's root `bun.lock` remains the source project's authoritative lock. Do not add a second lockfile inside this app workspace.

In the standalone project, install with the supported Node/npm versions, generate/review its lock, run `npm ci`, `npm run typecheck`, and `npm run build`. `npm start` serves `dist` on `0.0.0.0` and the platform's `PORT` (8080 by default). The server exposes `/healthz` and serves no MCP, database, or PHP endpoint.

Use AI Studio's supported import/file workflow for that isolated project. If its current importer cannot select the required source root, record the blocker and use Firebase; do not silently replace the monorepo root or create another remote repository. Actual AI Studio import remains a rehearsal item. Open the final deployed URL directly for MCP, because preview iframe policy may block loopback access.

### Use the existing Firebase workflow

From the monorepo root:

```sh
bun run --cwd apps/wordpress-playground check
bun run deploy wordpress-playground --dry-run
```

Resolve the exact project and dedicated app site using the ignored root `google.project.json` and the [existing operations guide](../../docs/operations/google-cloud.md). A missing target is a decision to resolve, not permission to guess one. After deployment is authorized for that target:

```sh
bun run deploy wordpress-playground
```

Use the repo's pinned Firebase CLI and explicit target workflow. Do not change the default site, create `.firebaserc`, alter global project settings, or deploy other apps. Update the local MCP `--url` to the final `.web.app` origin, restart it, and open its new returned URL.

The current repository has no deployment-on-push workflow. Saving this source to GitHub does not deploy it or enable billing.

## Connection and browser constraints

The wrapper uses the official bridge's loopback bind, origin allowlist, per-process token, and WebSocket. `--url` adds the hosted origin to upstream's built-in allowed origins; it does not make it the only allowed origin. Tokens are neither placed in the public launch URL nor stored by this app.

The page accepts one validated numeric port and never scans or accepts an arbitrary bridge host. Connect requires an explicit action. Its status describes the last observed bridge event; the public upstream API does not report every disconnect. An executing WordPress operation cannot be undone by clicking Disconnect.

Current Chrome is the primary workshop target. Its local-network permission applies to HTTP and WebSocket connections. Firefox also has permission controls; Safari's cleartext loopback compatibility requires testing. No disabling security flags, broad CORS, public tunnels, or insecure hosted pages is part of this setup.

The runtime lives in an official cross-origin iframe, which can encounter storage/service-worker restrictions. The wrapper's CSP explicitly permits that runtime and the exact loopback schemes. The Node server and Firebase headers match. The host does not use `upgrade-insecure-requests`, which could break the official cleartext loopback bridge.

See the [browser security research](../../docs/research/wordpress-playground-browser-bridge-2026-10-24.md) for current primary sources and the acceptance matrix.

## Checks and evidence

```sh
bun run --cwd apps/wordpress-playground check
node --test apps/wordpress-playground/scripts/*.test.mjs
bun run app:browser:verify --app wordpress-playground
bun apps/wordpress-playground/e2e/mcp-roundtrip.ts --mcp-only
bun apps/wordpress-playground/e2e/mcp-roundtrip.ts
bun run app:verify --app wordpress-playground
bun run verify
```

The shell smoke check is separate from the real remote WASM integration. The MCP-only mode exercises the actual local server and its origin/token rejection, without a browser. The complete roundtrip script creates and reads back a real draft in a disposable runtime. Neither script substitutes for an actual Antigravity or hosted-permission rehearsal.

`app:verify` intentionally rejects lifecycle `scaffold`. Keep that status until the completion evidence exists; do not change it merely to turn a check green. The [verification record](../../docs/verification/wordpress-playground-workshop-2026-10-24.md) records what ran and what remains blocked.

## Workshop and handoff files

| File | Use |
| --- | --- |
| [PROMPT.md](PROMPT.md) | Next agent's implementation, verification, and deployment handoff |
| [AI_STUDIO_PROMPT.md](AI_STUDIO_PROMPT.md) | Instructions for the isolated hosted app |
| [workshop/event-brief.md](workshop/event-brief.md) | Clearly synthetic input shared by both runs |
| [workshop/publishing-rules.md](workshop/publishing-rules.md) | Editorial requirements shared by both runs |
| [workshop/rubric.md](workshop/rubric.md) | Comparison procedure and observable evidence |
| [workshop/skills/](workshop/skills/) | Drafting skill, deliberately outside automatic discovery for the baseline |
| [spec](../../docs/wordpress-workshop/SPEC.md) | Product decisions, interfaces, boundaries, and acceptance |
| [plan](../../docs/plans/wordpress-playground-workshop-2026-10-24.md) | Current slices and progress |

Latest observed upstream is 3.1.60 (October 20, 2026). This scaffold uses 3.1.58 (October 12) to retain the repository's seven-day release buffer. The canonical hosted runtime is a separate changing dependency. Read the [original research and implementation follow-up](../../docs/research/wordpress-playground-workshop-2026-10-24.md) and [Matt Pocock planning research](../../docs/research/matt-pocock-specs-and-handoffs-2026-10-24.md) for provenance.
