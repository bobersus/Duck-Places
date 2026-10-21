const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const route = url.pathname;
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
  if (/^\/api\/(games|game-icons|game-thumbnails)$/.test(route)) {
    return require(path.join(root, route + '.js'))(req, res);
  }
  if (!['GET', 'HEAD'].includes(req.method)) return res.status(405).end();
  let relative = decodeURIComponent(route).replace(/^\/+/, '') || 'index.html';
  if (!path.extname(relative)) relative += '.html';
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep) || !/^(?:assets\/|(?:index|games|careers|privacy-policy|404)\.html$|(?:script\.js|client\.js|theme\.js|style\.css|design\.css|refinements\.css)$)/.test(relative)) return res.status(404).end();
  const exists = fs.existsSync(target) && fs.statSync(target).isFile();
  const file = exists ? target : path.join(root, '404.html');
  res.statusCode = exists ? 200 : 404;
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Duck Places local preview: http://127.0.0.1:${port}`));
