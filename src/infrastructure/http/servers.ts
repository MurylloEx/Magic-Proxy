import http, {
  type IncomingMessage,
  type RequestListener,
  type Server as HttpServer,
  type ServerResponse,
} from 'node:http';
import https, { type Server as HttpsServer } from 'node:https';
import type { MagicProxyConfig, ProxyMiddleware } from '@/domain/types.js';

export interface BoundServers {
  readonly httpServer: HttpServer | undefined;
  readonly httpsServer: HttpsServer | undefined;
}

/**
 * Run a Connect-style middleware chain against a Node request/response pair.
 */
export function runMiddlewareChain(
  middlewares: readonly ProxyMiddleware[],
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const dispatch = (index: number): void => {
    if (index >= middlewares.length) {
      if (!res.writableEnded) {
        res.statusCode = 404;
        res.end();
      }
      return;
    }

    const middleware = middlewares[index];
    if (!middleware) {
      dispatch(index + 1);
      return;
    }

    const advanced = { value: false };
    middleware(req, res, (err?: unknown) => {
      if (advanced.value) {
        return;
      }
      advanced.value = true;

      if (err) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end();
        } else {
          res.destroy();
        }
        return;
      }

      dispatch(index + 1);
    });
  };

  dispatch(0);
}

export function createRequestListener(
  middlewares: readonly ProxyMiddleware[],
): RequestListener {
  return (req, res) => {
    runMiddlewareChain(middlewares, req, res);
  };
}

/**
 * Create and listen on configured HTTP/HTTPS servers.
 */
export function startServers(
  config: MagicProxyConfig,
  httpListener: RequestListener | undefined,
  httpsListener: RequestListener | undefined,
): BoundServers {
  const httpServer =
    config.http.enabled && httpListener
      ? http.createServer(httpListener).listen(config.http.port, config.http.onListen)
      : undefined;

  const httpsServer =
    config.https.enabled && httpsListener
      ? https
          .createServer(
            {
              key: config.https.key,
              cert: config.https.cert,
            },
            httpsListener,
          )
          .listen(config.https.port, config.https.onListen)
      : undefined;

  return { httpServer, httpsServer };
}

export function closeServers(servers: BoundServers): void {
  servers.httpServer?.close();
  servers.httpsServer?.close();
}
