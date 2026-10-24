# Research: Hosted WordPress Playground with a local MCP bridge

- `Tease:` A hosted workshop page can connect browser WordPress to a local coding agent.
- `Lede:` Use the official Playground MCP bridge, an HTTPS frontend, and a normal browser tab on
  the same computer as Antigravity. Keep the bridge on loopback and use the exact deployed origin.
- `Why it matters:` Browser permissions, iframe policies, and storage can fail independently of a
  successful build. A working MCP process does not prove that the intended WordPress site is connected.
- `Go deeper:` Read the [browser matrix](#browser-matrix), [connection status](#connection-status),
  and [required-runtime-proof](#required-runtime-proof) before calling the app workshop-ready.

Research date: 2026-10-24. Scope: a disposable WordPress workshop app, static hosting, and a local
Antigravity MCP process. This document records source inspection and recommendations, not a completed
browser compatibility or security audit.

## Version and evidence

The eligible research baseline is **Playground 3.1.58**, released October 12. Releases 3.1.59 on
October 19 and 3.1.60 on October 20 are younger than this repository's seven-day adoption threshold
on the research date. Preserve that threshold for actual dependency resolution; an exact top-level
pin alone does not establish the age of every transitive dependency. [Release history][releases]

The tagged 3.1.58 bridge server, browser bridge, client exports, and Playground client were inspected.
Those four files have the same content hashes in 3.1.60. The 3.1.58 MCP manifest declares Node
`>=24.18.0` and npm `>=11.16.0`; the separate local MCP prerequisite must be documented alongside
the starter's Bun workflow. [Package manifest][package] [Browser exports][exports]

## Architecture and trust

Antigravity starts the local Node process through stdio. The HTTPS wrapper connects to that process
over WebSocket and forwards its commands to WordPress through the Playground JavaScript client.
PHP and SQLite run in the browser. The static host serves the app; it does not acquire the browser's
WordPress database or become a public WordPress REST endpoint. [Official introduction][intro]

Use `@wp-playground/mcp/client` and its exported `startMcpBridge`. Supply the site-list and active
client callbacks around `startPlaygroundWeb`. Use the official
`https://playground.wordpress.net/remote.html` runtime initially. The SDK checks the remote path and
origin; the website's root page is not interchangeable with `remote.html`. [Client API][client]

Pass the exact deployed frontend URL through the local MCP process's `--url` argument. Obtain the
opening URL from `playground_get_website_url`; it includes the selected `mcp-port`. Validate that
query value as an integer from 1 through 65535. Do not accept an arbitrary connection hostname,
scan ports, or expose the bridge through a tunnel. The browser and MCP process must share a computer.

The [3.1.58 server][server] provides these controls:

| Boundary | Verified behavior |
|---|---|
| Listening interface | Binds to `127.0.0.1`, with an available port selected by default |
| Browser token exchange | `/bridge-token` requires an allowed Origin and returns matching CORS headers |
| WebSocket authentication | Requires a random token generated when the process starts |
| Allowed origins | Built-in localhost and official Playground origins, plus the exact origin supplied through `--url` |
| Host header | No separate Host allowlist is implemented |

`--url` adds an origin; it does not remove the built-in allowlist. Missing Origin is rejected by the
token endpoint. A non-browser WebSocket client without Origin still needs the token. These checks
reject ordinary connections from unrelated web origins, but do not justify a claim of comprehensive
DNS-rebinding protection. Preserve the upstream trust rules instead of adding wildcard CORS or
binding to `0.0.0.0`.

Treat the wrapper as trusted code. Keep WordPress content inside the runtime iframe and display
diagnostics as text. An approved origin's compromised script remains a risk. Likewise, content
returned to an agent can contain prompt injection; the bridge does not make that content authoritative.
Use public workshop material and trusted seed code.

## Browser matrix

Local Network Access permission and CORS are separate checks. A successful CORS response cannot
grant browser permission. The older Private Network Access preflight proposal was replaced by LNA;
adding `Access-Control-Allow-Private-Network` alone is not the current solution. [Chrome guidance][lna]

| Browser | Evidence as of the research date | Workshop treatment |
|---|---|---|
| Current Chrome | LNA shipped in 142; 145 split device access into `loopback-network` and `local-network`; 147 added WebSocket checks | Primary candidate; rehearse allowing and denying device access on the deployed origin |
| Current Firefox desktop | Mozilla documents LNA enabled by default from 153 | Secondary candidate; verify its prompt and the complete post round trip |
| Safari | WebKit issue 171934 remains open, with 2026 reports of HTTPS-to-loopback HTTP/WebSocket failures | Compatibility gap until tested; recommend the rehearsed browser if blocked |

Sources: [Chrome 145][chrome145], [Chrome 147][chrome147], [Firefox permissions][firefox],
[WebKit issue][safari]. The WebKit report is evidence of a material risk, not proof that every
current Safari build fails every connection.

Start connection attempts after a visible Connect action. Explain that access is needed to reach
the local bridge. If denied, offer normal per-site permission instructions. Do not recommend disabling
browser security, downgrading the hosted page to HTTP, or installing a certificate for this scaffold.

## Embedding and CSP

Keep loopback requests in the top-level wrapper. The WordPress iframe then needs no delegated
loopback permission. AI Studio's embedded preview may impose an ancestor Permissions Policy that
the app cannot relax. Offer opening the deployed app in a separate tab. The default LNA policy is
`self`; cross-origin frames require explicit delegation. [Permissions Policy guidance][mdn-lna]

The wrapper's CSP must permit the official runtime in `frame-src` and explicit
`http://127.0.0.1:*` and `ws://127.0.0.1:*` connections when ephemeral bridge ports are used. Add only
the HTTPS resource origins actually required by the app. `connect-src 'self'` is insufficient, and
does not consistently cover WebSocket schemes across browsers. Avoid broad `connect-src *` and
unnecessary script exceptions. [CSP connect-src][csp]

Cross-site iframe storage and service-worker restrictions can also prevent runtime boot. The SDK
contains storage-access handling, but that does not prove every browser configuration works. Show
a bounded boot timeout and a useful error state. Pinning the wrapper SDK does not pin the remotely
served `remote.html` assets, so rehearse again near the workshop. [Client API][client]
[Official embed guidance][embeds]

## Content and persistence

Use `playground_request` for ordinary post CRUD. Its implementation serializes object bodies and
adds a REST nonce associated with the logged-in browser session. WordPress application passwords
and the separate MCP Adapter plugin are unnecessary for this connection. Read the saved post back
and check its HTTP status and fields rather than trusting the generated text. [Tool execution][tools]

Give sites distinct IDs and show the selected name. The bridge groups sites by slug and chooses
the most recently active reporting tab, so a shared hardcoded slug can target an unexpected tab.

Browser persistence is local and can be cleared. A `saveInBrowser` callback must persist the actual
runtime; storing a label or returning success does not save WordPress. Provide export/import for
work worth keeping, and state clearly when reload resets a disposable instance. A shared launch
URL reproduces a starting configuration, not another attendee's unsaved changes.

## Connection status

The upstream [browser bridge][bridge] exposes `onConnect`, `notifySitesChanged`, and `stop`.
`onConnect` fires when the WebSocket opens and registration is sent. It is not a server acknowledgment
or a successful WordPress request. Close, error, and failed token requests retry internally every
five seconds; the public callback interface exposes no disconnect or error event.

Do not leave a permanent green Connected indicator based only on that callback. Show the last
observed connection time and ask the agent to verify site discovery. A successful post/readback is
stronger evidence. Any richer live status needs an explicit implementation and its own validation.

Source inspection also identifies a shutdown race: `stop()` does not abort an in-flight token fetch
or recheck its stopped state before creating the socket. Revoke the wrapper's session callbacks
immediately on Disconnect, and close any subsequent stale connection in `onConnect`. Test that
sequence; it does not cancel a WordPress command already running. [Browser bridge][bridge]

## Required runtime proof

| Check | Expected evidence |
|---|---|
| Hosted HTTPS page, fresh Chrome permission state | Prompt follows Connect; allowed access registers the intended site |
| Denied permission or wrong configured origin | Clear failure; no security bypass suggested |
| Invalid token and unrelated Origin | Bridge rejects the connection |
| Post creation and readback | Actual saved draft, matching title and content, successful REST status |
| Bridge restart and two open tabs | Correct new URL and unambiguous target site |
| Reload and export/import | Persistence or documented reset behaves as advertised |
| Firefox, Safari, and AI Studio preview | Observed results recorded separately from the primary browser |

At research time, these deployment-specific checks remain unproven. A build, mock, upstream test,
or local HTTP smoke test cannot establish the hosted browser permission flow. Keep lifecycle status
at scaffold until the repository's app verification gate and the selected deployment's runtime checks pass.

[releases]: https://github.com/WordPress/wordpress-playground/releases
[package]: https://github.com/WordPress/wordpress-playground/blob/v3.1.58/packages/playground/mcp/package.json
[exports]: https://github.com/WordPress/wordpress-playground/blob/v3.1.58/packages/playground/mcp/src/client.ts
[intro]: https://make.wordpress.org/playground/2026/03/17/connect-ai-coding-agents-to-wordpress-playground-with-mcp/
[client]: https://github.com/WordPress/wordpress-playground/blob/v3.1.58/packages/playground/client/src/index.ts
[server]: https://github.com/WordPress/wordpress-playground/blob/v3.1.58/packages/playground/mcp/src/bridge-server.ts
[bridge]: https://github.com/WordPress/wordpress-playground/blob/v3.1.58/packages/playground/mcp/src/bridge-client.ts
[tools]: https://github.com/WordPress/wordpress-playground/blob/v3.1.58/packages/playground/mcp/src/tools/tool-executors.ts
[lna]: https://developer.chrome.com/blog/local-network-access
[chrome145]: https://developer.chrome.com/release-notes/145
[chrome147]: https://developer.chrome.com/release-notes/147
[firefox]: https://support.mozilla.org/en-US/kb/control-personal-device-local-network-permissions-firefox
[safari]: https://bugs.webkit.org/show_bug.cgi?id=171934
[mdn-lna]: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Local_network_access
[csp]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src
[embeds]: https://developer.wordpress.org/playground/handbook/guides/php-code-snippets/
