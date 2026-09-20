export { MagicProxy, MagicProxyBuilder, RouteBuilder } from './builder.js';
export { createMagicProxyInstance } from './magic-proxy-instance.js';
export { createBlockUnknownHostsMiddleware } from '#src/presentation/middleware/block-unknown-hosts.js';
export {
  createForceHttpsMiddleware,
  createHstsHeaderMiddleware,
} from '#src/presentation/middleware/force-https.js';
export { createHttpProxyMiddleware } from '#src/presentation/middleware/http-proxy.js';
export { createWebSocketProxyHandler } from '#src/presentation/middleware/websocket-proxy.js';
