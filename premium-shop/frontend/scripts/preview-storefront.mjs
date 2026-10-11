import http from 'node:http';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('.vercel/output');
const require = createRequire(import.meta.url);
const handler = require(resolve(root, 'functions/storefront.func/index.js'));
const types = { '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { res.writeHead(400); res.end(); return; }
  const staticRoot = resolve(root, 'static');
  const file = resolve(staticRoot, '.' + decoded);
  if (file.startsWith(staticRoot + sep)) {
    try {
      if ((await stat(file)).isFile()) { res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); return; }
    } catch {}
  }
  await handler(req, res);
});
server.listen(Number(process.env.PORT || 4200), '127.0.0.1', () => console.log('SEO preview at http://127.0.0.1:' + server.address().port));
