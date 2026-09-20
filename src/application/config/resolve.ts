import type {
  MagicProxyConfig,
  MagicProxyOptions,
  RouteConfig,
} from '../../domain/types.js';
import { DEFAULT_PROXY_CONFIG, DEFAULT_ROUTE } from './defaults.js';

function mergeRoute(
  partial: Partial<RouteConfig> | undefined,
  fallback: RouteConfig,
): RouteConfig {
  return {
    host: partial?.host ?? fallback.host,
    initialIndex: partial?.initialIndex ?? fallback.initialIndex,
    timeoutMs: partial?.timeoutMs ?? fallback.timeoutMs,
    targets: Object.freeze([...(partial?.targets ?? fallback.targets)]),
    websocketTargets: Object.freeze([
      ...(partial?.websocketTargets ?? fallback.websocketTargets),
    ]),
  };
}

/**
 * Merge declarative options with defaults into a frozen {@link MagicProxyConfig}.
 */
export function resolveConfig(input?: MagicProxyOptions): MagicProxyConfig {
  const http = {
    ...DEFAULT_PROXY_CONFIG.http,
    ...input?.http,
    middlewares: Object.freeze([
      ...(input?.http?.middlewares ?? DEFAULT_PROXY_CONFIG.http.middlewares),
    ]),
    onListen: input?.http?.onListen ?? DEFAULT_PROXY_CONFIG.http.onListen,
  };

  const https = {
    ...DEFAULT_PROXY_CONFIG.https,
    ...input?.https,
    middlewares: Object.freeze([
      ...(input?.https?.middlewares ?? DEFAULT_PROXY_CONFIG.https.middlewares),
    ]),
    onListen: input?.https?.onListen ?? DEFAULT_PROXY_CONFIG.https.onListen,
    key: input?.https?.key ?? DEFAULT_PROXY_CONFIG.https.key,
    cert: input?.https?.cert ?? DEFAULT_PROXY_CONFIG.https.cert,
  };

  const routes = Object.freeze(
    (input?.routes ?? []).map((route) => mergeRoute(route, DEFAULT_ROUTE)),
  );

  const policy = {
    ...DEFAULT_PROXY_CONFIG.policy,
    ...input?.policy,
  };

  const config: MagicProxyConfig = {
    http,
    https,
    routes,
    fallback: mergeRoute(input?.fallback, DEFAULT_ROUTE),
    policy,
    balancerStrategy:
      input?.balancerStrategy ?? DEFAULT_PROXY_CONFIG.balancerStrategy,
  };

  return Object.freeze(config);
}
