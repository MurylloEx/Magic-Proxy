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
} from '@/domain/index.js';

export {
  matchDomain,
  matchWildcard,
  parseHostname,
} from '@/domain/index.js';

export {
  ConfigValidationError,
  createBalancerRegistry,
  createRoundRobinBalancer,
  DEFAULT_PROXY_CONFIG,
  DEFAULT_ROUTE,
  isKnownHost,
  resolveConfig,
  resolveHostRoute,
  roundRobin,
  validateConfig,
} from '@/application/index.js';

export {
  MagicProxy,
  MagicProxyBuilder,
  RouteBuilder,
} from '@/presentation/builder.js';
