import { describe, expect, it } from 'vitest';
import { resolveConfig } from './resolve.js';

describe('resolveConfig', () => {
  it('merges camelCase options over defaults and freezes the result', () => {
    const config = resolveConfig({
      policy: { allowWebSockets: true },
      routes: [{ host: 'app.test', targets: ['http://localhost:1'] }],
      fallback: { targets: ['http://fallback'] },
    });

    expect(config.policy.allowUnknownHosts).toBe(true);
    expect(config.policy.allowWebSockets).toBe(true);
    expect(config.http.port).toBe(80);
    expect(config.routes[0]?.host).toBe('app.test');
    expect(config.routes[0]?.websocketTargets).toEqual([]);
    expect(config.fallback.targets).toEqual(['http://fallback']);
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.routes)).toBe(true);
  });

  it('preserves custom listener middlewares and callbacks', () => {
    const onListen = (): void => undefined;
    const middleware = (): void => undefined;
    const config = resolveConfig({
      http: { port: 9_001, onListen, middlewares: [middleware] },
      https: {
        enabled: true,
        key: 'k',
        cert: 'c',
        middlewares: [middleware],
      },
    });

    expect(config.http.port).toBe(9_001);
    expect(config.http.onListen).toBe(onListen);
    expect(config.http.middlewares).toHaveLength(1);
    expect(config.https.enabled).toBe(true);
    expect(config.https.key).toBe('k');
    expect(config.https.middlewares).toHaveLength(1);
  });

  it('returns defaults when called without input', () => {
    const config = resolveConfig();
    expect(config.routes).toEqual([]);
    expect(config.https.enabled).toBe(false);
  });
});
