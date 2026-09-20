export { MagicProxy, MagicProxyBuilder, RouteBuilder } from './builder.js';
export { createMagicProxyInstance } from './magic-proxy-instance.js';
export { createBlockUnknownHostsMiddleware } from '@/presentation/middleware/block-unknown-hosts.js';
export {
  createForceHttpsMiddleware,
  createHstsHeaderMiddleware,
} from '@/presentation/middleware/force-https.js';
export { createHttpProxyMiddleware } from '@/presentation/middleware/http-proxy.js';
export { createWebSocketProxyHandler } from '@/presentation/middleware/websocket-proxy.js';
