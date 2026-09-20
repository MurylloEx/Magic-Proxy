import http, { type Server as HttpServer } from 'node:http';
import https, { type Server as HttpsServer } from 'node:https';
import type { Express } from 'express';
import type { MagicProxyConfig } from '../../domain/types.js';

export interface BoundServers {
  readonly httpServer: HttpServer | undefined;
  readonly httpsServer: HttpsServer | undefined;
}

/**
 * Create and listen on configured HTTP/HTTPS servers.
 * Middleware must already be mounted on the Express apps before calling this.
 */
export function startServers(
  config: MagicProxyConfig,
  httpApp: Express,
  httpsApp: Express,
): BoundServers {
  const httpServer = config.http.enabled
    ? http.createServer(httpApp).listen(config.http.port, config.http.onListen)
    : undefined;

  const httpsServer = config.https.enabled
    ? https
        .createServer(
          {
            key: config.https.key,
            cert: config.https.cert,
          },
          httpsApp,
        )
        .listen(config.https.port, config.https.onListen)
    : undefined;

  return { httpServer, httpsServer };
}

export function closeServers(servers: BoundServers): void {
  servers.httpServer?.close();
  servers.httpsServer?.close();
}
