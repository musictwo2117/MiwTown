// Video studio for Miw's Town. No dependencies: `node video/serve.js`, then open http://localhost:19200
// Serves the clip pages in video/ plus the shared models, and saves frames a page POSTs in ?capture mode
// to video/out/<clip>/frames/0000.png, ready for `sh video/encode.sh <clip>`.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.MIW_VIDEO_PORT || 19200);
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.glb': 'model/gltf-binary' };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const frame = url.match(/^\/frame\/([a-z0-9-]+)\/(\d{4})$/);
  if (frame && req.method === 'POST') {
    const dir = path.join(__dirname, 'out', frame[1], 'frames');
    fs.mkdirSync(dir, { recursive: true });
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => { fs.writeFileSync(path.join(dir, frame[2] + '.png'), Buffer.concat(chunks)); res.end('ok'); });
    return;
  }
  // /<clip> is video/<clip>.html; models and models.js come from the town so clips use the same characters
  let file;
  if (url === '/') file = path.join(__dirname, 'intro.html');
  else if (/^\/[a-z0-9-]+$/.test(url) && fs.existsSync(path.join(__dirname, url.slice(1) + '.html'))) file = path.join(__dirname, url.slice(1) + '.html');
  else if (url === '/models.js' || /^\/models\/[a-z]+\.glb$/.test(url)) file = path.join(ROOT, url.slice(1));
  if (!file || !fs.existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
  res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`Miw's Town video studio → http://localhost:${PORT}`));
