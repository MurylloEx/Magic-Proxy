import HttpProxy from 'http-proxy';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';

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

/**
 * Factory for the shared http-proxy client used by HTTP and WebSocket middlewares.
 */
export function createProxyClient(): ProxyClient {
  const server = HttpProxy.createProxyServer({
    xfwd: false,
    preserveHeaderKeyCase: true,
    changeOrigin: true,
  });

  return {
    web: (req, res, target, timeout, onError) => {
      server.web(req, res, { target, timeout, changeOrigin: true }, onError);
    },
    ws: (req, socket, head, target, timeout, onError) => {
      server.ws(req, socket, head, { target, timeout, changeOrigin: true }, onError);
    },
    close: () => {
      server.close();
    },
  };
}
