import type { IncomingMessage, ServerResponse } from 'node:http';
import { isKnownHost } from '@/application/routing/host-router.js';
import { parseHostname } from '@/domain/hostname.js';
import type { MagicProxyConfig, ProxyMiddleware } from '@/domain/types.js';

/**
 * Drop connections whose Host does not match any configured route.
 */
export function createBlockUnknownHostsMiddleware(
  config: MagicProxyConfig,
): ProxyMiddleware {
  return (req: IncomingMessage, _res: ServerResponse, next): void => {
    const hostname = parseHostname(req);
    if (hostname && isKnownHost(config.routes, hostname)) {
      next();
      return;
    }

    req.socket.destroy();
  };
}
