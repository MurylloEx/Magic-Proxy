export {
  DEFAULT_BALANCER_STRATEGY,
  DEFAULT_PROXY_CONFIG,
  DEFAULT_ROUTE,
} from '#src/application/config/defaults.js';
export { resolveConfig } from '#src/application/config/resolve.js';
export {
  ConfigValidationError,
  validateConfig,
} from '#src/application/config/validate.js';
export {
  createBalancerRegistry,
  createRoundRobinBalancer,
  roundRobin,
  type BalancerRegistry,
  type DestinationKind,
} from '#src/application/balancing/round-robin.js';
export {
  isKnownHost,
  resolveHostRoute,
  type ResolvedRoute,
} from '#src/application/routing/host-router.js';
export { applyMiddlewareChain } from '#src/application/middleware/chain.js';
