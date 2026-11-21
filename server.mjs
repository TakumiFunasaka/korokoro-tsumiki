// dist/ を配信し、アプリが送ってくる「玉が止まったときの記録」を reports/ に書く小さなサーバー。
// 使い方: npm run build && node server.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const out = path.join(root, 'reports');
const PORT = +process.env.PORT || 5180;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/report') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
    req.on('end', () => {
      try {
        JSON.parse(body);
        fs.mkdirSync(out, { recursive: true });
        fs.writeFileSync(path.join(out, 'last.json'), body);
        fs.appendFileSync(path.join(out, 'log.jsonl'), body + '\n');
        res.writeHead(204).end();
      } catch { res.writeHead(400).end(); }
    });
    return;
  }
  // レビュー画面の判定（reports/review.json）
  if (url.pathname === '/review-data') {
    const f = path.join(out, 'review.json');
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
      req.on('end', () => {
        try { JSON.parse(body); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(f, body); res.writeHead(204).end(); }
        catch { res.writeHead(400).end(); }
      });
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(fs.existsSync(f) ? fs.readFileSync(f) : '{}');
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  // 公式の一覧図（参照用。手元にあるときだけ出る）
  if (url.pathname.startsWith('/charts/')) {
    const f = path.join(root, 'docs/research/official-charts', path.basename(url.pathname));
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'max-age=3600' });
      res.end(data);
    });
    return;
  }
  let file = path.normalize(path.join(dist, decodeURIComponent(url.pathname)));
  if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}).listen(PORT, '0.0.0.0', () => console.log(`http://localhost:${PORT}/`));
