# Bison Byte Dash

- `Tease:` A generated app workspace ready for one focused vertical slice.
- `Lede:` This app lives at `apps/bison-byte-dash` and inherits the Techlahoma Google Apps Starter's shared toolchain and agent contract.
- `Why it matters:` It can be built, tested, and launched independently without changing another demo app.
- `Go deeper:` Run `bun run dev` here, or `bun run --cwd apps/bison-byte-dash dev` from the repository root.

## Commands

```sh
bun run dev
bun run check
```

Firebase Hosting configuration is app-local. Root cloud commands must receive
`--app bison-byte-dash` so they cannot deploy a different workspace accidentally.
