# Transcript-Conditioned CRM Design Research

- `Tease:` A good small CRM is a next-action system with memory, not a dashboard with renamed cards.
- `Lede:` The live-demo prompt should first model the business's relationship and work nouns, then implement an urgency queue, a stage workflow, and a contextual record history over durable local data.
- `Why it matters:` Those choices make the result recognizable as operational software while preventing the most common generated-app failures: generic vocabulary, decorative controls, shallow tests, fake persistence, and a detail pane disconnected from the selected record.
- `Go deeper:` Drizzle with PGlite is a credible browser demo architecture. Firebase Hosting can later serve it as a static app, but shared authenticated data requires a new repository boundary rather than a fictional Drizzle-to-Firebase adapter swap.

- **Prepared:** 2026-08-06 (America/Chicago)
- **Prompt:** [Transcript CRM Live-Demo Prompt](../../apps/relationship-workbench/PROMPT.md)

## Product findings

### What the existing demo gets right—and why it still feels generated

The repository's `apps/example-crm` is functional and more complete than a static mockup: it has follow-ups, contacts, pipeline movement, storage error handling, and import/export logic. Its weakness is product shape. The business is permanently a bike shop, the information model stays `Contact` plus `Opportunity`, and the top-level experience is the familiar Today / Contacts / Pipeline / Settings template. KPI cards, emoji navigation, setup banners, archive controls, and configuration breadth compete with the operator's actual next action. Selection also does not create one continuous relationship/work/history surface. It uses localStorage rather than a queryable relational model, and the older workspace has no current app contract or callable browser smoke receipt.

**Prompt consequence:** keep the useful follow-up and workflow behaviors, but remove setup/configuration breadth, generic KPI decoration, and fixed sales nouns. Put transcript-derived language over a relationship/work model, make selected detail and timeline continuous, use real Drizzle/PGlite persistence, and require a browser flow that proves the record created during the demo.

### Model the business before choosing screens

The transcript needs to yield at least two distinct concepts: a durable relationship record and the piece of work that moves through a process. Attio's published model separates objects and records, which hold facts, from lists, which can model workflows. It also supports custom objects when a company's data does not fit generic people, companies, and deals. The prompt therefore asks for the business's real nouns and stages before implementation rather than relabeling a fixed sales schema.

**Prompt consequence:** one typed `business-profile` becomes a reviewable design contract for nouns, fields, workflow stages, attention rules, actions, and visual direction.

### Make the first screen answer “what should I do?”

Pipedrive sorts pipeline work by next activity by default, placing overdue and due-today activity ahead of future work. Its current pipeline guidance also presents a record's next activity directly on the work card. That pattern is more useful in a live small-business demo than generic revenue metrics or four KPI cards whose numbers do not help someone act.

**Prompt consequence:** `Focus` is an explainable urgency queue. Each item includes the reason it surfaced, its due timing, the related record, and a direct complete or reschedule action.

### Keep identity, work, history, and next action together

HubSpot's record layout combines core properties, associations, recent activity, and an activity timeline. Pipedrive's detail view similarly gathers status, linked contacts, activities, notes, and a dated change history. Attio describes a record page as the place where related activity and data come together. The common principle is contextual continuity: selecting a record should not make the operator reconstruct its story across disconnected pages.

**Prompt consequence:** list selection drives a real detail surface containing high-signal fields, related work, chronological activity, and the next task. Adding a note, task, or stage change must update that history.

### Favor compact, reversible operations over decorative breadth

A small CRM feels trustworthy when every control has a predictable state transition, validation, persistence, feedback, and recovery path. Stage changes need an activity record and Undo; likely duplicates need a warning plus an explicit override; reset needs cancellation and confirmation; database failures cannot end in a success toast. These are product-quality boundaries, not optional polish.

**Prompt consequence:** the prompt prohibits enabled no-op controls and requires a browser-tested mapping from each visible action to its implementation and proof.

## Local data architecture

Drizzle publishes an official PGlite adapter and demonstrates using Drizzle's query builder over an existing `PGlite` client. PGlite's IndexedDB filesystem persists a Postgres data directory within the browser origin and profile; its documentation currently recommends IndexedDB for broad browser support. PGlite also offers a multi-tab worker, but that adds bundler and lifecycle complexity that should not endanger a timed demo.

The important boundary is explicit:

- The browser app uses PostgreSQL-flavored Drizzle schemas and Drizzle repository queries.
- PGlite stores the local demo database at a stable `idb://` directory.
- Raw PGlite SQL is limited to bootstrap and the browser-safe migration runner.
- IndexedDB is durable across reloads and browser restarts for the same profile and origin, but it is not authenticated multi-device synchronization.
- Firebase Hosting can host the static bundle without changing that storage boundary.
- Drizzle's published connection-provider list does not include a Firebase database adapter. A later Drizzle-preserving architecture needs a secured server API backed by PostgreSQL. Firebase SQL Connect is a separate Cloud SQL for PostgreSQL product with declared queries and generated type-safe client SDKs, so adopting it would replace the repository implementation rather than merely change a Drizzle connection string.

## Evaluation-model choice

The accessible sub-agent roster for this task exposes GPT-5.6 Sol and GPT-5.6 Terra. OpenAI positions Terra as the balanced, lower-cost model for everyday work and supports explicit `low` reasoning. Google positions Gemini 3.6 Flash as a speed/intelligence balance for agentic work, supports `low`, and defaults it to `medium`. GPT-5.6 Terra at low reasoning is therefore the closest conservative evaluator available here.

This is an operational analogy, not a claim that the two vendors' effort levels or benchmark scores are calibrated. Terra may still be stronger in some coding and frontend tasks. Requiring the prompt to pass multiple independent Terra-low builds is meant to expose ambiguity and verification loopholes; it cannot mathematically guarantee a Gemini result.

## Optional Antigravity skill pack

Addy Osmani's `agent-skills` repository is the strongest fit for this event because it has a documented native Antigravity plugin installation and includes the exact workflows this build needs: frontend UI engineering, test-driven development, browser testing, code review, and simplification. Its official repository currently lists 24 skills, while skills.sh reports substantial aggregate use for the pack. Install it before the session, then let the prompt invoke only the relevant skills; loading or installing skills during the timed build would spend context and introduce network risk.

This recommendation comes from the skill ecosystem's install data plus direct source review, not from the name alone. The prompt still contains explicit acceptance criteria because a skill pack cannot substitute for a product contract or runtime proof.

## Sources

- [Attio: Understanding the data model](https://attio.com/help/reference/attio-101/attios-data-model/understanding-attio-data-model)
- [Attio: Create and view records](https://attio.com/help/reference/managing-your-data/records/create-and-view-records)
- [Pipedrive: Pipeline view](https://support.pipedrive.com/en/article/pipeline-view)
- [Pipedrive: Prioritize deals by next activity](https://support.pipedrive.com/en/article/how-are-deals-ordered-in-the-pipeline-view)
- [Pipedrive: Deal detail view](https://support.pipedrive.com/en/article/deal-detail-view)
- [HubSpot: Customize records](https://knowledge.hubspot.com/object-settings/customize-records)
- [Drizzle ORM: PGlite connection](https://orm.drizzle.team/docs/connect-pglite)
- [Drizzle ORM: Database connections](https://orm.drizzle.team/docs/connect-overview)
- [PGlite: Filesystems](https://pglite.dev/docs/filesystems)
- [PGlite: Multi-tab worker](https://pglite.dev/docs/multi-tab-worker)
- [Firebase SQL Connect](https://firebase.google.com/docs/sql-connect)
- [Google: Gemini 3.6 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.6-flash)
- [Google: Gemini thinking levels](https://ai.google.dev/gemini-api/docs/thinking)
- [OpenAI: GPT-5.6 model family](https://openai.com/index/gpt-5-6/)
- [OpenAI API: Model selection](https://developers.openai.com/api/docs/models)
- [Addy Osmani: agent-skills](https://github.com/addyosmani/agent-skills)
- [Addy Osmani: Antigravity setup](https://github.com/addyosmani/agent-skills/blob/main/docs/antigravity-setup.md)
- [skills.sh: Addy Osmani skills](https://www.skills.sh/addyosmani)
