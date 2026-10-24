# WordPress workshop implementation plan

- `Tease:` Prove one visible draft, then rehearse the workshop.
- `Lede:` Deliver the source and handoff in the existing meetup monorepo, with AI Studio and Firebase deployment paths kept explicit.
- `Why it matters:` A complete slice reveals integration problems earlier than separate frontend and bridge tasks.
- `Go deeper:` Use the [spec](../wordpress-workshop/SPEC.md), [app guide](../../apps/wordpress-playground/README.md), and [verification evidence](../verification/wordpress-playground-workshop-2026-10-24.md).

## Scope and checkpoint

Repository: `techlahoma/techlahoma-google-apps-starter`. Starting revision: `3aa17fe75e2b554fac387c0e36e1f750246a43c1`. Work branch: `feat/wordpress-playground-workshop`. User authorized saving the research and scaffold to this existing GitHub repository. No cloud resources are created by this work.

This document owns the ongoing plan and progress. The verification record owns measured evidence. A checkbox means its stated outcome has been observed, not that code for it merely exists.

## Slice 1: launch an isolated starting site

Depends on: none.

- [x] Locate the repo, read its instructions, and use its app generator.
- [x] Resolve current upstream APIs and select 3.1.58 within the release buffer.
- [ ] Boot the committed Blueprint in an actual browser and inspect its seed content.
- [ ] Observe actionable errors when the runtime is unavailable.
- [ ] Verify phone-width controls and normal console output.

Implementation: static app source, a user-triggered runtime, a distinct per-tab site identity, and the hosted canonical runtime. Do not claim that client pinning freezes the remote website.

## Slice 2: create and read back one draft

Depends on: slice 1's working runtime.

- [ ] Start the pinned MCP process through the local launcher and Antigravity.
- [x] Execute the real local MCP protocol and origin/token checks through the launcher, without claiming the separate Antigravity/browser step.
- [ ] Open its generated URL and grant the site permission after clicking Connect.
- [ ] Observe the correct site in MCP discovery, create a unique draft, and read back its stored fields.
- [ ] Open the actual returned post ID in the editor.
- [ ] Exercise denied permission, wrong origin, bridge restart, and two open tabs.

Implementation: use the official exported bridge with a single-site adapter. Do not substitute mock tool success for this slice. Node on Cloud Run does not replace the local MCP process.

## Slice 3: recover and reset

Depends on: slice 1; use slice 2's saved post for proof.

- [ ] Export a ZIP containing the actual draft.
- [ ] Restore it into a fresh sandbox and confirm the same draft exists.
- [ ] Confirm reset requires consent and restores the committed starter.
- [ ] Verify that browser saving reports unsupported and that reload discards temporary state as documented.

Implementation: ZIP export/import first. Browser persistence is a later requirement, not an implied capability.

## Slice 4: compare the skill

Depends on: slices 2 and 3.

- [ ] Run the same event task in fresh conversations with identical inputs and tool access.
- [ ] Keep only the drafting skill different between runs.
- [ ] Inspect actual saved content against the shared rubric.
- [ ] Record observed differences, including the possibility that both runs succeed.

The repo includes a synthetic event brief, editorial rules, a rubric, and a small drafting skill. No staged failure or claimed performance uplift is part of the deliverable.

## Slice 5: deploy the wrapper

Depends on: source/build verification; hosted bridge acceptance still depends on slice 2.

- [x] Generate and inspect the standalone AI Studio export.
- [x] Install/typecheck/build the isolated export with supported npm and verify its production static server over HTTP.
- [ ] Verify actual import in AI Studio at the isolated project root.
- [ ] Resolve the cloud project, account, audience, billing implications, and deployment authority.
- [ ] Deploy through AI Studio/Cloud Run; if import/runtime support blocks it, use the repo's Firebase app deployment plan.
- [ ] Open the final HTTPS URL directly and repeat the actual draft and permission checks.
- [ ] Record the deployed revision/URL and a rollback command.

The current repository has no deploy-on-push workflow. Publishing this branch does not deploy the app.

## Integration progress

Research, spec, prompts, browser source, local MCP launcher, Node static server, standalone export, and demonstration materials are present in this branch. The full repository check, ten Node tooling tests, seven app tests, real MCP protocol checks, standalone npm build/server checks, and applicable staged guardrails passed. Read the verification record for the exact boundaries and existing warning/tool gaps.

The environment's pinned Chromium download returned an invalid archive. Preserve the expected browser version and security settings; do not downgrade the dependency, disable the sandbox, or mark a browser check passed to work around that environment failure.

## Next-agent order

1. Read the [handoff prompt](../../apps/wordpress-playground/PROMPT.md) and evidence.
2. Resolve any recorded build or validation issue, then prove slices 1 and 2 locally.
3. Prove ZIP recovery, rehearse the skill comparison, and prepare the chosen deployment.
4. Apply only an authorized deployment to the named target, then repeat hosted acceptance.
5. Update this plan, the evidence, and app contract from actual results. Preserve separate source, build, browser, Antigravity, and deployed statuses.
