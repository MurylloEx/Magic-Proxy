import Express, { type RequestHandler } from 'express';
import type { Server as HttpServer } from 'node:http';
import type { Server as HttpsServer } from 'node:https';
import {
  applyMiddlewareChain,
  createBalancerRegistry,
  validateConfig,
} from '@/application/index.js';
import type { MagicProxyConfig, MagicProxyInstance } from '@/domain/types.js';
import {
  closeServers,
  createProxyClient,
  startServers,
  type BoundServers,
} from '@/infrastructure/index.js';
import { createBlockUnknownHostsMiddleware } from '@/presentation/middleware/block-unknown-hosts.js';
import {
  createForceHttpsMiddleware,
  createHstsHeaderMiddleware,
} from '@/presentation/middleware/force-https.js';
import { createHttpProxyMiddleware } from '@/presentation/middleware/http-proxy.js';
import { createWebSocketProxyHandler } from '@/presentation/middleware/websocket-proxy.js';

function asRequestHandlers(
  middlewares: readonly unknown[],
): readonly RequestHandler[] {
  return middlewares as readonly RequestHandler[];
}

function buildListenerPipeline(
  config: MagicProxyConfig,
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
    ...(!config.policy.allowUnknownHosts
      ? [createBlockUnknownHostsMiddleware(config)]
      : []),
    ...(options.forceHttpsRedirect
      ? [
          createForceHttpsMiddleware(config.policy.hstsMaxAgeSeconds),
        ]
      : []),
    ...(options.attachHstsHeader &&
    config.policy.hstsMaxAgeSeconds !== undefined
      ? [createHstsHeaderMiddleware(config.policy.hstsMaxAgeSeconds)]
      : []),
    createHttpProxyMiddleware(config, client, balancers),
  ];
}

/**
 * Materialize a validated config into a runnable proxy instance.
 */
export function createMagicProxyInstance(
  config: MagicProxyConfig,
): MagicProxyInstance {
  validateConfig(config);

  const httpApp = Express();
  const httpsApp = Express();
  const client = createProxyClient();
  const balancers = createBalancerRegistry(config.balancerStrategy);

  const servers: {
    httpServer: HttpServer | undefined;
    httpsServer: HttpsServer | undefined;
  } = {
    httpServer: undefined,
    httpsServer: undefined,
  };

  const mounted = { value: false };

  const listen = (): void => {
    if (mounted.value) {
      return;
    }

    if (config.http.enabled) {
      applyMiddlewareChain(
        httpApp,
        buildListenerPipeline(
          config,
          client,
          balancers,
          config.http.middlewares,
          {
            forceHttpsRedirect: config.policy.forceHttpsRedirect,
            attachHstsHeader: false,
          },
        ),
      );
    }

    if (config.https.enabled) {
      applyMiddlewareChain(
        httpsApp,
        buildListenerPipeline(
          config,
          client,
          balancers,
          config.https.middlewares,
          {
            forceHttpsRedirect: false,
            attachHstsHeader: true,
          },
        ),
      );
    }

    const bound: BoundServers = startServers(config, httpApp, httpsApp);
    servers.httpServer = bound.httpServer;
    servers.httpsServer = bound.httpsServer;

    const upgrade = createWebSocketProxyHandler(config, client, balancers);
    bound.httpServer?.on('upgrade', upgrade);
    bound.httpsServer?.on('upgrade', upgrade);

    mounted.value = true;
  };

  const close = (): void => {
    closeServers({
      httpServer: servers.httpServer,
      httpsServer: servers.httpsServer,
    });
    client.close();
    servers.httpServer = undefined;
    servers.httpsServer = undefined;
    mounted.value = false;
  };

  return {
    config,
    httpApp,
    httpsApp,
    get httpServer() {
      return servers.httpServer;
    },
    get httpsServer() {
      return servers.httpsServer;
    },
    listen,
    close,
  };
}
