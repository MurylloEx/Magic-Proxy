import { Request, Response, NextFunction } from "express";

//ALL COPYRIGHT OF EXPRESS-FORCE-HTTPS PACKAGE.
//THIS METHOD WAS IMPROVED BECAUSE IT'S ORIGINALLY VULNERABLE.
export function HstsSecurityMiddleware(req: Request, res: Response, next: NextFunction) {
  let schema = (req.headers['x-forwarded-proto']?.toString() || '').toLowerCase();
  if ((String(req.headers.host).indexOf('localhost') < 0) && (schema !== 'https')) {
    res.redirect('https://' + String(req.headers.host) + String(req.url));
  } else {
    next();
  }
}