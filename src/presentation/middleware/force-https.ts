import type { NextFunction, Request, Response } from 'express';

const HSTS_HEADER = 'max-age=31536000; includeSubDomains';

/**
 * Legacy `enable_hsts` behaviour: redirect plain HTTP to HTTPS (except localhost),
 * and attach a Strict-Transport-Security header when already on HTTPS.
 */
export function forceHttpsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const host = String(req.headers.host ?? '');
  const forwardedProto = String(req.headers['x-forwarded-proto'] ?? '').toLowerCase();
  const isLocalhost = host.toLowerCase().includes('localhost');
  const isHttps =
    forwardedProto === 'https' ||
    Boolean((req.socket as { encrypted?: boolean }).encrypted);

  if (isHttps) {
    res.setHeader('Strict-Transport-Security', HSTS_HEADER);
    next();
    return;
  }

  if (isLocalhost) {
    next();
    return;
  }

  if (!host) {
    next();
    return;
  }

  res.redirect(301, `https://${host}${req.url}`);
}
