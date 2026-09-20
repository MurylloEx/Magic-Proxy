# Magic Reverse Proxy

[![npm version](https://badgen.net/npm/v/magic-reverse-proxy)](https://www.npmjs.com/package/magic-reverse-proxy)
[![license](https://badgen.net/npm/license/magic-reverse-proxy)](./LICENSE)
[![node](https://badgen.net/badge/node/%3E%3D22/green)](https://nodejs.org/)
[![author](https://badgen.net/badge/author/MurylloEx/red)](https://github.com/MurylloEx)

TypeScript reverse proxy for Node.js with virtual hosts, WebSocket proxying, pluggable load balancing, middleware pipelines, and HTTPS / HSTS policy helpers.

Package name on npm: **`magic-reverse-proxy`**.

## Requirements

- Node.js **>= 22**

## Install

```bash
npm install magic-reverse-proxy
```

## Quick start (fluent)

```typescript
import { MagicProxy, roundRobin } from 'magic-reverse-proxy';

const proxy = MagicProxy.create()
  .http({
    port: 8080,
    onListen: () => console.log('Magic Proxy on :8080'),
  })
  .route('app.localhost')
    .to('http://127.0.0.1:3001', 'http://127.0.0.1:3002')
    .websockets('ws://127.0.0.1:3001', 'ws://127.0.0.1:3002')
    .timeout(10_000)
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

## Declarative alternative

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
  fallback: { targets: ['http://127.0.0.1:3999'] },
  policy: {
    allowUnknownHosts: false,
    allowWebSockets: true,
    forceHttpsRedirect: false,
  },
});

proxy.listen();
```

## Public API sketch

| Surface | Role |
| --- | --- |
| `MagicProxy.create()` | Immutable fluent builder |
| `MagicProxy.from(options)` | Declarative camelCase config |
| `.route(host).to(...).websockets(...).timeout(ms)` | Virtual-host route |
| `.fallback().to(...)` | Catch-all when unknown hosts are allowed |
| `.allowUnknownHosts` / `.allowWebSockets` / `.forceHttps` / `.hsts` | Security policy |
| `.balancer(roundRobin())` | Inject load-balancer **Strategy** |
| `.useHttp` / `.useHttps` | Middleware pipeline per listener |
| `proxy.listen()` / `proxy.close()` | Lifecycle |
| `proxy.httpApp` / `proxy.httpsApp` | Underlying Express apps |

Resolved `proxy.config` is **frozen**. Balancer cursors live outside the config object.

## Architecture

```
src/
  domain/           Types, hostname parsing, wildcard matching
  application/      Config resolve/validate, routing, balancer strategies
  infrastructure/   http-proxy client, HTTP/HTTPS server binding
  presentation/     MagicProxy builder + Express / upgrade middlewares
```

## Migration from v3 (snake_case / `createProxy`)

v4 replaces the v3 surface. Map fields as follows:

| v3 | v4 |
| --- | --- |
| `createProxy({...})` | `MagicProxy.from({...})` or `MagicProxy.create()...build()` |
| `bind()` / `unbind()` | `listen()` / `close()` |
| `app` / `appssl` | `httpApp` / `httpsApp` |
| `allow_unknown_host` | `policy.allowUnknownHosts` |
| `allow_websockets` | `policy.allowWebSockets` |
| `enable_hsts` | `policy.forceHttpsRedirect` + `policy.hstsMaxAgeSeconds` (or `.forceHttps()` / `.hsts()`) |
| `http.start_callback` | `http.onListen` |
| `https.sslkey` / `sslcert` | `https.key` / `https.cert` |
| `proxies[].domain` | `routes[].host` |
| `proxies[].destination` | `routes[].targets` |
| `proxies[].sockDestination` | `routes[].websocketTargets` |
| `proxies[].timeout` | `routes[].timeoutMs` |
| `proxies[].round` | `routes[].initialIndex` |
| `default_proxy` | `fallback` |

Example v3 → v4:

```typescript
// v3
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

// v4
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
npm test
npm run build
npm run lint
```

## License

MIT © Muryllo Pimenta de Oliveira
