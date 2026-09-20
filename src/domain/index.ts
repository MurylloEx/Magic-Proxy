export type {
  BalancerStrategy,
  HostPattern,
  HttpListenerConfig,
  HttpsListenerConfig,
  LoadBalancer,
  MagicProxyConfig,
  MagicProxyInstance,
  MagicProxyOptions,
  ProxyMiddleware,
  RouteConfig,
  SecurityPolicy,
} from './types.js';

export { parseHostname } from './hostname.js';
export { matchDomain, matchWildcard } from './wildcard.js';
