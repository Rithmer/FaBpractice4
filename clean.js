const fs = require('fs');

function clean(file) {
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  // multi-line
  c = c.replace(/\/\*[\s\S]*?\*\//g, '');
  // full line
  c = c.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  // inline comments avoiding URL schemas like http://
  c = c.replace(/([^:])\/\/.*/g, '$1');
  // Clean multiple newlines
  c = c.replace(/\n\s*\n/g, '\n\n');
  fs.writeFileSync(file, c);
}

clean(__dirname + '/app.js');
clean(__dirname + '/server.js');
clean(__dirname + '/sw.js');
console.log('Done');
