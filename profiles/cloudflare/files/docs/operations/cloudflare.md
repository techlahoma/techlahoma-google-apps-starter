# Cloudflare Operations

- `Tease:` Build, deploy, and live proof remain distinct.
- `Lede:` __PROJECT_NAME__ uses Cloudflare only through explicit environment,
  binding, migration, deployment, rollback, and verification contracts.
- `Why it matters:`
  - Upload success does not prove route propagation or application behavior.
  - Binding mistakes can turn ephemeral assumptions into data loss.
- `Go deeper:`
  - Record exact project commands in `PROJECT.md`.
  - Use the read-only HTTP verifier after an authorized deploy.

## Environment contract

- Account: `PLACEHOLDER`
- Worker or Pages project: `__PROJECT_SLUG__`
- Development host: `PLACEHOLDER`
- Production host: `PLACEHOLDER`
- Credential source: root `.env.local` or platform secret store

## Binding contract

| Binding | Environment | Durable purpose | Migration or recovery |
|---|---|---|---|
| `PLACEHOLDER` | `PLACEHOLDER` | `PLACEHOLDER` | `PLACEHOLDER` |

## Deployment sequence

1. Resolve the exact environment and account.
2. Run the real project build and tests.
3. Run `wrangler whoami` without exposing credentials.
4. Review migrations, bindings, routes, and deploy-on-push effects.
5. Obtain deployment authority.
6. Deploy through the project-owned command.
7. Record the deployment version.
8. Verify the live host and consequential private/public routes.

## Rollback

- Previous known-good version: `PLACEHOLDER`
- Rollback command: `PLACEHOLDER`
- Data migration reversal or forward repair: `PLACEHOLDER`
