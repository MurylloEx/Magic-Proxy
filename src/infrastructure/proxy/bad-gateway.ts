import type { Response } from 'express';

const BAD_GATEWAY_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>502 Bad Gateway</title></head>
<body>
  <center><h1>502 Bad Gateway</h1></center>
  <hr>
  <center>https://github.com/MurylloEx/Magic-Proxy</center>
</body>
</html>`;

export function sendBadGateway(res: Response): void {
  if (res.headersSent) {
    return;
  }
  res.status(502).set('Content-Type', 'text/html; charset=utf-8').end(BAD_GATEWAY_HTML);
}
