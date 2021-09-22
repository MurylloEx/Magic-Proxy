const Wildcard = require('wildcard');

import { MagicProxyDefinition, ProxyConfig } from '../../index';
import { IncomingMessage } from 'http';
import { createProxyServer } from 'http-proxy';
import { Parse } from "../parser/Hostname.Parser";
import { matchDomain } from './Domain.Analyzer';

const ProxyAPI = createProxyServer({ 
  xfwd: false, 
  preserveHeaderKeyCase: true, 
  changeOrigin: true 
});

export function WebSocketProxyMiddleware(options: ProxyConfig) {
  return (req: IncomingMessage, socket: any, head: any) => {
    let proxied = false;
    if (options.allow_websockets){
      const { proxies, default_proxy } = options;

      proxies.forEach((proxy: MagicProxyDefinition, i: number) => {
        if (matchDomain(proxy, req)) {
          if (!proxied && (proxy?.sockDestination?.length > 0)){
            ProxyAPI.ws(req, socket, head, { 
              target: proxy.sockDestination[proxy.round], 
              timeout: proxy.timeout 
            }, (e) => {
              //Empty error handler
              return;
            });
            options.proxies[i].round = 
              (proxies[i].round + 1) % proxies[i].sockDestination.length;
            proxied = true;
          }
        }
      });
      
      if (!proxied && (default_proxy?.sockDestination?.length > 0)) {
        ProxyAPI.ws(req, socket, head, { 
          target: default_proxy.sockDestination[default_proxy.round], 
          timeout: default_proxy.timeout 
        }, (e) => {
          //Empty error handler
          return;
        });
        options.default_proxy.round = 
          (default_proxy.round + 1) % default_proxy.sockDestination.length;
      }
    }
  }
}