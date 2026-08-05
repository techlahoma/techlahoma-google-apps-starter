# Example CRM — Fictional Demo

- `Tease:` A generated app workspace ready for one focused vertical slice.
- `Lede:` This app lives at `apps/example-crm` and inherits the Techlahoma Google Apps Starter's shared toolchain and agent contract.
- `Why it matters:` It can be built, tested, and launched independently without changing another demo app.
- `Go deeper:` Run `bun run dev` here, or `bun run --cwd apps/example-crm dev` from the repository root.

## Commands

```sh
bun run dev
bun run check
```

Firebase Hosting configuration is app-local. Root cloud commands must receive
`--app example-crm` so they cannot deploy a different workspace accidentally.
