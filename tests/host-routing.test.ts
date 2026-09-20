import { describe, expect, it } from 'vitest';
import type { IncomingMessage } from 'node:http';
import { resolveConfig } from '@/application/config/resolve.js';
import {
  isKnownHost,
  resolveHostRoute,
} from '@/application/routing/host-router.js';

function fakeRequest(host: string): IncomingMessage {
  return {
    headers: { host },
  } as unknown as IncomingMessage;
}

describe('resolveHostRoute', () => {
  const config = resolveConfig({
    allow_unknown_host: true,
    proxies: [
      {
        domain: 'api.example.com',
        destination: ['http://127.0.0.1:3001'],
        sockDestination: [],
        timeout: 5000,
        round: 0,
      },
      {
        domain: '*.cdn.example.com',
        destination: ['http://127.0.0.1:3002'],
        sockDestination: [],
        timeout: 5000,
        round: 0,
      },
    ],
    default_proxy: {
      domain: '*',
      destination: ['http://127.0.0.1:3999'],
      sockDestination: [],
      timeout: 5000,
      round: 0,
    },
  });

  it('matches an exact virtual host', () => {
    const resolved = resolveHostRoute(config, fakeRequest('api.example.com'));
    expect(resolved?.viaDefault).toBe(false);
    expect(resolved?.key).toBe('proxies[0]');
    expect(resolved?.route.destination[0]).toBe('http://127.0.0.1:3001');
  });

  it('matches wildcard domains', () => {
    const resolved = resolveHostRoute(
      config,
      fakeRequest('assets.cdn.example.com'),
    );
    expect(resolved?.key).toBe('proxies[1]');
  });

  it('falls back to default_proxy when allow_unknown_host is true', () => {
    const resolved = resolveHostRoute(config, fakeRequest('unknown.test'));
    expect(resolved?.viaDefault).toBe(true);
    expect(resolved?.key).toBe('default_proxy');
  });

  it('returns undefined when host is unknown and not allowed', () => {
    const strict = resolveConfig({
      allow_unknown_host: false,
      proxies: [
        {
          domain: 'only.example.com',
          destination: ['http://127.0.0.1:1'],
        },
      ],
    });
    expect(resolveHostRoute(strict, fakeRequest('other.example.com'))).toBeUndefined();
  });
});

describe('isKnownHost', () => {
  it('detects configured hosts', () => {
    expect(
      isKnownHost([{ domain: 'a.com', round: 0, timeout: 1, destination: [], sockDestination: [] }], 'a.com'),
    ).toBe(true);
    expect(
      isKnownHost([{ domain: 'a.com', round: 0, timeout: 1, destination: [], sockDestination: [] }], 'b.com'),
    ).toBe(false);
  });
});
