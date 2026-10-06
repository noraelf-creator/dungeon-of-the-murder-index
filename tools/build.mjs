// content/ のMarkdownから data/site-data.js を作る（ダンジョン・オブ・ザ・マーダー 改訂版）。
// 使い方: node tools/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';

const ROOT = path.resolve('.');
const C = (p) => path.join(ROOT, 'content', p);
const REV = (p) => C(path.join('改訂版', p));

// ---------- 分類（大題）と各ページ（中題） ----------
const GROUPS = [
  { id: 'start', label: 'はじめに', icon: 'home' },
  { id: 'ho', label: 'HO', icon: 'doc' },
  { id: 'read', label: '読み合わせ', icon: 'chat' },
  { id: 'card', label: 'カード', icon: 'cards' },
  { id: 'rule', label: 'ルール', icon: 'dice' },
  { id: 'gm', label: 'GM資料', icon: 'flag' },
  { id: 'canon', label: '正本（真相）', icon: 'key' },
  { id: 'check', label: 'チェック', icon: 'check' },
  { id: 'play', label: '仮想プレイ', icon: 'dice' },
  { id: 'ref', label: '参照・旧版', icon: 'books' },
  { id: 'log', label: '変更履歴', icon: 'clock' },
];
const P = [];
const add = (group, sub, id, nav, file, kind = 'doc', audience = '') => P.push({ group, sub, id, nav, file, kind, audience });

add('start', '', 'about', 'このサイトの使い方', C('サイトの使い方.md'), 'doc', '');
add('start', '', 'master', 'PROJECT_MASTER（全体の案内）', REV('PROJECT_MASTER.md'), 'doc', '制作');
add('start', '', 'report', 'REPORT（評価と課題）', REV('REPORT.md'), 'doc', '制作');
add('start', '', 'directive', '作者指示の反映表（10/06）', REV('03_改稿/00_作者指示の反映表.md'), 'doc', '制作');

const HO = (f) => REV('03_改稿/HO/' + f);
add('ho', '共通', 'ho-common', '共通HO（ギルドの依頼書）', HO('00_共通HO.md'), 'ho', 'PL配布');
const hoFiles = fs.readdirSync(REV('03_改稿/HO'));
const pcs = [['1', 'ミレイユ'], ['2', 'ヴィオラ'], ['3', 'リュシア'], ['4', 'ガルド']];
for (const [n, name] of pcs) {
  for (const f of hoFiles.filter((x) => x.startsWith(`PC${n}_${name}_`)).sort()) {
    const stage = f.replace(`PC${n}_${name}_`, '').replace(/\.md$/, '');
    const num = { '①': '1', '②': '2', '③': '3' }[stage[0]] || 'x';
    add('ho', `PC${n} ${name}`, `ho-pc${n}-${num}`, stage.replace(/_/g, ' '), HO(f), 'ho', n === '4' ? 'PL配布（本人のみ）' : 'PL配布');
  }
}

const readSubs = [
  ['オープニング', ['R00']], ['P1 入場と襲撃', ['R01', 'R02']], ['P3 崩落と分断', ['R03', 'R04', 'R05', 'R06']],
  ['P4 レオン救出', ['R07']], ['P6 守護者門', ['R08', 'R09', 'R10', 'R11']], ['P7〜P8', ['R12', 'R13']],
  ['P9 祭壇前の崩壊', ['R14', 'R15', 'R16', 'R17']], ['P10〜P12', ['R18', 'R19', 'R20']],
  ['真相・エンディング', ['R21', 'R22', 'R23']], ['共通', ['R24']],
];
const readDir = REV('03_改稿/読み合わせ');
const readFiles = fs.readdirSync(readDir);
for (const [sub, ids] of readSubs) for (const rid of ids) {
  const f = readFiles.find((x) => x.startsWith(rid + '_'));
  const nav = rid + ' ' + f.replace(/^R\d+_/, '').replace(/\.md$/, '').replace(/_/g, '／');
  add('read', sub, rid.toLowerCase(), nav, path.join(readDir, f), 'read', /^R2[123]/.test(rid) ? 'PL配布（最後）' : 'PL配布');
}

const CARD = (f) => REV('03_改稿/カード/' + f);
add('card', '場所', 'card-rooms', '部屋公開文（27部屋）', CARD('01_部屋公開文.md'), 'card', 'PL配布');
add('card', '調査カード', 'card-upper', '上層（U1〜U12）', CARD('02_調査カード_上層.md'), 'card', 'PL配布');
add('card', '調査カード', 'card-lower', '下層（L0〜L13）', CARD('03_調査カード_下層.md'), 'card', 'PL配布');
add('card', '調査カード', 'card-secret', '秘密区画', CARD('04_秘密区画カード.md'), 'card', 'PL配布');
add('card', '物語・分断', 'card-rec', '記録片【物語】（部屋LSの報酬）', CARD('05_記録片カード（部屋LSの報酬）.md'), 'card', 'PL配布');
add('card', '物語・分断', 'card-split', '分断LS・同行イベント', CARD('06_分断LS・同行イベントのカード.md'), 'card', 'PL配布');
add('card', '技能・事件', 'card-skill', '技能で得る専有カード', CARD('07_技能・専有カード.md'), 'card', 'PL配布');
add('card', '技能・事件', 'card-case', '事件調査（P10・P11）', CARD('08_事件調査カード（P10・P11）.md'), 'card', 'PL配布');
add('card', '品', 'card-items', '品の一覧', CARD('09_品の一覧.md'), 'card', 'PL配布');

const RULE = (f) => REV('03_改稿/ルール/' + f);
add('rule', 'プレイヤー向け', 'rule-phase', 'フェイズ進行表', RULE('フェイズ進行表（プレイヤー向け）.md'), 'doc', 'PL配布');
add('rule', 'プレイヤー向け', 'rule-ls', 'ライブセレクションの説明', RULE('ライブセレクション（プレイヤー向け説明）.md'), 'doc', 'PL配布');
add('rule', 'プレイヤー向け', 'rule-skill', 'スキル一覧（改定版）', RULE('スキル一覧（改定版・プレイヤー向け）.md'), 'doc', 'PL配布');
add('rule', 'GM・制作者向け', 'rule-ls-gm', 'ライブセレクション一覧と結果表', RULE('ライブセレクション一覧と結果表（GM）.md'), 'doc', 'GM専用');
add('rule', 'GM・制作者向け', 'rule-room', '部屋ライブセレクション一覧', RULE('部屋ライブセレクション一覧（GM）.md'), 'doc', 'GM専用');
add('rule', 'GM・制作者向け', 'rule-chaser', '追跡者の位置の仕様案（作者判断待ち）', RULE('追跡者の位置の仕様案（制作者向け）.md'), 'doc', '制作');

add('gm', '', 'gm-guide', 'GM進行ガイド', REV('03_改稿/GM進行ガイド.md'), 'doc', 'GM専用');
add('gm', '', 'gm-dist', '配布物の一覧と配るタイミング', REV('05_完成版/配布物の一覧と配るタイミング.md'), 'doc', 'GM専用');
add('gm', '', 'gm-impl', '実装反映メモ（Codex向け）', REV('03_改稿/実装反映メモ（Codex向け）.md'), 'doc', '制作');

add('canon', '', 'canon-truth', '真相', REV('01_正本/真相.md'), 'doc', 'GM専用');
add('canon', '', 'canon-tl', 'タイムライン', REV('01_正本/タイムライン.md'), 'doc', 'GM専用');
add('canon', '', 'canon-chars', 'キャラクター表', REV('01_正本/キャラクター表.md'), 'doc', 'GM専用');
add('canon', '', 'canon-clues', '手がかりマップ', REV('01_正本/手がかりマップ.md'), 'doc', 'GM専用');

add('check', '', 'check-structure', '構成チェック', REV('02_チェック/構成チェック.md'), 'doc', '制作');
add('check', '', 'check-integrity', '整合性チェック（校正結果を含む）', REV('02_チェック/整合性チェック.md'), 'doc', '制作');
add('check', '', 'check-inventory', '棚卸し（INVENTORY）', REV('00_INVENTORY.md'), 'doc', '制作');

const PLAY = (f) => REV('04_仮想プレイ/' + f);
add('play', '第1回 標準', 'play1-log', 'ログ', PLAY('第1回_標準プレイ_ログ.md'), 'doc', '制作');
add('play', '第1回 標準', 'play1-rev', '振り返り', PLAY('第1回_振り返り.md'), 'doc', '制作');
add('play', '第2回 難しめ', 'play2-log', 'ログ', PLAY('第2回_難しめプレイ_ログ.md'), 'doc', '制作');
add('play', '第2回 難しめ', 'play2-rev', '振り返り', PLAY('第2回_振り返り.md'), 'doc', '制作');
add('play', '第3回 初心者卓', 'play3-log', 'ログ', PLAY('第3回_初心者卓_ログ.md'), 'doc', '制作');
add('play', '第3回 初心者卓', 'play3-rev', '振り返り', PLAY('第3回_振り返り.md'), 'doc', '制作');
add('play', '第4回 修正後', 'play4', '修正後の再プレイ', PLAY('第4回_修正後の再プレイ.md'), 'doc', '制作');

add('ref', '改訂元（Ver3.4）', 'ref-handoff', 'Ver3.4 引き継ぎ（現行仕様）', C('参照/Ver3.4_引き継ぎ（CHATGPT_HANDOFF）.md'), 'doc', '参照');
add('ref', '改訂元（Ver3.4）', 'ref-readme', 'Ver3.4 README', C('参照/Ver3.4_README.md'), 'doc', '参照');
add('ref', '旧版', 'ref-v2', '旧・制作者確認盤（別画面）', null, 'link', '参照');

add('log', '', 'changelog', 'CHANGELOG', REV('CHANGELOG.md'), 'doc', '制作');

// ---------- 道具 ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (h) => String(h).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const norm = (s) => strip(s).replace(/\s+/g, '').trim();
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
const SPEAKERS = { 'ミレイユ': 'mireille', 'ヴィオラ': 'viola', 'リュシア': 'lucia', 'ガルド': 'gald', 'レオン': 'leon', '追跡者': 'chaser', '組の誰か': 'group' };
const TONES = ['', 'mireille', 'viola', 'lucia', 'gald'];
const NOTE_COL = /^(情報の限界|注意点|注意|備考)$/;
// 制作タグをバッジにする
function badgeTags(html) {
  return html
    .replace(/【修正(F\d+)】/g, '<span class="badge fix">修正$1</span>')
    .replace(/【作者指示】/g, '<span class="badge order">作者指示</span>')
    .replace(/【作者案】/g, '<span class="badge order">作者案</span>')
    .replace(/【追加設定】/g, '<span class="badge add">追加設定</span>')
    .replace(/【調整案】/g, '<span class="badge adj">調整案</span>')
    .replace(/【新】/g, '<span class="badge add">新</span>');
}

function makeCtx(page) {
  const used = new Map();
  const toc = [];
  const aid = (text, kind = 'a') => {
    const base = kind + fnv(norm(text)).toString(36);
    const n = (used.get(base) || 0) + 1; used.set(base, n);
    return n === 1 ? base : base + '-' + n;
  };
  return { page, aid, toc };
}

// ---------- Markdownの描画 ----------
function makeMarked(ctx) {
  const m = new Marked({ gfm: true, breaks: true });
  m.use({ renderer: {
    heading({ tokens, depth, text }) {
      let inner = this.parser.parseInline(tokens);
      const id = ctx.aid(text, 'h');
      const ho = /^▼\s*/.test(text);
      if (ho) inner = inner.replace(/^▼\s*/, '');
      if (depth === 2 || depth === 3) ctx.toc.push({ id, text: strip(inner), level: depth });
      return `<h${depth} id="${id}" class="${ho ? 'ho-sec' : 'h' + depth}" data-a="${id}">${inner}</h${depth}>\n`;
    },
    paragraph({ tokens, text }) {
      const inner = this.parser.parseInline(tokens);
      return `<p data-a="${ctx.aid(text)}">${inner}</p>\n`;
    },
    listitem(item) {
      const inner = this.parser.parse(item.tokens, !!item.loose);
      return `<li data-a="${ctx.aid(item.text)}">${inner}</li>\n`;
    },
    blockquote({ tokens, text }) {
      const inner = this.parser.parse(tokens).replace(/ data-a="[^"]*"/g, '');
      const tag = /^「/.test(text.trim()) ? ' class="tagline"' : '';
      return `<blockquote${tag} data-a="${ctx.aid(text)}">${inner}</blockquote>\n`;
    },
    table(token) { return renderTable.call(this, token, ctx); },
    hr() { return '<hr>\n'; },
    code({ text }) { return `<div class="screen" data-a="${ctx.aid(text)}">${esc(text).replace(/\n/g, '<br>')}</div>\n`; },
  } });
  return m;
}

function renderTable(token, ctx) {
  const P = this.parser;
  const head = token.header.map((c) => strip(P.parseInline(c.tokens)).trim());
  const noteIdx = head.map((h, i) => (NOTE_COL.test(h) ? i : -1)).filter((i) => i >= 0);
  const keep = head.map((_, i) => i).filter((i) => !noteIdx.includes(i));
  const notes = [];
  let html = '<div class="table-wrap"><table>\n<thead><tr>';
  for (const i of keep) html += `<th>${P.parseInline(token.header[i].tokens)}</th>`;
  html += '</tr></thead>\n<tbody>\n';
  for (const row of token.rows) {
    const cells = row.map((c) => P.parseInline(c.tokens));
    const rowText = cells.map(strip).join(' ');
    const id = ctx.aid(rowText, 'r');
    const rowNotes = [];
    for (const i of noteIdx) {
      if (!strip(cells[i]).trim() || /^[-—−]$/.test(strip(cells[i]).trim())) continue;
      const nid = 'n' + id + '-' + i;
      const first = strip(cells[keep[0]]).trim();
      const second = keep[1] !== undefined ? strip(cells[keep[1]]).trim() : '';
      const label = (first.length <= 14 && second ? first + ' ' + second : first).slice(0, 60);
      rowNotes.push(nid);
      notes.push({ nid, label, kind: head[i], body: cells[i] });
    }
    html += `<tr data-a="${id}">`;
    keep.forEach((i, k) => {
      const nw = k === 0 && strip(cells[i]).trim().length <= 8 ? ' class="nw"' : '';
      const mark = k === 0 && rowNotes.length ? rowNotes.map((n) => `<button type="button" class="note-mark" data-note="${n}" title="注意点を開く">注</button>`).join('') : '';
      html += `<td${nw}>${cells[i]}${mark}</td>`;
    });
    html += '</tr>\n';
  }
  html += '</tbody></table></div>\n';
  if (notes.length) {
    html += '<div class="notes-group"><div class="notes-label">備考・注意点</div>\n';
    for (const n of notes) html += `<details class="note caution" id="${n.nid}" data-a="${ctx.aid(n.label + n.kind + strip(n.body))}"><summary><span class="note-chip">${esc(n.kind)}</span>${esc(n.label)}</summary><div class="note-body">${n.body}</div></details>\n`;
    html += '</div>\n';
  }
  return html;
}

// 「> 【GM】…」の行を、たたまれたGM注記にする。:::note も扱う
function splitNotes(md) {
  const out = []; const lines = md.split('\n'); let buf = []; let note = null; let gm = null;
  const flush = () => { if (buf.length) out.push({ type: 'md', text: buf.join('\n') }); buf = []; };
  for (const line of lines) {
    const g = line.match(/^>\s*【GM】\s*(.*)$/);
    if (g) { if (!gm) { flush(); gm = { type: 'note', title: 'GM専用｜GM・アプリ向けの指示', body: [] }; } gm.body.push(g[1], ''); continue; }
    if (gm) { out.push(gm); gm = null; }
    const open = line.match(/^:::note\s*(.*)$/);
    if (!note && open) { flush(); note = { type: 'note', title: open[1].trim(), body: [] }; continue; }
    if (note && line.trim() === ':::') { out.push(note); note = null; continue; }
    if (note) note.body.push(line); else buf.push(line);
  }
  if (gm) out.push(gm);
  if (note) out.push(note);
  flush();
  return out;
}
function noteKind(title) {
  if (/^GM/.test(title)) return 'gm';
  if (/^情報の限界/.test(title)) return 'limit';
  if (/^(注意点|注意)/.test(title)) return 'caution';
  if (/制作|出典|新規執筆/.test(title)) return 'meta';
  return 'info';
}
function noteChip(title) {
  const m = title.match(/^([^｜|]+)[｜|](.+)$/);
  if (m) return `<span class="note-chip">${esc(m[1])}</span>${esc(m[2])}`;
  return esc(title);
}

function renderMd(md, ctx, opts = {}) {
  const mk = makeMarked(ctx);
  let html = '';
  for (const seg of splitNotes(md)) {
    if (seg.type === 'note') {
      const inner = renderMd(seg.body.join('\n'), ctx, opts);
      html += `<details class="note ${noteKind(seg.title)}" data-a="${ctx.aid('note' + seg.title + seg.body.join(''))}"><summary>${noteChip(seg.title)}</summary><div class="note-body">${inner}</div></details>\n`;
      continue;
    }
    html += renderTokens(mk.lexer(seg.text), mk, ctx, opts);
  }
  return html;
}

// カード：「**《タイトル》**　入手条件」の段落からカード枠を作る
const CARD_START = /^\*\*([^*\n]{1,48})\*\*([^\n]*)$/;
function renderTokens(tokens, mk, ctx, opts) {
  let html = '';
  let cardOpen = false;
  const closeCard = () => { if (cardOpen) { html += '</div></section>\n'; cardOpen = false; } };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'space') continue;
    if (t.type === 'heading' && t.depth === 1 && !ctx.h1Done) { ctx.h1Done = true; ctx.h1 = strip(mk.parseInline(t.text)); continue; }
    if (opts.kind === 'card') {
      if (t.type === 'heading' || t.type === 'hr') closeCard();
      const m = t.type === 'paragraph' && t.text.match(CARD_START);
      if (m) {
        closeCard();
        const title = m[1].trim();
        const meta = m[2].trim();
        const id = ctx.aid(title + meta, 'h');
        ctx.toc.push({ id, text: strip(mk.parseInline(title)), level: 3 });
        const tone = /^REC-/.test(title) ? ' rec' : /^INFO-P/.test(title) ? ' split' : /^深度|調査|記録《|台帳|出所/.test(title) ? ' case' : '';
        html += `<section class="cardx${tone}" id="${id}"><header class="cardx-head" data-a="${id}"><span class="cardx-title">${mk.parseInline(title)}</span>${meta ? `<span class="cardx-meta">${mk.parseInline(meta)}</span>` : ''}</header><div class="cardx-body">\n`;
        cardOpen = true;
        continue;
      }
    }
    html += mk.parser([t]);
  }
  closeCard();
  return html;
}

// ---------- 読み合わせ ----------
const LINE_RE = /^([^「」\s*]{1,14}?)(（[^）「」]{1,16}）)?「([\s\S]*)」(（[^）]*）)?$/;
function speakerKey(who) { return SPEAKERS[who] || (who === '地の文' ? 'narr' : 'npc'); }
function renderReading(md, ctx) {
  const lines = md.split('\n');
  let i = 0;
  if (lines[0].startsWith('# ')) { ctx.h1 = lines[0].slice(2).trim(); ctx.h1Done = true; i = 1; }
  while (i < lines.length && !lines[i].trim()) i++;
  // 冒頭の「> …」はこの場面の読み方（GM行はたたむ）
  const head = [];
  while (i < lines.length && /^>/.test(lines[i])) { head.push(lines[i]); i++; }
  let html = '';
  if (head.length) {
    const plain = head.filter((l) => !/^>\s*【GM】/.test(l)).map((l) => l.replace(/^>\s?/, ''));
    const gm = head.filter((l) => /^>\s*【GM】/.test(l));
    if (plain.length) html += `<div class="callout" data-a="${ctx.aid(plain.join(''))}">${renderMd(plain.join('\n\n'), ctx)}</div>\n`;
    if (gm.length) html += renderMd(gm.join('\n'), ctx);
  }
  html += '<div class="script">\n';
  let aside = []; let pending = null; let fence = null;
  const flushAside = () => {
    if (!aside.length) return;
    const text = aside.join('\n').trim(); aside = [];
    if (text) html += `<div class="aside">${renderMd(text, ctx)}</div>\n`;
  };
  const line = (who, mod, say, extra, cls = '') => {
    const key = speakerKey(who);
    html += `<div class="line sp-${key}${cls}" data-a="${ctx.aid(who + say)}"><span class="who">${esc(who)}${mod ? `<small>${esc(mod)}</small>` : ''}</span><span class="say">「${inlineMd(say)}」${extra ? `<small class="cond-note">${esc(extra)}</small>` : ''}</span></div>\n`;
  };
  for (; i < lines.length; i++) {
    const raw = lines[i]; const s = raw.trim();
    if (fence) {
      if (/^```/.test(s)) { html += `<div class="screen" data-a="${ctx.aid(fence.join(''))}">${fence.map((x) => inlineMd(x)).join('<br>')}</div>\n`; fence = null; }
      else fence.push(raw);
      continue;
    }
    if (/^```/.test(s)) { flushAside(); fence = []; continue; }
    if (!s) { pending = pending && pending.sticky ? pending : null; if (aside.length) aside.push(''); continue; }
    if (s === '---') { flushAside(); pending = null; html += '<hr class="sep">\n'; continue; }
    let m;
    if ((m = s.match(/^(#{1,3})\s+(.*)$/))) {
      flushAside(); pending = null;
      const level = m[1].length; const text = m[2];
      if (level === 1) { html += `<div class="line big sp-chaser" data-a="${ctx.aid(text)}"><span class="who"></span><span class="say">${inlineMd(text)}</span></div>\n`; continue; }
      const id = ctx.aid(text, 'h'); ctx.toc.push({ id, text: strip(inlineMd(text)), level });
      html += `<h${level} id="${id}" class="h${level} read-sec" data-a="${id}">${inlineMd(text)}</h${level}>\n`;
      continue;
    }
    if (/^■/.test(s)) { flushAside(); pending = null; html += `<div class="scene" data-a="${ctx.aid(s)}">${esc(s.replace(/^■\s*/, ''))}</div>\n`; continue; }
    if (/^（[\s\S]*）$/.test(s)) { flushAside(); html += `<div class="stage" data-a="${ctx.aid(s)}">${inlineMd(s)}</div>\n`; continue; }
    // 画面表示・カード配布・記録
    if (/^\*\*【(画面|カード|公開ログ|画面の助け舟)/.test(s)) { flushAside(); pending = null; html += `<div class="screen" data-a="${ctx.aid(s)}">${inlineMd(s)}</div>\n`; continue; }
    // 太字だけの行：話者の指定、または「いる人だけ読む」などの見出し
    if ((m = s.match(/^\*\*([^*]{1,40})\*\*$/))) {
      flushAside();
      const label = m[1];
      const sp = label.match(/^([^（\s]{1,8})(（[^）]{1,16}）)?$/);
      if (sp && (SPEAKERS[sp[1]] || /^(ギルド長|声)$/.test(sp[1]))) { pending = { who: sp[1], mod: sp[2] ? sp[2].slice(1, -1) : '', sticky: true }; continue; }
      if (/^組の誰か/.test(label)) { pending = { who: '組の誰か', mod: label.replace(/^組の誰かが読む/, '').replace(/^[（(]|[）)]$/g, ''), sticky: true }; html += `<div class="cond-head" data-a="${ctx.aid(label)}">${inlineMd(label)}</div>\n`; continue; }
      pending = null;
      html += `<div class="cond-head" data-a="${ctx.aid(label)}">${inlineMd(label)}</div>\n`;
      continue;
    }
    // 「- 名前「…」」はその場にいる人だけが読む台詞
    if ((m = s.match(/^-\s+(.*)$/)) && LINE_RE.test(m[1])) {
      flushAside();
      const d = m[1].match(LINE_RE);
      line(d[1], d[2] ? d[2].slice(1, -1) : '', d[3], d[4] ? d[4].slice(1, -1) : '', ' cond');
      continue;
    }
    if ((m = s.match(LINE_RE))) { flushAside(); pending = null; line(m[1], m[2] ? m[2].slice(1, -1) : '', m[3], m[4] ? m[4].slice(1, -1) : ''); continue; }
    if (/^「[\s\S]*」$/.test(s) && pending) { flushAside(); line(pending.who, pending.mod, s.slice(1, -1), ''); continue; }
    aside.push(raw);
  }
  flushAside();
  html += '</div>\n';
  return html;
}
const inlineMk = new Marked({ gfm: true, breaks: true });
const inlineMd = (s) => inlineMk.parseInline(s);

// ---------- 組み立て ----------
const pages = [];
for (const p of P) {
  const ctx = makeCtx(p); ctx.badges = [];
  let html = '';
  if (p.kind === 'link') {
    html = '<div class="callout"><p>改稿前（Ver3.4、2026-09-28）の制作者確認盤は別画面で開きます。27部屋・77カードの原文、推理導線、旧メモが見られます。</p><p><a class="btn primary" href="https://dungeon-of-the-murder-review.pages.dev/" target="_blank" rel="noopener">旧・制作者確認盤を開く</a></p></div>';
    ctx.h1 = '旧・制作者確認盤（Ver3.4）';
  } else {
    const src = fs.readFileSync(p.file, 'utf8').replace(/\r\n/g, '\n');
    if (p.kind === 'read') html = renderReading(src, ctx);
    else html = renderMd(src, ctx, { kind: p.kind });
  }
  html = badgeTags(html);
  let title = ctx.h1 || p.nav;
  if (p.kind === 'ho' && ctx.h1) {
    const hm = ctx.h1.match(/^【あなたは\s*(.+?)】\s*(.*)$/);
    const pcKey = (p.id.match(/^ho-pc(\d)/) || [])[1];
    const tone = pcKey ? TONES[+pcKey] : 'common';
    const name = hm ? hm[1] : ctx.h1.replace(/^【|】/g, ' ').trim();
    const kicker = hm ? hm[2] : (pcKey ? 'PC' + pcKey + '　' + p.sub.replace(/^PC\d\s*/, '') : 'PC全員に配布');
    html = `<div class="ho-hero tone-${tone}"><div class="ho-kicker">${esc(kicker)}</div><div class="ho-name">${esc(name)}</div></div>\n` + html;
    title = name + (hm ? '　' + p.nav : '');
  }
  if (/【作者指示】|【追加設定】|【修正F/.test(fs.existsSync(p.file || '') ? fs.readFileSync(p.file, 'utf8') : '')) {
    if (/【修正F/.test(fs.readFileSync(p.file, 'utf8'))) ctx.badges.push('仮想プレイ後に修正');
  }
  const text = strip(html).replace(/\s+/g, ' ').trim();
  const rel = p.file ? path.relative(path.join(ROOT, 'content'), p.file).replace(/\\/g, '/') : '';
  pages.push({ id: p.id, group: p.group, sub: p.sub, nav: p.nav, kind: p.kind, audience: p.audience, title, badges: ctx.badges, source: rel, toc: ctx.toc, html, text });
}

const data = { version: 'dom-rv1', built: new Date().toISOString(), groups: GROUPS, pages };
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'site-data.js'), 'window.SITE_DATA=' + JSON.stringify(data) + ';\n');
const size = fs.statSync(path.join(ROOT, 'data', 'site-data.js')).size;
console.log('pages:', pages.length, 'size:', (size / 1024).toFixed(0) + 'KB');
for (const g of GROUPS) console.log(' ', g.label, pages.filter((x) => x.group === g.id).length);
