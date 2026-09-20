import type {
  MagicProxyConfig,
  ProxyMiddleware,
  RouteConfig,
} from './types.js';
import { describe, expect, it } from 'vitest';

describe('domain types', () => {
  it('models Connect-style middleware and immutable config shapes', () => {
    const middleware: ProxyMiddleware = (_req, res, next) => {
      res.statusCode = 204;
      next();
    };
    expect(typeof middleware).toBe('function');

    const route = {
      host: 'app.test',
      targets: ['http://127.0.0.1:1'],
      websocketTargets: ['ws://127.0.0.1:1'],
      timeoutMs: 1_000,
      initialIndex: 0,
    } as const satisfies RouteConfig;

    const config = {
      http: {
        port: 8080,
        enabled: true,
        middlewares: [middleware],
        onListen: () => undefined,
      },
      https: {
        port: 8443,
        enabled: false,
        middlewares: [],
        onListen: () => undefined,
        key: '',
        cert: '',
      },
      routes: [route],
      fallback: route,
      policy: {
        allowUnknownHosts: false,
        allowWebSockets: true,
        forceHttpsRedirect: false,
        hstsMaxAgeSeconds: undefined,
      },
      balancerStrategy: (size, initialIndex) => ({
        size,
        next: () => initialIndex % size,
      }),
    } as const satisfies MagicProxyConfig;

    expect(config.routes[0]?.host).toBe('app.test');
    expect(config.balancerStrategy(2, 1).next()).toBe(1);
  });
});
