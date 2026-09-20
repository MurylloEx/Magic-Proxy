# Magic Reverse Proxy

[![npm version](https://badgen.net/npm/v/magic-reverse-proxy)](https://www.npmjs.com/package/magic-reverse-proxy)
[![license](https://badgen.net/npm/license/magic-reverse-proxy)](./LICENSE)
[![node](https://badgen.net/badge/node/%3E%3D22/green)](https://nodejs.org/)
[![author](https://badgen.net/badge/author/MurylloEx/red)](https://github.com/MurylloEx)

TypeScript reverse proxy for Node.js with virtual hosts, WebSocket proxying, Round-Robin load balancing, custom middleware chains, and HTTPS redirect / HSTS support.

Package name on npm: **`magic-reverse-proxy`**.

## Requirements

- Node.js **>= 22**
- TypeScript consumers get full typings out of the box

## Install

```bash
npm install magic-reverse-proxy
```

## Quick start

```typescript
import { createProxy } from 'magic-reverse-proxy';

const proxy = createProxy({
  allow_unknown_host: false,
  allow_websockets: true,
  enable_hsts: false,
  http: {
    port: 8080,
    enabled: true,
    start_callback: () => {
      console.log('Magic Proxy listening on :8080');
    },
    middlewares: [],
  },
  proxies: [
    {
      domain: 'app.localhost',
      timeout: 10_000,
      round: 0,
      destination: [
        'http://127.0.0.1:3001/',
        'http://127.0.0.1:3002/',
      ],
      sockDestination: ['ws://127.0.0.1:3001', 'ws://127.0.0.1:3002'],
    },
  ],
  default_proxy: {
    domain: '*',
    timeout: 10_000,
    round: 0,
    destination: ['http://127.0.0.1:3999/'],
    sockDestination: [],
  },
});

proxy.bind();

process.on('SIGINT', () => {
  proxy.unbind();
  process.exit(0);
});
```

## Public API

| Export | Description |
| --- | --- |
| `createProxy(options?)` | Factory that returns a `ProxyTrigger` |
| `ProxyTrigger.bind()` | Mount middleware, listen on configured ports, attach WebSocket upgrade handlers |
| `ProxyTrigger.unbind()` | Close HTTP/HTTPS servers |
| `ProxyTrigger.app` / `appssl` | Underlying Express applications |
| `ProxyTrigger.config` | Frozen resolved configuration |

Configuration field names keep the **v2 snake_case** shape (`allow_unknown_host`, `sockDestination`, `enable_hsts`, …) so existing samples remain familiar.

### Options overview

| Option | Default | Meaning |
| --- | --- | --- |
| `allow_unknown_host` | `true` | If `false`, Host values that do not match `proxies` are dropped |
| `allow_websockets` | `false` | Proxy `Upgrade` requests using `sockDestination` |
| `enable_hsts` | `false` | Redirect HTTP→HTTPS (non-localhost) and send `Strict-Transport-Security` on HTTPS |
| `http` / `https` | see defaults | Listeners, ports, TLS material, user middlewares |
| `proxies` | `[]` | Virtual-host routes (`domain` supports `*` wildcards) |
| `default_proxy` | catch-all `*` | Used when `allow_unknown_host` is `true` and no route matches |

`round` is the **initial** Round-Robin cursor only. Runtime balancer state is not written back into `config`.

## Architecture

```
src/
  domain/           Value objects & pure helpers (hostname, wildcard, types)
  application/      Config resolve/validate, host routing, Round-Robin strategy
  infrastructure/   http-proxy client, HTTP/HTTPS server binding
  presentation/     createProxy factory + Express / upgrade middlewares
  index.ts          Public exports
```

Patterns used where they clarify responsibilities:

- **Factory** — `createProxy`
- **Strategy** — Round-Robin `LoadBalancer`
- **Middleware chain** — ordered Express pipeline (user → policy → proxy)
- **Immutable config** — resolved `ProxyConfig` is frozen; balancers hold their own cursors

## Breaking changes (v2 → v3)

1. **Node.js >= 22** and a modern TypeScript build (`strict`, declarations, source maps).
2. **Configuration is immutable** after `createProxy`; `round` is no longer mutated on route objects.
3. **HTTP and WebSocket** Round-Robin counters are **independent** (v2 shared one `round` field incorrectly across both pools).
4. **Middlewares are registered before listen** (v2 registered them after `listen`, which was unreliable).
5. **Invalid config throws** `ConfigValidationError` at construction time.
6. **`enable_hsts`** still forces HTTPS redirect on the HTTP listener; v3 also sets a real `Strict-Transport-Security` header on HTTPS responses.
7. Dependency **`wildcard` removed** — matching is built-in.

## Scripts

```bash
npm test      # vitest
npm run build # emit dist/
npm run lint  # typecheck sources + tests
```

## License

MIT © Muryllo Pimenta de Oliveira
