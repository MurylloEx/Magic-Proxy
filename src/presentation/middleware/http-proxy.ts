import type { NextFunction, Request, Response } from 'express';
import type { BalancerRegistry } from '../../application/balancing/round-robin.js';
import { resolveHostRoute } from '../../application/routing/host-router.js';
import type { MagicProxyConfig } from '../../domain/types.js';
import { sendBadGateway } from '../../infrastructure/proxy/bad-gateway.js';
import type { ProxyClient } from '../../infrastructure/proxy/http-proxy-client.js';

/**
 * Terminal Express middleware that reverse-proxies HTTP to the matched upstream.
 */
export function createHttpProxyMiddleware(
  config: MagicProxyConfig,
  client: ProxyClient,
  balancers: BalancerRegistry,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, _next: NextFunction): void => {
    const resolved = resolveHostRoute(config, req);

    if (!resolved) {
      sendBadGateway(res);
      return;
    }

    const target = balancers.pick(
      resolved.key,
      'http',
      resolved.route.targets,
      resolved.route.initialIndex,
    );

    if (!target) {
      sendBadGateway(res);
      return;
    }

    const replied = { value: false };

    client.web(req, res, target, resolved.route.timeoutMs, () => {
      if (replied.value) {
        return;
      }
      replied.value = true;
      sendBadGateway(res);
    });
  };
}
