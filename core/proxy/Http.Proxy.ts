import { Request, Response } from 'express';
import { createProxyServer } from 'http-proxy';
import { Parse } from '../parser/Hostname.Parser';
const Wildcard = require('wildcard');

const ProxyAPI = createProxyServer({ xfwd: false, preserveHeaderKeyCase: true });

function BadGateway(res: Response){
  res.set('Content-Type', 'text/html')
    .status(502)
    .end(`
      <center>
        <h1>502 Bad Gateway</h1>
      </center>
      <hr>
      <center>
        https://github.com/MurylloEx/Magic-Proxy
      </center>
    `);
}

export function HttpProxyMiddleware(options: any) {
  return (req: Request, res: Response) => {
    let proxied = false;
    let sent = false;
    options.proxies.forEach((proxy: any, idx: number) => {
      if (Wildcard(String(proxy.domain).toUpperCase(), String(Parse(req)).toUpperCase()) && !proxied) {
        ProxyAPI.web(req, res, { target: proxy.destination[proxy.round], timeout: proxy.timeout }, () => {
          if (!sent){
            sent = true;
            return BadGateway(res);
          }
        });
        options.proxies[idx].round = (options.proxies[idx].round + 1) % options.proxies[idx].destination.length;
        proxied = true;
      }
    });
    if (!proxied && (options.allow_unknown_host == true)) {
      ProxyAPI.web(req, res, { target: options.default_proxy.destination[options.default_proxy.round], timeout: options.default_proxy.timeout }, (e) => {
        if (!sent){
          sent = true;
          return BadGateway(res);
        }
      });
      options.default_proxy.round = (options.default_proxy.round + 1) % options.default_proxy.destination.length;
    }
  }
}