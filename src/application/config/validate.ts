import type { ProxyConfig } from '@/domain/types.js';

export class ConfigValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid Magic Proxy configuration:\n- ${issues.join('\n- ')}`);
    this.name = 'ConfigValidationError';
    this.issues = issues;
  }
}

function isValidPort(port: number): boolean {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function collectRouteIssues(
  label: string,
  route: ProxyConfig['default_proxy'],
): readonly string[] {
  const issues: string[] = [];

  if (typeof route.domain !== 'string' || route.domain.length === 0) {
    issues.push(`${label}.domain must be a non-empty string`);
  }
  if (!Number.isInteger(route.round) || route.round < 0) {
    issues.push(`${label}.round must be a non-negative integer`);
  }
  if (!Number.isFinite(route.timeout) || route.timeout < 0) {
    issues.push(`${label}.timeout must be a non-negative number`);
  }
  if (!Array.isArray(route.destination)) {
    issues.push(`${label}.destination must be an array of URLs`);
  }
  if (!Array.isArray(route.sockDestination)) {
    issues.push(`${label}.sockDestination must be an array of URLs`);
  }

  return issues;
}

/**
 * Validate a resolved {@link ProxyConfig}. Throws {@link ConfigValidationError} on failure.
 */
export function validateConfig(config: ProxyConfig): void {
  const issues: string[] = [];

  if (config.http.enabled && !isValidPort(config.http.port)) {
    issues.push('http.port must be an integer between 1 and 65535');
  }
  if (config.https.enabled && !isValidPort(config.https.port)) {
    issues.push('https.port must be an integer between 1 and 65535');
  }
  if (!config.http.enabled && !config.https.enabled) {
    issues.push('at least one of http.enabled or https.enabled must be true');
  }
  if (config.https.enabled) {
    if (!config.https.sslkey) {
      issues.push('https.sslkey is required when https.enabled is true');
    }
    if (!config.https.sslcert) {
      issues.push('https.sslcert is required when https.enabled is true');
    }
  }

  issues.push(...collectRouteIssues('default_proxy', config.default_proxy));

  config.proxies.forEach((route, index) => {
    issues.push(...collectRouteIssues(`proxies[${index}]`, route));
  });

  if (issues.length > 0) {
    throw new ConfigValidationError(issues);
  }
}
