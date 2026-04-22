const { spawn } = require('child_process');
const path = require('path');

const backends = [
  { port: 3000, name: 'backend-1', role: 'primary' },
  { port: 3001, name: 'backend-2', role: 'primary' },
  { port: 3002, name: 'backend-3', role: 'backup' }
];

const backendScript = path.join(__dirname, 'backend.js');
const children = [];

function startBackend(config) {
  const child = spawn(process.execPath, [
    backendScript,
    '--port', String(config.port),
    '--name', config.name,
    '--role', config.role
  ], {
    stdio: 'inherit',
    env: process.env
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`${config.name} stopped with signal ${signal}`);
      return;
    }

    console.log(`${config.name} exited with code ${code}`);
  });

  children.push(child);
}

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});

for (const backend of backends) {
  startBackend(backend);
}
