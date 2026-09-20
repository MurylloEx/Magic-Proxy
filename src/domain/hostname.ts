import type { IncomingMessage } from 'node:http';

/**
 * Extract the hostname from an incoming request, preferring `X-Forwarded-Host`.
 * Port suffixes and IPv6 brackets are handled.
 */
export function parseHostname(req: IncomingMessage): string | undefined {
  const forwardedHeader = req.headers['x-forwarded-host'];
  const forwarded =
    typeof forwardedHeader === 'string'
      ? forwardedHeader
      : Array.isArray(forwardedHeader)
        ? forwardedHeader[0]
        : undefined;

  const hostHeader =
    typeof req.headers.host === 'string' ? req.headers.host : undefined;

  const raw = forwarded
    ? forwarded.includes(',')
      ? forwarded.slice(0, forwarded.indexOf(',')).trimEnd()
      : forwarded
    : hostHeader;

  if (!raw) {
    return undefined;
  }

  const offset = raw[0] === '[' ? raw.indexOf(']') + 1 : 0;
  const colonIndex = raw.indexOf(':', offset);
  return colonIndex !== -1 ? raw.slice(0, colonIndex) : raw;
}
