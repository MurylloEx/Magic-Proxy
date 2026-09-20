export type {
  MagicHttpConfig,
  MagicHttpsConfig,
  MagicProxyDefinition,
  ProxyConfig,
  ProxyConfigInput,
  ProxyMiddleware,
  ProxyTrigger,
} from './types.js';

export { parseHostname } from './hostname.js';
export { matchDomain, matchWildcard } from './wildcard.js';
