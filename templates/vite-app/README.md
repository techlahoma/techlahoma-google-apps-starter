# __APP_TITLE__

- `Tease:` A generated app workspace ready for one focused vertical slice.
- `Lede:` This app lives at `apps/__APP_SLUG__` and inherits the Google App Starter's shared toolchain and agent contract.
- `Why it matters:` It can be built, tested, and launched independently without changing another demo app.
- `Go deeper:` Run `bun run dev` here, or `bun run --cwd apps/__APP_SLUG__ dev` from the repository root.

## Commands

```sh
bun run dev
bun run check
```

Firebase Hosting configuration is app-local. Root cloud commands must receive
`--app __APP_SLUG__` so they cannot deploy a different workspace accidentally.
