# Cloudflare Profile

- `Tease:` Deploy request-driven infrastructure with explicit proof.
- `Lede:` This profile adds a minimal Wrangler configuration, deployment
  authority rules, and a read-only HTTP verifier without presuming the
  application framework.
- `Why it matters:`
  - A Worker upload, route change, deployment, and live verification are
    different states.
  - Root credential loading and target resolution prevent misleading auth
    failures.
- `Go deeper:`
  - Add bindings only after selecting their durable source-of-truth contract.
  - Keep production deployment explicitly authorized.

## Adds

- `wrangler.jsonc` with the project slug and real application date
- `docs/operations/cloudflare.md`
- `scripts/cloudflare-verify.sh`
- active agent guidance under `.starter/addenda/`

The profile does not install Wrangler or deploy anything.
