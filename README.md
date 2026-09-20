# Magic Reverse Proxy

[![npm version](https://badgen.net/npm/v/magic-reverse-proxy)](https://www.npmjs.com/package/magic-reverse-proxy)
[![license](https://badgen.net/npm/license/magic-reverse-proxy)](./LICENSE)
[![node](https://badgen.net/badge/node/%3E%3D22/green)](https://nodejs.org/)
[![author](https://badgen.net/badge/author/MurylloEx/red)](https://github.com/MurylloEx)

**Magic Reverse Proxy** (`magic-reverse-proxy`) is a TypeScript HTTP/HTTPS reverse proxy for Node.js. Route traffic by `Host` (virtual hosts and `*` wildcards), proxy WebSocket upgrades, balance upstreams with a pluggable strategy (Round-Robin by default), and apply HTTPS redirect / HSTS policy helpers.

## Requirements

- Node.js **>= 22**

## Install

```bash
npm install magic-reverse-proxy
```

## Quick start

### Fluent builder (primary)

```typescript
import { MagicProxy, roundRobin } from 'magic-reverse-proxy';

const proxy = MagicProxy.create()
  .http({
    port: 8080,
    onListen: () => console.log('Magic Proxy listening on :8080'),
  })
  .route('app.localhost')
    .to('http://127.0.0.1:3001', 'http://127.0.0.1:3002')
    .websockets('ws://127.0.0.1:3001', 'ws://127.0.0.1:3002')
    .timeout(10_000)
  .route('*.cdn.localhost')
    .to('http://127.0.0.1:3003')
  .fallback()
    .to('http://127.0.0.1:3999')
  .allowUnknownHosts(false)
  .allowWebSockets(true)
  .balancer(roundRobin())
  .build();

proxy.listen();

process.on('SIGINT', () => {
  proxy.close();
  process.exit(0);
});
```

Each fluent call returns a new immutable builder snapshot. Call `build()` to validate config and obtain a `MagicProxyInstance`, then `listen()` / `close()` for lifecycle.

### Declarative config

```typescript
import { MagicProxy } from 'magic-reverse-proxy';

const proxy = MagicProxy.from({
  http: { port: 8080 },
  routes: [
    {
      host: 'api.localhost',
      targets: ['http://127.0.0.1:3001'],
      websocketTargets: ['ws://127.0.0.1:3001'],
      timeoutMs: 10_000,
    },
  ],
  fallback: {
    targets: ['http://127.0.0.1:3999'],
  },
  policy: {
    allowUnknownHosts: false,
    allowWebSockets: true,
    forceHttpsRedirect: false,
  },
});

proxy.listen();
```

## Configuration reference

All public names use **camelCase**.

### Listeners

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `http.port` | `number` | `80` | HTTP listen port |
| `http.enabled` | `boolean` | `true` | Enable the HTTP listener |
| `http.onListen` | `() => void` | no-op | Called when the HTTP server starts |
| `http.middlewares` | `ProxyMiddleware[]` | `[]` | Express middleware before the proxy |
| `https.port` | `number` | `443` | HTTPS listen port |
| `https.enabled` | `boolean` | `false` | Enable the HTTPS listener |
| `https.key` / `https.cert` | `string` | `''` | PEM material (required when HTTPS is enabled) |
| `https.onListen` | `() => void` | no-op | Called when the HTTPS server starts |
| `https.middlewares` | `ProxyMiddleware[]` | `[]` | Express middleware on the HTTPS app |

Fluent helpers: `.http({...})`, `.https({ key, cert, ... })`, `.useHttp(...)`, `.useHttps(...)`.

### Routes

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `routes[].host` | `string` | — | Host pattern (`api.example.com`, `*.cdn.example.com`, `*`) |
| `routes[].targets` | `string[]` | `[]` | HTTP upstream URLs (load-balanced) |
| `routes[].websocketTargets` | `string[]` | `[]` | WebSocket upstream URLs |
| `routes[].timeoutMs` | `number` | `10000` | Upstream connect timeout |
| `routes[].initialIndex` | `number` | `0` | Initial balancer cursor (not mutated at runtime) |
| `fallback` | same shape | host `*` | Used when `policy.allowUnknownHosts` is `true` and no route matches |

Fluent helpers: `.route(host).to(...).websockets(...).timeout(ms).startAt(index)`, `.fallback()`.

### Policy

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `policy.allowUnknownHosts` | `boolean` | `true` | If `false`, unknown Host values are dropped |
| `policy.allowWebSockets` | `boolean` | `false` | Proxy `Upgrade` requests via `websocketTargets` |
| `policy.forceHttpsRedirect` | `boolean` | `false` | Redirect HTTP → HTTPS (skips localhost) |
| `policy.hstsMaxAgeSeconds` | `number \| undefined` | `undefined` | Send `Strict-Transport-Security` when set |

Fluent helpers: `.allowUnknownHosts(bool)`, `.allowWebSockets(bool)`, `.forceHttps()`, `.hsts(maxAge \| false)`.

### Load balancing

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `balancerStrategy` | `BalancerStrategy` | Round-Robin | `(size, initialIndex) => LoadBalancer` |

HTTP and WebSocket pools keep **independent** cursors. Use `.balancer(roundRobin())` or pass a custom strategy.

### Instance

| Member | Description |
| --- | --- |
| `listen()` | Mount middleware, start servers, attach WebSocket upgrade handlers |
| `close()` | Close servers and release the proxy client |
| `httpApp` / `httpsApp` | Underlying Express applications |
| `httpServer` / `httpsServer` | Node servers after `listen()` (otherwise `undefined`) |
| `config` | Frozen resolved `MagicProxyConfig` |

Invalid configuration throws `ConfigValidationError` at `build()` / `from()`.

## Architecture

```
src/
  domain/           Types, hostname parsing, wildcard matching
  application/      Config resolve/validate, host routing, balancer strategies
  infrastructure/   http-proxy client, HTTP/HTTPS server binding
  presentation/     MagicProxy builder + Express / upgrade middlewares
```

- **Factory** — `MagicProxy.create()` / `MagicProxy.from()`
- **Strategy** — pluggable `BalancerStrategy` (default Round-Robin)
- **Middleware chain** — user middleware → host policy → HSTS/redirect → proxy
- **Immutability** — builders and resolved `config` do not mutate route objects at runtime

## Migration from snake_case / `createProxy`

v4 replaces the older `createProxy` API. There is no deprecated adapter.

| Old | v4 |
| --- | --- |
| `createProxy({...})` | `MagicProxy.from({...})` or `MagicProxy.create()...build()` |
| `bind()` / `unbind()` | `listen()` / `close()` |
| `app` / `appssl` | `httpApp` / `httpsApp` |
| `allow_unknown_host` | `policy.allowUnknownHosts` |
| `allow_websockets` | `policy.allowWebSockets` |
| `enable_hsts` | `policy.forceHttpsRedirect` + `policy.hstsMaxAgeSeconds` |
| `http.start_callback` | `http.onListen` |
| `https.sslkey` / `sslcert` | `https.key` / `https.cert` |
| `proxies[].domain` | `routes[].host` |
| `proxies[].destination` | `routes[].targets` |
| `proxies[].sockDestination` | `routes[].websocketTargets` |
| `proxies[].timeout` | `routes[].timeoutMs` |
| `proxies[].round` | `routes[].initialIndex` |
| `default_proxy` | `fallback` |

```typescript
// Before
createProxy({
  allow_unknown_host: false,
  allow_websockets: true,
  http: { port: 8080, enabled: true, start_callback: () => {} },
  proxies: [{
    domain: 'app.localhost',
    destination: ['http://127.0.0.1:3001'],
    sockDestination: ['ws://127.0.0.1:3001'],
    timeout: 10_000,
    round: 0,
  }],
}).bind();

// After
MagicProxy.create()
  .http({ port: 8080 })
  .route('app.localhost')
    .to('http://127.0.0.1:3001')
    .websockets('ws://127.0.0.1:3001')
    .timeout(10_000)
  .allowUnknownHosts(false)
  .allowWebSockets(true)
  .build()
  .listen();
```

## Scripts

```bash
npm test        # vitest
npm run build   # emit dist/
npm run lint    # typecheck sources and tests
```

## License

MIT © Muryllo Pimenta de Oliveira
