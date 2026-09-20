import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveConfig } from '@/application/config/resolve.js';
import {
  closeServers,
  createRequestListener,
  runMiddlewareChain,
  startServers,
} from './servers.js';
import { createMockResponse, fakeIncomingMessage } from '../../../tests/helpers/mocks.js';
import {
  createCleanupStack,
  createEphemeralTlsMaterial,
  freePort,
  readBody,
} from '../../../tests/helpers/net.js';

describe('runMiddlewareChain', () => {
  it('runs middlewares in order and stops when one ends the response', () => {
    const calls: number[] = [];
    const res = createMockResponse();

    runMiddlewareChain(
      [
        (_req, _res, next) => {
          calls.push(1);
          next();
        },
        (_req, response, _next) => {
          calls.push(2);
          response.statusCode = 204;
          response.end();
        },
        () => {
          calls.push(3);
        },
      ],
      fakeIncomingMessage({ host: 'a' }),
      res,
    );

    expect(calls).toEqual([1, 2]);
    expect(res.statusCode).toBe(204);
  });

  it('returns 404 when the chain completes without writing', () => {
    const res = createMockResponse();
    runMiddlewareChain([], fakeIncomingMessage({ host: 'a' }), res);
    expect(res.statusCode).toBe(404);
    expect(res.ended).toBe(true);
  });

  it('returns 500 when a middleware calls next(err)', () => {
    const res = createMockResponse();
    runMiddlewareChain(
      [
        (_req, _res, next) => {
          next(new Error('boom'));
        },
      ],
      fakeIncomingMessage({ host: 'a' }),
      res,
    );
    expect(res.statusCode).toBe(500);
  });

  it('ignores a second next() call from the same middleware', () => {
    const calls: number[] = [];
    const res = createMockResponse();
    runMiddlewareChain(
      [
        (_req, _res, next) => {
          next();
          next();
        },
        () => {
          calls.push(1);
          res.end('done');
        },
      ],
      fakeIncomingMessage({ host: 'a' }),
      res,
    );
    expect(calls).toEqual([1]);
  });
});

describe('createRequestListener / startServers', () => {
  const cleanups = createCleanupStack();

  afterEach(async () => {
    await cleanups.drain();
  });

  it('binds an HTTP listener that serves the middleware chain', async () => {
    const port = await freePort();
    const listener = createRequestListener([
      (_req, res) => {
        res.statusCode = 200;
        res.end('hello');
      },
    ]);
    const config = resolveConfig({
      http: { port, enabled: true },
      https: { enabled: false },
    });
    const bound = startServers(config, listener, undefined);
    cleanups.push(async () => {
      closeServers(bound);
    });

    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path: '/' },
        resolve,
      );
      req.on('error', reject);
      req.end();
    });

    expect(response.statusCode).toBe(200);
    expect(await readBody(response)).toBe('hello');
  });

  it('binds an HTTPS listener with ephemeral certificates', async () => {
    const port = await freePort();
    const tls = createEphemeralTlsMaterial();
    const listener = createRequestListener([
      (_req, res) => {
        res.statusCode = 200;
        res.end('secure');
      },
    ]);
    const config = resolveConfig({
      http: { enabled: false },
      https: {
        enabled: true,
        port,
        key: tls.key,
        cert: tls.cert,
      },
    });
    const bound = startServers(config, undefined, listener);
    cleanups.push(async () => {
      closeServers(bound);
    });

    expect(bound.httpsServer).toBeTruthy();
  });
});
