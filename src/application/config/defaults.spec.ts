import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BALANCER_STRATEGY,
  DEFAULT_PROXY_CONFIG,
  DEFAULT_ROUTE,
} from './defaults.js';

describe('config defaults', () => {
  it('exposes a catch-all fallback route', () => {
    expect(DEFAULT_ROUTE.host).toBe('*');
    expect(DEFAULT_ROUTE.targets).toEqual([]);
    expect(DEFAULT_ROUTE.timeoutMs).toBe(10_000);
    expect(DEFAULT_ROUTE.initialIndex).toBe(0);
  });

  it('enables HTTP and disables HTTPS by default', () => {
    expect(DEFAULT_PROXY_CONFIG.http.enabled).toBe(true);
    expect(DEFAULT_PROXY_CONFIG.http.port).toBe(80);
    expect(DEFAULT_PROXY_CONFIG.https.enabled).toBe(false);
    expect(DEFAULT_PROXY_CONFIG.https.port).toBe(443);
  });

  it('uses permissive host policy and Round-Robin by default', () => {
    expect(DEFAULT_PROXY_CONFIG.policy.allowUnknownHosts).toBe(true);
    expect(DEFAULT_PROXY_CONFIG.policy.allowWebSockets).toBe(false);
    expect(DEFAULT_PROXY_CONFIG.balancerStrategy).toBe(DEFAULT_BALANCER_STRATEGY);
    expect(DEFAULT_BALANCER_STRATEGY(2, 0).next()).toBe(0);
  });
});
