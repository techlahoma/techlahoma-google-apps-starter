# Research: Public Google Engineering Conventions for a Small App Starter

- `Tease:` Use Google's public engineering habits without importing Google's internal scale.
- `Lede:` The smallest credible Google-aligned starter uses GTS for TypeScript, semantic HTML,
  strict types, exact dependencies, small reviewed changes, tests with behavior, and documentation
  beside code. Google does not publish one universal Firebase web-app starter that combines those
  concerns.
- `Why it matters:`
  - “Googley” should identify an auditable set of public conventions, not an unsupported claim of
    internal equivalence.
  - Bazel, monorepo policy, and enterprise cloud foundations solve a different scale of problem.
- `Go deeper:`
  - See the [adoption decision](../decisions/google-public-engineering-conventions-2026-08-03.md).
  - Use [`CONTRIBUTING.md`](../../CONTRIBUTING.md) for the working agreement.

## Question

Which public Google conventions and repositories should shape a minimal Firebase and Google Cloud
starter that remains easy for humans and coding agents to create, verify, deploy, and tear down?

## Method and limitations

Primary Google documentation and Google-owned repositories were reviewed on 2026-08-03. Public
guidance can show what Google recommends externally; it cannot prove the exact current internal
toolchain. Google's TypeScript guide explicitly says it is adapted from the internal guide and that
the internal environment differs from external projects.

## Findings

### There is no single general-purpose Google web-app starter

The closest official repositories each solve a narrower job:

| Source | Useful role | Why it is not the whole starter |
|---|---|---|
| [`google/gts`](https://github.com/google/gts) | TypeScript linting and formatting maintained by Google's Node.js team | A style tool, not an application or cloud lifecycle |
| [`firebase/quickstart-js`](https://github.com/firebase/quickstart-js) | Product-specific Firebase samples | A collection of samples rather than one minimal production baseline |
| [`GoogleCloudPlatform/cloud-run-microservice-template-nodejs`](https://github.com/GoogleCloudPlatform/cloud-run-microservice-template-nodejs) | Containerized Cloud Run service template | Starts at a billed server-runtime level the starter does not yet need |
| [`google/new-project`](https://github.com/google/new-project) | Open-source community and legal boilerplate | Not a runtime starter, and its Google-owned copyright and release process do not apply to this private repository |

The maintainable path is therefore an explicit composition: keep the small project-starter control
plane, use GTS as the TypeScript authority, use Firebase Hosting as the Level 0 deployment target,
and document every deviation.

### The strongest portable Google practices are social and structural

Google's public engineering-practices guide asks for small, self-contained changes and expects tests
with changes. Its review guidance considers design, functionality, complexity, tests, naming,
comments, style, documentation, and every changed line. Those habits are portable to a one-person
or agent-assisted repository without adding infrastructure.

The Google documentation guide recommends minimum viable documentation, keeping documents fresh,
and storing documentation with code. That aligns with a compact README, an operational contract,
dated decisions, and verification evidence in the repository.

### GTS is the closest maintained TypeScript implementation

GTS packages ESLint, TypeScript ESLint, and Prettier behind a small command surface. Version 7.0.0
is pinned here. The repository uses GTS's published Prettier settings and extends its strict
TypeScript base while overriding module, browser-library, and no-emit settings needed by Vite.
Because GTS invokes the `eslint` executable as a child process and omits its own `globals` import
from the package manifest, Bun's isolated dependency layout exposes two integration gaps. The
matching ESLint, Prettier, and globals versions are exact direct dependencies, and the GTS scripts
set `NODE_PATH` to the repository's dependency directory. This makes the published GTS configuration
work without global tools, accidental transitive hoisting, or a weaker package-manager layout.

GTS describes itself as maintained by Google's Node.js team and also says it is not an official
Google product. This starter preserves both facts and does not use GTS branding as an endorsement.

### HTML and CSS should remain semantic and separate

Google's public HTML/CSS guide prioritizes semantic HTML, accessibility, separation of structure,
presentation, and behavior, valid CSS, and consistent formatting. The starter therefore keeps its
static document in `index.html`, presentation in `src/style.css`, and only minimal behavior in
`src/main.ts`; it does not construct the page through an `innerHTML` sink.

### Bazel practices are useful principles, not the Level 0 toolchain

Google's published build-system material explains that Bazel grew from Google's internal Blaze
system and emphasizes declared build artifacts and version consistency. This repository adopts
exact dependency versions, a committed lockfile, and one verification command. It does not adopt
Bazel or a monorepo platform because the current app has one small build graph and no evidence that
the additional control plane would pay for itself.

## Adopted profile

| Area | Decision |
|---|---|
| TypeScript | GTS 7.0.0 for ESLint and Prettier; strict TypeScript configuration |
| HTML and CSS | Semantic static HTML, accessible labels, separated presentation; Biome for non-TypeScript formatting and lint |
| Changes | Small, self-contained changes with tests and docs in the same change |
| Dependencies | Exact versions, committed Bun lockfile, seven-day release-age gate |
| Build | One local `bash scripts/verify.sh` command and the same command in GitHub Actions |
| Cloud | Firebase Hosting first; explicit project IDs and plan/apply lifecycle |
| Repository | Private GitHub template, concise contribution guide, pinned Actions |

## Intentionally not adopted

- Bazel, Google's internal monorepo, or internal presubmit systems
- Google-owned copyright headers, Apache licensing, CLA setup, or official-product branding
- Cloud Run, billing, organization policy, or enterprise landing-zone scaffolding at Level 0
- A legacy `eslint-config-google` setup when the maintained GTS package already provides the
  TypeScript linting surface
- Archived organization-wide defaults as if they were current policy

## Dependency audit adjustment

The first `bun audit` on 2026-08-03 found Vite 8.0.4 inside several disclosed development-server
ranges, plus vulnerable transitive `tmp`, `uuid`, and OpenTelemetry packages in the GTS and
Firebase CLI trees. The starter moved to Vite 8.0.16, released 2026-06-01, and uses exact top-level
overrides for `tmp` 0.2.7 and `uuid` 11.1.1. All are older than the seven-day adoption gate.

The OpenTelemetry advisory remains upstream in `firebase-tools` through
`@google-cloud/pubsub` 5.3.1, which requires the 1.x OpenTelemetry line. Forcing the patched 2.x
major would violate that dependency contract, so the starter records the residual advisory instead
of making an unverified cross-major override. The affected library is in the development-only
Firebase CLI tree, not the static application bundle.

## Sources

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html)
- [Google Engineering Practices: small changes](https://google.github.io/eng-practices/review/developer/small-cls.html)
- [Google Engineering Practices: what to look for in review](https://google.github.io/eng-practices/review/reviewer/looking-for.html)
- [Google documentation best practices](https://google.github.io/styleguide/docguide/best_practices.html)
- [Software Engineering at Google: Build Systems and Build Philosophy](https://abseil.io/resources/swe-book/html/ch18.html)
- [GTS repository](https://github.com/google/gts)
- [Firebase JavaScript quickstarts](https://github.com/firebase/quickstart-js)
- [Cloud Run Node.js microservice template](https://github.com/GoogleCloudPlatform/cloud-run-microservice-template-nodejs)
- [Google new-project template](https://github.com/google/new-project)
