import type {
  MagicProxyDefinition,
  ProxyConfig,
  ProxyConfigInput,
} from '@/domain/types.js';
import { DEFAULT_PROXY_CONFIG, DEFAULT_PROXY_ROUTE } from './defaults.js';

function mergeRoute(
  partial: Partial<MagicProxyDefinition> | undefined,
  fallback: MagicProxyDefinition,
): MagicProxyDefinition {
  return {
    domain: partial?.domain ?? fallback.domain,
    round: partial?.round ?? fallback.round,
    timeout: partial?.timeout ?? fallback.timeout,
    destination: Object.freeze([
      ...(partial?.destination ?? fallback.destination),
    ]),
    sockDestination: Object.freeze([
      ...(partial?.sockDestination ?? fallback.sockDestination),
    ]),
  };
}

/**
 * Merge user input with defaults into a frozen {@link ProxyConfig}.
 * Does not mutate the input object.
 */
export function resolveConfig(input?: ProxyConfigInput): ProxyConfig {
  const http = {
    ...DEFAULT_PROXY_CONFIG.http,
    ...input?.http,
    middlewares: Object.freeze([
      ...(input?.http?.middlewares ?? DEFAULT_PROXY_CONFIG.http.middlewares),
    ]),
    start_callback:
      input?.http?.start_callback ?? DEFAULT_PROXY_CONFIG.http.start_callback,
  };

  const https = {
    ...DEFAULT_PROXY_CONFIG.https,
    ...input?.https,
    middlewares: Object.freeze([
      ...(input?.https?.middlewares ?? DEFAULT_PROXY_CONFIG.https.middlewares),
    ]),
    start_callback:
      input?.https?.start_callback ?? DEFAULT_PROXY_CONFIG.https.start_callback,
    sslkey: input?.https?.sslkey ?? DEFAULT_PROXY_CONFIG.https.sslkey,
    sslcert: input?.https?.sslcert ?? DEFAULT_PROXY_CONFIG.https.sslcert,
  };

  const proxies = Object.freeze(
    (input?.proxies ?? []).map((route) =>
      mergeRoute(route, DEFAULT_PROXY_ROUTE),
    ),
  );

  const config: ProxyConfig = {
    enable_hsts: input?.enable_hsts ?? DEFAULT_PROXY_CONFIG.enable_hsts,
    allow_unknown_host:
      input?.allow_unknown_host ?? DEFAULT_PROXY_CONFIG.allow_unknown_host,
    allow_websockets:
      input?.allow_websockets ?? DEFAULT_PROXY_CONFIG.allow_websockets,
    http,
    https,
    proxies,
    default_proxy: mergeRoute(input?.default_proxy, DEFAULT_PROXY_ROUTE),
  };

  return Object.freeze(config);
}
