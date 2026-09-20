import type { IncomingMessage, ServerResponse } from 'node:http';
import type { BalancerRegistry } from '@/application/balancing/round-robin.js';
import { resolveHostRoute } from '@/application/routing/host-router.js';
import type { MagicProxyConfig, ProxyMiddleware } from '@/domain/types.js';
import { sendBadGateway } from '@/infrastructure/proxy/bad-gateway.js';
import type { ProxyClient } from '@/infrastructure/proxy/http-proxy-client.js';

/**
 * Terminal middleware that reverse-proxies HTTP to the matched upstream.
 */
export function createHttpProxyMiddleware(
  config: MagicProxyConfig,
  client: ProxyClient,
  balancers: BalancerRegistry,
): ProxyMiddleware {
  return (req: IncomingMessage, res: ServerResponse, _next): void => {
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
