import http, {
  type IncomingMessage,
  type RequestOptions,
  type ServerResponse,
} from 'node:http';
import https from 'node:https';
import type { Socket } from 'node:net';
import {
  buildUpstreamRequestHeaders,
  filterUpstreamResponseHeaders,
  toHttpUpstreamUrl,
} from '@/infrastructure/proxy/headers.js';

export interface ProxyClient {
  readonly web: (
    req: IncomingMessage,
    res: ServerResponse,
    target: string,
    timeout: number,
    onError: (error: Error) => void,
  ) => void;
  readonly ws: (
    req: IncomingMessage,
    socket: Socket,
    head: Buffer,
    target: string,
    timeout: number,
    onError: (error: Error) => void,
  ) => void;
  readonly close: () => void;
}

function requestOptions(
  url: URL,
  path: string,
  method: string | undefined,
  headers: RequestOptions['headers'],
  timeout: number,
): RequestOptions {
  const isTls = url.protocol === 'https:';
  return {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port || (isTls ? 443 : 80),
    path,
    method: method ?? 'GET',
    headers,
    timeout,
  };
}

function transportFor(url: URL): typeof http | typeof https {
  return url.protocol === 'https:' ? https : http;
}

function writeSwitchingProtocols(
  socket: Socket,
  proxyRes: IncomingMessage,
): void {
  const lines = ['HTTP/1.1 101 Switching Protocols'];
  Object.entries(proxyRes.headers).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        lines.push(`${key}: ${entry}`);
      });
      return;
    }
    lines.push(`${key}: ${value}`);
  });
  lines.push('', '');
  socket.write(lines.join('\r\n'));
}

function pipeSockets(
  clientSocket: Socket,
  upstreamSocket: Socket,
  clientHead: Buffer,
  upstreamHead: Buffer,
): void {
  if (upstreamHead.length > 0) {
    upstreamSocket.unshift(upstreamHead);
  }
  if (clientHead.length > 0) {
    upstreamSocket.write(clientHead);
  }

  upstreamSocket.pipe(clientSocket);
  clientSocket.pipe(upstreamSocket);

  const destroyBoth = (): void => {
    upstreamSocket.destroy();
    clientSocket.destroy();
  };

  upstreamSocket.on('error', destroyBoth);
  clientSocket.on('error', destroyBoth);
  upstreamSocket.on('close', () => {
    clientSocket.destroy();
  });
  clientSocket.on('close', () => {
    upstreamSocket.destroy();
  });
}

/**
 * Zero-dependency reverse-proxy client built on `node:http` / `node:https`.
 */
export function createProxyClient(): ProxyClient {
  return {
    web: (req, res, target, timeout, onError) => {
      const url = toHttpUpstreamUrl(target);
      const headers = buildUpstreamRequestHeaders(req.headers, url.host, {
        keepUpgrade: false,
      });
      const proxyReq = transportFor(url).request(
        requestOptions(url, req.url ?? '/', req.method, headers, timeout),
        (proxyRes) => {
          const status = proxyRes.statusCode ?? 502;
          res.writeHead(status, filterUpstreamResponseHeaders(proxyRes.headers));
          proxyRes.pipe(res);
        },
      );

      const fail = (error: Error): void => {
        proxyReq.destroy();
        onError(error);
      };

      proxyReq.on('timeout', () => {
        fail(new Error('Upstream request timed out'));
      });
      proxyReq.on('error', fail);
      res.on('close', () => {
        if (!res.writableFinished) {
          proxyReq.destroy();
        }
      });

      req.pipe(proxyReq);
    },

    ws: (req, socket, head, target, timeout, onError) => {
      const url = toHttpUpstreamUrl(target);
      const headers = buildUpstreamRequestHeaders(req.headers, url.host, {
        keepUpgrade: true,
      });
      const path = req.url ?? `${url.pathname}${url.search}`;
      const proxyReq = transportFor(url).request(
        requestOptions(url, path, 'GET', headers, timeout),
      );

      const fail = (error: Error): void => {
        proxyReq.destroy();
        onError(error);
      };

      proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
        writeSwitchingProtocols(socket, proxyRes);
        pipeSockets(socket, proxySocket, head, proxyHead);
      });

      proxyReq.on('response', (proxyRes) => {
        proxyRes.resume();
        fail(new Error('Upstream did not complete the WebSocket upgrade'));
      });

      proxyReq.on('timeout', () => {
        fail(new Error('Upstream WebSocket timed out'));
      });
      proxyReq.on('error', fail);

      proxyReq.end();
    },

    close: () => undefined,
  };
}
