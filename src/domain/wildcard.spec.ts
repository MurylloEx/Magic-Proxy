import { describe, expect, it } from 'vitest';
import { matchDomain, matchWildcard } from './wildcard.js';

describe('matchWildcard', () => {
  it('matches a lone star against any value', () => {
    expect(matchWildcard('*', 'anything')).toBe(true);
    expect(matchWildcard('*', '')).toBe(true);
  });

  it('matches exact hosts case-insensitively', () => {
    expect(matchWildcard('API.Example.COM', 'api.example.com')).toBe(true);
    expect(matchWildcard('api.example.com', 'other.example.com')).toBe(false);
  });

  it('matches single-label wildcards', () => {
    expect(matchWildcard('*.example.com', 'a.example.com')).toBe(true);
    expect(matchWildcard('*.example.com', 'example.com')).toBe(false);
    expect(matchWildcard('*.example.com', 'a.b.example.com')).toBe(true);
  });

  it('escapes regex metacharacters in the pattern', () => {
    expect(matchWildcard('api.example.com', 'apiXexampleXcom')).toBe(false);
  });
});

describe('matchDomain', () => {
  it('delegates to matchWildcard', () => {
    expect(matchDomain('*.cdn.test', 'img.cdn.test')).toBe(true);
    expect(matchDomain('exact.test', 'other.test')).toBe(false);
  });
});
