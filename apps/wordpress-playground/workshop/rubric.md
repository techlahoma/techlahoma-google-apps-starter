# Draft inspection and comparison

- `Tease:` Compare what was saved in WordPress.
- `Lede:` Use the same task, facts, rules, model, tools, and initial site in both runs; change only access to the drafting skill.
- `Why it matters:` Withholding rules or staging a failed baseline would measure a different question.
- `Go deeper:` Follow the [app guide](../README.md) for setup, reset, and backup.

## Task for both runs

> Turn `apps/wordpress-playground/workshop/event-brief.md` into a WordPress draft using `apps/wordpress-playground/workshop/publishing-rules.md`. Open the saved result for inspection.

## Preparation

The packaged skill is stored under this app's `workshop/skills/` directory, outside automatic workspace skill discovery. For the baseline, keep it there and start a fresh conversation. For the skill run, copy `wordpress-workshop-draft/` into the workspace's `.agents/skills/` directory and start a fresh conversation; explicitly invoke `$wordpress-workshop-draft` if needed. Both runs can read the brief and rules. Restore the same starting site before each run. Use the visible site IDs to avoid writing into the wrong tab.

Do not place the source skill itself in the baseline prompt. Record the model and version, browser, MCP version, task prompt, starting state, and any interventions. A manual correction is evidence, not something to hide.

## Inspect actual saved fields

| Criterion | Evidence to record |
| --- | --- |
| Intended site | Visible site ID/name agrees with MCP target |
| Saved draft | Returned post ID and REST readback status `draft` |
| Title and marker | Match the supplied title; body contains `AGENT-SKILLS-DEMO` |
| Facts | Date/time/zone, price, audience, and laptop/charger preserved |
| Missing fields | Venue TBD and unavailable registration stated without fabrication |
| Attribution | Clearly fictional, no invented credentials or sponsors |
| Structure | Editable blocks and requested sections |
| Category | Events category ID verified from the actual site |
| Verification | Readback and editor inspection of the same post ID |
| Recovery | ZIP export retained by participant; optional restore verified |

Record pass, fail, or not observed per criterion. Count retries/corrections if useful, but do not invent numeric scores or claim a general model improvement from one workshop run. If both runs pass, discuss the procedure and verification behavior rather than forcing a winner.
