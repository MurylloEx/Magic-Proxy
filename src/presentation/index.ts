export { MagicProxy, MagicProxyBuilder, RouteBuilder } from './builder.js';
export { createMagicProxyInstance } from './magic-proxy-instance.js';
export { createBlockUnknownHostsMiddleware } from './middleware/block-unknown-hosts.js';
export {
  createForceHttpsMiddleware,
  createHstsHeaderMiddleware,
} from './middleware/force-https.js';
export { createHttpProxyMiddleware } from './middleware/http-proxy.js';
export { createWebSocketProxyHandler } from './middleware/websocket-proxy.js';
