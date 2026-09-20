import { describe, expect, it } from 'vitest';
import { resolveConfig } from '@/application/config/resolve.js';
import { isKnownHost, resolveHostRoute } from './host-router.js';
import { fakeIncomingMessage } from '../../../tests/helpers/mocks.js';

describe('resolveHostRoute', () => {
  const config = resolveConfig({
    policy: { allowUnknownHosts: true },
    routes: [
      {
        host: 'api.example.com',
        targets: ['http://127.0.0.1:3001'],
      },
      {
        host: '*.cdn.example.com',
        targets: ['http://127.0.0.1:3002'],
      },
    ],
    fallback: {
      targets: ['http://127.0.0.1:3999'],
    },
  });

  it('matches an exact virtual host', () => {
    const resolved = resolveHostRoute(
      config,
      fakeIncomingMessage({ host: 'api.example.com' }),
    );
    expect(resolved?.viaFallback).toBe(false);
    expect(resolved?.key).toBe('routes[0]');
    expect(resolved?.route.targets[0]).toBe('http://127.0.0.1:3001');
  });

  it('matches wildcard hosts', () => {
    const resolved = resolveHostRoute(
      config,
      fakeIncomingMessage({ host: 'assets.cdn.example.com' }),
    );
    expect(resolved?.key).toBe('routes[1]');
  });

  it('falls back when allowUnknownHosts is true', () => {
    const resolved = resolveHostRoute(
      config,
      fakeIncomingMessage({ host: 'unknown.test' }),
    );
    expect(resolved?.viaFallback).toBe(true);
    expect(resolved?.key).toBe('fallback');
  });

  it('returns undefined when host is unknown and not allowed', () => {
    const strict = resolveConfig({
      policy: { allowUnknownHosts: false },
      routes: [{ host: 'only.example.com', targets: ['http://127.0.0.1:1'] }],
    });
    expect(
      resolveHostRoute(strict, fakeIncomingMessage({ host: 'other.example.com' })),
    ).toBeUndefined();
  });

  it('returns undefined when the request has no hostname', () => {
    expect(resolveHostRoute(config, fakeIncomingMessage({}))).toBeUndefined();
  });
});

describe('isKnownHost', () => {
  it('detects configured hosts', () => {
    const routes = [
      {
        host: 'a.com',
        initialIndex: 0,
        timeoutMs: 1,
        targets: [] as string[],
        websocketTargets: [] as string[],
      },
    ];
    expect(isKnownHost(routes, 'a.com')).toBe(true);
    expect(isKnownHost(routes, 'b.com')).toBe(false);
  });
});
