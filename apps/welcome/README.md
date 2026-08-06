# Welcome App

- `Tease:` The monorepo's smallest working app and visual introduction.
- `Lede:` `apps/welcome` proves the shared Bun, TypeScript, Vite, and Firebase Hosting conventions without adding product state.
- `Why it matters:` New generated demos have a known-good workspace to compare against.
- `Go deeper:` Run `bun run dev` from the repository root or `bun run dev` from this directory.

## Commands

```sh
bun run dev
bun run check
```

## Deployment

No dedicated Welcome app deployment was verified on 2026-08-06. The derived secondary-site target `welcome-1af01c.web.app` returned HTTP 404 and no matching site was registered.

The project default site returned HTTP 200, but it is protected, serves unrelated content, and is not the Welcome app's deployment URL.

## Reproduction prompt

Welcome was not generated as an independent one-shot demo. Git history shows that the starter interface moved from the repository root into `apps/welcome` in commit `fb5528f`, then received its Techlahoma and GDG Tulsa identity in commit `8d72cb3`. The following maintenance prompt is reconstructed from that provenance; it is not a verbatim historical prompt.

```text
Update the Techlahoma Google Apps Starter's existing Welcome app without creating a
new workspace or changing another demo.

Keep it a small, static reference app that proves the shared Bun, strict TypeScript,
Vite, and Firebase Hosting conventions. Brand it for Techlahoma and GDG Tulsa as the
public entry point to the workshop repository.

The page should:

- explain that one Antigravity prompt creates an isolated app under apps/;
- link to the public repository and one-shot prompt library;
- link to the event, GDG Tulsa, Techlahoma Slack, user groups, and Code of Conduct;
- show the three-step workflow: create an app, build locally, grow deliberately;
- preserve the Techlahoma brand asset and public-brand attribution;
- use semantic HTML, visible focus, strong contrast, responsive layouts, and
  reduced-motion-safe interaction;
- stay static and contain no account, backend, analytics, or Firebase runtime state.

Keep apps/welcome as the root dev and preview target. Run its app check and the
repository verification. Do not authenticate, provision, deploy, commit, or push.
```
