import { describe, expect, it } from 'vitest';
import { sendBadGateway } from './bad-gateway.js';
import { createMockResponse } from '../../../tests/helpers/mocks.js';

describe('sendBadGateway', () => {
  it('writes a 502 HTML body when headers are not sent', () => {
    const res = createMockResponse();
    sendBadGateway(res);

    expect(res.statusCode).toBe(502);
    expect(res.getHeader('content-type')).toBe('text/html; charset=utf-8');
    expect(Buffer.concat(res.body).toString('utf8')).toContain('502 Bad Gateway');
  });

  it('is a no-op when headers were already sent', () => {
    const res = createMockResponse();
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    sendBadGateway(res);
    expect(Buffer.concat(res.body).toString('utf8')).toBe('ok');
  });
});
