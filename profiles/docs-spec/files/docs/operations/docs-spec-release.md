# Docs-spec Release

- `Tease:` Published docs need route, privacy, and content proof.
- `Lede:` __PROJECT_NAME__ documentation is complete only when the intended
  source revision is built, deployed, routed, and verified under each relevant
  access mode.
- `Why it matters:`
  - Upload success can coexist with stale production routing.
  - Private content can leak through anonymous routes, caches, search, or
    machine-readable indexes.
- `Go deeper:`
  - Record exact project build and deploy commands in `PROJECT.md`.
  - Preserve an evidence revision and verification timestamp.

## Release contract

- Source revision: `PLACEHOLDER`
- Build command: `PLACEHOLDER`
- Docs integrity check: `PLACEHOLDER`
- Deploy target: `PLACEHOLDER`
- Rollback: `PLACEHOLDER`

## Route proof

| Route class | Expected |
|---|---|
| Public landing page | HTTP 200 |
| Protected page, anonymous | HTTP 404 or the documented fail-closed response |
| Protected page, authenticated | HTTP 200 |
| Protected content cache | `Cache-Control: private, no-store` |
| Protected search and machine indexes | unavailable anonymously |

The included script proves only the first two rows:

```sh
bash scripts/docs-route-check.sh PUBLIC_URL PROTECTED_URL
```

Record authenticated and cache evidence through a project-owned secret-safe
probe.
