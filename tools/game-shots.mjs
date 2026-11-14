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
  /* 撮影用のローカル配信には version.json が無い（本番の版の確認用ファイル）。404 を出さないため、ここだけ返す */
  if (p === '/version.json') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ local: true, preview: true, note: '撮影用のローカル配信（本番の version.json ではない）' }));
    return;
  }
  /* 既定のアイコンは置いていない（404 をコンソールに出さない） */
  if (p === '/favicon.ico') { res.writeHead(204); res.end(); return; }
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

/* ================= 3列比較の右列（unitShots）：全カード・HO・部屋・品の実画面 =================
   1項目＝1つの画面（枠）を撮る。原稿をHTMLに写した物やダミーは撮らない（ゲームの描画関数がそのまま出す画面だけ）。
   単位IDは計画 Task 3 の体系：ROOM:<id> / CARD:<cardId> / CARD_DOC:<pageId>:<slug> / ITEMSEC:<pageId>:<n> /
   HO:<pageId>:<secIdx>_<key>（冒頭は 0_intro）。
   画像は長辺 960px 程度・webp 品質 78（clip の scale で足す）。ページ画像（pages）は今までどおり残す。 */
const UQ = Number(process.env.GAMESHOTS_UQ || 78);
const LONG = Number(process.env.GAMESHOTS_LONG || 960);
const unitShots = {}, unitNoShotReason = {}, unitMeta = {};
const unitPages = {};        /* unit → 元のINDEXページ（pages に足すとき用） */
let uSeq = 0;
const slugOf = s => String(s).replace(/[^0-9A-Za-z._@-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 96);
function addUnitFile(unit, entry, meta) {
  (unitShots[unit] = unitShots[unit] || []).push(entry);
  if (meta) unitMeta[unit] = Object.assign({}, meta, unitMeta[unit] || {});
  files.push(entry.file.replace('media/gameview/', ''));
}
async function shotClip(page, unit, caption, box, meta, opt = {}) {
  let cdp = cdps.get(page); if (!cdp) { cdp = await ctx.newCDPSession(page); cdps.set(page, cdp); }
  const x = Math.max(0, Math.round(box.x)), y = Math.max(0, Math.round(box.y));
  const w = Math.max(8, Math.min(VW - x, Math.round(box.width))), h = Math.max(8, Math.min(VH - y, Math.round(box.height)));
  const long = Math.max(w, h);
  const scale = Math.max(1, Math.min(2.2, LONG / long));
  const r = await cdp.send('Page.captureScreenshot', { format: 'webp', quality: UQ, clip: { x, y, width: w, height: h, scale } });
  uSeq++;
  const n = (unitShots[unit] || []).length + 1;
  const file = 'u_' + slugOf(unit) + '-' + String(n).padStart(2, '0') + '.webp';
  fs.writeFileSync(path.join(OUTDIR, file), Buffer.from(r.data, 'base64'));
  addUnitFile(unit, { file: 'media/gameview/' + file, caption, w: Math.round(w * scale), h: Math.round(h * scale) }, meta);
  if (opt.alsoPage) (pages[opt.alsoPage] = pages[opt.alsoPage] || []).push({ file: 'media/gameview/' + file, caption, w: Math.round(w * scale), h: Math.round(h * scale) });
  log('撮った（項目）' + unit + ' → ' + file);
}
/* 欄（スクロールする箱）の中の見出しごとに、その節だけを撮る。
   resolve(heading, index, count) が {unit, caption, meta} を返した見出しだけ撮る（null は撮らない）。
   節が箱より高いときは 90% ずつ送って複数枚（caption に「○枚目」を付ける）。 */
async function sectionShots(page, sel, resolve, introTarget) {
  const info = await page.evaluate(sel => {
    const c = document.querySelector(sel); if (!c) return null;
    const cr = c.getBoundingClientRect();
    const hs = [...c.querySelectorAll('h1,h2,h3')].filter(h => h.getClientRects().length);
    return {
      c: { x: cr.x, y: cr.y, w: cr.width, h: cr.height, ch: c.clientHeight, sh: c.scrollHeight },
      heads: hs.map(h => { const r = h.getBoundingClientRect(); return { tag: h.tagName, text: (h.innerText || '').trim().replace(/\s+/g, ' '), top: r.top - cr.top + c.scrollTop }; }),
    };
  }, sel);
  if (!info) return 0;
  /* 最初の見出しより前（窓の題・本文の冒頭）を1つの節として撮る */
  if (introTarget) info.heads.unshift({ tag: 'INTRO', text: '（冒頭）', top: 0 });
  const n = info.heads.length, limit = Math.max(0, info.c.sh - info.c.ch);
  let made = 0;
  for (let i = 0; i < n; i++) {
    const hd = info.heads[i];
    const end = i + 1 < n ? info.heads[i + 1].top : Math.max(info.c.sh, info.c.ch);
    const tgt = resolve(hd, i, n); if (!tgt) continue;
    let y = Math.min(Math.max(0, hd.top - 2), limit), part = 1;
    while (true) {
      await page.evaluate(([sel, y]) => { document.querySelector(sel).scrollTop = y; }, [sel, y]);
      await sleep(140);
      const top = info.c.y + Math.max(0, hd.top - y);
      const bottom = Math.min(info.c.y + info.c.h, info.c.y + (end - y));
      const endOnScreen = info.c.y + (end - y);   /* 節の終わり（箱で切る前）。箱より高い節は、ここが箱の下より下にある */
      if (bottom - top >= 24) {
        const cap = part > 1 ? tgt.caption + '（つづき・' + part + '枚目）' : tgt.caption;
        await shotClip(page, tgt.unit, cap, { x: info.c.x + 1, y: top, width: info.c.w - 2, height: bottom - top }, tgt.meta, tgt.opt);
        made++;
      }
      if (y >= limit || endOnScreen <= info.c.y + info.c.h - 2) break;
      const next = Math.min(limit, y + Math.floor(info.c.ch * 0.9));
      if (next === y) break;
      y = next; part++;
      if (part > 12) break;
    }
  }
  await page.evaluate(sel => { const c = document.querySelector(sel); if (c) c.scrollTop = 0; }, sel);
  return made;
}
/* ---- HO の節の並び（原稿の見出しの順。単位IDの secIdx をここで決める） ---- */
const HO_MAP = JSON.parse(fs.readFileSync(path.join(SG, 'scripts', 'manuscript-map.json'), 'utf8'));
const HO_KEYS = HO_MAP.hoSectionKeys || [];
const stripHead = t => String(t).replace(/^[▼\s#>]+/, '').trim();
function hoKeyOf(text) { const t = stripHead(text).replace(/[（(].*$/, ''); for (const k of HO_KEYS) if (new RegExp(k.match).test(t)) return k.key; return null; }
const KEY_ALIAS = { '技能': 'skills', 'スキル': 'skills', '秘密': 'secrets', '目的': 'goals', '知っていること': 'knows', '話し方': 'speech', '仲間のこと': 'companions', 'あなたの手順': 'steps', '手順': 'steps', '隠し方の指針': 'hiding', '《Disgord》': 'disgord' };
function normKeyOf(text) { const t = stripHead(text).replace(/[（(].*$/, '').trim(); return hoKeyOf(t) || KEY_ALIAS[t] || null; }
/* 見出しの語（Task 3 の抽出と同じ作り：count.py の norm_key に合わせ、12字まで）。
   例：「支給品-HO読み込み時全員追加で1つ選択すること」→「支給品HO読み込み時全員」。
   これを揃えないと、INDEX（build.mjs）が単位IDで実画面を引けない。 */
function hoSlug(s, limit = 12) {
  let t = String(s == null ? '' : s);
  t = t.replace(/^(INFO|REC)-[A-Z0-9-]+/, '');
  t = t.replace(/[《》▼]/g, '');
  t = t.replace(/^深度\s*\d/, '');
  t = t.replace(/[（(][^）)]*[）)]/g, '');
  t = t.replace(/[\s\u3000・、。,.–—:：/【】\[\]（）()「」『』!?！？-]/g, '');
  return t.slice(0, limit) || 'sec';
}
const CIRC = { '①': 1, '②': 2, '③': 3, '④': 4, '⑤': 5, '⑥': 6 };
function buildHoPages() {
  const dir = path.join(MS, 'GM資料', 'HO原本');
  const out = [];
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.md')).sort()) {
    let pageId, pc = null, num = null;
    if (/^00_共通HO/.test(f)) pageId = 'n-ho-common';
    else {
      const m = /^PC(\d)_.*?_([①②③④⑤⑥])/.exec(f); if (!m) continue;
      pc = 'PC' + m[1]; num = CIRC[m[2]]; pageId = 'n-ho-pc' + m[1] + '-' + num;
    }
    const lines = fs.readFileSync(path.join(dir, f), 'utf8').split(/\r?\n/);
    const secs = [{ idx: 0, key: 'intro', heading: '', norm: '' }];
    let idx = 1;
    for (const ln of lines) {
      const m = /^(#{2,3})\s+(.+?)\s*$/.exec(ln); if (!m) continue;
      const heading = stripHead(m[2]);
      secs.push({ idx: idx, key: normKeyOf(heading) || hoSlug(heading, 12), heading, norm: heading.replace(/[\s・、。（）()]/g, '') });
      idx++;
    }
    out.push({ pageId, pc, num, file: f, secs });
  }
  return out;
}
const HO_PAGES = buildHoPages();
const HO_BY_PAGE = Object.fromEntries(HO_PAGES.map(p => [p.pageId, p]));
function matchHoSection(page, headingText, isIntro) {
  if (!page) return null;
  if (isIntro) return page.secs[0];
  const k = normKeyOf(headingText);
  if (k) { const s = page.secs.find(x => x.idx > 0 && x.key === k); if (s) return s; }
  const nrm = stripHead(headingText).replace(/[\s・、。（）()]/g, '');
  return page.secs.find(x => x.idx > 0 && x.norm === nrm)
    || page.secs.find(x => x.idx > 0 && x.norm && (nrm.startsWith(x.norm) || x.norm.startsWith(nrm)))
    || null;
}
/* 撮った節の記録（検証スクリプトと結合スクリプトが読む） */
const hoShotLog = [];
const KEY_PART = { PC3_2_1: 'その1', PC3_2_2: 'その2' };   /* 1ページが2つの追加HOに分かれる物（PC3 追加HO②） */
async function hoLobbyShots(page, pageId, sel, where) {
  const pg = HO_BY_PAGE[pageId];
  if (!pg) { problems.push('HOの節表が無い：' + pageId); return 0; }
  const made = await sectionShots(page, sel, (h, i) => {
    const sec = matchHoSection(pg, h.text, h.tag === 'H1');
    if (!sec) { hoShotLog.push({ pageId, heading: h.text, unit: null }); return null; }
    const unit = 'HO:' + pageId + ':' + sec.idx + '_' + sec.key;
    hoShotLog.push({ pageId, heading: h.text, unit, secIdx: sec.idx, key: sec.key });
    return {
      unit,
      caption: 'ゲーム画面：' + where + '「' + (sec.heading || '冒頭') + '」',
      meta: { pageId, kind: 'ho', heading: sec.heading || '（冒頭）', tab: where },
    };
  });
  if (!made) problems.push('HOの節が撮れない：' + pageId);
  return made;
}

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
  /* 2026-11-14：ゲームの最初の札の初期表示が「はじめに」になったので、個人HOを撮る前に「あなたのHO」を押す（押さないと全員「はじめに」になる） */
  await clickAct(t, '[data-act=lbDoc][data-k=ho]');
  const n = await scrollShots(t, `n-ho-${p.toLowerCase()}-1`, LBSEL, (i, n) => `最初の HO の画面：${p} ${NAMES[p]} の「あなたのHO」タブ（${i}/${n}・文書の欄を上から順にスクロールして撮影）`);
  /* 3列比較の右列：HO①の節ごとの画面（同じ「あなたのHO」の文書を、見出しごとに撮る） */
  await hoLobbyShots(t, `n-ho-${p.toLowerCase()}-1`, LBSEL, `${p} ${NAMES[p]} の「あなたのHO」`);
  checks['ho_' + p] = (await textOf(t, LBSEL)).slice(0, 80).replace(/\s+/g, ' ');
  if (!n) problems.push(p + ' HO が撮れない');
}
await tabs.PC1.bringToFront();
await clickAct(tabs.PC1, '[data-act=lbDoc][data-k=commonHO]');
checks.lobbyCommonHO = await textOf(tabs.PC1, LBSEL);
await scrollShots(tabs.PC1, 'n-ho-common', LBSEL, (i, n) => `最初の HO の画面：「共通HO」タブ（PC1 のタブ・${i}/${n}・スクロールして撮影）`);
await hoLobbyShots(tabs.PC1, 'n-ho-common', LBSEL, '「共通HO」');
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

/* ---------- 4-6. 項目ごとの実画面（3列比較の右列：全部屋・全カード・品・全追加HO・技能の注記） ---------- */
const PAGE_OF_ADDHO = key => {
  const m = /^(PC\d)_(\d)/.exec(key);
  if (!m) return null;
  const num = key === 'PC3_2_1' || key === 'PC3_2_2' ? 2 : Number(m[2]);
  return 'n-ho-pc' + m[1].slice(2) + '-' + num;
};
async function clipEl(page, sel) {
  return await page.evaluate(sel => {
    const el = document.querySelector(sel); if (!el) return null;
    const r = el.getBoundingClientRect();
    const h = Math.min(r.height, innerHeight - Math.max(0, r.y) - 4);
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: h };
  }, sel);
}

/* 4-6-1. 部屋公開文（全28室）：探索先を選ぶ地図で、部屋パネルを1室ずつ */
try {
  const t = await openState('full', 'PC1');
  const roomIds = await t.evaluate(() => Object.keys(M7Debug.state.rooms));
  let n = 0;
  for (const id of roomIds) {
    await t.evaluate(id => { const u = M7Debug.ui; u.selRoom = id; u.selFloor = id[0]; M7Debug.paint(true); }, id);
    await sleep(130);
    const box = await clipEl(t, '.sel-info .ri-panel');
    const desc = (await t.evaluate(() => { const d = document.querySelector('.sel-info .ri-desc'); return d ? d.innerText : ''; })).trim();
    if (!box) { unitNoShotReason['ROOM:' + id] = '部屋パネルが出ない（状態：' + ST.info.full + '）'; continue; }
    await shotClip(t, 'ROOM:' + id, 'ゲーム画面：探索先を選ぶ地図で「' + id + '」を選んだときの部屋パネル（公開文）', box, { pageId: 'n-card-rooms', kind: 'room', heading: id });
    if (!desc) unitNoShotReason['ROOM:' + id] = '部屋パネルに公開文が出ない（未入室の部屋として出ている）';
    n++;
  }
  log('部屋の公開文：' + n + '/' + roomIds.length);
  await stateErrors(t, 'full/rooms'); await t.close();
} catch (e) { problems.push('部屋の公開文：' + e.message.split('\n')[0]); }

/* 4-6-2. カード（144枚）：共有できるカードは中央「# 共有カード」、本人だけのカードは手元の「情報」 */
try {
  const t = await openState('full', 'PC1');
  const list = await t.evaluate(() => {
    const D = window.M7Data || {}, M = window.M7Manuscript || { cards: {} };
    return Object.keys(M7Debug.state.cards).map(id => {
      const d = (D.infos || {})[id] || null, c = (M.cards || {})[id] || null;
      return {
        id, hasInfo: !!d, title: (d && d.title) || (c && c.title) || id, kind: (c && c.kind) || null,
        personal: !!(d && d.personal), expertOnly: !!(d && d.expertOnly), noShare: !!(d && d.noShare),
        viewer: (d && d.viewer) || null,
      };
    });
  });
  const ownerOf = {};
  for (const pc of ['PC1', 'PC2', 'PC3', 'PC4']) {
    const tab = pc === 'PC1' ? t : await openState('full', pc);
    const mine = await tab.evaluate(pc => Object.keys(M7Debug.state.cards).filter(id => (M7Debug.state.cards[id].owners || []).includes(pc)).map(id => [id, M7Debug.state.cards[id].owner || pc]), pc);
    for (const [id, ow] of mine) ownerOf[id] = ow;
    if (pc !== 'PC1') await tab.close();
  }
  const shareOk = list.filter(x => x.hasInfo && !x.personal && !x.expertOnly && !x.noShare && !x.viewer);
  const selfOnlyCards = list.filter(x => x.hasInfo && (x.personal || x.expertOnly || x.noShare || x.viewer));
  /* (a) 中央「共有カード」：共有できるカードを全員公開にして、1枚ずつ本文を撮る */
  await t.evaluate(() => { M7Debug.ui.center = 'cards'; M7Debug.ui.cardCat = 'すべて'; });
  for (const c of shareOk) {
    await t.evaluate(id => {
      const s = M7Debug.state.cards[id];
      s.status = 'SHARED'; s.sharedBy = s.owner || 'PC1'; s.sharedPhase = 3;
      M7Debug.ui.cardSel = id; M7Debug.paint(true);
    }, c.id);
    await sleep(90);
    const box = await clipEl(t, '.cv-detail');
    if (!box) { unitNoShotReason['CARD:' + c.id] = '共有カードの本文の枠が出ない'; continue; }
    await shotClip(t, 'CARD:' + c.id, 'ゲーム画面：共有カード「' + c.title + '」（中央の # 共有カード で開いた本文）', box, { pageId: null, kind: 'card', heading: c.title });
  }
  /* (b) 手元の「情報」：本人だけのカード・共有できないカード */
  for (const pc of ['PC1', 'PC2', 'PC3', 'PC4']) {
    const cur = pc === 'PC1' ? t : await openState('full', pc);
    const mine = selfOnlyCards.filter(c => ownerOf[c.id] === pc || c.viewer === pc || (c.viewer && c.viewer === pc));
    if (mine.length) {
      await cur.evaluate(() => { M7Debug.ui.center = 'auto'; M7Debug.ui.handTab = 'info'; M7Debug.ui.fold = { 'h-own': false, 'h-priv': false, 'h-shared': false }; });
      for (const c of mine) {
        const ok = await cur.evaluate(id => {
          const ui = M7Debug.ui; ui.pvOpenCard = id; ui.pvRead = ui.pvRead || {}; ui.pvRead[id] = 1;
          ui.handTab = 'info'; ui.fold = { 'h-own': false, 'h-priv': false, 'h-shared': false };
          M7Debug.paint(true);
          const el = document.querySelector('.infocard[data-card="' + id + '"]');
          if (!el) return false;
          const cont = el.closest('[data-scroll]');
          if (cont) cont.scrollTop = Math.max(0, el.offsetTop - cont.offsetTop - 8);
          el.scrollIntoView({ block: 'nearest' });
          return true;
        }, c.id);
        if (!ok) { unitNoShotReason['CARD:' + c.id] = '手元の「情報」に本文の枠が出ない（' + pc + ' の画面）'; continue; }
        await sleep(90);
        const box = await clipEl(cur, '.infocard[data-card="' + c.id + '"]');
        if (!box) { unitNoShotReason['CARD:' + c.id] = '手元の情報カードの枠が画面に無い（' + pc + ' の画面）'; continue; }
        await shotClip(cur, 'CARD:' + c.id, 'ゲーム画面：' + pc + ' の手元「情報」のカード「' + c.title + '」（本人だけのカード）', box, { pageId: null, kind: 'card', heading: c.title });
      }
    }
    if (pc !== 'PC1') await cur.close();
  }
  /* (c) ゲームにカードの画面が無い物（読み合わせ・ED だけで出る枠）は理由を明記（別の画像を流用しない）
     状態からは消える（D.infos に無いカード）ので、原稿の全カードの一覧から数える */
  const allCards = (() => {
    const req = createRequire(path.join(SG, 'package.json'));
    const M = req('./src/manuscript.js');
    return Object.entries(M.cards).map(([id, c]) => ({ id, title: c.title }));
  })();
  for (const c of allCards) {
    const u = 'CARD:' + c.id;
    if (unitShots[u] || unitNoShotReason[u]) continue;
    unitNoShotReason[u] = 'ゲーム内に情報カードの画面が無い（「' + c.title + '」は読み合わせ・ED・GM資料の中でだけ出る。カードとして配られない）';
  }
  /* 07 の重複見出しと 08 の Disgord の記録は、実カードの画面を同じ単位に紐付ける（画像は同じ物を指す） */
  const alias = [['CARD:INFO-N-STYLE@07', 'CARD:INFO-N-STYLE'], ['CARD:INFO-E-DISGORD1_2', 'CARD:INFO-E-DISGORD1']];
  for (const [to, from] of alias) {
    if (unitShots[from]) { unitShots[to] = unitShots[from].map(x => Object.assign({}, x, { caption: x.caption + '（同じ見出しの別ページ）' })); unitMeta[to] = Object.assign({}, unitMeta[from] || {}, { aliasOf: from }); }
    else unitNoShotReason[to] = '実カードの画面が撮れていない（' + from + '）';
  }
  /* 抽出側（Task 3）の CARD_DOC の綴りは「@rule_hideNone」（コロン無し）。両方の綴りで同じ画像を引けるようにする */
  for (const [to, from] of [['CARD_DOC:n-card-skill:@rule_hideNone', 'CARD_DOC:n-card-skill:@rule:hideNone'], ['CARD_DOC:n-card-skill:@rule_lure', 'CARD_DOC:n-card-skill:@rule:lure']]) {
    if (unitShots[from]) { unitShots[to] = unitShots[from].map(x => Object.assign({}, x, { caption: x.caption + '（抽出側の綴りでも同じ画面）' })); unitMeta[to] = Object.assign({}, unitMeta[from] || {}, { aliasOf: from }); }
  }
  /* 08 の「エドガーへの手紙」は ED の読み合わせでだけ出る（ゲームにカードの画面が無い）。単位の形が CARD でも CARD_DOC でも同じ理由を出す */
  unitNoShotReason['CARD_DOC:n-card-case:INFO-E-LETTER'] = unitNoShotReason['CARD:INFO-E-LETTER']
    || 'ゲーム内にカードの画面が無い（EDの読み合わせでだけ出る）';
  log('カード：共有 ' + shareOk.length + ' 枚／本人だけ ' + selfOnlyCards.length + ' 枚／画面なし ' + list.filter(x => !x.hasInfo).length + ' 枚');
  await stateErrors(t, 'full/cards'); await t.close();
} catch (e) { problems.push('カードの実画面：' + e.message.split('\n')[0]); }

/* 4-6-3. 品の一覧（09）：所持品の画面で、種類（節）ごとにまとめて撮る */
try {
  const t = await openState('full', 'PC1');
  await t.evaluate(() => { M7Debug.ui.center = 'auto'; M7Debug.ui.handTab = 'items'; M7Debug.paint(true); });
  await sleep(200);
  const boxes = await t.evaluate(() => {
    const cont = document.querySelector('[data-scroll="hand-items"]'); if (!cont) return null;
    const cr = cont.getBoundingClientRect(), st = cont.scrollTop;
    return {
      c: { x: cr.x, y: cr.y, w: cr.width, h: cr.height, ch: cont.clientHeight, sh: cont.scrollHeight },
      rows: [...document.querySelectorAll('.item-card')].map(e => {
        const r = e.getBoundingClientRect(), k = e.querySelector('.ic-kind');
        return { kind: k ? k.innerText.trim() : '', top: r.top - cr.top + st, bottom: r.bottom - cr.top + st };
      }),
    };
  });
  const SEC = { '消耗品': 0, 'お宝': 1, 'お宝・使える': 2, '装備': 3, '道具': 4, '素材': 5 };
  const groups = [];
  for (const r of (boxes ? boxes.rows : [])) {
    const sec = SEC[r.kind];
    if (sec == null) continue;
    const last = groups[groups.length - 1];
    if (last && last.sec === sec) last.bottom = Math.max(last.bottom, r.bottom);
    else groups.push({ sec, kind: r.kind, top: r.top, bottom: r.bottom });
  }
  const C = boxes.c, limit = Math.max(0, C.sh - C.ch);
  for (const g of groups) {
    const unit = 'ITEMSEC:n-card-items:' + g.sec;
    let y = Math.min(Math.max(0, g.top - 4), limit), part = 1;
    while (true) {
      await t.evaluate(([y]) => { const c = document.querySelector('[data-scroll="hand-items"]'); if (c) c.scrollTop = y; }, [y]);
      await sleep(140);
      const top = C.y + Math.max(0, g.top - y);
      const bottom = Math.min(C.y + C.h, C.y + (g.bottom - y));
      const endOnScreen = C.y + (g.bottom - y);
      if (bottom - top >= 24) {
        const cap = 'ゲーム画面：手元「所持品」の「' + g.kind + '」（' + g.sec + '番目の節）' + (part > 1 ? '（つづき・' + part + '枚目）' : '');
        await shotClip(t, unit, cap, { x: C.x + 1, y: top, width: C.w - 2, height: bottom - top }, { pageId: 'n-card-items', kind: 'itemsec', heading: g.kind });
      }
      if (y >= limit || endOnScreen <= C.y + C.h - 2) break;
      const next = Math.min(limit, y + Math.floor(C.ch * 0.9));
      if (next === y) break;
      y = next; part++;
      if (part > 10) break;
    }
    if (g.sec < 6) {
      const unitPl = 'ITEMSEC:n-card-items-pl:' + g.sec;
      unitShots[unitPl] = unitShots[unit].map(x => Object.assign({}, x, { caption: x.caption + '（配布版の同じ節）' }));
      unitMeta[unitPl] = Object.assign({}, unitMeta[unit] || {}, { pageId: 'n-card-items-pl' });
    }
  }
  unitNoShotReason['ITEMSEC:n-card-items:6'] = 'GM専用の注記（鑑定で分かることは《鑑定》の対象選択で1品ずつ出る。一覧の画面は無い）';
  log('品の節：' + groups.map(g => g.kind + '=' + g.sec).join(' / '));
  await stateErrors(t, 'full/items'); await t.close();
} catch (e) { problems.push('品の一覧：' + e.message.split('\n')[0]); }

/* 4-6-4. 追加HO（16キー／15ページ）：読み合わせの段で、追加HOの窓を1通ずつ開いて節ごとに撮る */
try {
  for (const pc of ['PC1', 'PC2', 'PC3', 'PC4']) {
    const t = await openState('allho', pc);
    const keys = await t.evaluate(pc => Object.keys(M7Debug.state.addHO).filter(k => M7Debug.state.addHO[k].pc === pc), pc);
    for (const key of keys) {
      const pageId = PAGE_OF_ADDHO(key);
      const page = HO_BY_PAGE[pageId];
      if (!page) { unitNoShotReason['HO:' + pageId + ':*'] = 'HOのページ表に無い：' + key; continue; }
      await t.evaluate(key => {
        const s = M7Debug.state;
        for (const k of Object.keys(s.addHO)) s.addHO[k].read = (k !== key);
        M7Debug.ui.addhoLater = {}; M7Debug.paint(true);
      }, key);
      await sleep(260);
      const has = await t.locator('.modal.on.addho').count();
      if (!has) { unitNoShotReason['HO:' + pageId + ':*'] = '追加HOの窓が開かない（' + key + '・段 ' + ST.info.allho + '）'; continue; }
      const title = (await textOf(t, '.modal.on.addho h2')).trim();
      const introSec = KEY_PART[key] ? (page.secs.find(s => s.heading.includes(KEY_PART[key])) || page.secs[0]) : page.secs[0];
      const made = await sectionShots(t, '.modal.on.addho .doc.mini', (h, i) => {
        if (h.tag === 'INTRO') return {
          unit: 'HO:' + pageId + ':' + introSec.idx + '_' + introSec.key,
          caption: 'ゲーム画面：追加HOの窓「' + title + '」（' + key + '）の冒頭',
          meta: { pageId, kind: 'ho', heading: introSec.heading || '（冒頭）', tab: '追加HOの窓', key },
          opt: { alsoPage: pageId },
        };
        const sec = matchHoSection(page, h.text, false);
        if (!sec) { hoShotLog.push({ pageId, key, heading: h.text, unit: null }); return null; }
        hoShotLog.push({ pageId, key, heading: h.text, unit: 'HO:' + pageId + ':' + sec.idx + '_' + sec.key, secIdx: sec.idx, key_: sec.key });
        return {
          unit: 'HO:' + pageId + ':' + sec.idx + '_' + sec.key,
          caption: 'ゲーム画面：追加HOの窓「' + title + '」（' + key + '）の「' + sec.heading + '」',
          meta: { pageId, kind: 'ho', heading: sec.heading, tab: '追加HOの窓', key },
        };
      }, true);
      if (!made) problems.push('追加HOの節が撮れない：' + key);
      /* 1ページが2つの追加HOに分かれる物（PC3 追加HO②）は、ページの冒頭（0_intro）が GM 注だけで画面に出ない。
         その場合は「その1」の画面を同じ単位に紐付け、理由も残す（別の通の画像を流用しない） */
      const uIntro = 'HO:' + pageId + ':' + introSec.idx + '_' + introSec.key;
      const u0 = 'HO:' + pageId + ':0_intro';
      if (introSec.idx !== 0 && unitShots[uIntro] && !unitShots[u0]) {
        unitShots[u0] = unitShots[uIntro].map(x => Object.assign({}, x, { caption: x.caption + '（このページの冒頭は GM 注だけで、画面には出ない。' + key + ' の冒頭を同じ単位に紐付け）' }));
        unitMeta[u0] = Object.assign({}, unitMeta[uIntro], { heading: '（冒頭・画面には出ない）', aliasOf: uIntro });
      }
    }
    await stateErrors(t, 'allho/' + pc); await t.close();
  }
} catch (e) { problems.push('追加HOの実画面：' + e.message.split('\n')[0]); }

/* 4-6-5. 07 の @rule の節（隠す・誘引）：技能の欄の、その技能の行を撮る */
try {
  const SPEC = [
    { pc: 'PC4', skill: 'hide', unit: 'CARD_DOC:n-card-skill:@rule:hideNone', caption: 'ゲーム画面：エドガーの手元「技能」の《何もなかったことにする》の行（07 の「技能《隠す》」）' },
    { pc: 'PC2', skill: 'lure', unit: 'CARD_DOC:n-card-skill:@rule:lure', caption: 'ゲーム画面：ヴィオラの手元「技能」の《誘引》の行（07 の「ヴィオラの《誘引》」）' },
  ];
  for (const s of SPEC) {
    const t = await openState('full', s.pc);
    await t.evaluate(() => { M7Debug.ui.center = 'auto'; M7Debug.ui.handTab = 'skill'; M7Debug.paint(true); });
    await sleep(160);
    const box = await clipEl(t, 'button.sk[data-key="' + s.skill + '"]');
    if (!box) { unitNoShotReason[s.unit] = '技能の欄にその技能の行が出ない（' + s.pc + ' の画面）'; await t.close(); continue; }
    await shotClip(t, s.unit, s.caption, { x: box.x, y: box.y, width: VW - box.x - 8, height: Math.max(box.height, 90) }, { pageId: 'n-card-skill', kind: 'card_doc', heading: s.skill });
    await stateErrors(t, 'full/skill'); await t.close();
  }
} catch (e) { problems.push('技能の注記：' + e.message.split('\n')[0]); }

/* 4-6-6. 単位IDの綴りの突き合わせ（抽出側 Task 3 の unit_id で必ず引けるようにする）
   - CARD_DOC は抽出側が「@rule_hideNone」（コロン無し）で出すので、その綴りにも同じ画像を登録する
   - HO は「page_id＋節番号」で同じ物を指しているか確かめ、違う綴りがあれば理由を残す（黙って欠けにしない） */
{
  const mirror = [['CARD_DOC:n-card-skill:@rule_hideNone', 'CARD_DOC:n-card-skill:@rule:hideNone'], ['CARD_DOC:n-card-skill:@rule_lure', 'CARD_DOC:n-card-skill:@rule:lure']];
  const aliased = [];
  for (const [to, from] of mirror) {
    if (unitShots[to]) continue;
    if (!unitShots[from]) { unitNoShotReason[to] = '実画面が撮れていない（' + from + '）'; continue; }
    unitShots[to] = unitShots[from].map(x => Object.assign({}, x, { caption: x.caption + '（抽出側の綴りでも同じ画面）' }));
    unitMeta[to] = Object.assign({}, unitMeta[from] || {}, { aliasOf: from });
    aliased.push(to + ' ← ' + from);
  }
  if (aliased.length) log('単位名の綴り合わせ：' + aliased.join(' / '));
}

await browser.close();
server.close();

/* ---------- 5. manifest ---------- */
/* 原稿の版（どの時点の原稿を取り込んだか。プレビューの明示に使う） */
const crypto = await import('node:crypto');
function dirDigest(root) {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(md|txt)$/i.test(e.name)) files.push(p);
    }
  })(root);
  files.sort();
  const h = crypto.createHash('sha256');
  let latest = 0;
  for (const f of files) { h.update(path.relative(root, f).replace(/\\/g, '/') + '\0' + fs.readFileSync(f)); try { latest = Math.max(latest, fs.statSync(f).mtimeMs); } catch (e) {} }
  return { files: files.length, sha256: h.digest('hex'), latest };
}
let msDigest = { files: 0, sha256: '', latest: 0 };
try { msDigest = dirDigest(manuscriptRoot); } catch (e) { problems.push('原稿の指紋が取れない：' + e.message.split('\n')[0]); }
/* 原稿の日付は「いちばん新しいファイル」の日付（フォルダの更新時刻ではない） */
const msDay = msDigest.latest ? new Date(msDigest.latest).toISOString().slice(0, 10) : '?';
/* 期待する単位と、撮れた／撮れないの数（抜粋禁止の検査に使う） */
const expectHo = [];
for (const pg of HO_PAGES) for (const s of pg.secs) expectHo.push('HO:' + pg.pageId + ':' + s.idx + '_' + s.key);
const expectCards = (() => {
  try {
    const req = createRequire(path.join(SG, 'package.json'));
    const M = req('./src/manuscript.js');
    return Object.keys(M.cards).map(id => 'CARD:' + id)
      .concat(['CARD:INFO-N-STYLE@07', 'CARD:INFO-E-DISGORD1_2']);
  } catch (e) { problems.push('カードの一覧が読めない：' + e.message.split('\n')[0]); return []; }
})();
const expectRooms = (() => { try { const req = createRequire(path.join(SG, 'package.json')); const dm = req('./src/data.js'); const D = dm.D || dm; return Object.keys(D.rooms).map(id => 'ROOM:' + id); } catch (e) { return []; } })();
const expectItems = ['ITEMSEC:n-card-items:0', 'ITEMSEC:n-card-items:1', 'ITEMSEC:n-card-items:2', 'ITEMSEC:n-card-items:3', 'ITEMSEC:n-card-items:4', 'ITEMSEC:n-card-items:5', 'ITEMSEC:n-card-items:6',
  'ITEMSEC:n-card-items-pl:0', 'ITEMSEC:n-card-items-pl:1', 'ITEMSEC:n-card-items-pl:2', 'ITEMSEC:n-card-items-pl:3', 'ITEMSEC:n-card-items-pl:4', 'ITEMSEC:n-card-items-pl:5'];
/* 07 の @rule の節（抽出側の綴りと撮影側の綴りの両方）と、08 の手紙（画面が無いので理由） */
const expectDocs = ['CARD_DOC:n-card-skill:@rule:hideNone', 'CARD_DOC:n-card-skill:@rule:lure',
  'CARD_DOC:n-card-skill:@rule_hideNone', 'CARD_DOC:n-card-skill:@rule_lure', 'CARD_DOC:n-card-case:INFO-E-LETTER'];
const missing = [];
for (const u of expectHo.concat(expectCards, expectRooms, expectItems, expectDocs)) if (!unitShots[u] && !unitNoShotReason[u]) missing.push(u);
if (missing.length) problems.push('単位の画像が無い（' + missing.length + '件）：' + missing.slice(0, 12).join(', '));
const shotCount = Object.keys(unitShots).length, reasonCount = Object.keys(unitNoShotReason).length;

const manifest = {
  builtAt: new Date().toISOString(),
  gameCommit, gameDirty: !!gameDirty,
  manuscriptRoot,
  manuscriptSnapshot: { date: msDay, files: msDigest.files, sha256: msDigest.sha256 },
  importWarnings: importWarnings.length,
  importWarningList: importWarnings,
  viewport: { width: VW, height: VH, deviceScaleFactor: DSF },
  /* 実画面はプレビュー（本番未デプロイ）。この版・この原稿の画面であることを必ず画面に出す */
  preview: true,
  liveDeployed: false,
  previewLabel: 'プレビュー（ゲーム ' + gameCommit + ' ＋ ' + msDay + 'の本仕様原稿 ' + (msDigest.sha256 || '').slice(0, 8) + ' 取込・本番未デプロイ）',
  unitShots,
  unitNoShotReason,
  unitMeta,
  unitCounts: { units: shotCount, noShot: reasonCount, images: Object.values(unitShots).reduce((a, b) => a + b.length, 0), expected: expectHo.length + expectCards.length + expectRooms.length + expectItems.length + expectDocs.length, missing: missing.length },
  hoPages: HO_PAGES.map(p => ({ pageId: p.pageId, file: p.file, sections: p.secs.map(s => ({ idx: s.idx, key: s.key, heading: s.heading })) })),
  hoShotLog,
  pages,
};
fs.writeFileSync(path.join(OUTDIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(BUILD, 'checks.json'), JSON.stringify({ checks, liveErrors, consoleErrors, notFound: [...notFound], problems, states: ST.info, missingStates: ST.missing, unitCounts: manifest.unitCounts, missingUnits: missing }, null, 2));
let total = 0; for (const f of files) total += fs.statSync(path.join(OUTDIR, f)).size;
log('完了：' + files.length + '枚・' + (total / 1048576).toFixed(1) + 'MB → ' + rel(OUTDIR));
log('項目の実画面：' + shotCount + '単位・' + manifest.unitCounts.images + '枚／画面が無い単位：' + reasonCount + '（欠け ' + missing.length + '）');
log('ゲームの JS エラー：' + JSON.stringify(liveErrors) + ' ／ console：' + consoleErrors.length);
if (problems.length) log('撮れなかった・気になった所：\n  - ' + problems.join('\n  - '));
