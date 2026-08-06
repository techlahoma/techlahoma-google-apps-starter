# App Verification Rule

Always follow the operational contract in [`PROJECT.md`](../../PROJECT.md), workspace guidelines in [`apps/AGENTS.md`](../../apps/AGENTS.md), and the demo skill in [`.agents/skills/build-and-launch-demo/SKILL.md`](../skills/build-and-launch-demo/SKILL.md).

- **Vertical Slice First:** Build one complete, runnable vertical slice before adding optional systems or complex dependencies.
- **App Ownership:** Keep all app code, `app.contract.json`, and browser specs inside `apps/<slug>/` (for example, `apps/<slug>/e2e/smoke.spec.ts`).
- **No Root or Temporary Verification Scripts:** Never place app-specific verification scripts at the repository root or inside temporary Antigravity storage. Use the repo-owned browser harness and completion commands.
- **Verification Authority:** Source inspection or compilation alone is not runtime proof. Run `bun run app:verify --app <slug>` before reporting an app complete.
- **Authority Boundary:** Local completion verification does not authorize git commit, push, PR creation, cloud provisioning, deployment, or publication.
