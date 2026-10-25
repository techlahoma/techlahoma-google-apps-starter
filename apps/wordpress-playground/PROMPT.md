# Agent handoff: WordPress workshop

- `Tease:` Continue from the scaffold and prove a visible WordPress draft.
- `Lede:` Use the prompt below in local Antigravity with this repository checked out.
- `Why it matters:` It preserves the actual architecture, evidence, and remaining work without making the next agent reconstruct the research.
- `Go deeper:` The [spec](../../docs/wordpress-workshop/SPEC.md), [plan](../../docs/plans/wordpress-playground-workshop-2026-10-24.md), and [verification record](../../docs/verification/wordpress-playground-workshop-2026-10-24.md) are authoritative for their respective concerns.

## Copy this prompt

```text
Finish and rehearse the WordPress Agent Workshop in the existing
techlahoma/techlahoma-google-apps-starter monorepo, starting from branch
feat/wordpress-playground-workshop. Preserve other apps and unrelated changes.

Read AGENTS.md, PROJECT.md, apps/AGENTS.md, the active .starter/addenda, and:
- apps/wordpress-playground/README.md
- docs/wordpress-workshop/SPEC.md
- docs/plans/wordpress-playground-workshop-2026-10-24.md
- docs/verification/wordpress-playground-workshop-2026-10-24.md
Use the research linked there when an implementation fact needs checking.

Restore the actual planning skills before revising the spec or plan. From the
repository root, run bun install --frozen-lockfile, bun run skills:plan,
bun run skills:apply, and bun run skills:check. package.json and skills-lock.json
select the reviewed upstream files; keep their installed copies out of Git.
Read .agents/skills/setup-matt-pocock-skills/SKILL.md and check the existing
docs/agents/issue-tracker.md and docs/agents/domain.md configuration. Preserve
the configured local Markdown workflow and settled setup choices.

When revising requirements, open .agents/skills/to-spec/SKILL.md. When splitting
implementation work, open .agents/skills/to-tickets/SKILL.md. When writing agent
instructions or a handoff, open .agents/skills/writing-for-agents/SKILL.md and
.agents/skills/handoff/SKILL.md respectively, following their referenced files.
Use those source instructions, not a remembered description of them. Update the
existing canonical spec, plan, and durable handoff; create separate ticket files
only when the task calls for tickets. The initial spec predates this install.
Skill instructions do not grant new external publication or deployment authority.

The app source and local tooling already exist. First inspect the checkout and
actual evidence. Resolve remaining defects; do not recreate the architecture.
Keep official @wp-playground/client and @wp-playground/mcp pinned at 3.1.58
unless a reviewed update respects the repo's release buffer and passes the same
checks. The launcher contains a narrowly scoped fix for the published MCP
bundle's undeclared Ajv import. Test actual startup before removing it.

The hosted app embeds WordPress/PHP-WASM in the attendee's browser. Local
Antigravity starts the Node stdio MCP process. The app uses the official browser
bridge after an explicit Connect action. Cloud Run's Node server serves static
files only; it must not replace the local MCP process. Do not add a public relay,
application passwords, a database, Docker, or a conventional WordPress server.

Prove the first uncompleted slice: start the committed Blueprint, connect the
official MCP, discover the visible site ID, create a uniquely marked draft via
WordPress REST, read its saved fields back, and open that exact post in the
WordPress editor. Then prove ZIP export/restore and reset behavior. A simulated
tool response or a source/build check is not this proof. Preserve the distinction
between the integration script and actual Antigravity/hosted-browser testing.

Use the provided brief, editorial rules, rubric, and optional drafting skill in
apps/wordpress-playground/workshop. Keep the skill outside automatic discovery
for the baseline. Compare fresh sessions with identical inputs and initial
state; report the observed results even if both runs succeed. Keep the installed
planning skills identical in both runs; only the workshop drafting skill varies.

Prepare the preferred AI Studio path with the export script's plan/apply flow
and apps/wordpress-playground/AI_STUDIO_PROMPT.md. Do not assume AI Studio can
select this monorepo's app root. If its supported import/runtime flow blocks the
isolated project, prepare the existing Firebase app-specific deployment instead.
Do all build and verification work before asking for a final target decision.

GitHub source publication for this workshop is authorized. Do not merge, deploy,
enable billing, provision cloud resources, or change account configuration unless
the current session supplies that authority and a concrete target. Do not ask
again for an action already authorized in the session. Missing cloud credentials
or project selection must not block useful local work.

Run the repo's applicable checks and touched-file guardrails. Do not disable
browser security, weaken tests, change the root linker, or mark app.contract.json
complete to hide a verification gap. Update the plan and evidence with passed,
failed, blocked, and not-exercised criteria. If deployment is authorized, use the
named app/project only, open the final HTTPS URL directly, repeat the draft and
permission checks, and record its revision, URL, and rollback path.

Return the exact source revision, changed behavior, checks actually run, actual
draft/recovery evidence, deployment status, and any remaining blocker. Never
claim that the cloud agent's localhost reaches the attendee's laptop.
```

## Installed skills and entry points

The [app guide](README.md#install-the-planning-skills) documents the five pinned Matt Pocock skills and their restore/check commands. The [source research](../../docs/research/matt-pocock-specs-and-handoffs-2026-10-24.md) records the exact upstream revisions. Installation makes the files available; open the relevant `SKILL.md` explicitly if the agent does not discover it.

Use this repository's `bootstrap-workspace` and `build-and-launch-demo` skills where applicable. For changed Playground/Blueprint APIs, consult the official [WordPress agent-skills source](https://github.com/WordPress/agent-skills) at a reviewed revision, especially `blueprint` and `wp-playground`; these are separate from the pinned Matt Pocock install.

The optional workshop drafting skill is in `workshop/skills/wordpress-workshop-draft/`. Copy it into `.agents/skills/` only for the skill-enabled exercise. The planning skills stay available in both runs.
