import type { NextFunction, Request, Response } from 'express';
import { isKnownHost } from '@/application/routing/host-router.js';
import type { ProxyConfig } from '@/domain/types.js';

/**
 * Drop connections whose Host does not match any configured proxy domain.
 */
export function createBlockUnknownHostsMiddleware(
  config: ProxyConfig,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const hostname = req.hostname;
    if (isKnownHost(config.proxies, hostname)) {
      next();
      return;
    }

    req.socket.destroy();
  };
}
