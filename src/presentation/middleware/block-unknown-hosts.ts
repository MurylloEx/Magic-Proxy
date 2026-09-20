import type { NextFunction, Request, Response } from 'express';
import { isKnownHost } from '#src/application/routing/host-router.js';
import type { MagicProxyConfig } from '#src/domain/types.js';

/**
 * Drop connections whose Host does not match any configured route.
 */
export function createBlockUnknownHostsMiddleware(
  config: MagicProxyConfig,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (isKnownHost(config.routes, req.hostname)) {
      next();
      return;
    }

    req.socket.destroy();
  };
}
