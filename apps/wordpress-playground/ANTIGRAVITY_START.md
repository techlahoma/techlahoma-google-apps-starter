# Start the workshop in Antigravity

- `Tease:` One paste gets Antigravity writing WordPress drafts.
- `Lede:` The `wordpress-workshop` MCP server is preconfigured on this Mac; Antigravity only needs to start the local app, open it, and connect the tab.
- `Why it matters:` The agent can do the whole setup itself instead of stopping on missing tools.
- `Go deeper:` Setup details live in the [app guide](README.md); the comparison task lives in the [rubric](workshop/rubric.md).

## Already done on this machine (2026-10-29)

- Locked dependencies installed with Bun 1.3.14 (`@wp-playground/mcp` 3.1.58).
- `~/.gemini/antigravity/mcp_config.json` (and the Antigravity IDE copy) registers `wordpress-workshop` with absolute paths, so it starts from any working directory. It points at `http://127.0.0.1:5173/`.
- The MCP-only check and the full local draft roundtrip both passed. See the [verification record](../../docs/verification/wordpress-playground-workshop-2026-10-24.md).

If Antigravity was open before the config was written, restart it, or refresh MCP servers in its settings, so the `playground_*` tools load.

## Paste this into a new Antigravity conversation

> Use the `wordpress-workshop` MCP server. From the repo root, start the app in the background with `bun run --cwd apps/wordpress-playground dev --host 127.0.0.1 --port 5173 --strictPort` and wait until it serves. Call `playground_get_website_url`, open the returned URL in a browser tab, click **Start WordPress**, wait for it to boot, then click **Connect** and allow local-network access if asked. Call `playground_list_sites` and confirm the site ID matches the one shown on the page. Then turn `apps/wordpress-playground/workshop/event-brief.md` into a WordPress draft using `apps/wordpress-playground/workshop/publishing-rules.md`, read the saved post back, and open it in the editor.

## If a step fails

| Symptom | Fix |
| --- | --- |
| No `playground_*` tools | Restart Antigravity; check the MCP panel shows `wordpress-workshop` enabled. |
| Port 5173 already in use | Stop the other dev server. The MCP allowlist expects exactly this origin. |
| `playground_list_sites` is empty | The tab was not connected. Open the URL from `playground_get_website_url` (it carries the port) and click **Connect**. |
| Version or Node error at startup | Run `node apps/wordpress-playground/scripts/mcp.mjs --check --url=http://127.0.0.1:5173/` from the repo root. |
