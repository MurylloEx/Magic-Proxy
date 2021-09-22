import { ProxyConfig } from '../../index';
import { Request, Response } from 'express';
import { createProxyServer } from 'http-proxy';
import { MagicProxyDefinition } from '../../index';
import { matchDomain } from './Domain.Analyzer';

const ProxyAPI = createProxyServer({ 
  xfwd: false, 
  preserveHeaderKeyCase: true, 
  changeOrigin: true 
});

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

export function HttpProxyMiddleware(options: ProxyConfig) {
  return (req: Request, res: Response) => {
    let proxied = false;
    let sent = false;
    const { proxies, default_proxy } = options;
    
    options.proxies.forEach((proxy: MagicProxyDefinition, idx: number) => {
      if (matchDomain(proxy, req)) {
        if (!proxied && (proxy?.destination?.length > 0)){
          ProxyAPI.web(req, res, { 
            target: proxy.destination[proxy.round], 
            timeout: proxy.timeout 
          }, (e) => {
            if (!sent){
              sent = true;
              return BadGateway(res);
            }
          });
          options.proxies[idx].round = 
            (proxies[idx].round + 1) % proxies[idx].destination.length;
          proxied = true;
        }
      }
    });

    if (options.allow_unknown_host){
      if (!proxied && (default_proxy?.destination?.length > 0)) {
        ProxyAPI.web(req, res, { 
          target: default_proxy.destination[default_proxy.round], 
          timeout: options.default_proxy.timeout 
        }, (e) => {
          if (!sent){
            sent = true;
            return BadGateway(res);
          }
        });
        options.default_proxy.round = 
          (default_proxy.round + 1) % default_proxy.destination.length;
      }
    }
  }
}