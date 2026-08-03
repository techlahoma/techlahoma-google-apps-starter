# Baseline Updates

- `Tease:` Audit starter changes without overwriting project choices.
- `Lede:` Generated repositories compare their recorded baseline hashes with a
  clean incoming starter checkout and apply only safe, unmodified managed-file
  updates.
- `Why it matters:`
  - GitHub template repositories begin with unrelated history, so ordinary
    upstream merges do not provide a safe update path.
  - Project-owned instructions and configuration must survive baseline
    evolution.
- `Go deeper:`
  - Audit first.
  - Reconcile merge-policy files manually.

## Provenance

`.starter/baseline.json` records:

- starter source and version;
- release revision when one has been published;
- tracked baseline files;
- each file's policy and generation-time SHA-256;
- merge-policy paths still awaiting manual reconciliation.

The release revision remains `null` in an uncommitted working tree. Set it only
to a real tag or commit during an authorized release.

## Audit

Obtain a clean local checkout of the incoming starter separately, then run:

```sh
bun scripts/project-starter.ts baseline audit \
  --source /absolute/path/to/incoming/project-starter
```

States:

| State | Meaning |
|---|---|
| `current` | Local and incoming content match |
| `local-only` | Only the project changed the file |
| `safe-update` | Only the incoming starter changed a known file |
| `new` | Incoming starter added a tracked file |
| `manual-reconcile` | Both sides changed a merge-policy file |
| `conflict` | Both sides changed a managed file |
| `source-dirty` | Incoming content does not match its own manifest |
| `source-removed` | The incoming baseline no longer tracks the local file |

## Apply

```sh
bun scripts/project-starter.ts baseline apply \
  --source /absolute/path/to/incoming/project-starter
```

Apply behavior:

- refuses dirty incoming baseline evidence;
- refuses managed-file conflicts;
- copies only `new` and `safe-update` files;
- preserves manual-reconcile and local-only files;
- never deletes a source-removed file automatically;
- updates provenance while retaining the old base hash for unresolved
  merge-policy files.

The command changes local files only. Review and validate the diff before any
staging, commit, or publication.
