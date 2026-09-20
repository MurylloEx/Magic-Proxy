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
} from '#src/domain/index.js';

export {
  matchDomain,
  matchWildcard,
  parseHostname,
} from '#src/domain/index.js';

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
} from '#src/application/index.js';

export {
  MagicProxy,
  MagicProxyBuilder,
  RouteBuilder,
} from '#src/presentation/builder.js';
