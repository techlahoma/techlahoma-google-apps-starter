# Browser Testing

- `Tease:` Browser proof should be isolated, reproducible, and respectful.
- `Lede:` __PROJECT_NAME__ browser work uses project-owned test commands and
  task-owned interactive windows, with behavioral, visual, responsive, and
  accessibility evidence recorded separately.
- `Why it matters:`
  - Focus-stealing or reused user sessions can disrupt work and expose private
    state.
  - One screenshot cannot prove a flow.
- `Go deeper:`
  - Record the real test command and supported browsers in `PROJECT.md`.
  - Use exact evidence revisions.

## Environment contract

- Automated suite command: `PLACEHOLDER`
- Supported browsers: `PLACEHOLDER`
- Viewports: `PLACEHOLDER`
- Test-data boundary: `PLACEHOLDER`
- Artifact retention: `PLACEHOLDER`

## Managed macOS isolation

- Interactive Firefox work starts in a new dedicated window.
- Every task tab remains inside that window.
- Existing user windows and tabs remain untouched.
- Project Playwright suites run through the repository command, outside
  `node_repl`.

## Evidence ladder

1. structural and unit checks;
2. component or integration behavior;
3. keyboard, focus, semantics, contrast, and reduced motion;
4. responsive and canonical-state review;
5. end-to-end flow;
6. production canary when release authority exists.
