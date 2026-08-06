# Numeronym Generator

- `Tease:` A generated app workspace ready for one focused vertical slice.
- `Lede:` This app lives at `apps/numeronym-generator` and inherits the Techlahoma Google Apps Starter's shared toolchain and agent contract.
- `Why it matters:` It can be built, tested, and launched independently without changing another demo app.
- `Go deeper:` Run `bun run dev` here, or `bun run --cwd apps/numeronym-generator dev` from the repository root.

## Commands

```sh
bun run dev
bun run check
```

Firebase Hosting configuration is app-local. Root cloud commands must receive
`--app numeronym-generator` so they cannot deploy a different workspace accidentally.

## Deployment

Verified live build: [numeronym-generator-ef4ba1.web.app](https://numeronym-generator-ef4ba1.web.app) returned HTTP 200 on 2026-08-06.

The live release is on a legacy, unmapped Firebase Hosting site. The current root configuration maps this app to `n7m.web.app`, which returned HTTP 404 on the same date. A deployment with the current mapping would not update the working legacy URL.

## Reproduction prompt

The original generation prompt was not preserved in Git or the event prompt library. The following prompt is explicitly reconstructed from the current application behavior and commits `eb995e4` and `0b8434e`; it is not represented as a verbatim historical prompt.

```text
Create a new app workspace named numeronym-generator titled "Numeronym Generator"
inside the Techlahoma Google Apps Starter. Preserve the root toolchain and app boundary.

Build a polished, static TypeScript numeronym utility. It should transform individual
words such as "kubernetes" into "k8s" and "accessibility" into "a11y", and collapse a
full multi-word phrase such as "Andreessen Horowitz" into one result such as "A16Z".

Required behavior:

- Make collapsed-phrase mode the default.
- Also provide an explicit word-by-word mode.
- Let the user choose the minimum eligible token length.
- Preserve meaningful casing and surrounding punctuation.
- Show the generated result before the input controls at phone widths.
- Explain the first character, counted middle characters, and final character.
- Provide copy-to-clipboard feedback.
- Keep a recent-history list with a clear action.
- Include deterministic presets for Techlahoma, Google Developer Group, Gradient,
  kubernetes, internationalization, accessibility, localization, and antigravity.
- Use semantic controls, visible focus, an aria-live result, and responsive layouts.
- Keep the application fully static with no account, backend, analytics, or runtime AI.

Add behavioral tests for classic word numeronyms, phrase collapsing, casing,
punctuation, minimum length, word-by-word mode, and the displayed breakdown. Run the
app check and repository verification, then report only behavior actually verified.
Do not commit, push, provision, or deploy.
```
