import http, { type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { MagicProxy } from '@/index.js';

async function listen(
  server: http.Server,
): Promise<{ port: number; close: () => Promise<void> }> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  return {
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function freePort(): Promise<number> {
  const probe = http.createServer();
  const bound = await listen(probe);
  await bound.close();
  return bound.port;
}

function readBody(res: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    res.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    res.on('error', reject);
  });
}

describe('native HTTP reverse proxy', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (cleanups.length > 0) {
      const cleanup = cleanups.pop();
      if (cleanup) {
        await cleanup();
      }
    }
  });

  it('forwards requests to the upstream and streams the response', async () => {
    const upstream = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`ok:${req.method}:${req.url}:${req.headers.host}`);
    });
    const upstreamBound = await listen(upstream);
    cleanups.push(upstreamBound.close);

    const proxyPort = await freePort();
    const proxy = MagicProxy.create()
      .http({ port: proxyPort })
      .route('app.localhost')
      .to(`http://127.0.0.1:${upstreamBound.port}`)
      .allowUnknownHosts(false)
      .build();

    proxy.listen();
    cleanups.push(async () => {
      proxy.close();
    });

    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: proxyPort,
          path: '/hello?x=1',
          method: 'GET',
          headers: { host: 'app.localhost' },
        },
        resolve,
      );
      req.on('error', reject);
      req.end();
    });

    expect(response.statusCode).toBe(200);
    expect(await readBody(response)).toBe(
      `ok:GET:/hello?x=1:127.0.0.1:${upstreamBound.port}`,
    );
  });

  it('returns 502 when the upstream is unreachable', async () => {
    const proxyPort = await freePort();
    const proxy = MagicProxy.create()
      .http({ port: proxyPort })
      .route('*')
      .to('http://127.0.0.1:1')
      .timeout(500)
      .build();

    proxy.listen();
    cleanups.push(async () => {
      proxy.close();
    });

    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: proxyPort,
          path: '/',
          method: 'GET',
          headers: { host: 'missing.localhost' },
        },
        resolve,
      );
      req.on('error', reject);
      req.end();
    });

    expect(response.statusCode).toBe(502);
    expect(await readBody(response)).toContain('502 Bad Gateway');
  });
});
