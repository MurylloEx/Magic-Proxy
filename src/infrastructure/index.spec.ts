import { describe, expect, it } from 'vitest';
import {
  createProxyClient,
  createRequestListener,
  sendBadGateway,
  toHttpUpstreamUrl,
} from './index.js';
import { createMockResponse } from '../../tests/helpers/mocks.js';

describe('infrastructure barrel', () => {
  it('re-exports proxy and server helpers', () => {
    expect(toHttpUpstreamUrl('ws://x').protocol).toBe('http:');
    expect(typeof createProxyClient().web).toBe('function');
    expect(typeof createRequestListener([])).toBe('function');
    const res = createMockResponse();
    sendBadGateway(res);
    expect(res.statusCode).toBe(502);
  });
});
