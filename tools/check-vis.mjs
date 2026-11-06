// 見せる範囲の印の確かめ（headless Edge・幅1366px）。node tools/check-vis.mjs [base-url]
// base-url を渡さないときは、この中で 127.0.0.1 の小さなサーバーを立てて確かめ、終わったら閉じる。
// 数えるもの：コンソールのエラー、全ページが開くか、印の無い段（.page-body の直下で .vis でないもの）、
// プレイヤー表示で画面に残る【GM】・正解・真相などの語、人物として見たときに他人の「本人だけ」が残る数、旧名。
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/81806/AppData/Local/hermes/hermes-agent/node_modules/playwright');

const root = path.resolve('.');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
let server = null; let base = process.argv[2];
if (!base) {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;
}
const shotDir = process.env.SHOT_DIR || path.join(root, 'tools', '_shots');
fs.mkdirSync(shotDir, { recursive: true });
const profile = path.join(process.env.TMPDIR || process.env.TEMP || '.', 'edge-profile-index-vis');
const ctx = await chromium.launchPersistentContext(profile, { channel: 'msedge', headless: true, viewport: { width: 1366, height: 900 } });
const page = ctx.pages()[0] || await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
// 共有保存（Worker）への通信はここでは止める（外へ出さない）
await page.route(/workers\.dev/, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"memos":[]}' }));
await page.goto(base + '?view=all#/n-now', { waitUntil: 'load' });
await page.waitForSelector('#page .page-body');
const ids = await page.evaluate(() => window.SITE_DATA.pages.map((p) => p.id));
const res = { pages: ids.length, opened: 0, noBody: [], unmarked: 0, unmarkedPages: [], labelMissing: 0, visBlocks: 0, plLeaks: [], personaLeaks: 0, oldNames: [], cardsWithHow: 0, cards: 0 };
const BAD = /【GM】|正解|真相|GM専用|GMだけ/;
const setView = async (v, after = true) => page.evaluate(([v, a]) => { localStorage.setItem('dom-rv1:view', JSON.stringify(v)); localStorage.setItem('dom-rv1:hideAfter', JSON.stringify(a)); const s = document.getElementById('viewMode'); s.value = v; s.dispatchEvent(new Event('change')); const h = document.getElementById('hideAfter'); if (h.checked !== a) { h.checked = a; h.dispatchEvent(new Event('change')); } }, [v, after]);
for (const id of ids) {
  await setView('all');
  await page.evaluate((id) => { location.hash = '#/' + id; }, id);
  await page.waitForFunction((id) => location.hash === '#/' + id && document.querySelector('#page .page-body'), id);
  const r = await page.evaluate(() => {
    const body = document.querySelector('#page .page-body');
    const kids = [...body.children];
    const unmarked = kids.filter((el) => !el.classList.contains('vis')).length;
    const visEls = body.querySelectorAll(':scope > .vis');
    const noLabel = [...visEls].filter((el) => !el.querySelector(':scope > .vis-label .vis-chip')).length;
    const cards = body.querySelectorAll('.cardx').length;
    const cardsHow = [...body.querySelectorAll('.vis-card')].filter((el) => el.querySelector(':scope > .vis-how')).length;
    return { unmarked, noLabel, n: visEls.length, cards, cardsHow, text: body.innerText.length };
  });
  res.opened++; res.visBlocks += r.n; res.unmarked += r.unmarked; res.labelMissing += r.noLabel; res.cards += r.cards; res.cardsWithHow += r.cardsHow;
  if (r.unmarked) res.unmarkedPages.push(id);
  if (!r.text) res.noBody.push(id);
  // プレイヤー表示：画面に見えている文に GM の語が残っていないか
  await setView('pl', true);
  const leak = await page.evaluate((src) => {
    const re = new RegExp(src);
    const body = document.querySelector('#page .page-body');
    const t = body.innerText; // display:none の中は入らない
    const hits = []; let m; const g = new RegExp(src, 'g');
    while ((m = g.exec(t)) && hits.length < 3) hits.push(t.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' '));
    return { hit: re.test(t), hits, hiddenPage: !!document.querySelector('#page .pl-empty') };
  }, BAD.source);
  if (leak.hit) res.plLeaks.push({ id, hits: leak.hits });
  // 人物として：他人の「本人だけ」が見えていないか
  for (const w of ['mireille', 'viola', 'mixi', 'edgar']) {
    await setView('pl:' + w, true);
    const n = await page.evaluate((w) => [...document.querySelectorAll('#page .vis.v-self')].filter((el) => getComputedStyle(el).display !== 'none' && el.dataset.who !== w && el.dataset.who !== 'each').length, w);
    res.personaLeaks += n;
  }
  const oldn = await page.evaluate(() => { const p = window.SITE_DATA.pages.find((x) => '#/' + x.id === location.hash); return p && p.group !== 'ref' && ['n-changelog', 'n-impl', 'n-now-1104', 'n-canon-truth'].indexOf(p.id) < 0 ? (document.querySelector('#page .page-body').innerText.match(/リュシア|ガルド|レオン/g) || []).length : 0; });
  if (oldn) res.oldNames.push(id + ':' + oldn);
}
// プレイヤー表示の目次：GMだけ・制作のページが出ていないか
await setView('pl', true);
await page.evaluate(() => { location.hash = '#/n-ho-common'; });
await page.waitForTimeout(300);
res.navGroupsPL = await page.evaluate(() => [...document.querySelectorAll('#navGroups .group-btn')].map((b) => b.textContent.trim()));
// 画面の写し（数枚）
const shots = [['all', 'n-now', 'now_all'], ['all', 'n-card-upper', 'card_all'], ['pl', 'n-card-upper', 'card_pl'], ['all', 'n-ho-pc3-1', 'ho3_all'], ['pl:edgar', 'n-card-skill', 'skill_as_edgar'], ['all', 'n-spec', 'spec_all']];
for (const [v, id, name] of shots) {
  await setView(v, true);
  await page.evaluate((id) => { location.hash = '#/' + id; }, id);
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shotDir, name + '.png') });
}
await setView('all', true);
res.consoleErrors = errors.length; res.errorSamples = errors.slice(0, 5);
console.log(JSON.stringify(res, null, 1));
await ctx.close();
if (server) server.close();
