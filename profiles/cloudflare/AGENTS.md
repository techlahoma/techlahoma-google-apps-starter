# Cloudflare Profile Instructions

- Treat Worker, Pages, Queues, D1, R2, KV, and Durable Objects changes as
  environment-specific external effects.
- Resolve the repository root and load its `.env.local` before looking for
  app-local credentials. Never print the token.
- Before an authorized deploy, run `wrangler whoami` through the repository's
  declared environment loader and confirm the account and target.
- A build, asset upload, Worker version, route change, deployment, and live
  verification are separate facts.
- Use Scale-to-zero services by default. Important state belongs in a durable
  binding or must be reproducible from authoritative inputs.
- Record migrations, binding changes, compatibility-date changes, rollback, and
  post-deployment probes.
- If authentication is rejected by the current network location, treat it as a
  credential policy boundary; do not inspect or print the token.
- Never deploy, publish, change routes, mutate DNS, or change Cloudflare account
  settings without explicit authority.
