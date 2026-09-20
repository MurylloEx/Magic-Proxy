import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { createProxyClient } from './http-proxy-client.js';
import { createCleanupStack, listenHttp, readBody } from '../../../tests/helpers/net.js';

describe('createProxyClient', () => {
  const cleanups = createCleanupStack();

  afterEach(async () => {
    await cleanups.drain();
  });

  it('proxies an HTTP request to a live upstream', async () => {
    const upstream = http.createServer((req, res) => {
      res.writeHead(201, { 'x-upstream': 'yes' });
      res.end(`body:${req.url}`);
    });
    const bound = await listenHttp(upstream);
    cleanups.push(bound.close);

    const client = createProxyClient();
    cleanups.push(async () => {
      client.close();
    });

    const server = http.createServer((req, res) => {
      client.web(
        req,
        res,
        `http://127.0.0.1:${bound.port}`,
        2_000,
        () => {
          res.statusCode = 502;
          res.end('fail');
        },
      );
    });
    const proxyBound = await listenHttp(server);
    cleanups.push(proxyBound.close);

    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: proxyBound.port,
          path: '/item/1',
          method: 'GET',
        },
        resolve,
      );
      req.on('error', reject);
      req.end();
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers['x-upstream']).toBe('yes');
    expect(await readBody(response)).toBe('body:/item/1');
  });

  it('invokes onError when the upstream is unreachable', async () => {
    const client = createProxyClient();
    const errors: Error[] = [];

    const server = http.createServer((req, res) => {
      client.web(req, res, 'http://127.0.0.1:1', 500, (error) => {
        errors.push(error);
        res.statusCode = 502;
        res.end('down');
      });
    });
    const bound = await listenHttp(server);
    cleanups.push(bound.close);

    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.request(
        { hostname: '127.0.0.1', port: bound.port, path: '/' },
        resolve,
      );
      req.on('error', reject);
      req.end();
    });

    expect(response.statusCode).toBe(502);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('exposes a no-op close()', () => {
    expect(() => createProxyClient().close()).not.toThrow();
  });

  it('reports the bound upstream port via AddressInfo for sanity', async () => {
    const server = http.createServer((_req, res) => {
      res.end('ok');
    });
    const bound = await listenHttp(server);
    cleanups.push(bound.close);
    expect((bound.server.address() as AddressInfo).port).toBe(bound.port);
  });
});
