const express = require('express');

const app = express();
const port = Number(process.env.PORT || 3000);
const serverName = process.env.BACKEND_NAME || 'backend';

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    server: serverName,
    pid: process.pid
  });
});

app.get('/', (req, res) => {
  res.json({
    server: serverName,
    pid: process.pid,
    timestamp: new Date().toISOString()
  });
});

app.use((req, res) => {
  res.status(404).json({
    message: 'Not found',
    server: serverName
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`${serverName} listening on http://0.0.0.0:${port}`);
});