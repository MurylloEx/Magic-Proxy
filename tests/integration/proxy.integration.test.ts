import http from 'node:http';
import https from 'node:https';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { MagicProxy } from '@/index.js';
import {
  createCleanupStack,
  createEphemeralTlsMaterial,
  freePort,
  httpsAgent,
  listenHttp,
  readBody,
} from '../helpers/net.js';

describe('MagicProxy functional integration', () => {
  const cleanups = createCleanupStack();

  afterEach(async () => {
    await cleanups.drain();
  });

  it('reverse-proxies HTTP requests to a live upstream', async () => {
    const upstream = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`http-ok:${req.method}:${req.url}:${req.headers.host}`);
    });
    const upstreamBound = await listenHttp(upstream);
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

    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: proxyPort,
          path: '/v1/items?id=9',
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
      `http-ok:GET:/v1/items?id=9:127.0.0.1:${upstreamBound.port}`,
    );
  });

  it('reverse-proxies HTTPS requests with ephemeral self-signed certs', async () => {
    const upstream = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end(`https-ok:${req.url}`);
    });
    const upstreamBound = await listenHttp(upstream);
    cleanups.push(upstreamBound.close);

    const tls = createEphemeralTlsMaterial();
    const proxyPort = await freePort();
    const proxy = MagicProxy.create()
      .http({ enabled: false })
      .https({
        port: proxyPort,
        key: tls.key,
        cert: tls.cert,
      })
      .route('secure.localhost')
      .to(`http://127.0.0.1:${upstreamBound.port}`)
      .hsts(3_600)
      .allowUnknownHosts(false)
      .build();
    proxy.listen();
    cleanups.push(async () => {
      proxy.close();
    });

    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = https.request(
        {
          hostname: '127.0.0.1',
          port: proxyPort,
          path: '/secure',
          method: 'GET',
          headers: { host: 'secure.localhost' },
          agent: httpsAgent(false),
        },
        resolve,
      );
      req.on('error', reject);
      req.end();
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['strict-transport-security']).toBe(
      'max-age=3600; includeSubDomains',
    );
    expect(await readBody(response)).toBe('https-ok:/secure');
  });

  it('proxies WebSocket traffic over ws://', async () => {
    const upstream = http.createServer();
    const wss = new WebSocketServer({ server: upstream });
    wss.on('connection', (socket) => {
      socket.on('message', (data) => {
        socket.send(`echo:${String(data)}`);
      });
    });
    const upstreamBound = await listenHttp(upstream);
    cleanups.push(async () => {
      await new Promise<void>((resolve) => {
        wss.close(() => resolve());
      });
      await upstreamBound.close();
    });

    const proxyPort = await freePort();
    const proxy = MagicProxy.create()
      .http({ port: proxyPort })
      .route('ws.localhost')
      .to(`http://127.0.0.1:${upstreamBound.port}`)
      .websockets(`ws://127.0.0.1:${upstreamBound.port}`)
      .allowWebSockets(true)
      .allowUnknownHosts(false)
      .build();
    proxy.listen();
    cleanups.push(async () => {
      proxy.close();
    });

    const reply = await new Promise<string>((resolve, reject) => {
      const client = new WebSocket(`ws://127.0.0.1:${proxyPort}/chat`, {
        headers: { host: 'ws.localhost' },
      });
      client.once('open', () => {
        client.send('ping');
      });
      client.once('message', (data) => {
        resolve(String(data));
        client.close();
      });
      client.once('error', reject);
    });

    expect(reply).toBe('echo:ping');
  });

  it('proxies WebSocket Secure traffic over wss:// through the HTTPS listener', async () => {
    const upstream = http.createServer();
    const wss = new WebSocketServer({ server: upstream });
    wss.on('connection', (socket) => {
      socket.on('message', (data) => {
        socket.send(`secure-echo:${String(data)}`);
      });
    });
    const upstreamBound = await listenHttp(upstream);
    cleanups.push(async () => {
      await new Promise<void>((resolve) => {
        wss.close(() => resolve());
      });
      await upstreamBound.close();
    });

    const tls = createEphemeralTlsMaterial();
    const proxyPort = await freePort();
    const proxy = MagicProxy.create()
      .http({ enabled: false })
      .https({
        port: proxyPort,
        key: tls.key,
        cert: tls.cert,
      })
      .route('wss.localhost')
      .to(`http://127.0.0.1:${upstreamBound.port}`)
      .websockets(`ws://127.0.0.1:${upstreamBound.port}`)
      .allowWebSockets(true)
      .allowUnknownHosts(false)
      .build();
    proxy.listen();
    cleanups.push(async () => {
      proxy.close();
    });

    const reply = await new Promise<string>((resolve, reject) => {
      const client = new WebSocket(`wss://127.0.0.1:${proxyPort}/secure-chat`, {
        headers: { host: 'wss.localhost' },
        rejectUnauthorized: false,
      });
      client.once('open', () => {
        client.send('pong');
      });
      client.once('message', (data) => {
        resolve(String(data));
        client.close();
      });
      client.once('error', reject);
    });

    expect(reply).toBe('secure-echo:pong');
  });

  it('returns 502 Bad Gateway when the upstream is unreachable', async () => {
    const proxyPort = await freePort();
    const proxy = MagicProxy.create()
      .http({ port: proxyPort })
      .route('*')
      .to('http://127.0.0.1:1')
      .timeout(400)
      .build();
    proxy.listen();
    cleanups.push(async () => {
      proxy.close();
    });

    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: proxyPort,
          path: '/',
          headers: { host: 'down.localhost' },
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
