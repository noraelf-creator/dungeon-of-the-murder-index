#!/usr/bin/env node
/* ゲームの実画面を、今の原稿で撮る（制作INDEXの「ゲームでの見え方」用）。
     node tools/game-shots.mjs
   1. ゲーム（読むだけ）を .gameview-build/game に写す（src・scripts・テストのヘルパー・必要な素材）。
   2. 写しの scripts/import-manuscript.js で今の原稿を取り込み（写しの src/manuscript.js）、写しで build。
   3. 写しの dist を手元のサーバーで出し、ヘッドレス Edge（1280×800）で画面を撮る → media/gameview/*.webp
   4. media/gameview/manifest.json を書く。
   環境変数：GAMESHOTS_GAME・GAMESHOTS_MANUSCRIPT（場所の上書き）、GAMESHOTS_DSF（画素の倍率。既定 1）、GAMESHOTS_Q（webp の画質。既定 82）、
            GAMESHOTS_SKIP_BUILD=1（写し・取り込み・build を飛ばして撮るだけ） */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const T0 = Date.now();
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAME = path.resolve(process.env.GAMESHOTS_GAME || 'C:/00_【創作】一時フォルダ/100_【マダミス】ハーネス作成/mm7_game_v4');
const MS = path.resolve(process.env.GAMESHOTS_MANUSCRIPT || 'C:/00_【創作】一時フォルダ/_マダミス改訂_20261004/ダンジョン・オブ・ザ・マーダー/05_完成版');
const BUILD = path.join(SITE, '.gameview-build');
const SG = path.join(BUILD, 'game');
const OUTDIR = path.join(SITE, 'media', 'gameview');
const PW = 'C:/Users/81806/AppData/Local/hermes/hermes-agent/node_modules/.pnpm/playwright@1.64.0/node_modules/playwright';
const DSF = Number(process.env.GAMESHOTS_DSF || 1), Q = Number(process.env.GAMESHOTS_Q || 82);
const VW = 1280, VH = 800;
const NODE = process.execPath;
const log = (...a) => console.log('[' + ((Date.now() - T0) / 1000).toFixed(1) + 's]', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rel = p => path.relative(SITE, p).split(path.sep).join('/');

/* ---------- 1. 写し ---------- */
/* 素材は撮る画面に要る物だけ写す（曲・LS の動画・最終戦の演出は撮らない画面なので外す。build は「無い」と書くだけで続く）。
   ジャンクションは使わない（build の cpSync・rmSync がリンクの先＝ゲーム本体に触れないように）。 */
const SKIP_ASSETS = new Set(['bgm', 'bgm_loop', 'ls_video', 'final_v12']);
function rmReal(p) {   /* リンクなら外すだけ、実体のフォルダなら消す（ゲーム本体の中は決して消さない） */
  if (!fs.existsSync(p) && !isLink(p)) return;
  if (path.resolve(p).toLowerCase().startsWith(GAME.toLowerCase())) throw new Error('ゲーム本体の中は消さない：' + p);
  if (isLink(p)) { fs.unlinkSync(p); return; }
  fs.rmSync(p, { recursive: true, force: true });
}
function isLink(p) { try { return fs.lstatSync(p).isSymbolicLink(); } catch { return false; } }
function prepare() {
  fs.mkdirSync(SG, { recursive: true });
  for (const d of ['src', 'scripts', 'tests', 'assets', 'dist']) rmReal(path.join(SG, d));
  fs.cpSync(path.join(GAME, 'src'), path.join(SG, 'src'), { recursive: true });
  fs.cpSync(path.join(GAME, 'scripts'), path.join(SG, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(SG, 'tests'), { recursive: true });
  for (const f of ['v4-helpers.js', 'v4-policies.js', 'names.js']) fs.copyFileSync(path.join(GAME, 'tests', f), path.join(SG, 'tests', f));
  fs.copyFileSync(path.join(GAME, 'package.json'), path.join(SG, 'package.json'));
  fs.mkdirSync(path.join(SG, 'assets'), { recursive: true });
  for (const e of fs.readdirSync(path.join(GAME, 'assets'), { withFileTypes: true })) {
    if (SKIP_ASSETS.has(e.name)) continue;
    fs.cpSync(path.join(GAME, 'assets', e.name), path.join(SG, 'assets', e.name), { recursive: true, dereference: true });
  }
  const gi = path.join(SITE, '.gitignore');
  const cur = fs.readFileSync(gi, 'utf8');
  if (!/^\.gameview-build\/?\s*$/m.test(cur)) fs.writeFileSync(gi, cur.replace(/\s*$/, '') + '\r\n.gameview-build/\r\n');
}
function run(args, opts = {}) {
  const r = spawnSync(NODE, args, { cwd: SG, encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  if (r.status !== 0) { console.error(r.stdout, r.stderr); throw new Error('失敗：node ' + args.join(' ')); }
  return r.stdout;
}

let importWarnings = [], manuscriptRoot = MS;
if (!process.env.GAMESHOTS_SKIP_BUILD) {
  log('写しを作る：' + SG);
  prepare();
  log('原稿の取り込み：' + MS);
  const out = run([path.join(SG, 'scripts', 'import-manuscript.js'), MS, path.join(SG, 'src', 'manuscript.js')]);
  console.log(out.trim().split('\n').slice(-6).join('\n'));
  log('build');
  run([path.join(SG, 'scripts', 'build.js')]);
}
{
  const req = createRequire(path.join(SG, 'package.json'));
  const M = req('./src/manuscript.js');
  importWarnings = M.importWarnings || [];
  manuscriptRoot = (M.source && M.source.root) || MS;
  log('取り込みの警告：' + importWarnings.length + (importWarnings.length ? '\n  - ' + importWarnings.join('\n  - ') : ''));
}
const gameCommit = (spawnSync('git', ['-C', GAME, 'log', '-1', '--format=%h'], { encoding: 'utf8' }).stdout || '').trim();
const gameDirty = (spawnSync('git', ['-C', GAME, 'status', '--short', '--', 'src', 'scripts'], { encoding: 'utf8' }).stdout || '').trim();

/* ---------- 2. 撮影用の状態（node で進めた場面） ---------- */
log('場面の状態を作る');
const statesFile = path.join(BUILD, 'states.json');
console.log(run([path.join(SITE, 'tools', 'gameshots', 'states.cjs'), SG, statesFile]).trim());
const ST = JSON.parse(fs.readFileSync(statesFile, 'utf8'));

/* ---------- 3. サーバー ---------- */
const DIST = path.join(SG, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };
const notFound = new Set();
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(DIST, p);
  if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { notFound.add(p); res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port + '/';
log('サーバー：' + BASE);

/* ---------- 4. 撮影 ---------- */
fs.mkdirSync(OUTDIR, { recursive: true });
for (const f of fs.readdirSync(OUTDIR)) if (/\.(webp|png)$/i.test(f) || f === 'manifest.json') fs.unlinkSync(path.join(OUTDIR, f));
const pages = {}, files = [], problems = [], consoleErrors = [];
const { chromium } = createRequire(import.meta.url)(PW);
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DSF, locale: 'ja-JP' });
const cdps = new WeakMap();
async function newPage(label) {
  const p = await ctx.newPage();
  p.on('pageerror', e => consoleErrors.push(label + ' pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) consoleErrors.push(label + ' console: ' + m.text()); });
  return p;
}
async function shot(page, pageId, caption, name) {
  let cdp = cdps.get(page); if (!cdp) { cdp = await ctx.newCDPSession(page); cdps.set(page, cdp); }
  await page.mouse.move(VW - 2, VH - 2).catch(() => {});
  const r = await cdp.send('Page.captureScreenshot', { format: 'webp', quality: Q });
  const n = (pages[pageId] || []).length + 1;
  const file = (name || pageId) + '-' + String(n).padStart(2, '0') + '.webp';
  fs.writeFileSync(path.join(OUTDIR, file), Buffer.from(r.data, 'base64'));
  (pages[pageId] = pages[pageId] || []).push({ file: 'media/gameview/' + file, caption, w: Math.round(VW * DSF), h: Math.round(VH * DSF) });
  files.push(file);
  log('撮った ' + file + '：' + caption);
}
/* マウスを乗せたまま撮る（shot はマウスを外すので別） */
async function shotHover(page, pageId, caption, sel) {
  let cdp = cdps.get(page); if (!cdp) { cdp = await ctx.newCDPSession(page); cdps.set(page, cdp); }
  await page.hover(sel); await sleep(900);
  const r = await cdp.send('Page.captureScreenshot', { format: 'webp', quality: Q });
  const n = (pages[pageId] || []).length + 1, file = pageId + '-' + String(n).padStart(2, '0') + '.webp';
  fs.writeFileSync(path.join(OUTDIR, file), Buffer.from(r.data, 'base64'));
  (pages[pageId] = pages[pageId] || []).push({ file: 'media/gameview/' + file, caption, w: Math.round(VW * DSF), h: Math.round(VH * DSF) });
  files.push(file); log('撮った ' + file + '：' + caption);
}
/* 文書の欄を上から順にスクロールして撮る（欄の見える高さの 88% ずつ。最後の一枚は末尾に合わせる） */
async function scrollShots(page, pageId, sel, captionOf) {
  await page.waitForSelector(sel, { timeout: 15000 });
  const m = await page.evaluate(sel => { const el = document.querySelector(sel); el.scrollTop = 0; return { sh: el.scrollHeight, ch: el.clientHeight }; }, sel);
  const step = Math.max(50, Math.floor(m.ch * 0.88));
  const pos = [0]; while (pos[pos.length - 1] + m.ch < m.sh) pos.push(Math.min(pos[pos.length - 1] + step, m.sh - m.ch));
  for (let i = 0; i < pos.length; i++) {
    await page.evaluate(([sel, y]) => { document.querySelector(sel).scrollTop = y; }, [sel, pos[i]]);
    await sleep(450);
    const now = await page.evaluate(sel => document.querySelector(sel).scrollTop, sel);
    if (Math.abs(now - pos[i]) > 2) { await page.evaluate(([sel, y]) => { document.querySelector(sel).scrollTop = y; }, [sel, pos[i]]); await sleep(150); }
    await shot(page, pageId, captionOf(i + 1, pos.length));
  }
  await page.evaluate(sel => { document.querySelector(sel).scrollTop = 0; }, sel);
  return pos.length;
}
async function waitFor(page, fn, arg, ms = 15000) { await page.waitForFunction(fn, arg, { timeout: ms }); }
async function clickAct(page, sel) { await page.locator(sel).first().click(); await sleep(700); }
const textOf = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); return e ? e.innerText : ''; }, sel);
const checks = {};

/* 4-1. 部屋を作る → キャラクター選び（4つのタブ） */
const NAMES = {};
const tabs = {};
tabs.PC1 = await newPage('PC1');
await tabs.PC1.goto(BASE, { waitUntil: 'load' });
await tabs.PC1.waitForSelector('[data-act=newParty]');
await clickAct(tabs.PC1, '[data-act=newParty]');
await tabs.PC1.waitForSelector('.cs .cs-fig[data-pc=PC4]');
await sleep(3000);   /* 立ち絵が順に入る動きを待つ */
const party = await tabs.PC1.evaluate(() => sessionStorage.getItem('m7v4-party'));
for (const p of ['PC1', 'PC2', 'PC3', 'PC4']) NAMES[p] = (await textOf(tabs.PC1, `.cs-fig[data-pc=${p}] .cs-plate b`)).trim();
log('部屋 ' + party + ' ／ ' + JSON.stringify(NAMES));
await shot(tabs.PC1, 'n-charsel', 'キャラクター選び：部屋に入った直後の画面（まだ誰も選んでいない）');
for (const p of ['PC1', 'PC2', 'PC3', 'PC4'])
  await shotHover(tabs.PC1, 'n-charsel', `キャラクター選び：${p} ${NAMES[p]} にマウスを乗せたところ（右の欄にその人の紹介）`, `.cs-fig[data-pc=${p}]`);
await clickAct(tabs.PC1, '.cs-fig[data-pc=PC1]');
for (const p of ['PC2', 'PC3', 'PC4']) {
  const t = tabs[p] = await newPage(p);
  await t.goto(BASE, { waitUntil: 'load' });
  await t.evaluate(code => sessionStorage.setItem('m7v4-party', code), party);
  await t.reload({ waitUntil: 'load' });
  await t.waitForSelector(`.cs-fig[data-pc=${p}]`);
  await sleep(1500);
  await clickAct(t, `.cs-fig[data-pc=${p}]`);
}
await sleep(1500);
await tabs.PC1.waitForSelector('[data-act=lobbyNext]:not([disabled])');
await shot(tabs.PC1, 'n-charsel', `参加者を待っている画面：PC1 ${NAMES.PC1} のタブ（4人がそろい「4人そろった → HOを読む」が押せる状態）`);

/* 4-2. 最初の HO の画面 */
await clickAct(tabs.PC1, '[data-act=lobbyNext]');
for (const p of Object.keys(tabs)) await tabs[p].waitForSelector('.lb-doc .lb-tabs', { timeout: 20000 });
await sleep(1200);
const LBSEL = '.lb-doc';
for (const p of ['PC1', 'PC2', 'PC3', 'PC4']) {
  const t = tabs[p];
  await t.bringToFront();
  const n = await scrollShots(t, `n-ho-${p.toLowerCase()}-1`, LBSEL, (i, n) => `最初の HO の画面：${p} ${NAMES[p]} の「あなたのHO」タブ（${i}/${n}・文書の欄を上から順にスクロールして撮影）`);
  checks['ho_' + p] = (await textOf(t, LBSEL)).slice(0, 80).replace(/\s+/g, ' ');
  if (!n) problems.push(p + ' HO が撮れない');
}
await tabs.PC1.bringToFront();
await clickAct(tabs.PC1, '[data-act=lbDoc][data-k=commonHO]');
checks.lobbyCommonHO = await textOf(tabs.PC1, LBSEL);
await scrollShots(tabs.PC1, 'n-ho-common', LBSEL, (i, n) => `最初の HO の画面：「共通HO」タブ（PC1 のタブ・${i}/${n}・スクロールして撮影）`);
await clickAct(tabs.PC1, '[data-act=lbDoc][data-k=phaseTable]');
checks.lobbyPhase = (await textOf(tabs.PC1, LBSEL)).slice(0, 200);
await scrollShots(tabs.PC1, 'n-rule-phase', LBSEL, (i, n) => `最初の HO の画面：「フェイズ進行表」タブ（PC1 のタブ・${i}/${n}・スクロールして撮影）`);
await clickAct(tabs.PC1, '[data-act=lbDoc][data-k=ho]');

/* 4-3. 支給品・準備完了 → はじめる → R00（任意） */
try {
  for (const p of ['PC1', 'PC2', 'PC3', 'PC4']) {
    const t = tabs[p];
    if (await t.locator('.lb-side [data-act=supply]').count()) await clickAct(t, '.lb-side [data-act=supply]');
    await clickAct(t, '[data-act=readyHO]');
  }
  await tabs.PC1.waitForSelector('[data-act=startParty]:not([disabled])', { timeout: 10000 });
  await clickAct(tabs.PC1, '[data-act=startParty]');
  await sleep(4000);
  await shot(tabs.PC1, 'n-r00', `ゲーム開始直後の R00（読み合わせの最初の画面・PC1 ${NAMES.PC1} の画面）`);
} catch (e) { problems.push('R00：' + e.message.split('\n')[0]); }
const liveErrors = {};
for (const p of Object.keys(tabs)) { liveErrors[p] = await tabs[p].evaluate(() => (window.M7Debug && window.M7Debug.errors || []).map(String)); await tabs[p].close(); }

/* 4-4. 復元した場面（node で進めた状態をオフラインの部屋として開く） */
async function openState(key, pc) {
  const st = ST.states[key]; if (!st) throw new Error('状態が無い：' + key);
  const code = 'GV' + key.toUpperCase();
  const t = await newPage(key + '/' + pc);
  await t.goto(BASE, { waitUntil: 'load' });
  await t.evaluate(([code, st, pc]) => { localStorage.setItem('gameState:' + code, st); sessionStorage.setItem('m7v4-party', code); sessionStorage.setItem('m7v4-viewer', pc); sessionStorage.setItem('m7v4-token', 'tok-' + pc); }, [code, st, pc]);
  await t.reload({ waitUntil: 'load' });
  await sleep(3500);
  return t;
}
async function stateErrors(t, key) { const e = await t.evaluate(() => (window.M7Debug && window.M7Debug.errors || []).map(String)); if (e.length) liveErrors[key] = e; }
const DOCS = [['intro', 'n-rule-intro'], ['commonHO', 'n-ho-common'], ['phaseTable', 'n-rule-phase'], ['lsGuide', 'n-rule-ls'], ['skillList', 'n-rule-skill']];
async function openDocs(t) {
  if (!(await t.locator('.docsview').count())) {
    await t.evaluate(() => { const b = [...document.querySelectorAll('[data-act=center][data-c=docs]')].find(e => e.offsetParent); if (b) b.click(); });
    await sleep(900);
  }
  if (!(await t.locator('.docsview').count())) { await t.evaluate(() => { M7Debug.ui.center = 'docs'; M7Debug.paint(true); }); await sleep(700); }
}
async function docShots(t, key, pageId, where) {
  await t.evaluate(k => { const a = document.querySelector('.dc-i[data-k="' + k + '"]'); if (a) a.click(); }, key);
  await sleep(900);
  const title = (await textOf(t, '.docsview .reading h1')).trim();
  checks['doc_' + key] = (await textOf(t, '.docsview .reading'));
  await scrollShots(t, pageId, '.docsview .reading[data-scroll=doc]', (i, n) => `ゲーム中の「資料」：${title}（${where}・${i}/${n}・スクロールして撮影）`);
}
try {
  const t = await openState('p2sel', 'PC1');
  await openDocs(t);
  for (const [k, id] of DOCS) await docShots(t, k, id, 'P2 の行き先選びの間・PC1 の画面');
  await stateErrors(t, 'p2sel'); await t.close();
} catch (e) { problems.push('資料（P2）：' + e.message.split('\n')[0]); }
try {
  const t = await openState('p10rules', 'PC1');
  const sel = await t.evaluate(() => { const c = [...document.querySelectorAll('.modal.on, [data-scroll], .reading')].filter(e => e.offsetParent && e.scrollHeight > e.clientHeight + 4); return c.map(e => e.className + '|' + (e.getAttribute('data-scroll') || '')); });
  log('P10 新しいルールの段のスクロール欄：' + JSON.stringify(sel));
  if (await t.locator('.reading[data-scroll=read]').count()) await scrollShots(t, 'n-rule-p10', '.reading[data-scroll=read]', (i, n) => `P10：新しいルールが配られた段（中央に本文が出る・PC1 の画面・${i}/${n}・スクロールして撮影）`);
  else await shot(t, 'n-rule-p10', `P10：新しいルールが配られた段（PC1 の画面）`);
  await stateErrors(t, 'p10rules'); await t.close();
} catch (e) { problems.push('P10 新しいルールの段：' + e.message.split('\n')[0]); }
try {
  const t = await openState('p10inv', 'PC1');
  await openDocs(t);
  await docShots(t, 'newRules', 'n-rule-p10', 'P10 の調査の間・PC1 の画面');
  await stateErrors(t, 'p10inv'); await t.close();
} catch (e) { problems.push('資料（P10）：' + e.message.split('\n')[0]); }

/* 4-5. 任意：追加HO の窓・会議の共有カード */
try {
  const t = await openState('addho4', 'PC4');
  const has = await t.locator('.modal.on.addho').count();
  if (has) {
    const m = await t.evaluate(() => { const c = [...document.querySelectorAll('.modal.on.addho, .modal.on.addho *')].filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)); return c.length ? (c[0].classList.contains('modal') ? '.modal.on.addho' : '.modal.on.addho .' + [...c[0].classList].join('.')) : null; });
    const title = (await textOf(t, '.modal.on.addho h2')).trim();
    if (m) await scrollShots(t, 'n-ho-pc4-2', m, (i, n) => `追加HO の窓：${title}（PC4 ${NAMES.PC4} の画面・${ST.info.addho4}・${i}/${n}・窓の中をスクロールして撮影）`);
    else await shot(t, 'n-ho-pc4-2', `追加HO の窓：${title}（PC4 ${NAMES.PC4} の画面・${ST.info.addho4}）`);
    checks.addho4 = await textOf(t, '.modal.on.addho');
  } else {
    await shot(t, 'n-ho-pc4-2', `追加HO が届いたところ（PC4 ${NAMES.PC4} の画面・${ST.info.addho4}。窓ではなく札で出る段）`);
    problems.push('追加HO の窓が開いていない（段 ' + ST.info.addho4 + '）');
  }
  await stateErrors(t, 'addho4'); await t.close();
} catch (e) { problems.push('追加HO：' + e.message.split('\n')[0]); }
try {
  const t = await openState('p5share', 'PC2');
  const card = await t.evaluate(() => { const s = M7Debug.state; const id = Object.keys(s.cards).find(k => s.cards[k].status === 'SHARED' || s.cards[k].status === 'PUBLIC'); M7Debug.ui.center = 'cards'; M7Debug.ui.cardSel = id || null; M7Debug.paint(true); const c = id && window.M7Manuscript && M7Manuscript.cards[id]; return (c && c.title ? c.title : id); });
  await sleep(900);
  await shot(t, 'n-card-board', `P5 の会議：共有カードの欄で「${card}」を開いたところ（PC2 ${NAMES.PC2} の画面）`);
  await stateErrors(t, 'p5share'); await t.close();
} catch (e) { problems.push('共有カード：' + e.message.split('\n')[0]); }

await browser.close();
server.close();

/* ---------- 5. manifest ---------- */
const manifest = {
  builtAt: new Date().toISOString(),
  gameCommit, gameDirty: !!gameDirty,
  manuscriptRoot,
  importWarnings: importWarnings.length,
  importWarningList: importWarnings,
  viewport: { width: VW, height: VH, deviceScaleFactor: DSF },
  pages,
};
fs.writeFileSync(path.join(OUTDIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(BUILD, 'checks.json'), JSON.stringify({ checks, liveErrors, consoleErrors, notFound: [...notFound], problems, states: ST.info, missingStates: ST.missing }, null, 2));
let total = 0; for (const f of files) total += fs.statSync(path.join(OUTDIR, f)).size;
log('完了：' + files.length + '枚・' + (total / 1048576).toFixed(1) + 'MB → ' + rel(OUTDIR));
log('ゲームの JS エラー：' + JSON.stringify(liveErrors) + ' ／ console：' + consoleErrors.length);
if (problems.length) log('撮れなかった・気になった所：\n  - ' + problems.join('\n  - '));
