/**
 * Case-insensitive glob match where `*` matches any sequence of characters.
 * Compatible with the previous `wildcard` package behaviour used in v2.
 */
export function matchWildcard(pattern: string, value: string): boolean {
  const normalizedPattern = pattern.toUpperCase();
  const normalizedValue = value.toUpperCase();

  if (normalizedPattern === '*') {
    return true;
  }

  const escaped = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');

  return new RegExp(`^${escaped}$`).test(normalizedValue);
}

export function matchDomain(domainPattern: string, hostname: string): boolean {
  return matchWildcard(domainPattern, hostname);
}
