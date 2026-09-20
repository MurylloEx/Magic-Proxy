export type {
  MagicHttpConfig,
  MagicHttpsConfig,
  MagicProxyDefinition,
  ProxyConfig,
  ProxyConfigInput,
  ProxyMiddleware,
  ProxyTrigger,
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
  DEFAULT_PROXY_ROUTE,
  isKnownHost,
  resolveConfig,
  resolveHostRoute,
  validateConfig,
} from '@/application/index.js';

export { createProxy } from '@/presentation/create-proxy.js';
