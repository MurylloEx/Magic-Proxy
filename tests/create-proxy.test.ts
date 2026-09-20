import { describe, expect, it } from 'vitest';
import { createProxy } from '@/presentation/create-proxy.js';

describe('createProxy', () => {
  it('exposes the legacy bind/unbind surface', () => {
    const proxy = createProxy({
      http: { enabled: true, port: 18080 },
      https: { enabled: false },
      proxies: [
        {
          domain: '*',
          destination: ['http://127.0.0.1:9'],
        },
      ],
    });

    expect(typeof proxy.bind).toBe('function');
    expect(typeof proxy.unbind).toBe('function');
    expect(proxy.app).toBeTruthy();
    expect(proxy.config.http.port).toBe(18080);
    expect(proxy.httpServer).toBeUndefined();
  });

  it('rejects invalid configuration at construction time', () => {
    expect(() =>
      createProxy({
        http: { enabled: false },
        https: { enabled: false },
      }),
    ).toThrow(/at least one/);
  });
});
