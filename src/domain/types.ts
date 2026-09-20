import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';
import type { Server as HttpsServer } from 'node:https';

/** Native Node middleware signature (Connect-style). */
export type ProxyMiddleware = (
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
) => void;

/** Host pattern; supports `*` wildcards (e.g. `*.cdn.example.com`). */
export type HostPattern = string;

export interface HttpListenerConfig {
  readonly port: number;
  readonly enabled: boolean;
  readonly middlewares: readonly ProxyMiddleware[];
  readonly onListen: () => void;
}

export interface HttpsListenerConfig {
  readonly port: number;
  readonly enabled: boolean;
  readonly middlewares: readonly ProxyMiddleware[];
  readonly onListen: () => void;
  readonly key: string;
  readonly cert: string;
}

/**
 * Virtual-host route.
 * `initialIndex` seeds the load-balancer cursor; runtime state is not stored here.
 */
export interface RouteConfig {
  readonly host: HostPattern;
  readonly targets: readonly string[];
  readonly websocketTargets: readonly string[];
  readonly timeoutMs: number;
  readonly initialIndex: number;
}

export interface SecurityPolicy {
  /** When false, Host values that do not match any `routes` entry are dropped. */
  readonly allowUnknownHosts: boolean;
  /** When true, WebSocket upgrades are proxied via `websocketTargets`. */
  readonly allowWebSockets: boolean;
  /** Redirect plain HTTP to HTTPS (skips localhost). */
  readonly forceHttpsRedirect: boolean;
  /**
   * When set, send `Strict-Transport-Security` on HTTPS responses.
   * `undefined` means do not attach the header.
   */
  readonly hstsMaxAgeSeconds: number | undefined;
}

/**
 * Creates a {@link LoadBalancer} for a destination pool.
 * Injected so Round-Robin (default) can be swapped later.
 */
export type BalancerStrategy = (
  size: number,
  initialIndex: number,
) => LoadBalancer;

export interface LoadBalancer {
  readonly next: () => number;
  readonly size: number;
}

export interface MagicProxyConfig {
  readonly http: HttpListenerConfig;
  readonly https: HttpsListenerConfig;
  readonly routes: readonly RouteConfig[];
  readonly fallback: RouteConfig;
  readonly policy: SecurityPolicy;
  readonly balancerStrategy: BalancerStrategy;
}

/** Declarative input accepted by {@link MagicProxy.from}. */
export type MagicProxyOptions = {
  readonly http?: Partial<Omit<HttpListenerConfig, 'middlewares'>> & {
    readonly middlewares?: readonly ProxyMiddleware[];
  };
  readonly https?: Partial<Omit<HttpsListenerConfig, 'middlewares'>> & {
    readonly middlewares?: readonly ProxyMiddleware[];
  };
  readonly routes?: readonly Partial<RouteConfig>[];
  readonly fallback?: Partial<RouteConfig>;
  readonly policy?: Partial<SecurityPolicy>;
  readonly balancerStrategy?: BalancerStrategy;
};

export interface MagicProxyInstance {
  readonly config: MagicProxyConfig;
  readonly httpServer: HttpServer | undefined;
  readonly httpsServer: HttpsServer | undefined;
  /** Start listeners and attach WebSocket upgrade handlers. */
  readonly listen: () => void;
  /** Close listeners and release proxy resources. */
  readonly close: () => void;
}
