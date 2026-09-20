import { describe, expect, it } from 'vitest';
import { parseHostname } from './hostname.js';
import { fakeIncomingMessage } from '../../tests/helpers/mocks.js';

describe('parseHostname', () => {
  it('reads Host without a port', () => {
    expect(parseHostname(fakeIncomingMessage({ host: 'example.com' }))).toBe(
      'example.com',
    );
  });

  it('strips a trailing port from Host', () => {
    expect(
      parseHostname(fakeIncomingMessage({ host: 'example.com:8080' })),
    ).toBe('example.com');
  });

  it('prefers the first X-Forwarded-Host value', () => {
    expect(
      parseHostname(
        fakeIncomingMessage({
          host: 'internal',
          'x-forwarded-host': 'public.example.com, other.example.com',
        }),
      ),
    ).toBe('public.example.com');
  });

  it('accepts X-Forwarded-Host as an array', () => {
    expect(
      parseHostname(
        fakeIncomingMessage({
          host: 'internal',
          'x-forwarded-host': ['first.example.com', 'second.example.com'],
        }),
      ),
    ).toBe('first.example.com');
  });

  it('supports IPv6 literals with ports', () => {
    expect(parseHostname(fakeIncomingMessage({ host: '[::1]:443' }))).toBe(
      '[::1]',
    );
  });

  it('returns undefined when no host is present', () => {
    expect(parseHostname(fakeIncomingMessage({}))).toBeUndefined();
  });
});
