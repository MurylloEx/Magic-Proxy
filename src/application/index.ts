export { DEFAULT_PROXY_CONFIG, DEFAULT_PROXY_ROUTE } from './config/defaults.js';
export { resolveConfig } from './config/resolve.js';
export {
  ConfigValidationError,
  validateConfig,
} from './config/validate.js';
export {
  createBalancerRegistry,
  createRoundRobinBalancer,
  type BalancerRegistry,
  type DestinationKind,
  type LoadBalancer,
} from './balancing/round-robin.js';
export {
  isKnownHost,
  resolveHostRoute,
  type ResolvedRoute,
} from './routing/host-router.js';
export { applyMiddlewareChain } from './middleware/chain.js';
