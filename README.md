<p align="center">
  <a href="https://www.npmjs.com/package/magic-reverse-proxy"><img src="https://badgen.net/npm/v/magic-reverse-proxy" alt="npm version"/></a>
  <a href="https://www.npmjs.com/package/magic-reverse-proxy"><img src="https://badgen.net/npm/dt/magic-reverse-proxy" alt="npm downloads"/></a>
  <a href="https://www.npmjs.com/package/magic-reverse-proxy"><img src="https://badgen.net/npm/license/magic-reverse-proxy" alt="license"/></a>
  <a href="https://www.npmjs.com/package/magic-reverse-proxy"><img src="https://badgen.net/npm/types/magic-reverse-proxy" alt="types"/></a>
  <a href="https://github.com/MurylloEx/Magic-Proxy/actions/workflows/ci.yml"><img src="https://badgen.net/github/checks/MurylloEx/Magic-Proxy/master/CI" alt="CI"/></a>
  <img src="https://badgen.net/badge/node/%3E=22/green" alt="node"/>
  <a href="https://github.com/MurylloEx"><img src="https://badgen.net/badge/author/MurylloEx/red?icon=label" alt="author"/></a>
</p>

# Magic Reverse Proxy

**Magic Reverse Proxy** (`magic-reverse-proxy`) is a TypeScript HTTP/HTTPS reverse proxy for Node.js. Route traffic by `Host` (virtual hosts and `*` wildcards), proxy WebSocket upgrades, balance upstreams with a pluggable strategy (Round-Robin by default), and apply HTTPS redirect / HSTS policy helpers.

v3 uses only Node.js built-ins (`node:http`, `node:https`, `node:net`) — no Express, no `http-proxy`.

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
| `http.middlewares` | `ProxyMiddleware[]` | `[]` | Connect-style middleware before the proxy |
| `https.port` | `number` | `443` | HTTPS listen port |
| `https.enabled` | `boolean` | `false` | Enable the HTTPS listener |
| `https.key` / `https.cert` | `string` | `''` | PEM material (required when HTTPS is enabled) |
| `https.onListen` | `() => void` | no-op | Called when the HTTPS server starts |
| `https.middlewares` | `ProxyMiddleware[]` | `[]` | Connect-style middleware on the HTTPS listener |

Fluent helpers: `.http({...})`, `.https({ key, cert, ... })`, `.useHttp(...)`, `.useHttps(...)`.

`ProxyMiddleware` is `(req, res, next) => void` over Node `IncomingMessage` / `ServerResponse` (not Express).

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
| `close()` | Close servers and release proxy resources |
| `httpServer` / `httpsServer` | Node `http.Server` / `https.Server` after `listen()` (otherwise `undefined`) |
| `config` | Frozen resolved `MagicProxyConfig` |

Invalid configuration throws `ConfigValidationError` at `build()` / `from()`.

## Architecture

```
src/
  domain/           Types, hostname parsing, wildcard matching
  application/      Config resolve/validate, host routing, balancer strategies
  infrastructure/   Native HTTP/WS proxy client, server binding, middleware runner
  presentation/     MagicProxy builder + Connect-style / upgrade middlewares
```

- **Factory** — `MagicProxy.create()` / `MagicProxy.from()`
- **Strategy** — pluggable `BalancerStrategy` (default Round-Robin)
- **Middleware chain** — user middleware → host policy → HSTS/redirect → proxy
- **Immutability** — builders and resolved `config` do not mutate route objects at runtime

## Breaking changes in v3

| Removed / changed | Replacement |
| --- | --- |
| Runtime deps `express`, `http-proxy` | Node built-ins only |
| `httpApp` / `httpsApp` (Express apps) | Use `httpServer` / `httpsServer` after `listen()` |
| Express `Request` / `Response` in middleware | Node `IncomingMessage` / `ServerResponse` |

## Migration from snake_case / `createProxy`

v3 replaces the older `createProxy` API. There is no deprecated adapter.

| Old | v3 |
| --- | --- |
| `createProxy({...})` | `MagicProxy.from({...})` or `MagicProxy.create()...build()` |
| `bind()` / `unbind()` | `listen()` / `close()` |
| `app` / `appssl` / `httpApp` / `httpsApp` | `httpServer` / `httpsServer` (after `listen()`) |
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
npm test        # vitest — colocated src/**/*.spec.ts + tests/integration
npm run build   # emit dist/ (specs excluded)
npm run lint    # typecheck sources and tests
```

Unit specs live next to the modules they cover (`src/**/*.spec.ts`). Functional coverage for HTTP, HTTPS, `ws://`, and `wss://` is under `tests/integration/` (uses Node built-ins plus the `ws` **devDependency** for WebSocket clients/servers).

## License

MIT © Muryllo Pimenta de Oliveira
