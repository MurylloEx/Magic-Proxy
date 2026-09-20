import { describe, expect, it } from 'vitest';
import { resolveConfig } from '@/application/config/resolve.js';
import {
  ConfigValidationError,
  validateConfig,
} from '@/application/config/validate.js';

describe('validateConfig', () => {
  it('accepts a minimal valid HTTP configuration', () => {
    const config = resolveConfig({
      http: { enabled: true, port: 8080 },
      https: { enabled: false },
      proxies: [
        {
          domain: '*',
          destination: ['http://127.0.0.1:3000'],
        },
      ],
    });
    expect(() => validateConfig(config)).not.toThrow();
  });

  it('rejects invalid ports', () => {
    const config = resolveConfig({
      http: { enabled: true, port: 0 },
    });
    expect(() => validateConfig(config)).toThrow(ConfigValidationError);
  });

  it('requires TLS material when HTTPS is enabled', () => {
    const config = resolveConfig({
      http: { enabled: false },
      https: { enabled: true, port: 443, sslkey: '', sslcert: '' },
    });
    expect(() => validateConfig(config)).toThrow(/sslkey/);
  });

  it('requires at least one listener', () => {
    const config = resolveConfig({
      http: { enabled: false },
      https: { enabled: false },
    });
    expect(() => validateConfig(config)).toThrow(/at least one/);
  });

  it('rejects negative round values', () => {
    const config = resolveConfig({
      proxies: [{ domain: 'x.com', round: -1, destination: ['http://x'] }],
    });
    expect(() => validateConfig(config)).toThrow(/round/);
  });
});

describe('resolveConfig', () => {
  it('freezes merged configuration and applies defaults', () => {
    const config = resolveConfig({
      allow_websockets: true,
      proxies: [{ domain: 'app.test', destination: ['http://localhost:1'] }],
    });

    expect(config.allow_unknown_host).toBe(true);
    expect(config.allow_websockets).toBe(true);
    expect(config.http.port).toBe(80);
    expect(config.proxies[0]?.sockDestination).toEqual([]);
    expect(Object.isFrozen(config)).toBe(true);
  });
});
