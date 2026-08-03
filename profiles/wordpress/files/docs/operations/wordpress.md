# WordPress Operations

- `Tease:` Release every WordPress surface deliberately.
- `Lede:` __PROJECT_NAME__ distinguishes source, built assets, database/content,
  media, caches, search, hosting environment, and live behavior throughout
  development and release.
- `Why it matters:`
  - Deploying files can leave consequential runtime state stale.
  - Managed-host convenience commands can mutate the wrong install or
    environment.
- `Go deeper:`
  - Complete the environment and release tables before production work.
  - Use the WordPress release-verification template for evidence.

## Project surface

- Type: `PLACEHOLDER: plugin | classic theme | block theme | mu-plugin | site`
- WordPress versions: `PLACEHOLDER`
- PHP versions: `PLACEHOLDER`
- Node and asset toolchain: `PLACEHOLDER`
- Hosting provider: `PLACEHOLDER`

## Environments

| Environment | Install or host | Database/content | Deploy command | Cache/search effects |
|---|---|---|---|---|
| `PLACEHOLDER` | `PLACEHOLDER` | `PLACEHOLDER` | `PLACEHOLDER` | `PLACEHOLDER` |

## Validation

```sh
bash scripts/wordpress-verify.sh --strict
```

Also document:

- project PHPUnit or integration command;
- asset lint, test, and build;
- Plugin Check or theme review checks when applicable;
- browser and accessibility checks;
- generated asset or search-index verification.

## Release sequence

1. Resolve the exact install and environment.
2. Inventory unrelated local and remote changes.
3. Back up consequential database/content state when needed.
4. Run syntax, standards, tests, build, and browser checks.
5. Review migrations, imports, generated assets, cache, and search effects.
6. Obtain explicit deploy or mutation authority.
7. Deploy the smallest scoped artifact.
8. Apply only approved idempotent migrations or content changes.
9. Purge or rebuild only the named caches/indexes.
10. Verify live routes, editor behavior, permissions, content, assets, and
    rollback.

## Rollback

- Last-known-good code revision: `PLACEHOLDER`
- Built artifact: `PLACEHOLDER`
- Database/content restore: `PLACEHOLDER`
- Cache/search repair: `PLACEHOLDER`
- Live recovery check: `PLACEHOLDER`
