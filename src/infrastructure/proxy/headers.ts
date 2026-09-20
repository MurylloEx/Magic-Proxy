import type { IncomingHttpHeaders, OutgoingHttpHeaders } from 'node:http';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
]);

function connectionTokens(headers: IncomingHttpHeaders): readonly string[] {
  const raw = headers.connection;
  if (typeof raw !== 'string') {
    return [];
  }
  return raw
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);
}

/**
 * Copy request headers for an upstream call.
 * Optionally keeps `Connection` / `Upgrade` for WebSocket handshakes.
 * Sets `Host` to the upstream authority when `changeOrigin` is desired.
 */
export function buildUpstreamRequestHeaders(
  headers: IncomingHttpHeaders,
  upstreamHost: string,
  options: { readonly keepUpgrade: boolean },
): OutgoingHttpHeaders {
  const skipExtra = new Set(connectionTokens(headers));
  const result: OutgoingHttpHeaders = {};

  Object.entries(headers).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    const lower = key.toLowerCase();
    if (lower === 'host') {
      return;
    }
    if (options.keepUpgrade && (lower === 'connection' || lower === 'upgrade')) {
      result[key] = value;
      return;
    }
    if (HOP_BY_HOP.has(lower) || skipExtra.has(lower)) {
      return;
    }
    result[key] = value;
  });

  result.host = upstreamHost;

  if (options.keepUpgrade) {
    result.connection = 'Upgrade';
    result.upgrade = 'websocket';
  }

  return result;
}

/** Strip hop-by-hop headers from an upstream response before writing to the client. */
export function filterUpstreamResponseHeaders(
  headers: IncomingHttpHeaders,
): OutgoingHttpHeaders {
  const skipExtra = new Set(connectionTokens(headers));
  const result: OutgoingHttpHeaders = {};

  Object.entries(headers).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || skipExtra.has(lower)) {
      return;
    }
    result[key] = value;
  });

  return result;
}

/** Normalize `ws:` / `wss:` targets to `http:` / `https:` for Node request APIs. */
export function toHttpUpstreamUrl(target: string): URL {
  const url = new URL(target);
  if (url.protocol === 'ws:') {
    url.protocol = 'http:';
  } else if (url.protocol === 'wss:') {
    url.protocol = 'https:';
  }
  return url;
}
