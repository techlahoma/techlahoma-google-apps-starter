# UI and Browser Profile Instructions

- Define the user goal, inputs, canonical states, transitions, responsive
  behavior, platform fit, and accessibility before implementation.
- Test meaningful empty, loading, error, partial, success, overflow, keyboard,
  focus, reduced-motion, and narrow/wide states.
- Visual evidence answers a named review question and records viewport,
  environment, data state, accessibility/privacy handling, and exact revision.
- Screenshots and recordings supplement behavioral and accessibility checks;
  they do not replace them.
- Use the project-owned browser command for automated suites.
- On managed macOS, never reuse or navigate the user's existing Firefox windows
  or tabs. Create a dedicated task window and close only that window.
- Never launch installed Chrome or Chromium binaries from `node_repl`.
- Stop browser interaction if the task-owned window cannot be identified with
  confidence.
- Avoid real personal or customer data in screenshots and test fixtures.
