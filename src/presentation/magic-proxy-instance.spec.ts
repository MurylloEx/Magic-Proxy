import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { MagicProxy } from './builder.js';
import { createMagicProxyInstance } from './magic-proxy-instance.js';
import { resolveConfig } from '@/application/config/resolve.js';
import {
  createCleanupStack,
  freePort,
  listenHttp,
  readBody,
} from '../../tests/helpers/net.js';

describe('createMagicProxyInstance', () => {
  const cleanups = createCleanupStack();

  afterEach(async () => {
    await cleanups.drain();
  });

  it('starts and closes HTTP servers via listen/close', async () => {
    const upstream = http.createServer((_req, res) => {
      res.end('up');
    });
    const upstreamBound = await listenHttp(upstream);
    cleanups.push(upstreamBound.close);

    const port = await freePort();
    const proxy = createMagicProxyInstance(
      resolveConfig({
        http: { port },
        routes: [
          {
            host: 'app.localhost',
            targets: [`http://127.0.0.1:${upstreamBound.port}`],
          },
        ],
        policy: { allowUnknownHosts: false },
      }),
    );

    expect(proxy.httpServer).toBeUndefined();
    proxy.listen();
    expect(proxy.httpServer).toBeTruthy();
    cleanups.push(async () => {
      proxy.close();
    });

    // second listen is a no-op
    proxy.listen();

    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/',
          headers: { host: 'app.localhost' },
        },
        resolve,
      );
      req.on('error', reject);
      req.end();
    });

    expect(response.statusCode).toBe(200);
    expect(await readBody(response)).toBe('up');

    proxy.close();
    expect(proxy.httpServer).toBeUndefined();
  });

  it('is reachable through MagicProxy.create().build()', () => {
    const proxy = MagicProxy.create()
      .http({ port: 18_081 })
      .route('*')
      .to('http://127.0.0.1:1')
      .build();
    expect(typeof proxy.listen).toBe('function');
    expect(typeof proxy.close).toBe('function');
  });
});
