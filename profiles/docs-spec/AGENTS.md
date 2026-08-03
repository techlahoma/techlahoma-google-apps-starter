# Docs-spec Profile Instructions

- Treat specifications, architecture, features, roadmap, open questions,
  verification, and changelog as distinct document jobs.
- Keep unresolved questions in `docs/project/open-questions.md`; do not infer
  missing product behavior.
- Use progressive retrieval: compact index pages link to focused detail rather
  than putting the entire project into one giant document.
- Preserve direct evidence links and label confirmed behavior, inference, and
  unverified intent separately.
- Private docs default to fail-closed routing. Prove public routes, anonymous
  denial, authenticated access, and private no-store caching separately.
- Do not publish internal identifiers, secrets, personal data, private traffic,
  negotiation details, or customer information.
- A build, asset upload, route change, deployment, and live page are separate
  states.
- Do not add `llms.txt`, MCP, A2A, API Catalog, or other machine-capability
  surfaces unless the project has real applicable content or capabilities.
