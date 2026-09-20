import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type { BalancerRegistry } from '@/application/balancing/round-robin.js';
import { resolveHostRoute } from '@/application/routing/host-router.js';
import type { MagicProxyConfig } from '@/domain/types.js';
import type { ProxyClient } from '@/infrastructure/proxy/http-proxy-client.js';

export type UpgradeHandler = (
  req: IncomingMessage,
  socket: Socket,
  head: Buffer,
) => void;

/**
 * HTTP `upgrade` listener that reverse-proxies WebSocket connections.
 */
export function createWebSocketProxyHandler(
  config: MagicProxyConfig,
  client: ProxyClient,
  balancers: BalancerRegistry,
): UpgradeHandler {
  return (req: IncomingMessage, socket: Socket, head: Buffer): void => {
    if (!config.policy.allowWebSockets) {
      socket.destroy();
      return;
    }

    const resolved = resolveHostRoute(config, req);
    if (!resolved) {
      socket.destroy();
      return;
    }

    const target = balancers.pick(
      resolved.key,
      'websocket',
      resolved.route.websocketTargets,
      resolved.route.initialIndex,
    );

    if (!target) {
      socket.destroy();
      return;
    }

    client.ws(req, socket, head, target, resolved.route.timeoutMs, () => {
      socket.destroy();
    });
  };
}
