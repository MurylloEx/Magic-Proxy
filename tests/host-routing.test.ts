import { describe, expect, it } from 'vitest';
import type { IncomingMessage } from 'node:http';
import { resolveConfig } from '#src/application/config/resolve.js';
import {
  isKnownHost,
  resolveHostRoute,
} from '#src/application/routing/host-router.js';

function fakeRequest(host: string): IncomingMessage {
  return {
    headers: { host },
  } as unknown as IncomingMessage;
}

describe('resolveHostRoute', () => {
  const config = resolveConfig({
    policy: { allowUnknownHosts: true },
    routes: [
      {
        host: 'api.example.com',
        targets: ['http://127.0.0.1:3001'],
        websocketTargets: [],
        timeoutMs: 5000,
        initialIndex: 0,
      },
      {
        host: '*.cdn.example.com',
        targets: ['http://127.0.0.1:3002'],
        websocketTargets: [],
        timeoutMs: 5000,
        initialIndex: 0,
      },
    ],
    fallback: {
      host: '*',
      targets: ['http://127.0.0.1:3999'],
      websocketTargets: [],
      timeoutMs: 5000,
      initialIndex: 0,
    },
  });

  it('matches an exact virtual host', () => {
    const resolved = resolveHostRoute(config, fakeRequest('api.example.com'));
    expect(resolved?.viaFallback).toBe(false);
    expect(resolved?.key).toBe('routes[0]');
    expect(resolved?.route.targets[0]).toBe('http://127.0.0.1:3001');
  });

  it('matches wildcard hosts', () => {
    const resolved = resolveHostRoute(
      config,
      fakeRequest('assets.cdn.example.com'),
    );
    expect(resolved?.key).toBe('routes[1]');
  });

  it('falls back when allowUnknownHosts is true', () => {
    const resolved = resolveHostRoute(config, fakeRequest('unknown.test'));
    expect(resolved?.viaFallback).toBe(true);
    expect(resolved?.key).toBe('fallback');
  });

  it('returns undefined when host is unknown and not allowed', () => {
    const strict = resolveConfig({
      policy: { allowUnknownHosts: false },
      routes: [
        {
          host: 'only.example.com',
          targets: ['http://127.0.0.1:1'],
        },
      ],
    });
    expect(
      resolveHostRoute(strict, fakeRequest('other.example.com')),
    ).toBeUndefined();
  });
});

describe('isKnownHost', () => {
  it('detects configured hosts', () => {
    expect(
      isKnownHost(
        [
          {
            host: 'a.com',
            initialIndex: 0,
            timeoutMs: 1,
            targets: [],
            websocketTargets: [],
          },
        ],
        'a.com',
      ),
    ).toBe(true);
    expect(
      isKnownHost(
        [
          {
            host: 'a.com',
            initialIndex: 0,
            timeoutMs: 1,
            targets: [],
            websocketTargets: [],
          },
        ],
        'b.com',
      ),
    ).toBe(false);
  });
});
