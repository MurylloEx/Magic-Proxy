import Express, { type RequestHandler } from 'express';
import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import {
  applyMiddlewareChain,
  createBalancerRegistry,
  resolveConfig,
  validateConfig,
} from '@/application/index.js';
import type { ProxyConfigInput, ProxyTrigger } from '@/domain/types.js';
import {
  bindServers,
  createProxyClient,
  unbindServers,
  type BoundServers,
} from '@/infrastructure/index.js';
import { createBlockUnknownHostsMiddleware } from './middleware/block-unknown-hosts.js';
import { forceHttpsMiddleware } from './middleware/force-https.js';
import { createHttpProxyMiddleware } from './middleware/http-proxy.js';
import { createWebSocketProxyHandler } from './middleware/websocket-proxy.js';

const HSTS_VALUE = 'max-age=31536000; includeSubDomains';

function asRequestHandlers(
  middlewares: readonly unknown[],
): readonly RequestHandler[] {
  return middlewares as readonly RequestHandler[];
}

const attachHstsHeader: RequestHandler = (_req, res, next) => {
  res.setHeader('Strict-Transport-Security', HSTS_VALUE);
  next();
};

function buildListenerPipeline(
  config: ReturnType<typeof resolveConfig>,
  client: ReturnType<typeof createProxyClient>,
  balancers: ReturnType<typeof createBalancerRegistry>,
  userMiddlewares: readonly unknown[],
  options: {
    readonly forceHttpsRedirect: boolean;
    readonly attachHstsHeader: boolean;
  },
): readonly RequestHandler[] {
  return [
    ...asRequestHandlers(userMiddlewares),
    ...(!config.allow_unknown_host
      ? [createBlockUnknownHostsMiddleware(config)]
      : []),
    ...(options.forceHttpsRedirect ? [forceHttpsMiddleware] : []),
    ...(options.attachHstsHeader ? [attachHstsHeader] : []),
    createHttpProxyMiddleware(config, client, balancers),
  ];
}

/**
 * Factory: create a Magic Proxy instance from optional configuration.
 *
 * Public surface is intentionally close to v2 (`createProxy` / `bind` / `unbind`)
 * so existing consumers can migrate with minimal changes.
 */
export function createProxy(options?: ProxyConfigInput): ProxyTrigger {
  const config = resolveConfig(options);
  validateConfig(config);

  const app = Express();
  const appssl = Express();
  const client = createProxyClient();
  const balancers = createBalancerRegistry();

  const servers: {
    httpServer: HttpServer | undefined;
    httpsServer: HttpsServer | undefined;
  } = {
    httpServer: undefined,
    httpsServer: undefined,
  };

  const mounted = { value: false };

  const bind = (): void => {
    if (mounted.value) {
      return;
    }

    if (config.http.enabled) {
      applyMiddlewareChain(
        app,
        buildListenerPipeline(
          config,
          client,
          balancers,
          config.http.middlewares,
          {
            forceHttpsRedirect: config.enable_hsts,
            attachHstsHeader: false,
          },
        ),
      );
    }

    if (config.https.enabled) {
      applyMiddlewareChain(
        appssl,
        buildListenerPipeline(
          config,
          client,
          balancers,
          config.https.middlewares,
          {
            forceHttpsRedirect: false,
            attachHstsHeader: config.enable_hsts,
          },
        ),
      );
    }

    const bound: BoundServers = bindServers(config, app, appssl);
    servers.httpServer = bound.httpServer;
    servers.httpsServer = bound.httpsServer;

    const upgrade = createWebSocketProxyHandler(config, client, balancers);
    bound.httpServer?.on('upgrade', upgrade);
    bound.httpsServer?.on('upgrade', upgrade);

    mounted.value = true;
  };

  const unbind = (): void => {
    unbindServers({
      httpServer: servers.httpServer,
      httpsServer: servers.httpsServer,
    });
    client.close();
    servers.httpServer = undefined;
    servers.httpsServer = undefined;
    mounted.value = false;
  };

  return {
    app,
    appssl,
    config,
    get httpServer() {
      return servers.httpServer;
    },
    get httpsServer() {
      return servers.httpsServer;
    },
    bind,
    unbind,
  };
}
