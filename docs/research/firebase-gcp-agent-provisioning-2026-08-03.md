# Firebase and Google Cloud Setup for Agent-Built Apps

- `Tease:` The favorite simple path is boring on purpose: a pinned local Firebase CLI, checked-in
  config, and one disposable project per environment.
- `Lede:` Start with Firebase Hosting and no billing. Add emulated Firebase services only when the
  product needs them, Cloud Run only when trusted server code is necessary, and Terraform/OpenTofu
  only when resource count, environments, or team ownership justify remote state.
- `Why it matters:`
  - This path removes most dashboard work without making a small app carry platform-team machinery.
  - Explicit project IDs and whole-project teardown give agents a boundary they can explain, plan,
    verify, and remove.
- `Go deeper:`
  - Use the [operations guide](../operations/google-cloud.md) for commands.
  - Use the [ADR](../decisions/project-per-environment-google-starter-2026-08-03.md) for the decision
    and adoption triggers.

## Research question

What current Firebase and Google Cloud workflow best matches a developer who builds in small,
agent-assisted slices; prefers local source-controlled configuration; wants explicit external
effects; and needs to provision and tear down experiments without a long dashboard ritual?

Research retrieved 2026-08-03. Official documentation supplies product facts. Community sources
are directional practitioner signals, not a representative survey.

## Local corpus input

This implementation starts from the earlier GDG and workspace synthesis at
`notes-search/docs/techlahoma/gdg/research/google-native-app-stack-for-sams-workflow-2026-07-22.md`,
which read the GDG meeting corpus through 2026-07-17 and inspected representative apps. The
starter carries forward its relevant requirements:

- begin with a real, browser-accessible app rather than a cloud-product tour;
- remove account, hardware, and setup friction where possible;
- preserve Bun, strict TypeScript, GitHub, and the repository's docs-first workflow;
- make a public URL an explicit outcome rather than confusing a local build with deployment;
- keep static delivery as the baseline and add state or custom compute only when earned; and
- use a plan, narrow mutation, browser/live proof, and precise handoff states.

The earlier synthesis recommended four Google golden paths rather than one universal scaffold. This
repository is intentionally only its first path: Astro/Vite-style static output to Firebase
Hosting. The research below narrows that path further around repeatable provision and teardown.

The later 2026-07-30 GDG planning meeting at
`notes-search/docs/meetings/2026-07-30--gdg-planning-meeting--not_3KFlY6N06nHxWv.api.md`
reinforced the same constraints: demonstrate JavaScript and static HTML apps, keep the experience
accessible to people without a laptop, help builders produce something real, and avoid overwhelming
them with Google's many products. This repository is the durable developer scaffold; a phone-only
workshop path still needs a separate hosted/browser tool and facilitation plan.

## Recommendation

Use four deliberate levels:

1. **Static first:** Vite plus Firebase Hosting, the Spark plan, `firebase.json`, and an exact local
   `firebase-tools` version.
2. **Firebase features second:** add Auth or Firestore with Emulator Suite coverage and explicit
   security rules only after the app needs identity or shared data.
3. **Google Cloud runtime third:** add Cloud Run, Cloud Tasks, or Secret Manager only after trusted
   server work is unavoidable; accept that billing and API enablement now enter the contract.
4. **Infrastructure as code last:** introduce Terraform/OpenTofu modules and remote state once
   multiple shared resources or environments make declarative convergence worth the bootstrap.

The starter implements Level 0 only.

## Why this is the simplest complete slice

### Firebase Hosting avoids the first billing decision

Google positions Firebase Hosting for static sites and single-page apps, and its comparison says a
small deployment can start without a billing account. Cloud Run and Firebase App Hosting are aimed
at dynamic or framework-backed server workloads and require billing. That makes Hosting the clean
default until the application proves it needs a server.

Sources: [Firebase Hosting product comparison](https://firebase.google.com/docs/app-hosting/product-comparison),
[Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans),
and [Hosting quickstart](https://firebase.google.com/docs/hosting/quickstart).

### The Firebase CLI already covers the small lifecycle

The official CLI can create a Google Cloud project and add Firebase with `projects:create`, deploy
an explicitly named project, and run local emulators. Google recommends checking in `firebase.json`.
For reusable templates, its docs specifically say not to check in `.firebaserc`; scripts should pass
the project ID instead. This is exactly the explicit-target behavior an agent starter needs.

Source: [Firebase CLI reference](https://firebase.google.com/docs/cli).

### One project per environment is the clean teardown unit

Google Cloud's CLI exposes project creation and deletion as direct commands. A whole project is an
understandable isolation boundary for a disposable development environment: APIs, IAM bindings,
quotas, services, and resources do not have to be rediscovered one by one at teardown. The cost is
that anything durable must be exported or moved before deletion.

Sources: [`gcloud projects create`](https://docs.cloud.google.com/sdk/gcloud/reference/projects/create)
and [`gcloud projects delete`](https://docs.cloud.google.com/sdk/gcloud/reference/projects/delete).

### Local emulators are the right first test surface

The Emulator Suite can use the checked-in Firebase configuration and a consistent demo project ID.
It supports start and test-exec workflows without touching production data. This makes it the
preferred next dependency when Auth, Firestore, Functions, or other supported Firebase services are
added; the static starter does not download those emulators preemptively.

Source: [Install, configure, and integrate Local Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure).

## What developers tend to prefer

### Project-local CLI over a global CLI

Firebase community discussions repeatedly favor keeping `firebase-tools` in the project so the
team and automation use the same version. That practice also fits lockfiles, isolated agents, and
the repository's minimum-release-age policy. This starter pins 15.24.0; registry metadata retrieved
2026-08-03 showed 15.25.1 was only four days old while 15.24.0 was released 2026-07-15.

Sources: [Firebase community discussion](https://www.reddit.com/r/Firebase/comments/1szqhr1/)
and [firebase-tools package metadata](https://registry.npmjs.org/firebase-tools).

### Terraform modules when the platform becomes shared

In current practitioner discussions, the strongest pro-Terraform theme is not the language; it is a
small, reviewed module interface that gives application teams sensible defaults. Pulumi appeals to
TypeScript teams and can make abstraction familiar, but platform engineers often call out the extra
freedom and long-term inconsistency that general-purpose code can introduce. For a single static
site, both tools are more machinery than value.

Signals: [experienced-developer Terraform-to-Pulumi discussion](https://www.reddit.com/r/ExperiencedDevs/comments/1u8nh33/anyone_moved_an_org_from_terraform_to_pulumi_how/)
and [Terraform/OpenTofu versus Pulumi discussion](https://www.reddit.com/r/devops/comments/1uf8774/terraform_opentofu_vs_pulumi/).

## Why Terraform is deferred

Google's Firebase Terraform support remains Preview and uses the `google-beta` provider. The
official guide also documents incomplete coverage, including limitations around provisioning the
default Cloud Storage bucket. Terraform adds another bootstrap question: local state is unsafe for
a team, while a versioned GCS state bucket has its own lifecycle, access, cost, and deletion order.

That does not make Terraform a bad choice. It makes these the adoption triggers:

- more than one shared environment;
- several Google Cloud services whose configuration must converge;
- a second human or CI principal making infrastructure changes;
- recurring drift or teardown mistakes that the small CLI cannot prevent; or
- organizational IAM, billing, folder, and policy requirements.

Sources: [Firebase Terraform get started](https://firebase.google.com/docs/projects/terraform/get-started),
[Terraform authentication for Google Cloud](https://docs.cloud.google.com/docs/terraform/authentication),
and [store Terraform state in Cloud Storage](https://docs.cloud.google.com/docs/terraform/resource-management/store-state).

Google's Infrastructure Manager can manage Terraform deployments and state, but enabling that
managed control plane is still a platform bootstrap. Application Design Center for Firebase is a
Preview catalog-and-deployment workflow aimed at platform teams and pre-provisioned projects. Both
are promising later-stage options, not a better Level 0.

Sources: [Infrastructure Manager overview](https://docs.cloud.google.com/infrastructure-manager/docs/overview)
and [Application Design Center for Firebase](https://firebase.google.com/docs/projects/adc/get-started).

## Authentication that agents can inherit safely

- **Local human work:** Firebase CLI user login for Firebase commands; Application Default
  Credentials for Terraform or Google client libraries.
- **CI:** Workload Identity Federation with a narrowly scoped service account. Do not export a
  long-lived JSON key.
- **Legacy Firebase tokens:** avoid them; the Firebase CLI documentation recommends Application
  Default Credentials for CI and describes `FIREBASE_TOKEN` as legacy.

Sources: [Firebase CLI CI guidance](https://firebase.google.com/docs/cli#cli-ci-systems),
[Google Cloud Terraform authentication](https://docs.cloud.google.com/docs/terraform/authentication),
and [Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation).

## Agent-native Google tooling

Firebase publishes an MCP server through `firebase-tools` and official Firebase agent skills for
Codex and other agents. These can reduce documentation lookup and expose Firebase operations in an
agent-native interface. They do not remove the need for target resolution or external-action
authority. A safe configuration should:

- invoke the repository's pinned CLI rather than `@latest`;
- bind the server to this repository with `--dir`;
- expose only the tool groups needed for the task with `--only`;
- use a separate, least-privilege identity for unattended work; and
- keep create, billing, deploy, and delete effects separately gated.

Sources: [Firebase MCP server](https://firebase.google.com/docs/ai-assistance/mcp-server),
[Firebase agent skills](https://firebase.google.com/docs/ai-assistance/agent-skills), and
[Cloud Run remote MCP servers](https://docs.cloud.google.com/run/docs/use-cloud-run-mcp).

## Rejected defaults

| Default | Why it is not Level 0 |
|---|---|
| Firebase console walkthrough | Easy once, but hard to reproduce, audit, or tear down with agents |
| Global Firebase CLI | Version drift and ambient workstation state |
| `.firebaserc` with a default project | Reusable templates can accidentally target the wrong real project |
| Cloud Run or App Hosting | Introduces billing and server operations before a server is necessary |
| Terraform/OpenTofu immediately | Provider preview gaps and state bootstrap outweigh one Hosting resource |
| Pulumi immediately | Adds language/runtime and abstraction choices without solving a current problem |
| Service-account JSON key | Long-lived credential material that must be stored and rotated |
| Broad MCP write access | Tool convenience can obscure the difference between inspection and mutation |

## Limitations

- Project IDs are globally unique, so selection cannot be fully pre-baked.
- Initial Firebase CLI login still uses a Google browser flow.
- Organization policies may require a folder, billing account, labels, or approved regions; this
  starter intentionally does not guess those values.
- The live create/deploy/delete cycle was not run during starter construction because no cloud-side
  effects were authorized.
