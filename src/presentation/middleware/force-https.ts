import type { NextFunction, Request, Response } from 'express';

/**
 * Redirect plain HTTP to HTTPS (except localhost).
 * Optionally attach Strict-Transport-Security when the request is already HTTPS.
 */
export function createForceHttpsMiddleware(
  hstsMaxAgeSeconds: number | undefined,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
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

    res.redirect(301, `https://${host}${req.url}`);
  };
}

export function createHstsHeaderMiddleware(
  maxAgeSeconds: number,
): (req: Request, res: Response, next: NextFunction) => void {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader(
      'Strict-Transport-Security',
      `max-age=${maxAgeSeconds}; includeSubDomains`,
    );
    next();
  };
}
