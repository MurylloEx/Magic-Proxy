import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import http, { type IncomingMessage, type Server as HttpServer } from 'node:http';
import https, { type Server as HttpsServer } from 'node:https';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type BoundHttp = {
  readonly server: HttpServer | HttpsServer;
  readonly port: number;
  readonly close: () => Promise<void>;
};

export async function listenHttp(
  server: HttpServer | HttpsServer,
): Promise<BoundHttp> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address() as AddressInfo;
  return {
    server,
    port: address.port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export async function freePort(): Promise<number> {
  const probe = http.createServer();
  const bound = await listenHttp(probe);
  await bound.close();
  return bound.port;
}

export function readBody(res: IncomingMessage): Promise<string> {
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

/** Generate a short-lived self-signed localhost certificate via OpenSSL. */
export function createEphemeralTlsMaterial(): {
  readonly key: string;
  readonly cert: string;
} {
  const dir = mkdtempSync(join(tmpdir(), 'magic-proxy-tls-'));
  const keyPath = join(dir, 'key.pem');
  const certPath = join(dir, 'cert.pem');

  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '1',
        '-nodes',
        '-subj',
        '/CN=localhost',
      ],
      { stdio: 'ignore' },
    );

    return {
      key: readFileSync(keyPath, 'utf8'),
      cert: readFileSync(certPath, 'utf8'),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function createCleanupStack(): {
  readonly push: (fn: () => Promise<void> | void) => void;
  readonly drain: () => Promise<void>;
} {
  const stack: Array<() => Promise<void> | void> = [];
  return {
    push: (fn) => {
      stack.push(fn);
    },
    drain: async () => {
      while (stack.length > 0) {
        const fn = stack.pop();
        if (fn) {
          await fn();
        }
      }
    },
  };
}

export function httpsAgent(rejectUnauthorized = false): https.Agent {
  return new https.Agent({ rejectUnauthorized });
}
