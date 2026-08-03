# ADR: Static Firebase Hosting with One Project per Environment

- `Tease:` Make the whole Google Cloud project the starter's isolation and teardown boundary.
- `Lede:` Begin with Firebase Hosting on Spark, explicit project IDs, and a pinned local CLI. Defer
  billing, server services, and infrastructure-as-code state until product or team complexity
  crosses a documented trigger.
- `Why it matters:`
  - The default can be created and deleted with a short, auditable command sequence.
  - An agent cannot silently inherit a developer's globally selected Firebase or gcloud project.
- `Go deeper:`
  - Follow the [operations guide](../operations/google-cloud.md).
  - Review the [supporting research](../research/firebase-gcp-agent-provisioning-2026-08-03.md).

## Status

Accepted — 2026-08-03

## Context

The starter needs to serve two competing goals:

- make a new Google-hosted app almost as easy as a local static project; and
- retain explicit, reversible boundaries when a human or coding agent touches external systems.

A dashboard-only workflow is not reproducible. A full Terraform platform is reproducible but adds
provider-preview gaps, state bootstrap, authentication, and teardown ordering before the app has
more than one hosted asset surface. Global Firebase aliases and gcloud defaults make commands short
but hide the most consequential input: the target project.

## Decision

1. The initial application is a static Vite and TypeScript build deployed only to Firebase Hosting.
2. Level 0 does not create or link a billing account.
3. Each remote environment gets its own Google Cloud/Firebase project, with the environment visible
   in its project ID.
4. `firebase.json` is committed. `.firebaserc` is neither generated nor committed.
5. The real project ID lives in ignored `google.project.json`; every remote command still passes it
   explicitly.
6. The Firebase CLI is an exact project-local development dependency subject to the repository's
   release-age policy.
7. Lifecycle commands separate `plan` from `apply`, print the exact target and command, and require
   the project ID as confirmation for every remote mutation.
8. Teardown deletes the whole project. Durable data must have an export and retention decision
   before the app adds a stateful service.
9. Local Google client-library or Terraform work will use Application Default Credentials. CI will
   use Workload Identity Federation rather than a service-account JSON key.
10. Terraform/OpenTofu is reconsidered when the app has multiple shared environments, several
    converged cloud resources, multiple infrastructure authors, organization policy, or recurring
    drift. Pulumi may be reconsidered if TypeScript-native infrastructure materially outweighs the
    value of a smaller declarative surface.

## Consequences

### Positive

- Local development has no Google dependency.
- Initial hosting needs no billing decision.
- The checked-in repository describes the build and Hosting behavior.
- Cloud commands are short enough for humans but structured enough for agents.
- Project deletion provides a comprehensive environment teardown boundary.
- The architecture can grow toward Firebase services, Cloud Run, or IaC without carrying them now.

### Negative

- Firebase login still requires an interactive Google authentication flow.
- Globally unique project IDs must be chosen at provision time.
- Whole-project deletion is intentionally broad and becomes inappropriate once an environment holds
  undeclared durable data.
- The small lifecycle wrapper does not converge a large set of resources or detect remote drift.
- Organization-specific folders, billing, IAM, labels, policies, and regions remain outside the
  default because the starter cannot safely guess them.

## Reconsideration triggers

Revisit this ADR before any of the following:

- adding the first stateful Firebase service;
- enabling billing or a non-Hosting Google API;
- adding a production environment;
- granting an unattended agent write access;
- adding a second infrastructure author or CI deploy principal;
- adopting remote Terraform/OpenTofu state; or
- retaining data that must survive whole-project deletion.
