import type {
  BalancerStrategy,
  HostPattern,
  HttpListenerConfig,
  HttpsListenerConfig,
  MagicProxyConfig,
  MagicProxyInstance,
  MagicProxyOptions,
  ProxyMiddleware,
  RouteConfig,
  SecurityPolicy,
} from '#src/domain/types.js';
import {
  DEFAULT_BALANCER_STRATEGY,
  DEFAULT_PROXY_CONFIG,
  DEFAULT_ROUTE,
} from '#src/application/config/defaults.js';
import { resolveConfig } from '#src/application/config/resolve.js';
import { createMagicProxyInstance } from './magic-proxy-instance.js';

const DEFAULT_HSTS_MAX_AGE = 31_536_000;

type BuilderState = {
  readonly http: HttpListenerConfig;
  readonly https: HttpsListenerConfig;
  readonly routes: readonly RouteConfig[];
  readonly fallback: RouteConfig;
  readonly policy: SecurityPolicy;
  readonly balancerStrategy: BalancerStrategy;
};

type RouteDraft = {
  readonly host: HostPattern;
  readonly targets: readonly string[];
  readonly websocketTargets: readonly string[];
  readonly timeoutMs: number;
  readonly initialIndex: number;
  readonly isFallback: boolean;
};

function freezeRoute(draft: RouteDraft): RouteConfig {
  return {
    host: draft.host,
    targets: Object.freeze([...draft.targets]),
    websocketTargets: Object.freeze([...draft.websocketTargets]),
    timeoutMs: draft.timeoutMs,
    initialIndex: draft.initialIndex,
  };
}

function toConfig(state: BuilderState): MagicProxyConfig {
  return Object.freeze({
    http: {
      ...state.http,
      middlewares: Object.freeze([...state.http.middlewares]),
    },
    https: {
      ...state.https,
      middlewares: Object.freeze([...state.https.middlewares]),
    },
    routes: Object.freeze([...state.routes]),
    fallback: freezeRoute({ ...state.fallback, isFallback: true }),
    policy: { ...state.policy },
    balancerStrategy: state.balancerStrategy,
  });
}

function initialState(): BuilderState {
  return {
    http: { ...DEFAULT_PROXY_CONFIG.http, middlewares: [] },
    https: { ...DEFAULT_PROXY_CONFIG.https, middlewares: [] },
    routes: [],
    fallback: { ...DEFAULT_ROUTE },
    policy: { ...DEFAULT_PROXY_CONFIG.policy },
    balancerStrategy: DEFAULT_BALANCER_STRATEGY,
  };
}

/**
 * Nested fluent configurator for a single virtual-host route.
 * Each method returns a new immutable builder snapshot.
 */
export class RouteBuilder {
  constructor(
    private readonly parent: BuilderState,
    private readonly draft: RouteDraft,
  ) {}

  /** Set HTTP upstream targets (Round-Robin across the list). */
  to(...targets: string[]): RouteBuilder {
    return new RouteBuilder(this.parent, {
      ...this.draft,
      targets: Object.freeze([...targets]),
    });
  }

  /** Set WebSocket upstream targets. */
  websockets(...targets: string[]): RouteBuilder {
    return new RouteBuilder(this.parent, {
      ...this.draft,
      websocketTargets: Object.freeze([...targets]),
    });
  }

  /** Upstream connect timeout in milliseconds. */
  timeout(timeoutMs: number): RouteBuilder {
    return new RouteBuilder(this.parent, { ...this.draft, timeoutMs });
  }

  /** Initial load-balancer cursor (0-based). */
  startAt(initialIndex: number): RouteBuilder {
    return new RouteBuilder(this.parent, { ...this.draft, initialIndex });
  }

  /** Commit this route and start configuring another host. */
  route(host: HostPattern): RouteBuilder {
    return this.commit().route(host);
  }

  /** Commit this route and configure the fallback (unknown Host) route. */
  fallback(): RouteBuilder {
    return this.commit().fallback();
  }

  allowUnknownHosts(allow: boolean): MagicProxyBuilder {
    return this.commit().allowUnknownHosts(allow);
  }

  allowWebSockets(allow: boolean): MagicProxyBuilder {
    return this.commit().allowWebSockets(allow);
  }

  forceHttps(enabled = true): MagicProxyBuilder {
    return this.commit().forceHttps(enabled);
  }

  hsts(maxAgeSeconds: number | false = DEFAULT_HSTS_MAX_AGE): MagicProxyBuilder {
    return this.commit().hsts(maxAgeSeconds);
  }

  balancer(strategy: BalancerStrategy): MagicProxyBuilder {
    return this.commit().balancer(strategy);
  }

  useHttp(...middlewares: ProxyMiddleware[]): MagicProxyBuilder {
    return this.commit().useHttp(...middlewares);
  }

  useHttps(...middlewares: ProxyMiddleware[]): MagicProxyBuilder {
    return this.commit().useHttps(...middlewares);
  }

  /** Commit the route and return the parent builder. */
  done(): MagicProxyBuilder {
    return this.commit();
  }

  build(): MagicProxyInstance {
    return this.commit().build();
  }

  private commit(): MagicProxyBuilder {
    const route = freezeRoute(this.draft);
    const nextState: BuilderState = this.draft.isFallback
      ? { ...this.parent, fallback: route }
      : { ...this.parent, routes: [...this.parent.routes, route] };
    return new MagicProxyBuilder(nextState);
  }
}

/**
 * Immutable fluent builder for {@link MagicProxyInstance}.
 */
export class MagicProxyBuilder {
  constructor(private readonly state: BuilderState = initialState()) {}

  http(
    options: Partial<Omit<HttpListenerConfig, 'middlewares' | 'enabled'>> & {
      readonly middlewares?: readonly ProxyMiddleware[];
      readonly enabled?: boolean;
    } = {},
  ): MagicProxyBuilder {
    return new MagicProxyBuilder({
      ...this.state,
      http: {
        ...this.state.http,
        ...options,
        enabled: options.enabled ?? true,
        middlewares: Object.freeze([
          ...(options.middlewares ?? this.state.http.middlewares),
        ]),
        onListen: options.onListen ?? this.state.http.onListen,
      },
    });
  }

  https(
    options: Partial<Omit<HttpsListenerConfig, 'middlewares' | 'enabled'>> & {
      readonly key: string;
      readonly cert: string;
      readonly middlewares?: readonly ProxyMiddleware[];
      readonly enabled?: boolean;
    },
  ): MagicProxyBuilder {
    return new MagicProxyBuilder({
      ...this.state,
      https: {
        ...this.state.https,
        ...options,
        enabled: options.enabled ?? true,
        middlewares: Object.freeze([
          ...(options.middlewares ?? this.state.https.middlewares),
        ]),
        onListen: options.onListen ?? this.state.https.onListen,
        key: options.key,
        cert: options.cert,
      },
    });
  }

  /** Append middleware to the HTTP listener pipeline. */
  useHttp(...middlewares: ProxyMiddleware[]): MagicProxyBuilder {
    return new MagicProxyBuilder({
      ...this.state,
      http: {
        ...this.state.http,
        middlewares: Object.freeze([
          ...this.state.http.middlewares,
          ...middlewares,
        ]),
      },
    });
  }

  /** Append middleware to the HTTPS listener pipeline. */
  useHttps(...middlewares: ProxyMiddleware[]): MagicProxyBuilder {
    return new MagicProxyBuilder({
      ...this.state,
      https: {
        ...this.state.https,
        middlewares: Object.freeze([
          ...this.state.https.middlewares,
          ...middlewares,
        ]),
      },
    });
  }

  /** Begin configuring a virtual-host route. */
  route(host: HostPattern): RouteBuilder {
    return new RouteBuilder(this.state, {
      host,
      targets: [],
      websocketTargets: [],
      timeoutMs: DEFAULT_ROUTE.timeoutMs,
      initialIndex: DEFAULT_ROUTE.initialIndex,
      isFallback: false,
    });
  }

  /** Begin configuring the fallback route used when `allowUnknownHosts` is true. */
  fallback(): RouteBuilder {
    return new RouteBuilder(this.state, {
      host: '*',
      targets: [],
      websocketTargets: [],
      timeoutMs: DEFAULT_ROUTE.timeoutMs,
      initialIndex: DEFAULT_ROUTE.initialIndex,
      isFallback: true,
    });
  }

  allowUnknownHosts(allow: boolean): MagicProxyBuilder {
    return new MagicProxyBuilder({
      ...this.state,
      policy: { ...this.state.policy, allowUnknownHosts: allow },
    });
  }

  allowWebSockets(allow: boolean): MagicProxyBuilder {
    return new MagicProxyBuilder({
      ...this.state,
      policy: { ...this.state.policy, allowWebSockets: allow },
    });
  }

  /**
   * Redirect HTTP → HTTPS on the HTTP listener.
   * Also enables a default HSTS max-age when none is set yet.
   */
  forceHttps(enabled = true): MagicProxyBuilder {
    return new MagicProxyBuilder({
      ...this.state,
      policy: {
        ...this.state.policy,
        forceHttpsRedirect: enabled,
        hstsMaxAgeSeconds:
          enabled && this.state.policy.hstsMaxAgeSeconds === undefined
            ? DEFAULT_HSTS_MAX_AGE
            : this.state.policy.hstsMaxAgeSeconds,
      },
    });
  }

  /**
   * Set (or disable) the Strict-Transport-Security max-age.
   * Pass `false` to omit the header.
   */
  hsts(maxAgeSeconds: number | false = DEFAULT_HSTS_MAX_AGE): MagicProxyBuilder {
    return new MagicProxyBuilder({
      ...this.state,
      policy: {
        ...this.state.policy,
        hstsMaxAgeSeconds: maxAgeSeconds === false ? undefined : maxAgeSeconds,
      },
    });
  }

  balancer(strategy: BalancerStrategy): MagicProxyBuilder {
    return new MagicProxyBuilder({
      ...this.state,
      balancerStrategy: strategy,
    });
  }

  build(): MagicProxyInstance {
    return createMagicProxyInstance(toConfig(this.state));
  }
}

/**
 * Primary entry point for Magic Proxy v4.
 *
 * @example Fluent
 * ```ts
 * const proxy = MagicProxy.create()
 *   .http({ port: 8080 })
 *   .route('api.localhost').to('http://127.0.0.1:3000')
 *   .allowUnknownHosts(false)
 *   .build();
 * proxy.listen();
 * ```
 *
 * @example Declarative
 * ```ts
 * const proxy = MagicProxy.from({
 *   http: { port: 8080 },
 *   routes: [{ host: 'api.localhost', targets: ['http://127.0.0.1:3000'] }],
 *   policy: { allowUnknownHosts: false },
 * });
 * ```
 */
export const MagicProxy = {
  create(): MagicProxyBuilder {
    return new MagicProxyBuilder();
  },

  from(options: MagicProxyOptions): MagicProxyInstance {
    return createMagicProxyInstance(resolveConfig(options));
  },
} as const;
