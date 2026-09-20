import { describe, expect, it } from 'vitest';
import {
  ConfigValidationError,
  MagicProxy,
  MagicProxyBuilder,
  matchDomain,
  matchWildcard,
  parseHostname,
  resolveConfig,
  roundRobin,
  validateConfig,
} from './index.js';
import { fakeIncomingMessage } from '../tests/helpers/mocks.js';

describe('package entrypoint', () => {
  it('re-exports the public API surface', () => {
    expect(parseHostname(fakeIncomingMessage({ host: 'a.test' }))).toBe(
      'a.test',
    );
    expect(matchWildcard('*', 'x')).toBe(true);
    expect(matchDomain('a.test', 'a.test')).toBe(true);
    expect(roundRobin()(2, 0).next()).toBe(0);
    expect(() => validateConfig(resolveConfig({ http: { port: 2 } }))).not.toThrow();
    expect(new ConfigValidationError(['x']).issues).toEqual(['x']);
    expect(MagicProxy.create()).toBeInstanceOf(MagicProxyBuilder);
  });
});
