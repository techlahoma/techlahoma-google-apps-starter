# WordPress workshop verification

- `Tease:` Source and protocol checks passed; browser rehearsal remains open.
- `Lede:` This record separates tested code and MCP behavior from the unverified WordPress, Antigravity, and deployed-browser workflow.
- `Why it matters:` A package version check or a successful bundle is insufficient evidence that an agent saved a real WordPress draft.
- `Go deeper:` Follow the [plan](../plans/wordpress-playground-workshop-2026-10-24.md) and [handoff](../../apps/wordpress-playground/PROMPT.md).

Date: October 24, 2026. Repository: `techlahoma/techlahoma-google-apps-starter`. Base revision: `3aa17fe75e2b554fac387c0e36e1f750246a43c1`. Work branch: `feat/wordpress-playground-workshop`. Checks below target the task worktree; the containing Git commit identifies the published source checkpoint. No cloud deployment was attempted.

## Environment and pins

- Linux x64, Node 24.22.1, Bun 1.3.14.
- App client and MCP 3.1.58; explicit Ajv 8.17.1 for the published MCP packaging issue below.
- WordPress Blueprint requests 7.1.3 and PHP 8.3. These are requested runtime versions, not an observed successful browser boot.
- Root lockfile retained; `bun install --frozen-lockfile` completed without lock changes after the app dependencies were added.
- Pinned Playwright 1.62.1 expects Chromium 151.0.7922.34, revision 1234. The browser executable could not be installed here.
- Required build/guardrail tools were downloaded to task-local storage, with their exact pins retained. No global developer-tool or browser security setting was changed.

## Completed narrow checks

| Check | Result and boundary |
| --- | --- |
| Before/after setup doctor | Git, exact Bun, checkout, and installed dependencies pass; browser remains missing |
| App `check` | Strict types, 7 tests / 40 assertions, and Vite production build pass |
| Official Blueprint validation | Installed 3.1.58 `validateBlueprint` accepts the committed JSON; no runtime boot is implied |
| Node tooling tests | 10 tests pass: launcher URL/runtime validation, real static HTTP server, path/method/symlink boundaries, export allowlist/refusal, generated standalone configuration |
| Scoped source lint/format | App source GTS checks and tooling formatting pass; integration script has separate strict TypeScript/format checks |
| Workshop skill syntax | Official skill-creator validator accepts frontmatter/name/description |
| Real MCP-only protocol test | Pass, including actual server initialization and token/origin rejection |

Commands:

```sh
bun run setup:doctor --json
bun install --frozen-lockfile
bun run --cwd apps/wordpress-playground check
node --test apps/wordpress-playground/scripts/*.test.mjs
bun apps/wordpress-playground/e2e/mcp-roundtrip.ts --mcp-only
```

The repo's default ESLint project excludes `e2e/`; a direct lint invocation on the integration file reports that exclusion. It was not disabled or reported as an ESLint pass. Separate strict TypeScript checking and formatting passed for that file.

## Actual MCP protocol evidence

The optional proof script starts the installed package through the real local launcher. It uses raw MCP JSON-RPC over stdio and real HTTP/WebSocket handshakes against the owned loopback process. No WordPress site, tool result, token, or endpoint is mocked in this mode.

| Boundary | Observed result |
| --- | --- |
| `initialize` and `playground_get_website_url` | Succeeded |
| Configured test HTTPS origin retained in launch URL | Succeeded |
| Allowed-origin `/bridge-token` request | 200; CORS origin matches exactly |
| Missing or unrelated token-request Origin | 403 |
| WebSocket with invalid token | 401 |
| WebSocket with correct token but unrelated Origin | 403 |
| WebSocket with correct token and allowed Origin | 101 |
| Owned-process shutdown | Completed, test exits 0 |

The test's `.invalid` HTTPS hostname is a deliberate non-network test origin; the test does not fetch or deploy it. This evidence does not prove browser permissions, comprehensive DNS-rebinding resistance, or support for cloud-hosted MCP control of a local browser.

### Packaging issue found by execution

The installed 3.1.58 bundle imports `ajv` from its entry module but omits that direct dependency. Under the repository's isolated global store, real startup failed with `ERR_MODULE_NOT_FOUND`. `--check` alone did not expose this. A trial using symlink-preserving Node resolution instead failed on `ws`, so that approach was discarded.

The retained fix declares exact Ajv 8.17.1 in this app and temporarily registers a Node resolver hook for only that exact importer/specifier pair. All other imports use default resolution, and the hook is removed after initial import. It leaves the upstream bridge and repo linker settings intact. The successful MCP-only test above exercises this implementation. Reassess the workaround after an eligible upstream update fixes the package manifest.

## Browser checks: blocked, not passed

`bun run browser:install` repeatedly received an invalid ZIP from the pinned official CDN URL. A focused response inspection found a **195-byte HTML “Site Unavailable” page**, not a browser archive. No TLS check, browser sandbox, security policy, version pin, or download integrity check was disabled.

Both these checks were attempted with the required local process permissions:

```sh
bun run app:browser:verify --app wordpress-playground
bun apps/wordpress-playground/e2e/mcp-roundtrip.ts
```

Vite started successfully. The full integration script also repeated the successful MCP/security assertions, then failed before browser launch because the expected Chromium executable was missing. The commands exited nonzero and cleaned up their owned processes.

**Not established:** visible WordPress boot, saved draft/readback through the browser, ZIP export/restore, actual UI screenshots, hosted CSP behavior, Chrome permission allow/deny, Firefox/Safari behavior, or an Antigravity client round trip. The shell test contains an explicitly unresponsive iframe fixture to test timeout handling; that fixture is not a simulated WordPress success.

The app contract remains `scaffold`. `bun run app:verify --app wordpress-playground` was run and exited 1 at that lifecycle gate, as intended. It therefore cannot establish completion yet. Finish the real acceptance work before changing that status.

## Publication and broader validation

| Check | Final integration result |
| --- | --- |
| `bun run verify` | Exit 0: repository contract, format, lint, types, root tests, and every app's checks/builds passed |
| Repository warning boundary | 32 existing Biome warnings in other apps; actionlint and shellcheck were not installed locally and their optional checks were not run. No workflow or shell source was changed |
| `prek run` on the staged task files | Passed all applicable hooks, including repository verification, private-key detection, and staged Gitleaks scan |
| Standalone export plan/apply | Passed; the exported copies match their source bytes, and a second plan correctly refuses to overwrite the existing destination |
| Isolated npm validation | Using task-local npm 11.16.0: generated the separate lockfile, `npm ci`, `npm run typecheck`, and `npm run build` all passed outside the monorepo workspace configuration |
| Exported production server | Real HTTP checks passed for `/`, `/healthz`, built JavaScript, CSP, and the requested WordPress 7.1.3 Blueprint; the owned test process was stopped |
| Independent review | No blocking findings across runtime/bridge/recovery source, hosting/export tooling, prompts/spec, evidence, and drafting-skill target/fact handling; read-only review, not runtime proof |
| Diff hygiene | Only this task's 39 files are staged; no credentials, local project binding, downloaded browser/tool, participant ZIP, generated export, or second app lockfile is included |

The builds retain Vite's advisory warning about an upstream client chunk over 500 kB. It is dynamically loaded after Start. The warning threshold was not raised to hide it.

The standalone export is generated output, not a second tracked project or proof that AI Studio's importer accepted it. Its separate npm lockfile was used for validation only. GitHub source publication targets the named task branch; the containing Git commit is the durable checkpoint. No merge, cloud deployment, provisioning, or billing change is implied.

## Upstream skill installation follow-up

October 24, 2026. This follow-up extends local checkpoint
`c6f0362e1a0e438587c02937cb62f1c7a4a686fa` with the user's explicit request to
install the literal upstream planning skills. The containing Git commit owns the
updated source. Checks used Linux, Bun 1.3.14, and Git 2.51.1.

| Check | Observed result |
| --- | --- |
| Manager installation | The existing `skills-lock` revision `4e37719a163b6022d4a2828850567421f9de7825` was installed from its immutable archive; the root Bun lock records archive integrity. |
| Locked dependency restore | `bun install --frozen-lockfile` passed with no changes after the new manager was added. |
| Actual skill restore | `bun run skills:apply` restored all five selected skills from an empty installed directory set and empty source cache, using native `install --frozen`. The lock file stayed unchanged. |
| Installed content | `bun run skills:check` verified all five directory hashes at Matt Pocock revision `5beb35b040e3de97e54fa9e386d7e42d15c295c2`: 16 original files, including setup templates, agent metadata, and writing mechanics. |
| Repository boundaries | `git check-ignore` confirms each of the five external skill directories and the source cache is ignored. `git ls-files .agents/skills` still contains only the existing first-party bootstrap/demo skills. |
| Repeat and refusal behavior | Four installer tests, 15 assertions, passed. They exercise offline plan/check, unchanged repeat apply, refusal of edited copies, missing installs, inconsistent locks, and symlink rejection. The symlink test skips Windows because creating links there can require separate privileges. |
| Literal setup | The setup skill and its local tracker/domain templates were read and applied to `docs/agents/`. Existing durable spec/plan and decision locations were retained. No remote issues or triage labels were created. |
| Documentation use | Installed `writing-for-agents` and `handoff` instructions were read for this update. The existing spec is not claimed to have been generated retroactively by the installed `to-spec` skill. |
| Repository validation | `bun run verify` passed after the changes, including format, lint, strict types, tests, and workspace checks/builds. Existing 32 Biome warnings, the upstream chunk-size advisory, and missing optional actionlint/shellcheck remain as previously recorded. |
| Independent review | A separate read-only review found no material issue in the installer, locked source, ignore rules, setup, or updated prompts. |

The normal install is explicit and project-local. It runs the pinned manager with
Bun, so this skill setup does not add a Node prerequisite to the base starter.
No automatic install hook, global skill directory, or floating source is used.
The native manager overwrites destinations; the wrapper checks existing copies
before invoking it and refuses content that differs from the lock. Its Git
line-ending setting applies only to the child process. Native Windows/macOS runs
and actual skill discovery in the Antigravity UI were not exercised here.

This follow-up changes skill setup and documentation. Browser, WordPress, MCP,
AI Studio import, and deployment acceptance remain at their previously recorded
states. The standalone AI Studio export does not contain these installed skills
or the monorepo's skill manager.

## Remaining acceptance

1. Install the exact browser on a supported environment and run the shell and real runtime suites without weakened settings.
2. Rehearse through local Antigravity: identify the site, create one draft, read it back, and open the returned editor ID.
3. Export that site, restore it into a new sandbox, and verify the draft survives; test reset independently.
4. Rehearse allow/deny, wrong origin, process restart, and two tabs on the final top-level HTTPS origin.
5. Verify isolated AI Studio import and deployed Cloud Run behavior, or use the existing Firebase workflow with a named authorized target.
6. Record the final browser, source revision, public URL if deployed, and each passed/failed/not-exercised criterion. Only then update the lifecycle contract and plan checkboxes.

## Primary references

- [Published-version source and manifest](https://github.com/WordPress/wordpress-playground/tree/v3.1.58/packages/playground/mcp).
- [WordPress 7.1.3 release, October 6](https://wordpress.org/news/2026/10/wordpress-7-1-3-maintenance-and-security-release/).
- [Node module customization hooks](https://nodejs.org/api/module.html#moduleregisterhooksoptions).
- [Browser security review and sources](../research/wordpress-playground-browser-bridge-2026-10-24.md).
