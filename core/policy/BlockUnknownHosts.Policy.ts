import { Request, Response, NextFunction } from 'express';
const Wildcard = require('wildcard');

export function BlockUnknownHostsMiddleware(options: { proxies: any[] }) {
  return function (req: Request, res: Response, next: NextFunction) {
    let isKnownHost: Boolean = false;
    options.proxies.forEach((proxy: any) => {
      if (Wildcard(String(proxy.domain).toUpperCase(), String(req.hostname).toUpperCase())) {
        isKnownHost = true;
        return void(0);
      }
    });
    if (!isKnownHost) {
      try {
        return res.connection.destroy();
      } catch(e){}
    } else {
      return next();
    }
  }
}