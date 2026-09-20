import type { IncomingMessage } from 'node:http';
import { matchDomain, parseHostname } from '@/domain/index.js';
import type { MagicProxyConfig, RouteConfig } from '@/domain/types.js';

export interface ResolvedRoute {
  readonly route: RouteConfig;
  readonly key: string;
  readonly viaFallback: boolean;
}

/**
 * Resolve which virtual-host route should handle the request Host header.
 */
export function resolveHostRoute(
  config: MagicProxyConfig,
  req: IncomingMessage,
): ResolvedRoute | undefined {
  const hostname = parseHostname(req);
  if (!hostname) {
    return undefined;
  }

  const matchedIndex = config.routes.findIndex((route) =>
    matchDomain(route.host, hostname),
  );

  if (matchedIndex >= 0) {
    const route = config.routes[matchedIndex];
    if (!route) {
      return undefined;
    }
    return {
      route,
      key: `routes[${matchedIndex}]`,
      viaFallback: false,
    };
  }

  if (!config.policy.allowUnknownHosts) {
    return undefined;
  }

  return {
    route: config.fallback,
    key: 'fallback',
    viaFallback: true,
  };
}

export function isKnownHost(
  routes: readonly RouteConfig[],
  hostname: string,
): boolean {
  return routes.some((route) => matchDomain(route.host, hostname));
}
