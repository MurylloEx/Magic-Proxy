import { describe, expect, it } from 'vitest';
import type { IncomingMessage } from 'node:http';
import { parseHostname } from '../src/domain/hostname.js';
import { matchWildcard } from '../src/domain/wildcard.js';

function fakeRequest(headers: Record<string, string>): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

describe('parseHostname', () => {
  it('reads Host header without port', () => {
    expect(parseHostname(fakeRequest({ host: 'example.com:8080' }))).toBe(
      'example.com',
    );
  });

  it('prefers the first X-Forwarded-Host value', () => {
    expect(
      parseHostname(
        fakeRequest({
          host: 'internal',
          'x-forwarded-host': 'public.example.com, other.example.com',
        }),
      ),
    ).toBe('public.example.com');
  });

  it('supports IPv6 literals', () => {
    expect(parseHostname(fakeRequest({ host: '[::1]:443' }))).toBe('[::1]');
  });
});

describe('matchWildcard', () => {
  it('matches exact and star patterns case-insensitively', () => {
    expect(matchWildcard('*', 'anything')).toBe(true);
    expect(matchWildcard('API.Example.COM', 'api.example.com')).toBe(true);
    expect(matchWildcard('*.example.com', 'a.example.com')).toBe(true);
    expect(matchWildcard('*.example.com', 'example.com')).toBe(false);
  });
});
