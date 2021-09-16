import Https from 'https';
import Express, { Express as ExpressInterface } from 'express';

import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';

import { HttpProxyMiddleware } from './core/proxy/Http.Proxy';
import { WebSocketProxyMiddleware } from './core/proxy/WebSock.Proxy';
import { HstsSecurityMiddleware } from './core/policy/HstsSecurity.Policy';
import { BlockUnknownHostsMiddleware } from './core/policy/BlockUnknownHosts.Policy';


export interface MagicHttpConfig {
  port: number,
  enabled: boolean,
  middlewares?: Array<(...args: any) => any>
  start_callback?: () => void
}

export interface MagicHttpsConfig {
  port: number,
  enabled: boolean,
  middlewares?: Array<(...args: any) => any>,
  start_callback?: () => void,
  sslkey: string,
  sslcert: string
}

export interface MagicDefaultProxy {
  destination: Array<string>,
  sockDestination: Array<string>,
  timeout: number,
  round: number
}

export interface ProxyConfig {
  enable_hsts: boolean,
  allow_unknown_host: boolean,
  allow_websockets: boolean,
  http: MagicHttpConfig,
  https: MagicHttpsConfig,
  proxies: Array<string>,
  default_proxy: MagicDefaultProxy
}

export interface ProxyTrigger {
  app: ExpressInterface,
  appssl: ExpressInterface,
  config: ProxyConfig,
  httpServer?: HttpServer,
  httpsServer?: HttpsServer,
  bind: () => void,
  unbind: () => void
}

const standardConfig: ProxyConfig = {
  enable_hsts: false,
  allow_unknown_host: true,
  allow_websockets: false,
  http: {
    port: 80,
    enabled: true,
    middlewares: [],
    start_callback: () => {}
  },
  https: {
    port: 443,
    enabled: false,
    middlewares: [],
    start_callback: () => {},
    sslkey: '',
    sslcert: ''
  },
  proxies: [],
  default_proxy: {
    destination: [],
    sockDestination: [],
    timeout: 10000,
    round: 0
  }
};

function is_set(val: any) {
  return !((typeof val == 'undefined') || (val === null));
}

/**Generate default options for the input specified.
 * 
 * @param {ProxyConfig} options Options of proxy.
 */
function defaultConfigs(options?: ProxyConfig) {
  let opts = options || standardConfig;
  opts.enable_hsts = !is_set(opts.enable_hsts) ? false : opts.enable_hsts;
  opts.allow_unknown_host = !is_set(opts.allow_unknown_host) ? true : opts.allow_unknown_host;
  opts.allow_websockets = !is_set(opts.allow_websockets) ? false : opts.allow_websockets;
  opts.http = opts.http || standardConfig.http;
  opts.https = opts.https || standardConfig.https;
  opts.proxies = opts.proxies || [];
  opts.default_proxy = opts.default_proxy || standardConfig.default_proxy;
  return opts;
}

/**Create a new proxy object that contains the express app, appssl and the bind() function that starts all servers and listen on local port.
 * 
 * @param {ProxyConfig} options Options of proxy.
 */
export function createProxy(options?: ProxyConfig) {
  let defaultOptions = defaultConfigs(options);
  let proxy: ProxyTrigger = {
    app: Express(),
    appssl: Express(),
    config: defaultOptions,
    httpServer: undefined,
    httpsServer: undefined,

    /**
     * Bind the proxy on local port specified in options of createProxy() function.
     * 
     * @returns {void} 
     */
    bind: function (): void {
      if (defaultOptions.http.enabled) {
        this.httpServer = this.app.listen(defaultOptions.http.port, defaultOptions.http.start_callback);
      }
      if (defaultOptions.https.enabled) {
        this.httpsServer = Https.createServer({
          key: defaultOptions.https.sslkey,
          cert: defaultOptions.https.sslcert
        }, this.appssl).listen(defaultOptions.https.port, defaultOptions.https.start_callback);
      }

      defaultOptions.http.middlewares?.forEach((middleware) => {
        this.app.use(middleware);
      });
      defaultOptions.https.middlewares?.forEach((middleware) => {
        this.appssl.use(middleware);
      });

      if (defaultOptions.http.enabled) {
        this.app.use(BlockUnknownHostsMiddleware(defaultOptions));
        if (defaultOptions.enable_hsts) {
          this.app.use(HstsSecurityMiddleware);
        }
        this.app.use(HttpProxyMiddleware(defaultOptions));
        this.httpServer?.on('upgrade', WebSocketProxyMiddleware(defaultOptions));
      }
      if (defaultOptions.https.enabled) {
        this.appssl.use(BlockUnknownHostsMiddleware(defaultOptions));
        this.appssl.use(HttpProxyMiddleware(defaultOptions));
        this.httpsServer?.on('upgrade', WebSocketProxyMiddleware(defaultOptions));
      }
    },

    /**
     * Unbind the proxy on local port specified in options of createProxy() function.
     * 
     * @returns {void} 
     */
    unbind: function(): void{
      if (defaultOptions.http.enabled)
        this.httpServer?.close();
      if (defaultOptions.https.enabled)
        this.httpsServer?.close();
    }
  }
  return proxy;
}
