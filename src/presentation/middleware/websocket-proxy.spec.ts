import { describe, expect, it, vi } from 'vitest';
import { createBalancerRegistry } from '@/application/balancing/round-robin.js';
import { resolveConfig } from '@/application/config/resolve.js';
import type { ProxyClient } from '@/infrastructure/proxy/http-proxy-client.js';
import { createWebSocketProxyHandler } from './websocket-proxy.js';
import {
  createMockSocket,
  fakeIncomingMessage,
} from '../../../tests/helpers/mocks.js';

function stubClient(overrides: Partial<ProxyClient> = {}): ProxyClient {
  return {
    web: vi.fn(),
    ws: vi.fn(),
    close: vi.fn(),
    ...overrides,
  };
}

describe('createWebSocketProxyHandler', () => {
  it('destroys the socket when WebSockets are disabled', () => {
    const config = resolveConfig({
      policy: { allowWebSockets: false },
      routes: [
        {
          host: 'app.test',
          targets: ['http://127.0.0.1:1'],
          websocketTargets: ['ws://127.0.0.1:1'],
        },
      ],
    });
    const socket = createMockSocket();
    createWebSocketProxyHandler(config, stubClient(), createBalancerRegistry())(
      fakeIncomingMessage({ host: 'app.test' }),
      socket,
      Buffer.alloc(0),
    );
    expect(socket.destroyedFlag.value).toBe(true);
  });

  it('proxies upgrades to the selected websocket target', () => {
    const config = resolveConfig({
      policy: { allowWebSockets: true },
      routes: [
        {
          host: 'app.test',
          targets: ['http://127.0.0.1:1'],
          websocketTargets: ['ws://127.0.0.1:3001', 'ws://127.0.0.1:3002'],
        },
      ],
    });
    const client = stubClient();
    const socket = createMockSocket();
    createWebSocketProxyHandler(config, client, createBalancerRegistry())(
      fakeIncomingMessage({ host: 'app.test' }),
      socket,
      Buffer.from('head'),
    );

    expect(client.ws).toHaveBeenCalledOnce();
    expect(vi.mocked(client.ws).mock.calls[0]?.[3]).toBe('ws://127.0.0.1:3001');
  });

  it('destroys the socket when no websocket targets exist', () => {
    const config = resolveConfig({
      policy: { allowWebSockets: true },
      routes: [
        {
          host: 'app.test',
          targets: ['http://127.0.0.1:1'],
          websocketTargets: [],
        },
      ],
    });
    const socket = createMockSocket();
    createWebSocketProxyHandler(config, stubClient(), createBalancerRegistry())(
      fakeIncomingMessage({ host: 'app.test' }),
      socket,
      Buffer.alloc(0),
    );
    expect(socket.destroyedFlag.value).toBe(true);
  });

  it('destroys the socket when the client reports an error', () => {
    const config = resolveConfig({
      policy: { allowWebSockets: true },
      routes: [
        {
          host: 'app.test',
          targets: ['http://127.0.0.1:1'],
          websocketTargets: ['ws://127.0.0.1:1'],
        },
      ],
    });
    const socket = createMockSocket();
    const client = stubClient({
      ws: (_req, _socket, _head, _target, _timeout, onError) => {
        onError(new Error('fail'));
      },
    });
    createWebSocketProxyHandler(config, client, createBalancerRegistry())(
      fakeIncomingMessage({ host: 'app.test' }),
      socket,
      Buffer.alloc(0),
    );
    expect(socket.destroyedFlag.value).toBe(true);
  });
});
