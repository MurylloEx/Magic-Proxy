import type { MagicProxyDefinition, ProxyConfig } from '@/domain/types.js';

export const DEFAULT_PROXY_ROUTE: MagicProxyDefinition = {
  domain: '*',
  destination: [],
  sockDestination: [],
  timeout: 10_000,
  round: 0,
};

export const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  enable_hsts: false,
  allow_unknown_host: true,
  allow_websockets: false,
  http: {
    port: 80,
    enabled: true,
    middlewares: [],
    start_callback: () => undefined,
  },
  https: {
    port: 443,
    enabled: false,
    middlewares: [],
    start_callback: () => undefined,
    sslkey: '',
    sslcert: '',
  },
  proxies: [],
  default_proxy: DEFAULT_PROXY_ROUTE,
};
