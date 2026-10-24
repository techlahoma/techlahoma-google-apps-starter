# Matt Pocock's spec and handoff practices for the WordPress workshop

- `Tease:` Give the next agent a clear destination and a small first delivery.
- `Lede:` Adopt Pocock's seven-section spec, independently verifiable implementation slices, and a short handoff that references the canonical documents. Adapt the format to this repository's existing workflow.
- `Why it matters:` The workshop needs a repeatable WordPress and MCP demonstration. An agent should spend its next session proving that connection, with the decisions and evidence already available.
- `Go deeper:` The source checkpoint, adopted structure, proposed slices, and repository constraints follow. The source links preserve the exact skill versions inspected.

## Scope and source checkpoint

Research date: October 24, 2026. The upstream repository's observed `main` was
`5beb35b040e3de97e54fa9e386d7e42d15c295c2`, dated October 19, 2026.
The relevant files were read at that immutable revision. `to-spec` last changed
August 19; `to-tickets` and `handoff` last changed October 6. Pocock's explanatory
AI Hero articles display an August 24 update date. The current source files take
precedence when an older tutorial uses different names.

This memo selects documentation practices for the workshop scaffold. Application
implementation, runtime checks, publishing, and deployment need their own recorded
evidence.

## What the current skills recommend

[`to-spec`][to-spec] is the current successor to `to-prd`. It synthesizes existing
conversation and repository knowledge. It separates requirements and settled
decisions from implementation tasks, uses the project's vocabulary, and identifies
where behavior will be tested. The source asks for extensive user stories, but the
useful requirement here is coverage of real participant and presenter needs.
Invented stories add no evidence.

[`to-tickets`][to-tickets] divides work into complete, narrow user behaviors. Each
slice must be demonstrable or verifiable on its own, fit a fresh agent context,
and identify the work that actually blocks it. Its publication process depends on
a configured issue tracker. The transferable idea is the delivery structure; this
scaffold can retain a compact implementation plan within the repository's existing
documentation convention.

[`handoff`][handoff] carries the current task and next objective between sessions.
It points to specs, plans, commits, and other evidence instead of reproducing them,
and includes suggested skills. Upstream uses a temporary file by default. The
requested GitHub handoff belongs in durable repository documentation so the next
agent can retrieve it later.

## The spec structure to adopt

Use these seven sections from the current template. State proposed defaults and
unverified assumptions explicitly rather than presenting them as user decisions.

| Section | Workshop content |
| --- | --- |
| Problem statement | Participants need a WordPress environment they can launch and control without Docker setup. |
| Solution | A repository-owned Playground recipe, a documented MCP connection, and a repeatable skills exercise. |
| User stories | Launch the starter, connect the agent, create a draft, inspect it, compare runs, reset, and retain work. |
| Implementation decisions | Runtime choice, MCP transport, version pins, starting content, persistence, and optional hosting boundaries. |
| Testing decisions | Observe the complete draft-creation workflow and the documented recovery behavior. |
| Out of scope | Production publishing, shared participant databases, and a custom bridge unless the official connection fails a demonstrated requirement. |
| Further notes | Evidence links, unresolved compatibility questions, and the conditions for revisiting a choice. |

Describe contracts and behavior in the spec. Keep changeable commands and concrete
repository paths in the scaffold README and handoff. This follows upstream's
distinction between a durable decision and a cached implementation detail.

## Proposed implementation slices

These are recommendations for the future implementation plan, not completed work.

1. **Launch the starter.** A participant opens the repository's Playground link
   and sees the expected seeded site and WordPress admin. Record the exact recipe
   and runtime versions used.
2. **Create one draft through MCP.** After the starter works, configure the
   client, discover its tools, create a uniquely identifiable draft, and open that
   exact post in WordPress. The title, content, and draft status must match.
3. **Run the skills comparison.** After MCP works, repeat one task from identical
   starter state, keeping the model, prompt, tool access, and evaluation criteria
   constant. Change only the skill context and record the actual results.
4. **Recover and retain work.** Demonstrate export and reopening, and reset the
   presenter environment to the known starter. Starter recovery depends on slice
   one; recovery of an agent-created draft also depends on slice two.

An AI Studio or Firebase wrapper is an optional additional slice. Its deployment
and browser compatibility should be verified independently. It should not block
the first successful local MCP demonstration.

The main testing boundary is the observable draft workflow, from configured agent
through MCP to the visible WordPress record. Recovery adds a second observable
boundary. Tests should assert these outcomes and failures, with verification
records distinguishing intended checks, implemented checks, and checks actually
run.

## A short handoff with reliable references

The handoff should identify the repository, branch, checkpoint commit, next
objective, and required reading. State what exists, what was verified, what remains
uncertain, and the next slice's acceptance criteria. Reference the spec and
research for detailed decisions. Preserve the reason for a choice when it exists
only in the conversation.

Include relevant suggested skills, such as the official WordPress Blueprint skill
when editing a recipe. Adopting these documentation practices does not require
installing Pocock's entire suite or introducing another tracker. His
[`writing-for-agents`][writing] guidance favors clear completion criteria, specific
document pointers, and one authoritative location for each fact.

## Existing repository constraints

The repository contract places runnable demos under `apps/<slug>` and preserves
the shared Bun toolchain and root lockfile. The root development command launches
the welcome app; it does not select an arbitrary new workshop automatically.

The [Model Workshop README][model-readme] explicitly recommends a separate
from-scratch AI Studio path. Its recorded concerns are the connected-account
repository picker and compatibility of the Bun workspace and asset preparation
with AI Studio's documented runtime. The [verification record][model-proof]
observed the GitHub import interface but stopped at account connection. These
records establish an unverified import, not proof that monorepos are impossible.
An isolated export with compatible commands is a candidate to test separately.

## Sources

- [Current to-spec source][to-spec], pinned October 19 repository revision.
- [Current to-tickets source][to-tickets], same revision.
- [Current handoff source][handoff], same revision.
- [Writing-for-agents source][writing], same revision.
- [Matt Pocock's explanation of to-spec](https://www.aihero.dev/skills-to-spec).
- [Matt Pocock's explanation of handoff](https://www.aihero.dev/skills-handoff).

[to-spec]: https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/to-spec/SKILL.md
[to-tickets]: https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/to-tickets/SKILL.md
[handoff]: https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/productivity/handoff/SKILL.md
[writing]: https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/productivity/writing-for-agents/SKILL.md
[model-readme]: https://github.com/techlahoma/techlahoma-google-apps-starter/blob/3aa17fe75e2b554fac387c0e36e1f750246a43c1/apps/building-ai-models-without-coding/README.md
[model-proof]: https://github.com/techlahoma/techlahoma-google-apps-starter/blob/3aa17fe75e2b554fac387c0e36e1f750246a43c1/docs/verification/model-workshop-2026-09-15.md
