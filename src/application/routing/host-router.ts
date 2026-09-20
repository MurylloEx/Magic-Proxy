import type { IncomingMessage } from 'node:http';
import { matchDomain, parseHostname } from '@/domain/index.js';
import type { MagicProxyDefinition, ProxyConfig } from '@/domain/types.js';

export interface ResolvedRoute {
  readonly route: MagicProxyDefinition;
  readonly key: string;
  readonly viaDefault: boolean;
}

/**
 * Resolve which virtual-host route should handle the request Host header.
 */
export function resolveHostRoute(
  config: ProxyConfig,
  req: IncomingMessage,
): ResolvedRoute | undefined {
  const hostname = parseHostname(req);
  if (!hostname) {
    return undefined;
  }

  const matchedIndex = config.proxies.findIndex((proxy) =>
    matchDomain(proxy.domain, hostname),
  );

  if (matchedIndex >= 0) {
    const route = config.proxies[matchedIndex];
    if (!route) {
      return undefined;
    }
    return {
      route,
      key: `proxies[${matchedIndex}]`,
      viaDefault: false,
    };
  }

  if (!config.allow_unknown_host) {
    return undefined;
  }

  return {
    route: config.default_proxy,
    key: 'default_proxy',
    viaDefault: true,
  };
}

export function isKnownHost(
  proxies: readonly MagicProxyDefinition[],
  hostname: string,
): boolean {
  return proxies.some((proxy) => matchDomain(proxy.domain, hostname));
}
