# WordPress Profile Instructions

- Identify whether the owned surface is a plugin, classic theme, block theme,
  mu-plugin, content migration, search index, media archive, or managed-host
  operation before editing.
- Read the project README and hosting runbook before choosing commands.
- Never edit WordPress core, generated dependencies, vendor packages, or live
  database/content as a shortcut.
- Validate and sanitize input, check capabilities and nonces for state changes,
  use prepared queries, escape output at the final context, and preserve
  translatability.
- Follow WordPress Coding Standards for touched PHP unless a stronger
  project-local standard is documented.
- Treat source code, built assets, database migrations, content, media, caches,
  search indexes, CDN state, and live routes as separate release surfaces.
- Before a content or schema mutation, document backup, forward migration,
  rollback or repair, idempotency, and environment.
- On managed hosting, resolve the exact install and environment before any
  deploy, cache purge, SSH command, content import, or database operation.
- Run PHP syntax, PHPCS, project tests, asset build, and relevant browser checks.
  A successful deploy still requires live verification.
- Preserve unrelated local and remote WordPress work. Never infer production
  authority from a dev-environment request.
