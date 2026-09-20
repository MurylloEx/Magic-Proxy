import { describe, expect, it } from 'vitest';
import {
  MagicProxy,
  MagicProxyBuilder,
  createMagicProxyInstance,
  createBlockUnknownHostsMiddleware,
  createForceHttpsMiddleware,
  createHttpProxyMiddleware,
  createWebSocketProxyHandler,
} from './index.js';

describe('presentation barrel', () => {
  it('re-exports builder, instance factory and middlewares', () => {
    expect(MagicProxy.create()).toBeInstanceOf(MagicProxyBuilder);
    expect(typeof createMagicProxyInstance).toBe('function');
    expect(typeof createBlockUnknownHostsMiddleware).toBe('function');
    expect(typeof createForceHttpsMiddleware).toBe('function');
    expect(typeof createHttpProxyMiddleware).toBe('function');
    expect(typeof createWebSocketProxyHandler).toBe('function');
  });
});
