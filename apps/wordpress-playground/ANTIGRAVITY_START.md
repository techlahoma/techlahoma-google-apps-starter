# Start the workshop in Antigravity

- `Tease:` One paste gets Antigravity writing a WordPress article.
- `Lede:` The prompt below sets up the `wordpress-workshop` MCP server on any machine, starts the app on port 5173 if it isn't already running, connects the browser tab, and drafts a sourced article about Gemini 4 Carbon.
- `Why it matters:` The agent can do the whole setup itself instead of stopping on missing tools or guessing ports.
- `Go deeper:` Setup details live in the [app guide](README.md); the MCP launcher is [scripts/mcp.mjs](scripts/mcp.mjs).

## How it fits together

- The app always runs at `http://127.0.0.1:5173/`. [vite.config.ts](vite.config.ts) pins that port and refuses to fall back to another.
- `bun run --cwd apps/wordpress-playground antigravity:setup apply` adds the `wordpress-workshop` server to Antigravity's user config (`~/.gemini/antigravity/mcp_config.json`). It resolves this checkout's path and the current Node, keeps any other servers, and does nothing if the entry already matches. Use `plan` instead of `apply` to preview. Re-run it if the repo moves or Node is upgraded.
- The MCP bridge picks its own random WebSocket port. `playground_get_website_url` returns the app URL with `?mcp-port=` already set, so the agent never has to work out that port.

Requirements: Git, Bun 1.3.14, and Node 24.18.0 or newer. See the [fresh-machine guide](../../docs/operations/fresh-machine-setup.md) if any are missing.

## Paste this into a new Antigravity conversation

```text
Work in this repository. The WordPress workshop app always runs at http://127.0.0.1:5173/.

1. Tools. If the playground_* MCP tools (from the wordpress-workshop server) are not available to you:
   from the repo root run `bun install --frozen-lockfile`, then `bun run --cwd apps/wordpress-playground antigravity:setup apply`.
   Then stop and tell me to refresh MCP servers in Antigravity's settings (or restart Antigravity) and send this prompt again.
2. App. Check http://127.0.0.1:5173/. If it responds with the page titled "WordPress Agent Workshop", reuse it. If nothing responds, start it in the background with `bun run --cwd apps/wordpress-playground dev` and wait until it responds. If port 5173 is taken by something else, stop and tell me what is using it.
3. Connect. Call playground_list_sites. If a site is already connected, use it. Otherwise call playground_get_website_url, open that exact URL in a browser tab, click "Start WordPress", wait for it to boot, click "Connect", and allow local-network access if asked. Call playground_list_sites again and confirm the site ID matches the one shown on the page.
4. Research. Write about Google's new Gemini 4 Carbon model. Start from Google's official announcement (https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-carbon/) and use reputable coverage only to add context. Use only facts you found in those sources: what it is, when it was announced, the capabilities and benchmarks Google reports (say they are Google-reported), safety notes, availability, and pricing. Do not invent quotes, numbers, or dates. If you cannot reach the sources, stop and tell me.
5. Post. Use playground_request against the WordPress REST API to create a draft post with a clear title, a short intro, a few headed sections, and a "Sources" list linking every source you used. Read the post back by ID to confirm the title, content, and draft status, then open it in the WordPress editor. Tell me the post ID, the site ID, and the sources.
```

## Keep in mind

- The post is a **draft** in a sandbox that lives only in that browser tab. Use **Export ZIP** on the page to keep it; reloading or closing the tab loses it.
- To publish inside the sandbox instead, change "create a draft post" to "create a published post".

## If a step fails

| Symptom | Fix |
| --- | --- |
| No `playground_*` tools after setup | Refresh MCP servers or restart Antigravity; check that `wordpress-workshop` is enabled in its MCP panel. |
| `Port 5173 is already in use` | Another program holds the port. Stop it, or reuse it if it is already this app. |
| `playground_list_sites` is empty | The tab isn't connected. Open the URL from `playground_get_website_url` (it carries `mcp-port`) and click **Connect**. |
| Version or Node error at startup | Run `node apps/wordpress-playground/scripts/mcp.mjs --check --url=http://127.0.0.1:5173/` from the repo root. |
