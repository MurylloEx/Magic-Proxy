const Wildcard = require('wildcard');
const HttpProxy = require('http-proxy');
const ParseHostname = require('./hostnameparser');

const ProxyAPI = HttpProxy.createProxyServer({ xfwd: false, preserveHeaderKeyCase: true });

module.exports = function (defOptions) {
  return (req, socket, head) => {
    let proxied = false;
    if (defOptions.allow_websockets == true){
      defOptions.proxies.forEach((proxyObj, idx, proxies) => {
        if (Wildcard(String(proxyObj.domain).toUpperCase(), String(ParseHostname(req)).toUpperCase()) && !proxied) {
          ProxyAPI.ws(req, socket, head, { target: proxyObj.sockDestination[proxyObj.round], timeout: proxyObj.timeout }, (e) => {
            //Empty error handler
            return;
          });
          defOptions.proxies[idx].round = (defOptions.proxies[idx].round + 1) % defOptions.proxies[idx].sockDestination.length;
          proxied = true;
        }
      });
      if (!proxied && (defOptions.allow_unknown_host == true)) {
        ProxyAPI.ws(req, socket, head, { target: defOptions.default_proxy.sockDestination[defOptions.default_proxy.round], timeout: defOptions.default_proxy.timeout }, (e) => {
          //Empty error handler
          return;
        });
        defOptions.default_proxy.round = (defOptions.default_proxy.round + 1) % defOptions.default_proxy.sockDestination.length;
      }
    }
  }
}