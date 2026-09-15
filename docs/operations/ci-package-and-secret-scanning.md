# CI package installation and secret scanning

- `Tease:` Keep portability and secret checks executable.
- `Lede:` Windows CI uses a disposable cache beside its checkout; secret scanning uses the open-source Gitleaks CLI pinned in `mise.toml`.
- `Why it matters:` Package installation and scanner licensing failures must not turn into skipped verification.
- `Go deeper:` See [Guardrails](../../.github/workflows/guardrails.yml) and [the failed run](https://github.com/techlahoma/techlahoma-google-apps-starter/actions/runs/35004344892).

## Windows install

The September 15, 2026 run failed under Bun 1.3.14 with 541 package-link `ENOENT` errors using the `copyfile` backend. The first named package was `json-parse-helpfulerror@1.0.3`. The log did not expose source and destination paths, so it does not prove whether a cache race or cross-volume fallback caused the failure.

The next-run candidate keeps `linker = "isolated"`, `globalStore = true`, Bun 1.3.14, and the frozen lockfile. Only Windows CI sets `BUN_INSTALL_CACHE_DIR` to a disposable directory beside its checkout. This keeps cache and workspace on the same volume and isolates the cache from other installations. Verbose output provides the missing paths if the failure recurs. No retry masks an unsuccessful installation; all later checks still depend on install success.

[Bun documents](https://bun.com/docs/pm/global-cache) the cache override, Windows hardlink backend, and copyfile fallback. [Upstream issue 28064](https://github.com/oven-sh/bun/pull/28064) describes an analogous Windows shared-cache race; it is context, not proof of this run's cause. Windows verification remains pending until a new CI run completes. Revisit this override when upgrading Bun, using a clean Windows run before removing it.

## Secret scan

The prior `gitleaks-action` wrapper stopped before scanning because its organization license was unavailable. Its [licensing requirement](https://github.com/gitleaks/gitleaks-action) is distinct from the [MIT-licensed Gitleaks CLI](https://github.com/gitleaks/gitleaks).

CI installs the existing `mise.toml` Gitleaks pin through an immutable mise-action revision. Both the action's mise selection and the repository tool installation retain a seven-day minimum release age. The scan checks all fetched Git history with `gitleaks git --log-opts="--all" --redact --no-banner .`, fails on findings, and redacts matching secret values from output. Full-history checkout remains enabled. No baseline, allowlist, or exit-code override was added.

The CLI provides the scan and failing status; the licensed wrapper's PR comments are no longer used. Consequently, the job requires only the workflow's read-only contents permission. This workflow does not deploy or change repository secrets or settings.

## Local verification

On September 15, actionlint 1.7.7 and `git diff --check` passed for the workflow candidate. Gitleaks 8.30.0 scanned 31 local commits and returned one `gcp-api-key` finding in `apps/tulsa-gravity-rally/src/multiplayer/firebase.ts`, line 30, from commit `89080f455bf38ab6ab926b4a6f833558d0672062`. The value was redacted and is not copied here. Classification and remediation are outstanding; the new scanner is operational but its result is not clean. No finding was suppressed to obtain a passing result.

### Classification follow-up

Read-only metadata matched the existing Gravity Rally configuration to an intended browser key. Its allowed services extend beyond Firebase, and its referrer list includes development and Firebase-hosted sites. This does not meet the narrow Firebase-only case described in [Firebase API-key guidance](https://firebase.google.com/docs/projects/api-keys). No credential, referrer, API restriction, history, or scanner exception was changed. The finding remains unresolved pending owner review of shared consumers and restrictions.
