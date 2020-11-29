const Wildcard = require('wildcard');

module.exports = function (defOptions) {
  return function (req, res, next) {
    let is_known_host = false;
    defOptions.proxies.forEach((proxyObj, _idx, _proxies) => {
      if (Wildcard(String(proxyObj.domain).toUpperCase(), String(req.hostname).toUpperCase())) {
        is_known_host = true;
        return void(0);
      }
    });
    if (!is_known_host) {
      try {
        return res.connection.destroy();
      } catch(e){}
    } else {
      return next();
    }
  }
}