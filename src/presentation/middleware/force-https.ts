import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ProxyMiddleware } from '@/domain/types.js';

/**
 * Redirect plain HTTP to HTTPS (except localhost).
 * Optionally attach Strict-Transport-Security when the request is already HTTPS.
 */
export function createForceHttpsMiddleware(
  hstsMaxAgeSeconds: number | undefined,
): ProxyMiddleware {
  return (req: IncomingMessage, res: ServerResponse, next): void => {
    const host = String(req.headers.host ?? '');
    const forwardedProto = String(
      req.headers['x-forwarded-proto'] ?? '',
    ).toLowerCase();
    const isLocalhost = host.toLowerCase().includes('localhost');
    const isHttps =
      forwardedProto === 'https' ||
      Boolean((req.socket as { encrypted?: boolean }).encrypted);

    if (isHttps) {
      if (hstsMaxAgeSeconds !== undefined) {
        res.setHeader(
          'Strict-Transport-Security',
          `max-age=${hstsMaxAgeSeconds}; includeSubDomains`,
        );
      }
      next();
      return;
    }

    if (isLocalhost || !host) {
      next();
      return;
    }

    res.statusCode = 301;
    res.setHeader('Location', `https://${host}${req.url ?? '/'}`);
    res.end();
  };
}

export function createHstsHeaderMiddleware(
  maxAgeSeconds: number,
): ProxyMiddleware {
  return (_req: IncomingMessage, res: ServerResponse, next): void => {
    res.setHeader(
      'Strict-Transport-Security',
      `max-age=${maxAgeSeconds}; includeSubDomains`,
    );
    next();
  };
}
