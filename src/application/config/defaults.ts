import type {
  BalancerStrategy,
  MagicProxyConfig,
  RouteConfig,
} from '@/domain/types.js';
import { createRoundRobinBalancer } from '@/application/balancing/round-robin.js';

export const DEFAULT_ROUTE: RouteConfig = {
  host: '*',
  targets: [],
  websocketTargets: [],
  timeoutMs: 10_000,
  initialIndex: 0,
};

export const DEFAULT_BALANCER_STRATEGY: BalancerStrategy =
  createRoundRobinBalancer;

export const DEFAULT_PROXY_CONFIG: MagicProxyConfig = {
  http: {
    port: 80,
    enabled: true,
    middlewares: [],
    onListen: () => undefined,
  },
  https: {
    port: 443,
    enabled: false,
    middlewares: [],
    onListen: () => undefined,
    key: '',
    cert: '',
  },
  routes: [],
  fallback: DEFAULT_ROUTE,
  policy: {
    allowUnknownHosts: true,
    allowWebSockets: false,
    forceHttpsRedirect: false,
    hstsMaxAgeSeconds: undefined,
  },
  balancerStrategy: DEFAULT_BALANCER_STRATEGY,
};
