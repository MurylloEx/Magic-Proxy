# Magic Reverse Proxy

<p align="center">
<img src="https://badgen.net/npm/v/magic-reverse-proxy"/>
<img src="https://badgen.net/npm/dt/magic-reverse-proxy"/>
<img src="https://badgen.net/npm/license/magic-reverse-proxy"/>
<img src="https://badgen.net/npm/types/magic-reverse-proxy"/>
<img src="https://badgen.net/badge/author/MurylloEx/red?icon=label"/>
</p>

## Getting started into Magic Reverse Proxy!
<p align="justify">Magic Reverse Proxy is a proxy that can be used to forward requests to another server by domain name, and have a load balancer, ssl/tls support features.</p>

## Installation

<p align="center">
  <img src="https://nodei.co/npm/magic-reverse-proxy.png?downloads=true&downloadRank=true&stars=true"/>
</p>

<p align="justify">You must run the following terminal command in same path of your project.<p>
  
```
npm install magic-reverse-proxy --save
```

## How it works?

```javascript

const http = require('http');
const WebSockets = require('websocket');
const magicproxy = require('magic-reverse-proxy');

const server = http.createServer((req, res) => {
  //Reject useless requests...
  res.writeHead(403);
  res.end();
});

server.listen(1234, function () {
  console.log('Destination server is running on port 1234!');
});

const WebSockServer = new WebSockets.server({
  httpServer: server,
  maxReceivedFrameSize: 65536,
  maxReceivedMessageSize: 65536
});

WebSockServer.on('request', (request) => {
  console.log('WebSocket connected over [Client -> localhost:8080 -> localhost:1234]');
  let sock = request.accept();
  sock.on('message', (msg) => {
    //Print in the console the data recepted from client.
    console.log(msg.utf8Data);
  })
});


let proxy = magicproxy({
  allow_unknown_host: false, //Drop connections from unknown hosts
  allow_websockets: true, //Allow websocket to be proxied as well
  http: {
    port: 8080, //Define HTTP proxy to port 80
    enabled: true, //Enable HTTP proxy
    start_callback: () => {
      console.log('Magic proxy server is running on port 8080!');
    },
    middlewares: [] //Stack of middlewares to be loaded into HTTP server
  },
  proxies: [
    {
      domain: '*', //Proxy all websocket traffic to ws://localhost:1234
      timeout: 10000, //Timeout for connection
      round: 0, //Round-Robin index of destinations to proxy all requests
      destination: ['http://localhost:1234/'], //Array with destinations (Round-Robin will be used to load balance)
      sockDestination: ['ws://localhost:1234'] //Array with websocket destinations (Round-Robin will be used to load balance)
    }
  ],
  default_proxy: {
    timeout: 10000, //Timeout for connection
    round: 0, //Round-Robin index of destinations to proxy all requests
    destination: ['http://localhost:1234/'] //Array with destinations (Round-Robin will be used to load balance)
  }
});

//Bind proxy with specified configurations
proxy.bind();

```