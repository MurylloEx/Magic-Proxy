import type { MagicProxyConfig, RouteConfig } from '#src/domain/types.js';

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
  route: RouteConfig,
): readonly string[] {
  return [
    ...(typeof route.host !== 'string' || route.host.length === 0
      ? [`${label}.host must be a non-empty string`]
      : []),
    ...(!Number.isInteger(route.initialIndex) || route.initialIndex < 0
      ? [`${label}.initialIndex must be a non-negative integer`]
      : []),
    ...(!Number.isFinite(route.timeoutMs) || route.timeoutMs < 0
      ? [`${label}.timeoutMs must be a non-negative number`]
      : []),
    ...(!Array.isArray(route.targets)
      ? [`${label}.targets must be an array of URLs`]
      : []),
    ...(!Array.isArray(route.websocketTargets)
      ? [`${label}.websocketTargets must be an array of URLs`]
      : []),
  ];
}

/**
 * Validate a resolved {@link MagicProxyConfig}. Throws {@link ConfigValidationError} on failure.
 */
export function validateConfig(config: MagicProxyConfig): void {
  const issues = [
    ...(config.http.enabled && !isValidPort(config.http.port)
      ? ['http.port must be an integer between 1 and 65535']
      : []),
    ...(config.https.enabled && !isValidPort(config.https.port)
      ? ['https.port must be an integer between 1 and 65535']
      : []),
    ...(!config.http.enabled && !config.https.enabled
      ? ['at least one of http.enabled or https.enabled must be true']
      : []),
    ...(config.https.enabled && !config.https.key
      ? ['https.key is required when https.enabled is true']
      : []),
    ...(config.https.enabled && !config.https.cert
      ? ['https.cert is required when https.enabled is true']
      : []),
    ...(config.policy.hstsMaxAgeSeconds !== undefined &&
    (!Number.isFinite(config.policy.hstsMaxAgeSeconds) ||
      config.policy.hstsMaxAgeSeconds < 0)
      ? ['policy.hstsMaxAgeSeconds must be a non-negative number when set']
      : []),
    ...collectRouteIssues('fallback', config.fallback),
    ...config.routes.flatMap((route, index) =>
      collectRouteIssues(`routes[${index}]`, route),
    ),
  ];

  if (issues.length > 0) {
    throw new ConfigValidationError(issues);
  }
}
