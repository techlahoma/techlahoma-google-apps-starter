# Domain documents for the installed skills

- `Tease:` Read the decisions that already govern the app you are changing.
- `Lede:` Use the monorepo's existing project contract, scoped instructions, app documents, and decision records as the domain context for Matt Pocock's skills.
- `Why it matters:` Planning should preserve settled vocabulary and decisions without adding duplicate documentation.
- `Go deeper:` The reading order and glossary rules follow.

## Before exploring an app

1. Read `PROJECT.md`, root `AGENTS.md`, and every active instruction under
   `.starter/addenda/`.
2. Read the nearest scoped `AGENTS.md`, the affected app's README, and its
   canonical spec and plan when they exist. For the WordPress workshop, these are
   linked from `apps/wordpress-playground/README.md`.
3. Read relevant architectural decisions in `docs/decisions/`. This repository
   already uses that location; do not create a parallel `docs/adr/` tree for the
   installed skills.
4. If a root `GLOSSARY-MAP.md` exists, follow its pointers for the affected scope.
   Otherwise read an existing root or app glossary when relevant. If no glossary
   exists, proceed with the vocabulary in the project and app documents.

## Preserve the existing scope

This is a monorepo with shared tooling at the root and app-specific behavior under
`apps/<slug>/`. Shared decisions belong in the project contract and existing
decision records. Workshop decisions belong with the workshop spec and plan.

Use the same terms for the same concepts in specs, ticket titles, code, and
verification notes. If an existing glossary defines a term, use that definition.
Record a consequential unresolved term in the current plan rather than inventing
a definition or generating an empty glossary.

Surface conflicts with an existing decision explicitly, with a link and the
reason to revisit it. An installed upstream skill does not silently replace the
repository's current decisions or scoped instructions.

## Source

Configured from the literal
[domain template](https://github.com/mattpocock/skills/blob/5beb35b040e3de97e54fa9e386d7e42d15c295c2/skills/engineering/setup-matt-pocock-skills/domain.md)
bundled with `setup-matt-pocock-skills`. Its missing-glossary behavior is retained;
the document locations follow this repository's existing conventions.
