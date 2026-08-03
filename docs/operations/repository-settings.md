# Repository Settings

- `Tease:` Plan GitHub guardrails before applying them.
- `Lede:` The starter can inspect and explicitly apply least-privilege workflow
  permissions and a default-branch ruleset when the repository owner and
  GitHub plan support that feature.
- `Why it matters:`
  - Template files do not configure repository-level protections.
  - Repository settings are remote mutations with plan and account boundaries.
- `Go deeper:`
  - Use an exact `OWNER/REPOSITORY` target.
  - Keep apply separately authorized.

## Read-only plan

```sh
bun scripts/project-starter.ts settings plan \
  --repo OWNER/REPOSITORY
```

The plan reports:

- whether the `Sam project baseline` ruleset would be created or updated;
- whether rulesets are unavailable for the current repository or GitHub plan;
- whether Actions already defaults to read-only permissions.

## Explicit apply

```sh
bun scripts/project-starter.ts settings apply \
  --repo OWNER/REPOSITORY \
  --confirm OWNER/REPOSITORY
```

Apply:

- requires the exact target twice;
- creates or updates the reviewed ruleset when available;
- sets default workflow permissions to read-only;
- prevents workflows from approving pull-request reviews;
- skips and reports rulesets when the API is unavailable.

It does not change visibility, rename the default branch, enable auto-merge,
merge a pull request, push code, or deploy.

## Ruleset recipe

The recipe protects the default branch from deletion and force-push, requires a
pull request with resolved review threads, and requires the `guardrails` and
`secrets` status checks.

Private repositories under some personal GitHub plans cannot use rulesets. That
is a platform capability gap, not a successful protection. CI still runs, but
GitHub may not be able to require it before merge.
