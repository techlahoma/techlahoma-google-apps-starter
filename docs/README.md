# Documentation Map

- `Tease:` Durable project state has predictable homes.
- `Lede:` Documentation is organized by its job, with initiative slices only
  when a topic grows large enough to need its own entrypoint.
- `Why it matters:`
  - Future humans and agents can find current intent, rationale, and evidence
    without reconstructing chat.
  - Minimal structure prevents both scattered documents and empty scaffolding.
- `Go deeper:`
  - Use the templates in `docs/templates/`.
  - Keep plan and progress in the same file.

## Global document types

| Job | Path |
|---|---|
| Source-backed investigation | `docs/research/<topic>-YYYY-MM-DD.md` |
| Plan and ongoing progress | `docs/plans/<topic>-YYYY-MM-DD.md` |
| Nygard architecture decision | `docs/decisions/<topic>-YYYY-MM-DD.md` |
| Durable verification evidence | `docs/verification/<topic>-YYYY-MM-DD.md` |
| Repository-wide convention | `docs/conventions/<topic>.md` |
| Reusable document starting point | `docs/templates/<type>.md` |

Create a folder only when its first real document exists.

## Current project documents

- [Research: public Google engineering conventions](research/google-public-engineering-conventions-2026-08-03.md)
- [Research: Firebase and Google Cloud setup for agent-built apps](research/firebase-gcp-agent-provisioning-2026-08-03.md)
- [Decision: selectively adopt public Google engineering conventions](decisions/google-public-engineering-conventions-2026-08-03.md)
- [Decision: static Firebase Hosting with one project per environment](decisions/project-per-environment-google-starter-2026-08-03.md)
- [Operations: Google Cloud lifecycle](operations/google-cloud.md)
- [Verification: Google App Starter](verification/google-app-starter-2026-08-03.md)

## Initiative slices

Promote an ongoing product, client, campaign, event, or subsystem to
`docs/<initiative>/` when it needs a stable entrypoint, spans multiple document
types, or accumulates roughly ten dated documents.

The slice README owns status, start-here links, folder rules, and sensitivity
notes. Add only the typed subfolders that contain real material.

## Human-facing document summary

Immediately after the title, add:

- `Tease:` one-line relevance signal;
- `Lede:` the short answer or purpose;
- `Why it matters:` consequences;
- `Go deeper:` best next links or actions.

Raw transcripts and machine-readable source files do not require this block.
