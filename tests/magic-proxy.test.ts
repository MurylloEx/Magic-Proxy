import { describe, expect, it } from 'vitest';
import { MagicProxy, roundRobin } from '#src/index.js';

describe('MagicProxy fluent API', () => {
  it('builds an immutable instance with listen/close lifecycle', () => {
    const proxy = MagicProxy.create()
      .http({ port: 18080, onListen: () => undefined })
      .route('app.localhost')
      .to('http://127.0.0.1:3001', 'http://127.0.0.1:3002')
      .websockets('ws://127.0.0.1:3001')
      .timeout(5_000)
      .fallback()
      .to('http://127.0.0.1:3999')
      .allowUnknownHosts(false)
      .allowWebSockets(true)
      .balancer(roundRobin())
      .build();

    expect(typeof proxy.listen).toBe('function');
    expect(typeof proxy.close).toBe('function');
    expect(proxy.httpApp).toBeTruthy();
    expect(proxy.config.http.port).toBe(18080);
    expect(proxy.config.routes).toHaveLength(1);
    expect(proxy.config.routes[0]?.targets).toEqual([
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
    ]);
    expect(proxy.config.fallback.targets).toEqual(['http://127.0.0.1:3999']);
    expect(proxy.config.policy.allowUnknownHosts).toBe(false);
    expect(proxy.config.policy.allowWebSockets).toBe(true);
    expect(proxy.httpServer).toBeUndefined();
    expect(Object.isFrozen(proxy.config)).toBe(true);
  });

  it('supports forceHttps and hsts policy helpers', () => {
    const proxy = MagicProxy.create()
      .http({ port: 8080 })
      .route('*')
      .to('http://127.0.0.1:1')
      .forceHttps()
      .build();

    expect(proxy.config.policy.forceHttpsRedirect).toBe(true);
    expect(proxy.config.policy.hstsMaxAgeSeconds).toBe(31_536_000);
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

describe('MagicProxy.from declarative API', () => {
  it('creates a proxy from camelCase options', () => {
    const proxy = MagicProxy.from({
      http: { port: 9090 },
      https: { enabled: false },
      routes: [{ host: 'api.test', targets: ['http://127.0.0.1:7'] }],
      policy: { allowUnknownHosts: false, allowWebSockets: true },
    });

    expect(proxy.config.http.port).toBe(9090);
    expect(proxy.config.routes[0]?.host).toBe('api.test');
    expect(proxy.config.policy.allowWebSockets).toBe(true);
  });
});
