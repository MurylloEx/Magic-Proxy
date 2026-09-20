import { describe, expect, it } from 'vitest';
import {
  buildUpstreamRequestHeaders,
  filterUpstreamResponseHeaders,
  toHttpUpstreamUrl,
} from './headers.js';

describe('buildUpstreamRequestHeaders', () => {
  it('rewrites Host and strips hop-by-hop headers', () => {
    const headers = buildUpstreamRequestHeaders(
      {
        host: 'public.example',
        connection: 'keep-alive',
        'keep-alive': 'timeout=5',
        'x-request-id': 'abc',
        accept: 'text/plain',
      },
      '127.0.0.1:3000',
      { keepUpgrade: false },
    );

    expect(headers.host).toBe('127.0.0.1:3000');
    expect(headers['x-request-id']).toBe('abc');
    expect(headers.accept).toBe('text/plain');
    expect(headers.connection).toBeUndefined();
    expect(headers['keep-alive']).toBeUndefined();
  });

  it('forces Upgrade headers for WebSocket handshakes', () => {
    const headers = buildUpstreamRequestHeaders(
      {
        host: 'public.example',
        upgrade: 'websocket',
        connection: 'Upgrade',
        'sec-websocket-key': 'x',
      },
      'upstream.local',
      { keepUpgrade: true },
    );

    expect(headers.host).toBe('upstream.local');
    expect(headers.connection).toBe('Upgrade');
    expect(headers.upgrade).toBe('websocket');
    expect(headers['sec-websocket-key']).toBe('x');
  });

  it('skips undefined header values', () => {
    const headers = buildUpstreamRequestHeaders(
      { host: 'a', accept: undefined },
      'b',
      { keepUpgrade: false },
    );
    expect(headers.accept).toBeUndefined();
  });
});

describe('filterUpstreamResponseHeaders', () => {
  it('removes hop-by-hop response headers', () => {
    const headers = filterUpstreamResponseHeaders({
      connection: 'close',
      'content-type': 'text/plain',
      'transfer-encoding': 'chunked',
      'x-upstream': '1',
    });

    expect(headers['content-type']).toBe('text/plain');
    expect(headers['x-upstream']).toBe('1');
    expect(headers.connection).toBeUndefined();
    expect(headers['transfer-encoding']).toBeUndefined();
  });
});

describe('toHttpUpstreamUrl', () => {
  it('maps ws/wss schemes to http/https', () => {
    expect(toHttpUpstreamUrl('ws://127.0.0.1:9/path').protocol).toBe('http:');
    expect(toHttpUpstreamUrl('wss://example.com').protocol).toBe('https:');
    expect(toHttpUpstreamUrl('http://example.com').protocol).toBe('http:');
  });
});
