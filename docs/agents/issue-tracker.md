# Issue tracker and document destinations

- `Tease:` Keep workshop decisions and progress in the existing repository documents.
- `Lede:` Matt Pocock's installed skills use local Markdown for this project. Specs and plans stay at their canonical paths; this setup creates no remote issues or labels.
- `Why it matters:` The next agent needs durable instructions that agree with the repository's current workflow.
- `Go deeper:` The destinations and the meaning of upstream publication instructions follow.

## Configured tracker

The tracker is local Markdown in this Git repository. Continue the existing
research, spec, plan, and verification records. The user requested durable files
for the workshop handoff and explicitly requested installation of the upstream
skills. No new issue-tracking service is needed for that work.

For the WordPress workshop, use these canonical destinations:

| Output | Destination |
| --- | --- |
| Spec | `docs/wordpress-workshop/SPEC.md` |
| Plan and progress | `docs/plans/wordpress-playground-workshop-2026-10-24.md` |
| Measured verification | `docs/verification/wordpress-playground-workshop-2026-10-24.md` |
| Durable next-agent prompt | `apps/wordpress-playground/PROMPT.md` |
| Individual tickets, if requested | `docs/wordpress-workshop/issues/<NN>-<slug>.md` |

For another initiative, use its existing canonical documents. If it has none,
follow the `docs/` conventions in `AGENTS.md` and record the chosen destinations in
its dated plan.

## When a skill says to publish or fetch

For `to-spec`, publishing means updating the canonical spec file. For `to-tickets`,
publishing means writing one Markdown file per approved ticket, numbered from
`01` in dependency order. Each ticket records its acceptance criteria and
`Blocked by` references. Read the actual referenced files when fetching a spec or
ticket.

The upstream local-file template uses `.scratch/<feature>/`. This repository
uses the durable paths above for the requested handoff. Preserve the original
installed skill files; these project settings provide their output destinations.

The existing plan remains the progress index. If individual tickets become
useful, link to them from that plan instead of copying their acceptance criteria
into multiple documents. This setup does not create an empty ticket directory or
retrospectively turn the plan's unfinished work into completed tickets.

For the selected `to-spec` and `to-tickets` workflows, the upstream
`ready-for-agent` label maps to a local `Status: ready-for-agent` field on newly
prepared work. Readiness means the work is specified; completion requires the
recorded proof. The `triage` skill is not installed, so there is no separate triage
label configuration or remote label creation.

Keep the existing SBC4 header convention on human-facing Markdown. Local file
creation, Git publication, and cloud deployment remain separate effects under
`AGENTS.md`. A skill's use of the word "publish" grants no additional remote
authority.

## Handoff destination

Upstream `handoff` normally writes to the operating system's temporary directory.
For the requested durable workshop handoff, update the prompt file above and point
to the canonical spec, plan, and proof. Preserve a short next objective and useful
references rather than duplicating those documents.

## Source

Configured from the literal
[setup skill](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/setup-matt-pocock-skills/SKILL.md)
and its
[local tracker template](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/setup-matt-pocock-skills/issue-tracker-local.md).
The tracked manifest and lock identify the installed source; this file contains
the repository-specific settings.
