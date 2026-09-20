import { describe, expect, it } from 'vitest';
import { resolveConfig } from './resolve.js';
import { ConfigValidationError, validateConfig } from './validate.js';

describe('validateConfig', () => {
  it('accepts a minimal valid HTTP configuration', () => {
    const config = resolveConfig({
      http: { enabled: true, port: 8080 },
      https: { enabled: false },
      routes: [{ host: '*', targets: ['http://127.0.0.1:3000'] }],
    });
    expect(() => validateConfig(config)).not.toThrow();
  });

  it('rejects invalid ports', () => {
    expect(() =>
      validateConfig(resolveConfig({ http: { enabled: true, port: 0 } })),
    ).toThrow(ConfigValidationError);
  });

  it('requires TLS material when HTTPS is enabled', () => {
    expect(() =>
      validateConfig(
        resolveConfig({
          http: { enabled: false },
          https: { enabled: true, port: 443, key: '', cert: '' },
        }),
      ),
    ).toThrow(/https\.key/);
  });

  it('requires at least one listener', () => {
    expect(() =>
      validateConfig(
        resolveConfig({
          http: { enabled: false },
          https: { enabled: false },
        }),
      ),
    ).toThrow(/at least one/);
  });

  it('rejects negative initialIndex and timeout values', () => {
    expect(() =>
      validateConfig(
        resolveConfig({
          routes: [{ host: 'x.com', initialIndex: -1, targets: ['http://x'] }],
        }),
      ),
    ).toThrow(/initialIndex/);

    expect(() =>
      validateConfig(
        resolveConfig({
          routes: [{ host: 'x.com', timeoutMs: -5, targets: ['http://x'] }],
        }),
      ),
    ).toThrow(/timeoutMs/);
  });

  it('rejects invalid HSTS max-age', () => {
    expect(() =>
      validateConfig(
        resolveConfig({
          policy: { hstsMaxAgeSeconds: -1 },
        }),
      ),
    ).toThrow(/hstsMaxAgeSeconds/);
  });

  it('exposes structured issues on ConfigValidationError', () => {
    try {
      validateConfig(
        resolveConfig({
          http: { enabled: false },
          https: { enabled: false },
        }),
      );
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      expect((error as ConfigValidationError).issues.length).toBeGreaterThan(0);
    }
  });
});
