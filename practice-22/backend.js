const http = require('http');
const { URL } = require('url');

function readArg(name, fallback) {
  const prefixed = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (prefixed) {
    return prefixed.slice(name.length + 3);
  }

  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }

  return fallback;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

const port = toNumber(readArg('port', process.env.PORT || 3000), 3000);
const name = readArg('name', process.env.BACKEND_NAME || `backend-${port}`);
const role = readArg('role', process.env.BACKEND_ROLE || 'primary');

let totalRequests = 0;
let activeRequests = 0;

const server = http.createServer((req, res) => {
  totalRequests += 1;
  activeRequests += 1;

  let settled = false;
  const completeRequest = () => {
    if (!settled) {
      settled = true;
      activeRequests = Math.max(0, activeRequests - 1);
    }
  };

  res.on('finish', completeRequest);
  res.on('close', completeRequest);

  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname, searchParams } = requestUrl;

  if (pathname === '/health') {
    sendJson(res, 200, {
      status: 'ok',
      healthy: true,
      backend: name,
      role,
      port,
      pid: process.pid,
      activeRequests,
      totalRequests
    });
    return;
  }

  if (pathname === '/slow') {
    const delay = toNumber(searchParams.get('ms'), 750);
    setTimeout(() => {
      sendJson(res, 200, {
        message: 'Slow response from backend server',
        backend: name,
        role,
        port,
        pid: process.pid,
        delayedByMs: delay,
        activeRequests,
        totalRequests,
        timestamp: new Date().toISOString()
      });
    }, Math.max(0, delay));
    return;
  }

  if (pathname === '/' || pathname === '/api') {
    sendJson(res, 200, {
      message: 'Response from backend server',
      backend: name,
      role,
      port,
      pid: process.pid,
      activeRequests,
      totalRequests,
      timestamp: new Date().toISOString()
    });
    return;
  }

  sendJson(res, 404, {
    message: 'Not found',
    backend: name,
    role,
    port,
    path: pathname
  });
});

server.listen(port, () => {
  console.log(`Backend ${name} listening on http://localhost:${port}`);
});
