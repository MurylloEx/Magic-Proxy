import { describe, expect, it } from 'vitest';
import { matchDomain, matchWildcard, parseHostname } from './index.js';
import { fakeIncomingMessage } from '../../tests/helpers/mocks.js';

describe('domain barrel', () => {
  it('re-exports hostname and wildcard helpers', () => {
    expect(parseHostname(fakeIncomingMessage({ host: 'a.test' }))).toBe(
      'a.test',
    );
    expect(matchWildcard('*', 'x')).toBe(true);
    expect(matchDomain('b.test', 'b.test')).toBe(true);
  });
});
