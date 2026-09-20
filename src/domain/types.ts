import type { Express } from 'express';
import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';

/** Express-compatible middleware signature. */
export type ProxyMiddleware = (
  req: unknown,
  res: unknown,
  next: (err?: unknown) => void,
) => void;

export interface MagicHttpConfig {
  readonly port: number;
  readonly enabled: boolean;
  readonly middlewares: readonly ProxyMiddleware[];
  readonly start_callback: () => void;
}

export interface MagicHttpsConfig {
  readonly port: number;
  readonly enabled: boolean;
  readonly middlewares: readonly ProxyMiddleware[];
  readonly start_callback: () => void;
  readonly sslkey: string;
  readonly sslcert: string;
}

/**
 * Virtual-host route definition.
 * `round` is the initial Round-Robin cursor (0-based); runtime state is not mutated on this object.
 */
export interface MagicProxyDefinition {
  readonly domain: string;
  readonly round: number;
  readonly timeout: number;
  readonly destination: readonly string[];
  readonly sockDestination: readonly string[];
}

export interface ProxyConfig {
  /**
   * When true on the HTTP listener, redirect non-HTTPS requests to HTTPS
   * (legacy flag name from v2; also sets Strict-Transport-Security on HTTPS responses).
   */
  readonly enable_hsts: boolean;
  /** When false, connections whose Host does not match any `proxies` entry are dropped. */
  readonly allow_unknown_host: boolean;
  /** When true, WebSocket upgrades are proxied via `sockDestination`. */
  readonly allow_websockets: boolean;
  readonly http: MagicHttpConfig;
  readonly https: MagicHttpsConfig;
  readonly proxies: readonly MagicProxyDefinition[];
  readonly default_proxy: MagicProxyDefinition;
}

/** Deep-partial input accepted by {@link createProxy}. */
export type ProxyConfigInput = {
  readonly enable_hsts?: boolean;
  readonly allow_unknown_host?: boolean;
  readonly allow_websockets?: boolean;
  readonly http?: Partial<MagicHttpConfig>;
  readonly https?: Partial<MagicHttpsConfig>;
  readonly proxies?: readonly Partial<MagicProxyDefinition>[];
  readonly default_proxy?: Partial<MagicProxyDefinition>;
};

export interface ProxyTrigger {
  readonly app: Express;
  readonly appssl: Express;
  readonly config: ProxyConfig;
  readonly httpServer: HttpServer | undefined;
  readonly httpsServer: HttpsServer | undefined;
  readonly bind: () => void;
  readonly unbind: () => void;
}
