import { describe, expect, it } from 'vitest';
import { MagicProxy, MagicProxyBuilder, RouteBuilder } from './builder.js';
import { roundRobin } from '@/application/balancing/round-robin.js';

describe('MagicProxy builder', () => {
  it('builds an immutable fluent configuration', () => {
    const proxy = MagicProxy.create()
      .http({ port: 18_080 })
      .route('app.localhost')
      .to('http://127.0.0.1:3001', 'http://127.0.0.1:3002')
      .websockets('ws://127.0.0.1:3001')
      .timeout(5_000)
      .startAt(1)
      .fallback()
      .to('http://127.0.0.1:3999')
      .allowUnknownHosts(false)
      .allowWebSockets(true)
      .balancer(roundRobin())
      .hsts(100)
      .build();

    expect(proxy.config.http.port).toBe(18_080);
    expect(proxy.config.routes[0]?.targets).toEqual([
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ]);
    expect(proxy.config.routes[0]?.websocketTargets).toEqual([
      'ws://127.0.0.1:3001',
    ]);
    expect(proxy.config.routes[0]?.timeoutMs).toBe(5_000);
    expect(proxy.config.routes[0]?.initialIndex).toBe(1);
    expect(proxy.config.fallback.targets).toEqual(['http://127.0.0.1:3999']);
    expect(proxy.config.policy.allowUnknownHosts).toBe(false);
    expect(proxy.config.policy.allowWebSockets).toBe(true);
    expect(proxy.config.policy.hstsMaxAgeSeconds).toBe(100);
    expect(Object.isFrozen(proxy.config)).toBe(true);
  });

  it('supports forceHttps default HSTS and disabling HSTS', () => {
    const withHsts = MagicProxy.create()
      .http({ port: 8080 })
      .route('*')
      .to('http://127.0.0.1:1')
      .forceHttps()
      .build();
    expect(withHsts.config.policy.forceHttpsRedirect).toBe(true);
    expect(withHsts.config.policy.hstsMaxAgeSeconds).toBe(31_536_000);

    const without = MagicProxy.create()
      .http({ port: 8080 })
      .route('*')
      .to('http://127.0.0.1:1')
      .forceHttps()
      .hsts(false)
      .build();
    expect(without.config.policy.hstsMaxAgeSeconds).toBeUndefined();
  });

  it('appends listener middlewares via useHttp / useHttps', () => {
    const mw = (): void => undefined;
    const proxy = MagicProxy.create()
      .http({ port: 8080 })
      .useHttp(mw)
      .https({ key: 'k', cert: 'c', port: 8443 })
      .useHttps(mw)
      .route('*')
      .to('http://127.0.0.1:1')
      .done()
      .build();

    expect(proxy.config.http.middlewares).toHaveLength(1);
    expect(proxy.config.https.middlewares).toHaveLength(1);
    expect(proxy.config.https.enabled).toBe(true);
  });

  it('creates instances from declarative options', () => {
    const proxy = MagicProxy.from({
      http: { port: 9090 },
      routes: [{ host: 'api.test', targets: ['http://127.0.0.1:7'] }],
      policy: { allowWebSockets: true },
    });
    expect(proxy.config.http.port).toBe(9090);
    expect(proxy.config.routes[0]?.host).toBe('api.test');
  });

  it('exposes builder classes for typing', () => {
    expect(new MagicProxyBuilder()).toBeInstanceOf(MagicProxyBuilder);
    const nested = MagicProxy.create().route('a.test');
    expect(nested).toBeInstanceOf(RouteBuilder);
  });

  it('rejects invalid configuration at build time', () => {
    expect(() =>
      MagicProxy.create()
        .http({ enabled: false })
        .https({ enabled: false, key: 'k', cert: 'c' })
        .build(),
    ).toThrow(/at least one/);
  });
});
