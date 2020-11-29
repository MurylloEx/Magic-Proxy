//ALL COPYRIGHT OF EXPRESS-FORCE-HTTPS PACKAGE.
//THIS METHOD WAS IMPROVED BECAUSE IT'S ORIGINALLY VULNERABLE.
module.exports = function (req, res, next) {
  let schema = (req.headers['x-forwarded-proto'] || '').toLowerCase();
  if ((String(req.headers.host).indexOf('localhost') < 0) && (schema !== 'https')) {
    res.redirect('https://' + String(req.headers.host) + String(req.url));
  } else {
    next();
  }
}