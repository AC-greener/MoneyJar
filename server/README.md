```txt
npm install
npm run dev
```

## Verification

```txt
pnpm typecheck
pnpm test
pnpm test:coverage
```

Coverage uses Istanbul because the Cloudflare Workers Vitest pool does not support the V8 coverage provider's `node:inspector` dependency.

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
