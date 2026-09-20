export {
  DEFAULT_BALANCER_STRATEGY,
  DEFAULT_PROXY_CONFIG,
  DEFAULT_ROUTE,
} from '@/application/config/defaults.js';
export { resolveConfig } from '@/application/config/resolve.js';
export {
  ConfigValidationError,
  validateConfig,
} from '@/application/config/validate.js';
export {
  createBalancerRegistry,
  createRoundRobinBalancer,
  roundRobin,
  type BalancerRegistry,
  type DestinationKind,
} from '@/application/balancing/round-robin.js';
export {
  isKnownHost,
  resolveHostRoute,
  type ResolvedRoute,
} from '@/application/routing/host-router.js';
