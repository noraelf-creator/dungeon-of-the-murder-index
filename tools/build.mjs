// content/ のMarkdownから data/site-data.js を作る（ダンジョン・オブ・ザ・マーダー 制作INDEX）。
// 使い方: node tools/build.mjs
// - 今の原稿は content/完成版/（tools/sync-content.mjs が 05_完成版 から写す）。配布版とGM版の両方があるものは、GM版（メモつき）だけを載せる。
// - 旧版（2026-10-06）は content/旧版_20261006/ を「参照・旧版」に、前と同じページIDで載せる（共有保存の修正案がそのページに付いたまま残るように）。
import fs from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';

const ROOT = path.resolve('.');
const C = (p) => path.join(ROOT, 'content', p);
const NOW = (p) => C(path.join('完成版', p));
const GM = (p) => NOW(path.join('GM資料', p));
const PL = (p) => NOW(path.join('プレイヤー配布', p));
const OLD = (p) => C(path.join('旧版_20261006', p));

// ---------- 分類（大題）と各ページ（中題） ----------
const GROUPS = [
  { id: 'now', label: '今の状態', icon: 'home' },
  { id: 'ho', label: 'HO', icon: 'doc' },
  { id: 'read', label: '読み合わせ', icon: 'chat' },
  { id: 'card', label: 'カード', icon: 'cards' },
  { id: 'rule', label: 'ルール・進行', icon: 'dice' },
  { id: 'screen', label: '部屋LS・画面の文', icon: 'flag' },
  { id: 'canon', label: '真相・正本（GM専用）', icon: 'key' },
  { id: 'log', label: '変更の記録', icon: 'clock' },
  { id: 'ref', label: '参照・旧版（10/06）', icon: 'books' },
];
const P = [];
const add = (group, sub, id, nav, file, kind = 'doc', audience = '', extra = {}) => P.push({ group, sub, id, nav, file, kind, audience, ...extra });
const must = (f) => { if (!fs.existsSync(f)) throw new Error('ファイルが無い: ' + f); return f; };

// 今の状態
add('now', '', 'n-now', '今の状態（2026-11-04）', must(C('今の状態_20261104.md')), 'doc', '制作');
add('now', '', 'n-spec', '今の仕様（ゲーム）', must(C('今の仕様（ゲーム）.md')), 'doc', 'GM専用');
add('now', '', 'about', 'このサイトの使い方', must(C('サイトの使い方.md')), 'doc', '');
add('now', '資料の案内', 'n-gm-about', 'GM資料の案内', must(GM('00_GM資料の案内.md')), 'doc', 'GM専用');
add('now', '資料の案内', 'n-dist', '配布物の一覧と配るタイミング', must(GM('00_配布物の一覧と配るタイミング.md')), 'doc', 'GM専用');
add('now', '資料の案内', 'n-directive', '作者指示の反映表', must(GM('00_作者指示の反映表.md')), 'doc', '制作');
add('now', '資料の案内', 'n-match', '配布版とGM版の照合（自動）', must(NOW('_配布版との照合.md')), 'doc', '制作');

// HO（GM版＝メモつき。【GM】はたたむ）
const HODIR = GM('HO原本');
add('ho', '共通', 'n-ho-common', '共通HO（ギルドの依頼書）', must(path.join(HODIR, '00_共通HO.md')), 'ho', 'PL配布');
const hoFiles = fs.readdirSync(HODIR);
const PCS = [['1', 'ミレイユ'], ['2', 'ヴィオラ'], ['3', 'ミクシィ'], ['4', 'エドガー']];
const NUM = { '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5', '⑥': '6', '⑦': '7' };
for (const [n, name] of PCS) {
  const fsx = hoFiles.filter((x) => x.startsWith(`PC${n}_${name}_`)).sort();
  if (!fsx.length) throw new Error('HO が無い: ' + name);
  for (const f of fsx) {
    const stage = f.replace(`PC${n}_${name}_`, '').replace(/\.md$/, '');
    const num = NUM[stage[0]] || 'x';
    add('ho', `PC${n} ${name}`, `n-ho-pc${n}-${num}`, stage.replace(/_/g, ' '), path.join(HODIR, f), 'ho', 'PL配布（本人のみ）');
  }
}

// 読み合わせ（GM版）
const READDIR = GM('読み合わせ原本（GMメモつき）');
const readFiles = fs.readdirSync(READDIR).filter((f) => /^R\d+[a-z]?_/.test(f));
const readSubs = [
  ['オープニング', ['R00']], ['P1 入場と襲撃', ['R01', 'R02']], ['P3 崩落と分断', ['R03', 'R04', 'R05', 'R06', 'R06b']],
  ['P4 リック救出', ['R07', 'R07b']], ['P6 守護者門', ['R08', 'R09', 'R10', 'R11']], ['P7〜P8 下層', ['R11b', 'R12', 'R13']],
  ['P9 祭壇前の崩壊', ['R14', 'R15', 'R16', 'R17', 'R17b']], ['P10〜P12', ['R18', 'R19', 'R20']],
  ['真相・エンディング', ['R21', 'R22', 'R23']], ['共通', ['R24']],
];
// 2026-11-03 作者の決定 N11：分断LSのあとの組ごとの読み合わせはゲームでは読まず、密談の画面の文になった（R12 はカードだけ）
const NOT_READ = new Set(['R04', 'R05', 'R06', 'R06b', 'R09', 'R10', 'R11', 'R12', 'R15', 'R16', 'R17', 'R17b']);
const usedRead = new Set();
for (const [sub, ids] of readSubs) for (const rid of ids) {
  const f = readFiles.find((x) => x.startsWith(rid + '_'));
  if (!f) throw new Error('読み合わせが無い: ' + rid);
  usedRead.add(f);
  const nav = rid + ' ' + f.replace(/^R\d+[a-z]?_/, '').replace(/\.md$/, '').replace(/_/g, '／');
  add('read', sub, 'n-' + rid.toLowerCase(), nav, path.join(READDIR, f), 'read', /^R2[123]/.test(rid) ? 'PL配布（最後）' : 'PL配布',
    NOT_READ.has(rid) ? { extraBadges: ['ゲームでは読まない（密談の画面の文へ）'] } : {});
}
for (const f of readFiles) if (!usedRead.has(f)) throw new Error('目次に無い読み合わせ: ' + f);

// カード（GM版）
const CARDDIR = GM('カード原本（GMメモつき）');
const CARD = (f) => must(path.join(CARDDIR, f));
add('card', '場所', 'n-card-rooms', '部屋公開文', CARD('01_部屋公開文.md'), 'card', 'PL配布');
add('card', '調査カード', 'n-card-upper', '上層（U0〜U12）', CARD('02_調査カード_上層.md'), 'card', 'PL配布');
add('card', '調査カード', 'n-card-lower', '下層', CARD('03_調査カード_下層.md'), 'card', 'PL配布');
add('card', '調査カード', 'n-card-secret', '秘密区画', CARD('04_秘密区画カード.md'), 'card', 'PL配布');
add('card', '物語・分断', 'n-card-rec', '記録片（部屋LSの報酬）', CARD('05_記録片カード（部屋LSの報酬）.md'), 'card', 'PL配布');
add('card', '物語・分断', 'n-card-split', '分断LS・同行イベント', CARD('06_分断LS・同行イベントのカード.md'), 'card', 'PL配布');
add('card', '技能・事件', 'n-card-skill', '技能・専有カード（本人だけ）', CARD('07_技能・専有カード.md'), 'card', 'PL配布（本人のみ）');
add('card', '技能・事件', 'n-card-case', '事件調査（P10・P11）', CARD('08_事件調査カード（P10・P11）.md'), 'card', 'PL配布');
add('card', '品', 'n-card-items', '品の一覧（GM版）', CARD('09_品の一覧.md'), 'card', 'GM専用');
add('card', '品', 'n-card-items-pl', '品の一覧（配布版）', must(PL('カード/09_品の一覧.md')), 'card', 'PL配布');

// ルール・進行
add('rule', 'プレイヤー向け', 'n-rule-intro', 'はじめに', must(PL('00_はじめに.md')), 'doc', 'PL配布');
add('rule', 'プレイヤー向け', 'n-rule-phase', 'フェイズ進行表', must(PL('共通/フェイズ進行表（プレイヤー向け）.md')), 'doc', 'PL配布');
add('rule', 'プレイヤー向け', 'n-rule-ls', 'ライブセレクションの説明', must(PL('共通/ライブセレクション（プレイヤー向け説明）.md')), 'doc', 'PL配布');
add('rule', 'プレイヤー向け', 'n-rule-skill', 'スキル一覧', must(PL('共通/スキル一覧（改定版・プレイヤー向け）.md')), 'doc', 'PL配布');
add('rule', 'プレイヤー向け', 'n-rule-p10', 'P10で配る：新しいルール《リック・チームズの死》', must(PL('P10で配る/新しいルール_リック・チームズの死.md')), 'doc', 'PL配布');
add('rule', 'GM向け', 'n-gm-guide', 'GM進行ガイド', must(GM('GM進行ガイド.md')), 'doc', 'GM専用');
add('rule', 'GM向け', 'n-rule-ls-gm', 'ライブセレクション一覧と結果表', must(GM('ライブセレクション一覧と結果表（GM）.md')), 'doc', 'GM専用');
add('rule', 'GM向け', 'n-rule-chaser', '追跡者の位置の仕様', must(GM('追跡者の位置の仕様案（制作者向け）.md')), 'doc', 'GM専用');
add('rule', '制作・ゲーム向け', 'n-impl', '実装反映メモ（Codex向け）', must(GM('実装反映メモ（Codex向け）.md')), 'doc', '制作');

// 部屋LS・画面の文
add('screen', '部屋LS', 'n-room-ls', '部屋ライブセレクション一覧', must(GM('部屋ライブセレクション一覧（GM）.md')), 'doc', 'GM専用');
add('screen', '探索', 'n-explore', '探索の調べた場所（ゲーム用）', must(GM('探索の調べた場所（ゲーム用）.md')), 'doc', 'GM専用');
add('screen', '画面の文', 'n-huddle', '密談の画面の文（ゲーム用）', must(GM('密談の画面の文（ゲーム用）.md')), 'doc', 'GM専用');
add('screen', '画面の文', 'n-small', '画面の小さな文（ゲーム用）', must(GM('画面の小さな文（ゲーム用）.md')), 'doc', 'GM専用');
add('screen', '画面の文', 'n-guide-viola', '画面の案内（ヴィオラ・ゲーム用）', must(GM('画面の案内（ヴィオラ・ゲーム用）.md')), 'doc', 'GM専用');
add('screen', '画面の文', 'n-final-calls', '最終ライブセレクションの掛け声（ゲーム用）', must(GM('最終ライブセレクションの掛け声（ゲーム用）.md')), 'doc', 'GM専用');
add('screen', '画面の文', 'n-disgord', 'Disgordの演出（ゲーム用）', must(GM('Disgordの演出（ゲーム用）.md')), 'doc', 'GM専用');

// 真相・正本
add('canon', '', 'n-canon-truth', '真相', must(GM('正本/真相.md')), 'doc', 'GM専用');
add('canon', '', 'n-canon-tl', 'タイムライン', must(GM('正本/タイムライン.md')), 'doc', 'GM専用');
add('canon', '', 'n-canon-chars', 'キャラクター表', must(GM('正本/キャラクター表.md')), 'doc', 'GM専用');
add('canon', '', 'n-canon-clues', '手がかりマップ', must(GM('正本/手がかりマップ.md')), 'doc', 'GM専用');

// 変更の記録
add('log', '', 'n-changelog', 'CHANGELOG（今の原稿）', must(NOW('CHANGELOG.md')), 'doc', '制作');

// 参照・旧版（2026-10-06 の写し。前と同じページID）
add('ref', '改訂元（Ver3.4）', 'ref-handoff', 'Ver3.4 引き継ぎ（現行仕様）', must(C('参照/Ver3.4_引き継ぎ（CHATGPT_HANDOFF）.md')), 'doc', '参照');
add('ref', '改訂元（Ver3.4）', 'ref-readme', 'Ver3.4 README', must(C('参照/Ver3.4_README.md')), 'doc', '参照');
add('ref', '改訂元（Ver3.4）', 'ref-v2', '旧・制作者確認盤（別画面）', null, 'link', '参照');
add('ref', '旧版 10/06 はじめに', 'master', 'PROJECT_MASTER（10/06）', OLD('PROJECT_MASTER.md'), 'doc', '参照');
add('ref', '旧版 10/06 はじめに', 'report', 'REPORT（10/06）', OLD('REPORT.md'), 'doc', '参照');
add('ref', '旧版 10/06 はじめに', 'directive', '作者指示の反映表（10/06）', OLD('03_改稿/00_作者指示の反映表.md'), 'doc', '参照');
add('ref', '旧版 10/06 はじめに', 'changelog', 'CHANGELOG（10/07まで）', OLD('CHANGELOG.md'), 'doc', '参照');
const OHO = (f) => OLD('03_改稿/HO/' + f);
add('ref', '旧版 10/06 HO', 'ho-common', '共通HO', OHO('00_共通HO.md'), 'ho', '参照');
const oldHo = fs.readdirSync(OLD('03_改稿/HO'));
for (const [n, name] of [['1', 'ミレイユ'], ['2', 'ヴィオラ'], ['3', 'リュシア'], ['4', 'ガルド']]) {
  for (const f of oldHo.filter((x) => x.startsWith(`PC${n}_${name}_`)).sort()) {
    const stage = f.replace(`PC${n}_${name}_`, '').replace(/\.md$/, '');
    add('ref', '旧版 10/06 HO', `ho-pc${n}-${NUM[stage[0]] || 'x'}`, `PC${n} ${name} ${stage.replace(/_/g, ' ')}`, OHO(f), 'ho', '参照', { oldTone: true });
  }
}
const oldReadDir = OLD('03_改稿/読み合わせ');
for (const f of fs.readdirSync(oldReadDir).filter((x) => /^R\d+_/.test(x)).sort()) {
  const rid = f.match(/^(R\d+)_/)[1];
  add('ref', '旧版 10/06 読み合わせ', rid.toLowerCase(), rid + ' ' + f.replace(/^R\d+_/, '').replace(/\.md$/, '').replace(/_/g, '／'), path.join(oldReadDir, f), 'read', '参照');
}
const OC = (f) => OLD('03_改稿/カード/' + f);
for (const [id, nav, f] of [['card-rooms', '部屋公開文', '01_部屋公開文.md'], ['card-upper', '調査カード 上層', '02_調査カード_上層.md'], ['card-lower', '調査カード 下層', '03_調査カード_下層.md'], ['card-secret', '秘密区画', '04_秘密区画カード.md'], ['card-rec', '記録片', '05_記録片カード（部屋LSの報酬）.md'], ['card-split', '分断LS・同行イベント', '06_分断LS・同行イベントのカード.md'], ['card-skill', '技能・専有カード', '07_技能・専有カード.md'], ['card-case', '事件調査', '08_事件調査カード（P10・P11）.md'], ['card-items', '品の一覧', '09_品の一覧.md']]) add('ref', '旧版 10/06 カード', id, nav, OC(f), 'card', '参照');
const OR = (f) => OLD('03_改稿/ルール/' + f);
for (const [id, nav, f] of [['rule-phase', 'フェイズ進行表', 'フェイズ進行表（プレイヤー向け）.md'], ['rule-ls', 'ライブセレクションの説明', 'ライブセレクション（プレイヤー向け説明）.md'], ['rule-skill', 'スキル一覧', 'スキル一覧（改定版・プレイヤー向け）.md'], ['rule-ls-gm', 'ライブセレクション一覧と結果表', 'ライブセレクション一覧と結果表（GM）.md'], ['rule-room', '部屋ライブセレクション一覧', '部屋ライブセレクション一覧（GM）.md'], ['rule-chaser', '追跡者の位置の仕様案', '追跡者の位置の仕様案（制作者向け）.md']]) add('ref', '旧版 10/06 ルール・GM', id, nav, OR(f), 'doc', '参照');
add('ref', '旧版 10/06 ルール・GM', 'gm-guide', 'GM進行ガイド', OLD('03_改稿/GM進行ガイド.md'), 'doc', '参照');
add('ref', '旧版 10/06 ルール・GM', 'gm-dist', '配布物の一覧と配るタイミング', OLD('05_完成版/配布物の一覧と配るタイミング.md'), 'doc', '参照');
add('ref', '旧版 10/06 ルール・GM', 'gm-impl', '実装反映メモ（Codex向け）', OLD('03_改稿/実装反映メモ（Codex向け）.md'), 'doc', '参照');
for (const [id, nav, f] of [['canon-truth', '真相', '真相.md'], ['canon-tl', 'タイムライン', 'タイムライン.md'], ['canon-chars', 'キャラクター表', 'キャラクター表.md'], ['canon-clues', '手がかりマップ', '手がかりマップ.md']]) add('ref', '旧版 10/06 正本', id, nav, OLD('01_正本/' + f), 'doc', '参照');
add('ref', '旧版 10/06 チェック・仮想プレイ', 'check-structure', '構成チェック', OLD('02_チェック/構成チェック.md'), 'doc', '参照');
add('ref', '旧版 10/06 チェック・仮想プレイ', 'check-integrity', '整合性チェック', OLD('02_チェック/整合性チェック.md'), 'doc', '参照');
add('ref', '旧版 10/06 チェック・仮想プレイ', 'check-inventory', '棚卸し（INVENTORY）', OLD('00_INVENTORY.md'), 'doc', '参照');
const PLAY = (f) => OLD('04_仮想プレイ/' + f);
for (const [id, nav, f] of [['play1-log', '第1回 ログ', '第1回_標準プレイ_ログ.md'], ['play1-rev', '第1回 振り返り', '第1回_振り返り.md'], ['play2-log', '第2回 ログ', '第2回_難しめプレイ_ログ.md'], ['play2-rev', '第2回 振り返り', '第2回_振り返り.md'], ['play3-log', '第3回 ログ', '第3回_初心者卓_ログ.md'], ['play3-rev', '第3回 振り返り', '第3回_振り返り.md'], ['play4', '第4回 修正後の再プレイ', '第4回_修正後の再プレイ.md'], ['play5-log', '第5回 ログ', '第5回_作者修正後の通しプレイ_ログ.md'], ['play5-rev', '第5回 振り返り', '第5回_振り返り.md']]) add('ref', '旧版 10/06 チェック・仮想プレイ', id, nav, PLAY(f), 'doc', '参照');
for (const p of P) if (p.file) must(p.file);

// ---------- 道具 ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const strip = (h) => String(h).replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const norm = (s) => strip(s).replace(/\s+/g, '').trim();
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
// 話者の色（今の人名）。旧名は旧版のページだけに出る
const SPEAKERS = {
  'ミレイユ': 'mireille', 'ヴィオラ': 'viola', 'ミクシィ': 'mixi', 'エドガー': 'edgar', 'リック': 'rick', 'リック・チームズ': 'rick', '追跡者': 'chaser',
  'ギルド長': 'guild', 'ギルドの使い': 'guild', '声': 'npc', '町の声': 'npc', '全員': 'group', '組の誰か': 'group',
  'リュシア': 'lucia', 'ガルド': 'gald', 'レオン': 'leon',
};
const NOTE_COL = /^(情報の限界|注意点|注意|備考)$/;
function badgeTags(html) {
  return html
    .replace(/【作者修正([^】]*)】/g, (_, t) => `<span class="badge order" title="${esc(t.replace(/^[：:]/, ''))}">作者修正${t ? '：' + esc(t.replace(/^[：:]/, '')) : ''}</span>`)
    .replace(/【修正(F\d+(?:・F\d+)*)】/g, '<span class="badge fix">修正$1</span>')
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

// 「> 【GM】…」「- 【GM】…」「【GM】…」の行を、たたまれたGM注記にする。:::note も扱う
const GM_LINE = /^(?:>\s*)?(?:-\s+)?【GM】\s*(.*)$/;
function splitNotes(md) {
  const out = []; const lines = md.split('\n'); let buf = []; let note = null; let gm = null; let fence = false;
  const flush = () => { if (buf.length) out.push({ type: 'md', text: buf.join('\n') }); buf = []; };
  for (const line of lines) {
    if (!note && /^\s*```/.test(line)) fence = !fence;
    const g = !fence && !note && line.match(GM_LINE);
    if (g) { if (!gm) { flush(); gm = { type: 'note', title: 'GM専用｜GM・アプリ向けの指示', body: [] }; } gm.body.push(g[1], ''); continue; }
    if (gm) { out.push(gm); gm = null; }
    const open = !fence && line.match(/^:::note\s*(.*)$/);
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

// カード：「**《タイトル》**　入手条件」の段落からカード枠を作る（「**ID《タイトル》**」も可）
const CARD_START = /^\*\*([^*\n]{1,60})\*\*([^\n]*)$/;
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
      if (m && /《|^[A-Z]{2,}-|^REC-|^INFO-/.test(m[1])) {
        closeCard();
        const title = m[1].trim();
        const meta = m[2].trim();
        const id = ctx.aid(title + meta, 'h');
        ctx.toc.push({ id, text: strip(mk.parseInline(title)), level: 3 });
        const tone = /^REC-|記録片/.test(title) ? ' rec' : /^INFO-P/.test(title) ? ' split' : /^深度|調査|記録《|台帳|出所/.test(title) ? ' case' : '';
        ctx.cards = (ctx.cards || 0) + 1;
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
  const head = [];
  while (i < lines.length && /^>/.test(lines[i])) { head.push(lines[i]); i++; }
  let html = '';
  if (head.length) {
    const plain = head.filter((l) => !GM_LINE.test(l)).map((l) => l.replace(/^>\s?/, ''));
    const gm = head.filter((l) => GM_LINE.test(l));
    if (plain.length) html += `<div class="callout" data-a="${ctx.aid(plain.join(''))}">${renderMd(plain.join('\n\n'), ctx)}</div>\n`;
    if (gm.length) html += renderMd(gm.join('\n'), ctx);
  }
  html += '<div class="script">\n';
  let aside = []; let pending = null; let fence = null; let gmBuf = []; let det = 0;
  const flushAside = () => {
    if (aside.length) { const text = aside.join('\n').trim(); aside = []; if (text) html += `<div class="aside">${renderMd(text, ctx)}</div>\n`; }
  };
  const flushGm = () => { if (gmBuf.length) { html += renderMd(gmBuf.join('\n'), ctx); gmBuf = []; } };
  const flushAll = () => { flushGm(); flushAside(); };
  const line = (who, mod, say, extra, cls = '') => {
    const wm = who.match(/^(.+?)【([^】]+)】$/);
    if (wm) { who = wm[1]; mod = (mod ? mod + '・' : '') + wm[2]; }
    const key = speakerKey(who);
    ctx.speakers = ctx.speakers || {}; ctx.speakers[who] = (ctx.speakers[who] || 0) + 1;
    html += `<div class="line sp-${key}${cls}" data-a="${ctx.aid(who + say)}"><span class="who">${esc(who)}${mod ? `<small>${esc(mod)}</small>` : ''}</span><span class="say">「${inlineMd(say)}」${extra ? `<small class="cond-note">${esc(extra)}</small>` : ''}</span></div>\n`;
  };
  for (; i < lines.length; i++) {
    const raw = lines[i]; const s = raw.trim();
    if (fence) {
      if (/^```/.test(s)) { html += `<div class="screen" data-a="${ctx.aid(fence.join(''))}">${fence.map((x) => inlineMd(x)).join('<br>')}</div>\n`; fence = null; }
      else fence.push(raw);
      continue;
    }
    if (GM_LINE.test(s)) { flushAside(); gmBuf.push(s.replace(/^-\s+/, '')); continue; }
    if (gmBuf.length && s) flushGm();
    if (/^```/.test(s)) { flushAll(); fence = []; continue; }
    // 原稿の <details>（選ばれた答えへの反応など）は、たたみの枠にする
    let m;
    if ((m = s.match(/^<details[^>]*>\s*(?:<summary>(.*?)<\/summary>)?\s*$/))) { flushAll(); pending = null; det++; html += `<details class="note info" data-a="${ctx.aid('det' + (m[1] || '') + i)}">${m[1] ? `<summary>${inlineMd(m[1])}</summary>` : ''}<div class="note-body">\n`; continue; }
    if ((m = s.match(/^<summary>(.*?)<\/summary>$/))) { flushAll(); html += `<summary>${inlineMd(m[1])}</summary>`; continue; }
    if (/^<\/details>$/.test(s)) { flushAll(); pending = null; if (det > 0) { det--; html += '</div></details>\n'; } continue; }
    if (!s) { pending = pending && pending.sticky ? pending : null; if (aside.length) aside.push(''); continue; }
    if (s === '---') { flushAll(); pending = null; html += '<hr class="sep">\n'; continue; }
    if ((m = s.match(/^(#{1,4})\s+(.*)$/))) {
      flushAll(); pending = null;
      const level = Math.min(m[1].length, 3); const text = m[2];
      if (level === 1) { html += `<div class="line big sp-chaser" data-a="${ctx.aid(text)}"><span class="who"></span><span class="say">${inlineMd(text)}</span></div>\n`; continue; }
      const id = ctx.aid(text, 'h'); ctx.toc.push({ id, text: strip(inlineMd(text)), level });
      html += `<h${level} id="${id}" class="h${level} read-sec" data-a="${id}">${inlineMd(text)}</h${level}>\n`;
      continue;
    }
    if (/^■/.test(s)) { flushAll(); pending = null; const id = ctx.aid(s, 'h'); ctx.toc.push({ id, text: s.replace(/^■\s*/, ''), level: 3 }); html += `<div class="scene" id="${id}" data-a="${id}">${esc(s.replace(/^■\s*/, ''))}</div>\n`; continue; }
    if (/^（[\s\S]*）$/.test(s)) { flushAll(); html += `<div class="stage" data-a="${ctx.aid(s)}">${inlineMd(s)}</div>\n`; continue; }
    if (/^\*\*【(画面|カード|公開ログ|画面の助け舟)/.test(s)) { flushAll(); pending = null; html += `<div class="screen" data-a="${ctx.aid(s)}">${inlineMd(s)}</div>\n`; continue; }
    if ((m = s.match(/^\*\*([^*]{1,60})\*\*$/))) {
      flushAll();
      const label = m[1];
      const sp = label.match(/^([^（\s]{1,10})(（[^）]{1,16}）)?$/);
      if (sp && SPEAKERS[sp[1]]) { pending = { who: sp[1], mod: sp[2] ? sp[2].slice(1, -1) : '', sticky: true }; continue; }
      if (/^組の誰か/.test(label)) { pending = { who: '組の誰か', mod: label.replace(/^組の誰かが読む/, '').replace(/^[（(]|[）)]$/g, ''), sticky: true }; html += `<div class="cond-head" data-a="${ctx.aid(label)}">${inlineMd(label)}</div>\n`; continue; }
      pending = null;
      html += `<div class="cond-head" data-a="${ctx.aid(label)}">${inlineMd(label)}</div>\n`;
      continue;
    }
    // 「- 名前「…」」は、その場にいる人だけが読む台詞（いれば）
    if ((m = s.match(/^-\s+(.*)$/)) && LINE_RE.test(m[1])) {
      flushAll();
      const d = m[1].match(LINE_RE);
      line(d[1], d[2] ? d[2].slice(1, -1) : '', d[3], d[4] ? d[4].slice(1, -1) : '', ' cond');
      continue;
    }
    if ((m = s.match(LINE_RE))) { flushAll(); pending = null; line(m[1], m[2] ? m[2].slice(1, -1) : '', m[3], m[4] ? m[4].slice(1, -1) : ''); continue; }
    if (/^「[\s\S]*」$/.test(s) && pending) { flushAll(); line(pending.who, pending.mod, s.slice(1, -1), ''); continue; }
    aside.push(raw);
  }
  flushAll();
  while (det-- > 0) html += '</div></details>\n';
  html += '</div>\n';
  return html;
}
const inlineMk = new Marked({ gfm: true, breaks: true });
const inlineMd = (s) => inlineMk.parseInline(s);

// ---------- 組み立て ----------
const pages = [];
const speakerAll = {};
const TONE_BY_PC = { 1: 'mireille', 2: 'viola', 3: 'mixi', 4: 'edgar' };
const OLD_TONE_BY_PC = { 1: 'mireille', 2: 'viola', 3: 'lucia', 4: 'gald' };
const isNew = (p) => p.group !== 'ref';
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
    const pcKey = (p.id.match(/ho-pc(\d)/) || [])[1];
    const tone = pcKey ? (p.oldTone ? OLD_TONE_BY_PC : TONE_BY_PC)[+pcKey] : 'common';
    const name = hm ? hm[1] : ctx.h1.replace(/^【|】/g, ' ').trim();
    const kicker = hm ? hm[2] : (pcKey ? 'PC' + pcKey + '　' + (p.oldTone ? '旧版 10/06' : p.sub.replace(/^PC\d\s*/, '')) : 'PC全員に配布');
    html = `<div class="ho-hero tone-${tone}"><div class="ho-kicker">${esc(kicker)}</div><div class="ho-name">${esc(name)}</div></div>\n` + html;
    title = name + (hm ? '　' + p.nav.replace(/^PC\d\s+\S+\s+/, '') : '');
  }
  const rawSrc = p.file && fs.existsSync(p.file) ? fs.readFileSync(p.file, 'utf8') : '';
  if (isNew(p) && /2026-11-0[34]/.test(rawSrc)) ctx.badges.push('11/3〜11/4 改稿');
  if (!isNew(p) && /【作者修正/.test(rawSrc)) ctx.badges.push('作者修正（10/07）');
  for (const b of p.extraBadges || []) ctx.badges.push(b);
  if (ctx.speakers && isNew(p)) for (const [w, n] of Object.entries(ctx.speakers)) speakerAll[w] = (speakerAll[w] || 0) + n;
  const text = strip(html).replace(/\s+/g, ' ').trim();
  const rel = p.file ? path.relative(path.join(ROOT, 'content'), p.file).replace(/\\/g, '/') : '';
  pages.push({ id: p.id, group: p.group, sub: p.sub, nav: p.nav, kind: p.kind, audience: p.audience, title, badges: ctx.badges, source: rel, toc: ctx.toc, html, text, cards: ctx.cards || 0 });
}
const ids = new Set();
for (const p of pages) { if (ids.has(p.id)) throw new Error('ページIDの重複: ' + p.id); ids.add(p.id); }

const data = { version: 'dom-rv2', built: new Date().toISOString(), home: 'n-now', groups: GROUPS, pages };
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'site-data.js'), 'window.SITE_DATA=' + JSON.stringify(data) + ';\n');
const size = fs.statSync(path.join(ROOT, 'data', 'site-data.js')).size;
console.log('pages:', pages.length, 'size:', (size / 1024).toFixed(0) + 'KB');
for (const g of GROUPS) console.log(' ', g.label, pages.filter((x) => x.group === g.id).length);
const nw = pages.filter((x) => x.group !== 'ref');
console.log('今の原稿：HO', nw.filter((x) => x.kind === 'ho').length, '／読み合わせ', nw.filter((x) => x.kind === 'read').length,
  '／カードの枠', nw.filter((x) => x.kind === 'card').reduce((a, x) => a + x.cards, 0), '（カードのページ', nw.filter((x) => x.kind === 'card').length, '）');
console.log('話者（今の原稿の読み合わせ）:', Object.entries(speakerAll).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w}${n}(${speakerKey(w)})`).join(' '));
const OLDN = /リュシア|ガルド|レオン/g;
const withOld = nw.map((x) => [x.nav, (x.text.match(OLDN) || []).length]).filter((x) => x[1]);
console.log('旧名が残る今のページ:', withOld.length ? withOld.map(([n, c]) => `${n}:${c}`).join(' ') : 0);
