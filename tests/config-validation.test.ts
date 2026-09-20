import { describe, expect, it } from 'vitest';
import { resolveConfig } from '#src/application/config/resolve.js';
import {
  ConfigValidationError,
  validateConfig,
} from '#src/application/config/validate.js';

describe('validateConfig', () => {
  it('accepts a minimal valid HTTP configuration', () => {
    const config = resolveConfig({
      http: { enabled: true, port: 8080 },
      https: { enabled: false },
      routes: [
        {
          host: '*',
          targets: ['http://127.0.0.1:3000'],
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
      https: { enabled: true, port: 443, key: '', cert: '' },
    });
    expect(() => validateConfig(config)).toThrow(/https\.key/);
  });

  it('requires at least one listener', () => {
    const config = resolveConfig({
      http: { enabled: false },
      https: { enabled: false },
    });
    expect(() => validateConfig(config)).toThrow(/at least one/);
  });

  it('rejects negative initialIndex values', () => {
    const config = resolveConfig({
      routes: [{ host: 'x.com', initialIndex: -1, targets: ['http://x'] }],
    });
    expect(() => validateConfig(config)).toThrow(/initialIndex/);
  });
});

describe('resolveConfig', () => {
  it('freezes merged configuration and applies camelCase defaults', () => {
    const config = resolveConfig({
      policy: { allowWebSockets: true },
      routes: [{ host: 'app.test', targets: ['http://localhost:1'] }],
    });

    expect(config.policy.allowUnknownHosts).toBe(true);
    expect(config.policy.allowWebSockets).toBe(true);
    expect(config.http.port).toBe(80);
    expect(config.routes[0]?.websocketTargets).toEqual([]);
    expect(Object.isFrozen(config)).toBe(true);
  });
});
