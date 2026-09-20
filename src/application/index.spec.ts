import { describe, expect, it } from 'vitest';
import {
  ConfigValidationError,
  createRoundRobinBalancer,
  DEFAULT_PROXY_CONFIG,
  resolveConfig,
  roundRobin,
  validateConfig,
} from './index.js';

describe('application barrel', () => {
  it('re-exports config, validation and balancer helpers', () => {
    expect(DEFAULT_PROXY_CONFIG.http.port).toBe(80);
    expect(roundRobin()).toBe(createRoundRobinBalancer);
    expect(() => validateConfig(resolveConfig({ http: { port: 1 } }))).not.toThrow();
    expect(new ConfigValidationError(['x']).name).toBe('ConfigValidationError');
  });
});
