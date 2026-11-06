// 画面の配置の確かめ（1366px）：上の帯の部品が画面内か、横はみ出し、GMだけの段がたたまれているか
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/81806/AppData/Local/hermes/hermes-agent/node_modules/playwright');
const root = path.resolve('.');
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const profile = path.join(process.env.TMPDIR || '.', 'edge-profile-index-vis');
const ctx = await chromium.launchPersistentContext(profile, { channel: 'msedge', headless: true, viewport: { width: 1366, height: 900 } });
const page = ctx.pages()[0] || await ctx.newPage();
await page.route(/workers\.dev/, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"memos":[]}' }));
const out = {};
for (const view of ['all', 'pl']) {
  await page.goto(base + '?view=' + view + '#/n-card-upper', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  out[view] = await page.evaluate(() => {
    const vw = innerWidth;
    const top = ['#viewMode', '#q', '#btnKey', '#btnPanel', '#hideAfter'].map((s) => { const e = document.querySelector(s); if (!e) return [s, 'none']; const r = e.getBoundingClientRect(); return [s, r.width ? Math.round(r.left) + '-' + Math.round(r.right) : 'hidden']; });
    const main = document.querySelector('#main');
    const overflowX = main.scrollWidth - main.clientWidth;
    const gmOpen = [...document.querySelectorAll('.page-body > .vis.v-gm')].filter((v) => { const d = v.querySelector(':scope > .vis-body > details'); return !d || d.open; }).length;
    const gmTotal = document.querySelectorAll('.page-body > .vis.v-gm').length;
    const shown = [...document.querySelectorAll('.page-body > .vis')].filter((v) => getComputedStyle(v).display !== 'none').map((v) => v.dataset.vis);
    const cnt = {}; for (const k of shown) cnt[k] = (cnt[k] || 0) + 1;
    return { vw, top, overflowX, gmTotal, gmNotFolded: gmOpen, shown: cnt, banner: !document.querySelector('#modeBanner').hidden, navPages: document.querySelectorAll('#navPages .page-link').length };
  });
}
// GMだけの段が本文の途中でたたまれていないページの数（GM専用のページは除く）
await page.goto(base + '?view=all#/n-now', { waitUntil: 'load' });
out.gmUnfoldedOnMixedPages = await page.evaluate(async () => {
  const bad = [];
  for (const p of window.SITE_DATA.pages) {
    if (p.vis.k === 'gm') continue;
    const div = document.createElement('div'); div.innerHTML = p.html;
    for (const v of div.querySelectorAll(':scope > .vis.v-gm')) { const d = v.querySelector(':scope > .vis-body > details'); if (!d) bad.push(p.id); }
  }
  return [...new Set(bad)];
});
console.log(JSON.stringify(out, null, 1));
await ctx.close(); server.close();
