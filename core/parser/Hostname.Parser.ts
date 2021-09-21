import { IncomingMessage } from 'http';

export function Parse(req: IncomingMessage) {
  let host = req.headers['x-forwarded-host']?.toString();

  if (!host) {
    host = req.headers['host'];
  } else if (host.indexOf(',') !== -1) {
    // Note: X-Forwarded-Host is normally only ever a
    //       single value, but this is to be safe.
    host = host.substring(0, host.indexOf(',')).trimRight()
  }

  if (!host) return;

  // IPv6 literal support
  let offset = host[0] === '['
    ? host.indexOf(']') + 1
    : 0;
  let index = host.indexOf(':', offset);

  return index !== -1
    ? host.substring(0, index)
    : host;
};