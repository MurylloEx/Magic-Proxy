const Wildcard = require('wildcard');

import { Request, Response } from 'express';
import { createProxyServer } from 'http-proxy';
import { Parse } from "../parser/Hostname.Parser";

const ProxyAPI = createProxyServer({ xfwd: false, preserveHeaderKeyCase: true });

export function WebSocketProxyMiddleware(options: any) {
  return (req: Request, socket: Response, head: any) => {
    let proxied = false;
    if (options.allow_websockets == true){
      options.proxies.forEach((proxy: any, idx: number) => {
        if (Wildcard(String(proxy.domain).toUpperCase(), String(Parse(req)).toUpperCase()) && !proxied) {
          ProxyAPI.ws(req, socket, head, { 
            target: proxy.sockDestination[proxy.round], 
            timeout: proxy.timeout 
          }, () => {
            //Empty error handler
            return;
          });
          options.proxies[idx].round = 
            (options.proxies[idx].round + 1) % options.proxies[idx].sockDestination.length;
          proxied = true;
        }
      });
      if (!proxied && (options.allow_unknown_host == true)) {
        ProxyAPI.ws(req, socket, head, { 
          target: options.default_proxy.sockDestination[options.default_proxy.round], 
          timeout: options.default_proxy.timeout 
        }, () => {
          //Empty error handler
          return;
        });
        options.default_proxy.round = 
          (options.default_proxy.round + 1) % options.default_proxy.sockDestination.length;
      }
    }
  }
}