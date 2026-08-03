# UI and Browser Profile

- `Tease:` Define screen intent before proving visual behavior.
- `Lede:` This profile adds UX framing, state-aware screen review,
  accessibility expectations, isolated browser-operation rules, and evidence
  templates without selecting a frontend framework.
- `Why it matters:`
  - A passing build cannot prove hierarchy, interaction feel, responsive
    behavior, or accessibility.
  - Browser automation must not take over the user's working windows.
- `Go deeper:`
  - Add the project-owned test command after choosing the UI stack.
  - Tie every screenshot or recording to an exact evidence revision.

## Adds

- `docs/ux/README.md`
- `docs/operations/browser-testing.md`
- UX-frame and screen-review templates
- active agent guidance under `.starter/addenda/`
