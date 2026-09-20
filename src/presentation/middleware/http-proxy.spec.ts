import { describe, expect, it, vi } from 'vitest';
import { createBalancerRegistry } from '@/application/balancing/round-robin.js';
import { resolveConfig } from '@/application/config/resolve.js';
import type { ProxyClient } from '@/infrastructure/proxy/http-proxy-client.js';
import { createHttpProxyMiddleware } from './http-proxy.js';
import {
  createMockResponse,
  fakeIncomingMessage,
} from '../../../tests/helpers/mocks.js';

function stubClient(
  overrides: Partial<ProxyClient> = {},
): ProxyClient {
  return {
    web: vi.fn(),
    ws: vi.fn(),
    close: vi.fn(),
    ...overrides,
  };
}

describe('createHttpProxyMiddleware', () => {
  it('proxies to the balanced upstream target', () => {
    const config = resolveConfig({
      routes: [
        {
          host: 'app.test',
          targets: ['http://127.0.0.1:3001', 'http://127.0.0.1:3002'],
        },
      ],
      policy: { allowUnknownHosts: false },
    });
    const client = stubClient();
    const middleware = createHttpProxyMiddleware(
      config,
      client,
      createBalancerRegistry(),
    );
    const res = createMockResponse();

    middleware(
      fakeIncomingMessage({ host: 'app.test' }, { url: '/x' }),
      res,
      () => undefined,
    );

    expect(client.web).toHaveBeenCalledOnce();
    expect(vi.mocked(client.web).mock.calls[0]?.[2]).toBe(
      'http://127.0.0.1:3001',
    );
  });

  it('returns 502 when no route matches', () => {
    const config = resolveConfig({
      routes: [{ host: 'only.test', targets: ['http://127.0.0.1:1'] }],
      policy: { allowUnknownHosts: false },
    });
    const middleware = createHttpProxyMiddleware(
      config,
      stubClient(),
      createBalancerRegistry(),
    );
    const res = createMockResponse();
    middleware(
      fakeIncomingMessage({ host: 'other.test' }),
      res,
      () => undefined,
    );
    expect(res.statusCode).toBe(502);
  });

  it('returns 502 when the route has no HTTP targets', () => {
    const config = resolveConfig({
      routes: [{ host: 'app.test', targets: [] }],
      policy: { allowUnknownHosts: false },
    });
    const middleware = createHttpProxyMiddleware(
      config,
      stubClient(),
      createBalancerRegistry(),
    );
    const res = createMockResponse();
    middleware(
      fakeIncomingMessage({ host: 'app.test' }),
      res,
      () => undefined,
    );
    expect(res.statusCode).toBe(502);
  });

  it('maps client errors to 502 once', () => {
    const config = resolveConfig({
      routes: [{ host: 'app.test', targets: ['http://127.0.0.1:1'] }],
    });
    const client = stubClient({
      web: (_req, _res, _target, _timeout, onError) => {
        onError(new Error('down'));
        onError(new Error('down-again'));
      },
    });
    const middleware = createHttpProxyMiddleware(
      config,
      client,
      createBalancerRegistry(),
    );
    const res = createMockResponse();
    middleware(
      fakeIncomingMessage({ host: 'app.test' }),
      res,
      () => undefined,
    );
    expect(res.statusCode).toBe(502);
    expect(Buffer.concat(res.body).toString('utf8')).toContain('502');
  });
});
