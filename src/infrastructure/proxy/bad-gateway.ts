import type { ServerResponse } from 'node:http';

const BAD_GATEWAY_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>502 Bad Gateway</title></head>
<body>
  <center><h1>502 Bad Gateway</h1></center>
  <hr>
  <center>https://github.com/MurylloEx/Magic-Proxy</center>
</body>
</html>`;

export function sendBadGateway(res: ServerResponse): void {
  if (res.headersSent) {
    return;
  }
  res.statusCode = 502;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(BAD_GATEWAY_HTML);
}
