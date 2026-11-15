// content/ のMarkdownから data/site-data.js を作る（ダンジョン・オブ・ザ・マーダー 制作INDEX）。
// 使い方: node tools/build.mjs
// - 今の原稿は content/完成版/（tools/sync-content.mjs が 05_完成版 から写す）。配布版とGM版の両方があるものは、GM版（メモつき）だけを載せる。
// - 旧版（2026-10-06）は content/旧版_20261006/ を「参照・旧版」に、前と同じページIDで載せる（共有保存の修正案がそのページに付いたまま残るように）。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Marked } from 'marked';
// 70 作者用INDEX：訂正済み・疑問・ゲームの全文字のページを組み立てる部品（2026-11-15）
import * as AP from './author-pages.mjs';

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
  { id: 'gtext', label: 'ゲームの全文字', icon: 'flag' },
  { id: 'ref', label: '参照・旧版（10/06）', icon: 'books' },
];
const P = [];
const add = (group, sub, id, nav, file, kind = 'doc', audience = '', extra = {}) => P.push({ group, sub, id, nav, file, kind, audience, ...extra });
const must = (f) => { if (!fs.existsSync(f)) throw new Error('ファイルが無い: ' + f); return f; };

// 今の状態
// 2026-11-15 作者の指定：最終確認先は #/n-now。11/15 版を n-now にし、11/11 版は「変更の記録」へ履歴として残す。
add('now', '', 'n-now', '今の状態（2026-11-15）', must(C('今の状態_20261115.md')), 'doc', '制作');
add('now', '', 'n-textcut', '文量を減らす検討（11/12・方針・削る案・ブレスト）', must(C('文量を減らす検討_20261112.md')), 'doc', '制作');
add('now', 'ブレストエルフ（11/11）', 'n-bs-cut', 'ブレスト：削るべき項目（全文）', must(C('ブレスト_20261111/削るべき項目.md')), 'doc', '制作');
add('now', 'ブレストエルフ（11/11）', 'n-bs-improve', 'ブレスト：改善案（全文）', must(C('ブレスト_20261111/改善案.md')), 'doc', '制作');
add('now', 'ブレストエルフ（11/11）', 'n-bs-system', 'ブレスト：新しいシステム案（全文）', must(C('ブレスト_20261111/新しいシステム案.md')), 'doc', '制作');
add('now', '', 'n-lspre', '分断LSの前置き・スチル v44（11/11・改善案つき）', must(C('分断LSの前置き_20261111.md')), 'doc', '制作');
add('now', '', 'n-newtext', '新しく書いた文（作者の文でないもの）', must(C('新しく書いた文_20261107.md')), 'doc', '制作');
add('now', '', 'n-spec', '今の仕様（ゲーム）', must(C('今の仕様（ゲーム）.md')), 'doc', 'GM専用');
add('now', '', 'about', 'このサイトの使い方（印の見方）', must(C('サイトの使い方.md')), 'doc', '');
add('now', '資料の案内', 'n-gm-about', 'GM資料の案内', must(GM('00_GM資料の案内.md')), 'doc', 'GM専用');
add('now', '資料の案内', 'n-dist', '配布物の一覧と配るタイミング', must(GM('00_配布物の一覧と配るタイミング.md')), 'doc', 'GM専用');
add('now', '資料の案内', 'n-directive', '作者指示の反映表', must(GM('00_作者指示の反映表.md')), 'doc', '制作');
add('now', '資料の案内', 'n-match', '配布版とGM版の照合（自動）', must(NOW('_配布版との照合.md')), 'doc', '制作');

// HO（GM版＝メモつき。【GM】はたたむ）
// 2026-11-14 作者「はじめにも入れる欄が違う」：ロビーで読む順（はじめに→共通HO→各PCのHO）に合わせ、
// 「はじめに」は HO の 共通 の先頭へ移す。ページIDは変えない（D1のメモの紐付けを壊さないため）。
const HODIR = GM('HO原本');
add('ho', '共通', 'n-rule-intro', 'はじめに', must(PL('00_はじめに.md')), 'doc', 'PL配布');
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
add('rule', 'プレイヤー向け', 'n-rule-phase', 'フェイズ進行表', must(PL('共通/フェイズ進行表（プレイヤー向け）.md')), 'doc', 'PL配布');
add('rule', 'プレイヤー向け', 'n-rule-ls', 'ライブセレクションの説明', must(PL('共通/ライブセレクション（プレイヤー向け説明）.md')), 'doc', 'PL配布');
add('rule', 'プレイヤー向け', 'n-rule-skill', 'スキル一覧', must(PL('共通/スキル一覧（改定版・プレイヤー向け）.md')), 'doc', 'PL配布');
add('rule', 'プレイヤー向け', 'n-rule-p10', 'P10で配る：新しいルール《リック・チームズの死》', must(PL('P10で配る/新しいルール_リック・チームズの死.md')), 'doc', 'PL配布');
add('rule', 'GM向け', 'n-gm-guide', 'GM進行ガイド', must(GM('GM進行ガイド.md')), 'doc', 'GM専用');
add('rule', 'GM向け', 'n-rule-ls-gm', 'ライブセレクション一覧と結果表', must(GM('ライブセレクション一覧と結果表（GM）.md')), 'doc', 'GM専用');
add('rule', 'GM向け', 'n-rule-chaser', '追跡者の位置の仕様', must(GM('追跡者の位置の仕様案（制作者向け）.md')), 'doc', 'GM専用');
add('rule', '制作・ゲーム向け', 'n-impl', '実装反映メモ（Codex向け）', must(GM('実装反映メモ（Codex向け）.md')), 'doc', '制作');

// 部屋LS・画面の文
add('screen', '最初の画面', 'n-charsel', 'キャラ選択画面の文（タイトル〜HO を読む画面）', must(C('キャラ選択画面の文_20261113.md')), 'doc', 'PL配布');
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
add('log', '前の「今の状態」', 'n-now-1111', '今の状態（2026-11-11・前の版）', must(C('今の状態_20261111.md')), 'doc', '制作');
add('log', '前の「今の状態」', 'n-now-1107', '今の状態（2026-11-07・前の版）', must(C('今の状態_20261107.md')), 'doc', '制作');
add('log', '前の「今の状態」', 'n-now-1104', '今の状態（2026-11-04・前の版）', must(C('今の状態_20261104.md')), 'doc', '制作');

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
// ---------- 70 作者用INDEX：訂正済み・疑問・ゲームの全文字（2026-11-15 作者の指示） ----------
// 作者「訂正した箇所と現在疑問点及び矛盾や気になるところはそれとは別に追記して」「ヴィオラの説明や最初の
// キャラ選択画面、はじめにやゲーム開始画面の文字なども全ての文字データも搭載して」。
// 本文（原稿のページ）には混ぜず、別のページにする。中身は tools/author-pages.mjs が作り、ここは登録と書き出しだけ。
const BUILT_AT = new Date().toISOString();
const GAME_COMMIT = process.env.GAME_COMMIT || 'fb478cf';
const MANUSCRIPT = process.env.MANUSCRIPT_ROOT || 'C:/00_【創作】一時フォルダ/_マダミス改訂_20261004/ダンジョン・オブ・ザ・マーダー/05_完成版';
const A69 = process.env.AUTHOR_PAGES_69 || 'C:/00_【創作】一時フォルダ/100_【マダミス】ハーネス作成/work_claude_opus_20261015/69_author_decisions_20261115';
const A70 = process.env.AUTHOR_PAGES_70 || 'C:/00_【創作】一時フォルダ/100_【マダミス】ハーネス作成/work_claude_opus_20261015/70_author_index_editor_20261115';
const readJsonMaybe = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
// ゲームの全文字（T3 が data/game-text.json を作る）。無いまま空のページを作らず、ここで止める。
const GAMETEXT = (() => {
  if (!fs.existsSync(path.join(ROOT, 'data', 'game-text.json'))) {
    if (process.env.AUTHOR_PAGES_SKIP_GTEXT === '1') return null;   // 中間確認用。親の最終 build では使わない
    throw new Error('data/game-text.json が無い：ゲームの全文字（g-*）を作れない。先に node tools/game-text.mjs --commit ' + GAME_COMMIT + ' を実行する（T3）');
  }
  return AP.parseGameText(fs.readFileSync(path.join(ROOT, 'data', 'game-text.json'), 'utf8'));
})();
const GTEXT_COMMIT_SHORT = GAMETEXT ? (GAMETEXT.commitShort || GAMETEXT.commit.slice(0, 7)) : '';
const GT_GROUP = GAMETEXT ? AP.groupGameText(GAMETEXT, {
  chunkSize: Number(process.env.GTEXT_CHUNK || 200),
  // 収録元（T3）の場面 meta をそのまま使う：ページ名（g-lines-lspre など）・題・順番を勝手に作らない
  scenesMeta: GAMETEXT.scenes,
  scenes: [...new Set(GAMETEXT.items.map((x) => String(x.scene || '')).filter((x) => x && x !== 'other'))],
}) : null;
if (GT_GROUP) {
  const dir = C('ゲーム全文字');
  fs.mkdirSync(dir, { recursive: true });
  for (const gp of GT_GROUP.pages) {
    const r = AP.buildGameTextPage({ page: gp, commit: GTEXT_COMMIT_SHORT, generatedAt: BUILT_AT });
    const f = path.join(dir, gp.id + '.md');
    fs.writeFileSync(f, r.md);
    add('gtext', gp.label, gp.id, gp.label, f, 'doc', '制作', { gen: true, gen_kind: 'gtext', scene: gp.scene, gameCommit: GTEXT_COMMIT_SHORT });
  }
  console.log('ゲームの全文字:', GTEXT_COMMIT_SHORT, GT_GROUP.stats.total, '件 →', GT_GROUP.pages.length, 'ページ',
    GT_GROUP.stats.metaMismatch.length ? '（場面の宣言件数と実数の違い ' + GT_GROUP.stats.metaMismatch.map((m) => m.scene + ':' + m.declared + '→' + m.actual).join(' ') + '）' : '');
}
// 訂正済み・疑問は、ほかのページを組み上げたあとに作る（「反映後」の実アンカーを引くため）
add('now', '', 'n-fixed', '訂正済みの箇所', C('訂正済みの箇所.md'), 'doc', '制作', { gen: true, gen_kind: 'fixed', gen_late: true });
add('now', '', 'n-questions', '疑問・矛盾・気になる所', C('疑問と気になる所.md'), 'doc', '制作', { gen: true, gen_kind: 'questions', gen_late: true });
for (const p of P) if (p.file && !p.gen) must(p.file);

// ---------- 見せる範囲の印（2026-11-07 作者の指示「PL達に見せる情報とそうではないものはみて分かるように」） ----------
// k：all＝PL・全員が見る／self＝PL・本人だけ（who）／here＝PL・その場にいた人だけ（cond）／gm＝GMだけ／make＝制作
// when：after＝推理のあと（真相の読み合わせ・ED）。how：カードの「だれが・いつ・どうやって」
const PCN = { PC1: 'ミレイユ', PC2: 'ヴィオラ', PC3: 'ミクシィ', PC4: 'エドガー' };
const PCKEY = { 1: 'ミレイユ', 2: 'ヴィオラ', 3: 'ミクシィ', 4: 'エドガー' };
const WHO_KEY = { 'ミレイユ': 'mireille', 'ヴィオラ': 'viola', 'ミクシィ': 'mixi', 'エドガー': 'edgar' };
const V = (k, o = {}) => ({ k, who: o.who || '', cond: o.cond || '', when: o.when || '', how: o.how || '', card: o.card || '' });
const GROUP_READ = { R04: 'P3 分断で A「地図・物資を守る」を選んだ組', R05: 'P3 分断で B「崩落を支える」を選んだ組', R06: 'P3 分断で「様子を見る」になった組', R06b: 'P3 分断で C「抜け道を探す」を選んだ組',
  R09: 'P6 分断で A「正面突破」を選んだ組', R10: 'P6 分断で B「水に飛び込む」を選んだ組', R11: 'P6 分断で C「崩れた穴」を選んだ組', R12: 'P7 リックと同行している組',
  R15: 'P9 分断で A「リックと共に戦う」を選んだ組', R16: 'P9 分断で B「名前を呼ぶ」を選んだ組', R17: 'P9 分断で C「魔力装置の解析」を選んだ組', R17b: 'P9 分断で「様子を見る」になった組',
  R24: '分断で一人だけの組になった人' };
const PAGE_VIS = {
  'n-now': V('make'), 'n-textcut': V('make'), 'n-bs-cut': V('make'), 'n-bs-improve': V('make'), 'n-bs-system': V('make'), 'n-lspre': V('make'), 'n-newtext': V('make'), 'n-spec': V('gm'), about: V('make'), 'n-gm-about': V('gm'), 'n-dist': V('gm'), 'n-directive': V('make'), 'n-match': V('make'),
  // 訂正済み・疑問は制作だけ（本文のページとは別。PL表示では出さない）
  'n-fixed': V('make', { cond: '制作の記録（訂正済み）' }), 'n-questions': V('make', { cond: '制作の記録（未確定・実装差）' }),
  'n-ho-common': V('all'),
  'n-card-rooms': V('all', { cond: '部屋に入ったときに出る文' }), 'n-card-upper': V('here', { cond: 'その部屋を調べた人' }), 'n-card-lower': V('here', { cond: 'その部屋を調べた人' }), 'n-card-secret': V('here', { cond: '秘密区画を開けた人' }),
  'n-card-rec': V('here', { cond: '部屋LSで報酬を得た人' }), 'n-card-split': V('here', { cond: 'その組・同行していた人' }), 'n-card-skill': V('self', { cond: '技能を使った本人' }), 'n-card-case': V('here', { cond: 'P10〜P11 で調べた人' }),
  'n-card-items': V('gm'), 'n-card-items-pl': V('all'),
  'n-rule-intro': V('all'), 'n-rule-phase': V('all'), 'n-rule-ls': V('all'), 'n-rule-skill': V('all'), 'n-rule-p10': V('all', { cond: 'P10 で配る' }),
  'n-gm-guide': V('gm'), 'n-rule-ls-gm': V('gm'), 'n-rule-chaser': V('gm'), 'n-impl': V('make'),
  'n-charsel': V('all', { cond: '画面に出る文（タイトル〜HO を読む画面）' }), 'n-room-ls': V('gm'), 'n-explore': V('here', { cond: '調べた人の画面（探索の結果票）' }), 'n-huddle': V('here', { cond: '分断の組（その組の密談の画面）' }), 'n-small': V('all', { cond: '画面に出る文' }),
  'n-guide-viola': V('all', { cond: '画面に出る文（最初の案内）' }), 'n-final-calls': V('all', { cond: '最終戦の画面に出る文' }), 'n-disgord': V('all', { cond: '《Disgord》の画面に出る文' }),
  'n-canon-truth': V('gm'), 'n-canon-tl': V('gm'), 'n-canon-chars': V('gm'), 'n-canon-clues': V('gm'), 'n-changelog': V('make'), 'n-now-1111': V('make', { cond: '前の版' }), 'n-now-1107': V('make', { cond: '前の版' }), 'n-now-1104': V('make', { cond: '前の版' }),
};
// 資料の頭の「>」の説明（作者承認・書き方・本文はClaude案 など）は制作の注にする
const INTRO_MAKE = new Set(['n-card-rooms', 'n-card-upper', 'n-card-lower', 'n-card-secret', 'n-card-rec', 'n-card-split', 'n-card-skill', 'n-card-case',
  'n-explore', 'n-huddle', 'n-small', 'n-guide-viola', 'n-final-calls', 'n-disgord']);
function pageVis(p) {
  if (p.group === 'ref') return V('make', { cond: '旧版（10/06）・参照' });
  if (p.group === 'gtext') return V('make', { cond: 'ゲームの画面に出る文（' + (p.scene || '') + '・' + (p.gameCommit || GAME_COMMIT) + '）' });
  const m = p.id.match(/^n-ho-pc(\d)/);
  if (m) return V('self', { who: PCKEY[m[1]] });
  if (p.kind === 'read') {
    const rid = (p.nav.match(/^(R\d+[a-z]?)/) || [])[1];
    if (GROUP_READ[rid]) return V('here', { cond: GROUP_READ[rid] });
    if (/^R2[123]$/.test(rid)) return V('all', { when: 'after', cond: '推理のあと（最終戦のあと）に読む' });
    return V('all', { cond: '読み合わせ（全員で読む）' });
  }
  if (PAGE_VIS[p.id]) return PAGE_VIS[p.id];
  throw new Error('見せる範囲が決まっていないページ: ' + p.id);
}
for (const p of P) p.vis = pageVis(p);

// ゲームのカード表（tools/game-cards.mjs が data.js から作る）
const GAME_CARDS = JSON.parse(fs.readFileSync(C('_ゲームのカード表.json'), 'utf8'));
const gameById = new Map(GAME_CARDS.cards.map((c) => [c.id, c]));
const gameByTitle = new Map();
for (const c of GAME_CARDS.cards) { if (!gameByTitle.has(c.title)) gameByTitle.set(c.title, []); gameByTitle.get(c.title).push(c); }
const ROOM_NAME = GAME_CARDS.rooms;
// カードの節（見出し行から次のカード・見出しまで）の原文を先に読み、共有の可否などを拾う
const CARD_HEAD = /^\*\*([^*\n]{1,60})\*\*([^\n]*)$/;
function scanCards(md) {
  const out = new Map(); let h2 = ''; let cur = null;
  for (const line of md.split('\n')) {
    const hm = line.match(/^(#{2,3})\s+(.*)$/);
    if (hm) { cur = null; if (hm[1] === '##') h2 = hm[2].trim(); continue; }
    if (/^---\s*$/.test(line)) { cur = null; continue; }
    const cm = line.match(CARD_HEAD);
    if (cm && /《|^[A-Z]{2,}-|^REC-|^INFO-|^深度/.test(cm[1])) { cur = { title: cm[1].trim(), meta: cm[2].trim(), h2, body: [] }; out.set(cur.title + '|' + cur.meta, cur); continue; }
    if (cur) cur.body.push(line);
  }
  return out;
}
const NAMES_RE = /(ミレイユ|ヴィオラ|ミクシィ|エドガー)/;
function cardVis(title, meta, fact, page) {
  const plain = strip(title);
  const idm = (plain.match(/^([A-Z][A-Z0-9-]+)/) || [])[1];
  const name = (plain.match(/《([^》]+)》/) || [])[1] || plain;
  const h2 = (fact && fact.h2) || '';
  const body = fact ? fact.body.join('\n') : '';
  let g = (idm && gameById.get(idm)) || null;
  if (!g && gameByTitle.has(name)) { const arr = gameByTitle.get(name); g = arr.length === 1 ? arr[0] : null; }
  const metaPlain = strip(meta);
  // だれが
  let who = g && g.viewer ? PCN[g.viewer] : '';
  const onlyM = metaPlain.match(/(ミレイユ|ヴィオラ|ミクシィ|エドガー)(?:だけ|にだけ|に）)/) || h2.match(/[（(](ミレイユ|ヴィオラ|ミクシィ|エドガー)(?:だけ)?[）)]|(ミレイユ|ヴィオラ|ミクシィ|エドガー)だけ/);
  if (!who && onlyM) who = onlyM[1] || onlyM[2];
  if (!who && page.id === 'n-card-skill') { const w = (metaPlain.match(/^(ミレイユ|ヴィオラ|ミクシィ|エドガー)が/) || h2.match(NAMES_RE) || [])[1]; if (w) who = w; }
  // 共有
  const noShare = g ? g.noShare : (/共有できない|共有不可/.test(metaPlain) || /共有できない|共有不可/.test(body) && !/共有可[。、）\s]/.test(body.replace(/共有不可/g, '')));
  const each = /本人にだけ/.test(metaPlain) && !who;
  const personal = (g && g.personal) || each;
  const share = noShare ? '共有できない（専門の見立て・本人の記憶。口で伝えるのは自由）' : personal ? 'カードの共有はしない（本人・組の情報。口で伝えるのは自由）' : '全体共有で全員に見せられる';
  // どこで・いつ
  let where = '';
  if (g && g.where.length) where = [...new Set(g.where.map((w) => `${w.room} ${w.name}・深度${w.depth}`))].join('／');
  else if (/^深度\d/.test(plain) || /^深度\d/.test(metaPlain)) where = (h2 ? h2 + '・' : '') + (plain.match(/^深度\d/) || metaPlain.match(/^深度\d/))[0];
  else if (/深度\d/.test(metaPlain) && h2) where = h2.replace(/[（(].*$/, '') + '・' + metaPlain.match(/深度\d/)[0];
  else if (/^REC-/.test(plain)) where = '部屋LS「' + metaPlain + '」の報酬';
  else if (h2) where = h2.replace(/【[^】]*】/g, '').trim();
  const when = /エンディング用/.test(h2) ? 'after' : '';
  const how = [where && 'どこで：' + where, metaPlain && 'いつ・条件：' + metaPlain, share].filter(Boolean).join('　／　');
  let k; let cond = '';
  const isAll = /全員/.test(metaPlain) && !/全員が?…?ではない/.test(metaPlain) || /全員に公開/.test(h2);
  if (each) { k = 'self'; cond = '各自（見えるものは人によって違う）'; }
  else if (who && (noShare || personal || (g && g.viewer) || onlyM || page.id === 'n-card-skill')) { k = 'self'; cond = who; }
  else if (isAll) { k = 'all'; cond = metaPlain || h2; }
  else if (g && g.category === 'P' || /組/.test(metaPlain)) { k = 'here'; cond = metaPlain || 'その組'; }
  else if (g && g.where.length) { k = 'here'; cond = `${g.where[0].room} ${g.where[0].name}を調べた人`; }
  else if (/^REC-/.test(plain)) { k = 'here'; cond = `部屋LS（${metaPlain}）で報酬を得た人`; }
  else if (page.id === 'n-card-secret') { k = 'here'; cond = h2.replace(/[（(].*$/, '').trim() + 'を開けた人'; }
  else if (page.id === 'n-card-case') { k = 'here'; cond = 'P10〜P11 で調べた人（' + (h2.replace(/[（(].*$/, '') || '事件調査') + '）'; }
  else { k = 'here'; cond = metaPlain || where || 'その場にいた人'; }
  if (page.id === 'n-card-skill' && !who) { k = 'here'; }
  return V(k, { who: k === 'self' ? (each ? '各自' : who) : '', cond, how, when, card: '1' });
}

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

// ---------- Discord風の節表示（2026-11-15 作者の指示1：丸い顔アイコン＋話者名＋本文で節を区切る） ----------
// 話者は、原稿に書かれている人だけを使う（読み合わせの話者、「名前：」で始まる行）。
// 話者の書かれていない説明・ルール・ト書きは「システム」（人物ではない案内）にする。
// 新しい人物・架空の発言・架空の日時は作らない。アイコンはゲームの既存の顔画像（media/faces/）、
// 無い人とシステムは文字の丸にする（絵を勝手に描かない）。
const DC_SYS = 'システム';
const DC_FACE = { mireille: 'mireille.webp', viola: 'viola.webp', mixi: 'mixi.webp', edgar: 'edgar.webp', leon: 'leon.webp' };
const DC_SK = {
  'ミレイユ': 'mireille', 'ヴィオラ': 'viola', 'ミクシィ': 'mixi', 'エドガー': 'edgar', 'レオン': 'leon',
  'リュシア': 'lucia', 'ガルド': 'gald', 'リック': 'rick', 'リック・チームズ': 'rick', '追跡者': 'chaser',
  'ギルド長': 'guild', 'ギルドの使い': 'guild', '声': 'npc', '町の声': 'npc', '全員': 'group', '組の誰か': 'group',
};
// 「ヴィオラ：…」のように、本文の頭に話者が書かれている行（画面の案内など）
const DC_INLINE = new RegExp('^(' + Object.keys(DC_SK).sort((a, b) => b.length - a.length).join('|') + ')[：:]');
const dcSk = (name) => (name === DC_SYS ? 'sys' : DC_SK[name] || 'sys');
function dcAvHTML(name) {
  const k = dcSk(name); const f = name === DC_SYS ? '' : DC_FACE[k];
  if (f) return `<span class="dc-av" aria-hidden="true"><img src="media/faces/${f}" alt="" width="40" height="40" loading="lazy"></span>`;
  return `<span class="dc-av dc-txt" aria-hidden="true">${esc(name === DC_SYS ? 'DM' : name.slice(0, 1))}</span>`;
}
const DC_NONE = { attrs: '', head: '', lead: false };
const dcOn = (ctx) => !ctx.nest && !ctx.noDc;
// まとまりの先頭（見出しの直後・枠の変わり目）だけ顔と名前を出し、続く段は本文だけを同じ桁にそろえる
function dcBlock(ctx, { spk, inline = false } = {}) {
  const name = spk || DC_SYS;
  const lead = !!ctx.dcLead || ctx.dcWho !== name;   // 話者が変わる所も、まとまりの先頭
  ctx.dcLead = false; ctx.dcWho = name;
  const attrs = ` data-dc="${lead ? 'lead' : 'cont'}" data-spk="${esc(name)}" data-sk="${dcSk(name)}"` + (lead && inline ? ' data-dcname="off"' : '');
  const head = lead ? dcAvHTML(name) + (inline ? '' : `<span class="dc-name">${esc(name)}</span>`) : '';
  return { attrs, head, lead };
}
// 節の変わり目（見出し・区切り・枠の切れ目）では、次の段をまとまりの先頭にする
const dcNew = (ctx) => { ctx.dcLead = true; };

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
  return { page, aid, toc, dcLead: true, dcWho: '', noDc: 0 };
}

// ---------- 作者注（疑義はその場所へ）2026-11-15 ----------
// 原稿本文には注を書かない。content/_creator_notes.json（正本は 69/source/CREATOR_NOTES.json。
// 実ルートへの対応は 69/index/notes_overrides.json）を、ページ本文の該当する見出し・段落・行の直前に
// 折りたたみ（details.cnote）で差し込む。PL 表示では CSS で隠し、さらに app.js が DOM から外す。
const NOTEBOOK = (() => {
  try { return JSON.parse(fs.readFileSync(C('_creator_notes.json'), 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
})();
const NOTE_HITS = [];          // {note_id, page_id, anchor, hits}
const NOTE_MISS = [];          // {note_id, page_id, why}
const VOID_TAGS = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'base', 'col', 'embed', 'param', 'track']);
const TABLE_TAGS = new Set(['tr', 'td', 'th', 'thead', 'tbody', 'tfoot', 'table']);
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function cnoteHtml(n, pageId, anchorId) {
  const links = (n.related || []).map((x) => `<a href="${esc(x.href)}">${esc(x.label)}</a>`).join('') +
    (anchorId ? `<a href="#/${esc(pageId)}/${esc(anchorId)}">この場所のリンク</a>` : '');
  const rows = [['原文', n.original], ['採用文', n.adopted], ['疑義・注', n.query]]
    .filter(([, v]) => String(v || '').trim())
    .map(([k, v]) => `<div class="cnote-row"><span class="cnote-k">${k}</span><div class="cnote-v">${esc(String(v)).replace(/\n/g, '<br>')}</div></div>`).join('');
  return `<details class="cnote" data-cnote="${esc(n.id)}" data-a="cnote-${esc(n.id)}" data-nstate="${esc(n.state)}" data-cpage="${esc(pageId)}">` +
    `<summary><span class="cnote-tag">制作の注</span><span class="cnote-state s-${esc(n.state)}">${esc(n.state_label)}</span><span class="cnote-sec">${esc(n.section)}</span></summary>` +
    `<div class="cnote-body">${rows}` +
    (n.why ? `<div class="cnote-row"><span class="cnote-k">扱い</span><div class="cnote-v">${esc(n.why)}</div></div>` : '') +
    `<div class="cnote-foot">${links}</div></div></details>\n`;
}
// 本文HTMLを「文字」と「タグ」に分け、文字ごとに一番近い data-a の要素（表の中なら表の外の入れ物）を覚える
function scanHtml(html) {
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^">]|"[^"]*")*)>/g;
  const stack = []; const ends = new Map();
  let text = ''; const segs = []; let last = 0; let m;
  const push = (s, e) => {
    if (e <= s) return;
    const t = html.slice(s, e);
    let a1 = null, a2 = null, a3 = null;
    for (let i = stack.length - 1; i >= 0; i--) {
      const el = stack[i];
      if (el.dataA && !TABLE_TAGS.has(el.tag) && a1 === null) a1 = el;
      if (/table-wrap/.test(el.cls) && a2 === null) a2 = el;
      if (el.dataA && a3 === null) a3 = el;
    }
    segs.push({ t0: text.length, t1: text.length + t.length, a1, a2, a3 });
    text += t;
  };
  while ((m = re.exec(html))) {
    push(last, m.index);
    last = m.index + m[0].length;
    if (m[0].startsWith('<!--')) continue;
    const tag = (m[2] || '').toLowerCase();
    if (!tag) continue;
    if (m[1] === '/') {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) { ends.set(stack[i].start, last); stack.length = i; break; }
      }
    } else if (!VOID_TAGS.has(tag)) {
      const attrs = m[3] || '';
      const da = /data-a="([^"]*)"/.exec(attrs);
      stack.push({ tag, start: m.index, dataA: da ? da[1] : null, cls: (/class="([^"]*)"/.exec(attrs) || [])[1] || '' });
    }
  }
  push(last, html.length);
  return { text, segs, ends };
}
function injectNotes(html, page) {
  if (!NOTEBOOK || !Array.isArray(NOTEBOOK.notes)) return html;
  const mine = NOTEBOOK.notes.filter((n) => n.page_id === page.id);
  if (!mine.length) return html;
  const { text, segs, ends } = scanHtml(html);
  const flat = [];               // 空白を除いた本文と、その1字ずつの元の位置
  const raw = unesc(text);
  const remap = [];
  for (let i = 0; i < raw.length; i++) { if (!/\s/.test(raw[i])) { flat.push(raw[i]); remap.push(i); } }
  const needle = flat.join('');
  const ins = [];
  for (const n of mine) {
    const want = unesc(String((n.anchor && n.anchor.text) || '')).replace(/\s+/g, '');
    if (!want) { NOTE_MISS.push({ note_id: n.id, page_id: page.id, why: 'アンカーの文が空' }); continue; }
    let at = needle.indexOf(want); let hits = 0; const cands = [];
    while (at >= 0) {
      hits++;
      const rawAt = remap[at];
      const seg = segs.find((s) => rawAt >= s.t0 && rawAt < s.t1) || segs[segs.length - 1];
      const el = seg.a1 || seg.a2 || seg.a3;
      if (el) cands.push({ el, at, fallback: (seg.a3 && seg.a3.dataA) || '' });
      at = needle.indexOf(want, at + 1);
    }
    if (!cands.length) { NOTE_MISS.push({ note_id: n.id, page_id: page.id, why: '本文に「' + n.anchor.text + '」が無い（または data-a の要素が無い）' }); continue; }
    const prefer = (n.anchor && n.anchor.prefer) || '';
    const pick = (prefer === 'heading' && cands.find((c) => /^h[1-6]$/.test(c.el.tag))) || cands[0];
    const el = pick.el;
    const after = n.anchor && n.anchor.mode === 'after';
    const off = after ? (ends.get(el.start) || el.start) : el.start;
    const anchorId = el.dataA || pick.fallback || ('cnote-' + n.id);   // 表の中などで親に data-a が無い時は、注そのものに飛ばす
    ins.push({ off, s: cnoteHtml(n, page.id, anchorId), id: n.id });
    NOTE_HITS.push({ note_id: n.id, page_id: page.id, anchor: anchorId, mode: after ? 'after' : 'before', hits });
  }
  if (!ins.length) return html;
  ins.sort((a, b) => b.off - a.off);
  let out = html;
  for (const x of ins) out = out.slice(0, x.off) + x.s + out.slice(x.off);
  return out;
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
      let unit = '';
      if (ctx.u) unit = (ctx.page.kind === 'ho' || /^n-card-items/.test(ctx.page.id)) && depth <= 3 ? uOpen(ctx, text) : uClose(ctx);
      dcNew(ctx);   // 見出しのあとは、新しいまとまり（顔と名前を出す）
      return unit + `<h${depth} id="${id}" class="${ho ? 'ho-sec' : 'h' + depth}" data-a="${id}">${inner}</h${depth}>\n`;
    },
    paragraph({ tokens, text }) {
      const inner = this.parser.parseInline(tokens);
      const im = dcOn(ctx) ? DC_INLINE.exec(strip(text || '')) : null;
      const d = dcOn(ctx) ? dcBlock(ctx, im ? { spk: im[1], inline: true } : {}) : DC_NONE;
      return `<p data-a="${ctx.aid(text)}"${d.attrs}>${d.head}${inner}</p>\n`;
    },
    listitem(item) {
      const d = dcOn(ctx) ? dcBlock(ctx) : DC_NONE;
      ctx.noDc = (ctx.noDc || 0) + 1;   // 入れ子の箇条の中は、まとまりを作らない
      const inner = this.parser.parse(item.tokens, !!item.loose);
      ctx.noDc--;
      return `<li data-a="${ctx.aid(item.text)}"${d.attrs}>${d.head}${inner}</li>\n`;
    },
    blockquote({ tokens, text }) {
      ctx.noDc = (ctx.noDc || 0) + 1;
      const inner = this.parser.parse(tokens).replace(/ data-a="[^"]*"/g, '');
      ctx.noDc--;
      const tag = /^「/.test(text.trim()) ? ' class="tagline"' : '';
      const d = dcOn(ctx) && !tag ? dcBlock(ctx) : DC_NONE;
      return `<blockquote${tag} data-a="${ctx.aid(text)}"${d.attrs}>${d.head}${inner}</blockquote>\n`;
    },
    table(token) { return renderTable.call(this, token, ctx); },
    hr() { dcNew(ctx); return '<hr>\n'; },
    code({ text }) {
      const d = dcOn(ctx) ? dcBlock(ctx) : DC_NONE;
      return `<div class="screen" data-a="${ctx.aid(text)}"${d.attrs}>${d.head}${esc(text).replace(/\n/g, '<br>')}</div>\n`;
    },
  } });
  return m;
}
function renderTable(token, ctx) {
  const P = this.parser;
  if (ctx.page.id === 'n-card-rooms' && ctx.u) return renderRoomBlocks(token, P, ctx);
  const head = token.header.map((c) => strip(P.parseInline(c.tokens)).trim());
  const noteIdx = head.map((h, i) => (NOTE_COL.test(h) ? i : -1)).filter((i) => i >= 0);
  const keep = head.map((_, i) => i).filter((i) => !noteIdx.includes(i));
  const notes = [];
  // 表は横に広く使いたいので、Discord風のまとまりの箱には入れない（見出しの話者名が、その節の名前になる）
  let html = `<div class="table-wrap"><table>\n<thead><tr>`;
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
// 【GM】の行のすぐ下に続く「> - …」「>   …」の行も GM の注の続き（二重の意味の対応表など）
const GM_CONT = /^>\s*(?:-\s+|\s{2,}\S)/;
// 行の途中の【GM】（「画面の文。【GM】注」）は、その先を赤い札にする（プレイヤー表示では隠す）
const inlineGm = (line) => {
  // 文の区切り（。）」！？・空白）のすぐあとの【GM】だけ。「【GM】の注」のように語として書いた所は変えない
  if (!/[。）)」！？\s]【GM】/.test(line) || GM_LINE.test(line) || /^\s*>?\s*-?\s*【GM】/.test(line)) return line;
  const span = (_, t) => `<span class="gm-inline"><b>GMだけ</b>${t.replace(/</g, '&lt;')}</span>`;
  return /^\s*\|/.test(line) ? line.replace(/(?<=[。）)」！？\s])【GM】([^|]*)/g, span) : line.replace(/(?<=[。）)」！？\s])【GM】(.*)$/, span);
};
const VIS_DIRECTIVE = /^<!--\s*vis:([a-z]+)(?::([^|>]*))?(?:\|([^>]*))?\s*-->$/;
function splitNotes(md) {
  const out = []; const lines = md.split('\n'); let buf = []; let note = null; let gm = null; let fence = false;
  const flush = () => { if (buf.length) out.push({ type: 'md', text: buf.join('\n') }); buf = []; };
  for (const line of lines) {
    if (!note && /^\s*```/.test(line)) fence = !fence;
    const vd = !fence && !note && line.trim().match(VIS_DIRECTIVE);
    if (vd) { if (gm) { out.push(gm); gm = null; } flush(); out.push({ type: 'vis', k: vd[1], who: (vd[2] || '').trim(), cond: (vd[3] || '').trim() }); continue; }
    const g = !fence && !note && line.match(GM_LINE);
    if (g) { if (!gm) { flush(); gm = { type: 'note', title: 'GMだけ｜GM・アプリ向けの指示', body: [] }; } gm.body.push(g[1], ''); continue; }
    if (gm && GM_CONT.test(line)) { gm.body.push(line.replace(/^>\s?/, '')); continue; }
    if (gm) { out.push(gm); gm = null; }
    const open = !fence && line.match(/^:::note\s*(.*)$/);
    if (!note && open) { flush(); note = { type: 'note', title: open[1].trim(), body: [] }; continue; }
    if (note && line.trim() === ':::') { out.push(note); note = null; continue; }
    if (note) note.body.push(line); else buf.push(fence ? line : inlineGm(line));
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
  const top = !ctx.nest;
  if (top && opts.kind === 'card' && !ctx.cardFacts) ctx.cardFacts = scanCards(md);
  if (top && ctx.u && ctx.page.kind === 'ho' && ctx.page.group !== 'ref') html += uOpen(ctx, '__intro__');
  for (const seg of splitNotes(md)) {
    if (seg.type === 'vis') {
      if (top) { const v = V(seg.k, { who: seg.k === 'self' ? seg.who : '', cond: seg.k === 'self' ? seg.cond : (seg.cond || seg.who) }); ctx.base = v; html += mark(ctx, v); ctx.dcLead = true; }
      continue;
    }
    if (seg.type === 'note') {
      ctx.nest = (ctx.nest || 0) + 1;
      const inner = renderMd(seg.body.join('\n'), ctx, opts);
      ctx.nest--;
      const nk = noteKind(seg.title);
      const nv = nk === 'gm' ? V('gm') : nk === 'meta' ? V('make') : null;
      const box = `<details class="note ${nk}" data-a="${ctx.aid('note' + seg.title + seg.body.join(''))}"><summary>${noteChip(seg.title)}</summary><div class="note-body">${inner}</div></details>\n`;
      ctx.dcLead = true;   // 注のあとは、新しいまとまり
      if (top && nv) html += mark(ctx, nv) + box + mark(ctx, ctx.base || ctx.page.vis);
      else html += box;
      continue;
    }
    html += renderTokens(mk.lexer(seg.text), mk, ctx, opts);
  }
  return html;
}
// 見せる範囲の切れ目の印（あとで wrapVis が枠にする）。入れ子の中では出さない
function mark(ctx, v) {
  if (ctx.nest) return '';
  return `<!--V:${[v.k, v.who, v.cond, v.when, v.how, v.card].map((x) => encodeURIComponent(x || '')).join('|')}-->`;
}

// カード：「**《タイトル》**　入手条件」の段落からカード枠を作る（「**ID《タイトル》**」も可）
const CARD_START = /^\*\*([^*\n]{1,60})\*\*([^\n]*)$/;
function renderTokens(tokens, mk, ctx, opts) {
  let html = '';
  let cardOpen = false;
  const top = !ctx.nest;
  const closeCard = () => { if (cardOpen) { ctx.noDc--; html += '</div></section>\n' + uClose(ctx) + mark(ctx, ctx.base || ctx.page.vis); cardOpen = false; ctx.dcLead = true; } };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'space') continue;
    if (t.type === 'heading' && t.depth === 1 && !ctx.h1Done) { ctx.h1Done = true; ctx.h1 = strip(mk.parseInline(t.text)); continue; }
    if (top && INTRO_MAKE.has(ctx.page.id) && !ctx.introDone) {
      if (t.type === 'blockquote') { html += mark(ctx, V('make', { cond: '資料の説明・書き方' })) + mk.parser([t]) + mark(ctx, ctx.base || ctx.page.vis); continue; }
      ctx.introDone = true;
    }
    if (opts.kind === 'card') {
      if (t.type === 'heading' || t.type === 'hr') closeCard();
      const m = t.type === 'paragraph' && t.text.match(CARD_START);
      if (m && /《|^[A-Z]{2,}-|^REC-|^INFO-|^深度/.test(m[1])) {
        closeCard();
        const title = m[1].trim();
        const meta = m[2].trim();
        const id = ctx.aid(title + meta, 'h');
        ctx.toc.push({ id, text: strip(mk.parseInline(title)), level: 3 });
        const tone = /^REC-|記録片/.test(title) ? ' rec' : /^INFO-P/.test(title) ? ' split' : /^深度|調査|記録《|台帳|出所/.test(title) ? ' case' : '';
        ctx.cards = (ctx.cards || 0) + 1;
        if (top && ctx.page.group !== 'ref') {
          const cv = cardVis(title, meta, ctx.cardFacts && ctx.cardFacts.get(title + '|' + meta), ctx.page);
          ctx.cardVisList = ctx.cardVisList || []; ctx.cardVisList.push({ title: strip(title), ...cv });
          html += mark(ctx, cv);
        }
        const unitMark = (top && ctx.page.group !== 'ref') ? uOpen(ctx, m[1] + m[2]) : '';
        // カード1枚＝1つのまとまり。見出しの左に丸いアイコン（顔が分かる人は顔、それ以外はシステム）を置く
        html += unitMark + `<section class="cardx${tone}" id="${id}" data-card-unit="${esc(ctx.page.id)}" data-dc="lead" data-dckind="card"><header class="cardx-head" data-a="${id}">${dcAvHTML(DC_SYS)}<span class="cardx-title">${mk.parseInline(title)}</span>${meta ? `<span class="cardx-meta">${mk.parseInline(meta)}</span>` : ''}</header><div class="cardx-body">\n`;
        cardOpen = true; ctx.noDc = (ctx.noDc || 0) + 1;
        continue;
      }
    }
    if (t.type === 'paragraph' && /^\*\*Disgordの記録\*\*/.test(t.text) && ctx.u) html += uOpen(ctx, t.text);
    html += mk.parser([t]);
  }
  closeCard();
  return html;
}

// 部屋公開文は、1室＝1単位の3列にする（表の行のままだと列を並べられない）
function renderRoomBlocks(token, P, ctx) {
  let html = '<div class="room-list">\n';
  for (const row of token.rows) {
    const cells = row.map((c) => P.parseInline(c.tokens));
    const idText = strip(cells[0]).trim();
    if (!/^[UL]\d+$/.test(idText)) continue;
    const rowText = cells.map(strip).join(' ');
    const id = ctx.aid(rowText, 'r');
    html += uOpen(ctx, 'ROOM:' + idText) +
      `<div class="room-row" data-a="${id}"><span class="room-id">${cells[0]}</span><span class="room-name">${cells[1] || ''}</span><span class="room-text">${cells[2] || ''}</span></div>\n`;
  }
  html += uClose(ctx) + '</div>\n';
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
    ctx.nest = (ctx.nest || 0) + 1;
    const cHtml = plain.length ? renderMd(plain.join('\n\n'), ctx) : '';
    ctx.nest--;
    if (plain.length) {
      const calD = dcOn(ctx) ? (dcNew(ctx), dcBlock(ctx)) : DC_NONE;
      html += mark(ctx, V('gm', { cond: '読み方の注（配役・場面・目的）' })) + `<div class="callout" data-a="${ctx.aid(plain.join(''))}"${calD.attrs}>${calD.head}${cHtml}</div>\n` + mark(ctx, ctx.page.vis);
    }
    if (gm.length) html += renderMd(gm.join('\n'), ctx);
  }
  let aside = []; let pending = null; let fence = null; let gmBuf = []; let det = 0;
  const flushAside = () => {
    if (aside.length) {
      const text = aside.join('\n').trim(); aside = [];
      ctx.nest = (ctx.nest || 0) + 1;
      if (text) { const ad = dcBlock(ctx); html += `<div class="aside"${ad.attrs}>${ad.head}${renderMd(text, ctx)}</div>\n`; }
      ctx.nest--;
      ctx.dcLead = true;
    }
  };
  const flushGm = () => { if (gmBuf.length) { if (det > 0) ctx.nest = (ctx.nest || 0) + 1; html += renderMd(gmBuf.join('\n'), ctx); if (det > 0) ctx.nest--; gmBuf = []; } };
  const flushAll = () => { flushGm(); flushAside(); };
  const line = (who, mod, say, extra, cls = '') => {
    const wm = who.match(/^(.+?)【([^】]+)】$/);
    if (wm) { who = wm[1]; mod = (mod ? mod + '・' : '') + wm[2]; }
    const key = speakerKey(who);
    ctx.speakers = ctx.speakers || {}; ctx.speakers[who] = (ctx.speakers[who] || 0) + 1;
    // 台詞は、原稿に書かれている話者をそのまま使う（名乗りは .who に本文として出ているので、顔だけを足す）
    const d = dcOn(ctx) ? dcBlock(ctx, { spk: who, inline: true }) : DC_NONE;
    html += `<div class="line sp-${key}${cls}" data-a="${ctx.aid(who + say)}"${d.attrs}>${d.head}<span class="who">${esc(who)}${mod ? `<small>${esc(mod)}</small>` : ''}</span><span class="say">「${inlineMd(say)}」${extra ? `<small class="cond-note">${esc(extra)}</small>` : ''}</span></div>\n`;
  };
  for (; i < lines.length; i++) {
    const raw = inlineGm(lines[i]); const s = raw.trim();
    if (fence) {
      if (/^```/.test(s)) { const fd = dcOn(ctx) ? (dcNew(ctx), dcBlock(ctx)) : DC_NONE; html += `<div class="screen" data-a="${ctx.aid(fence.join(''))}"${fd.attrs}>${fd.head}${fence.map((x) => inlineMd(x)).join('<br>')}</div>\n`; fence = null; }
      else fence.push(raw);
      continue;
    }
    if (GM_LINE.test(s)) { flushAside(); gmBuf.push(s.replace(/^-\s+/, '')); continue; }
    if (gmBuf.length && GM_CONT.test(raw)) { gmBuf.push(raw); continue; }
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
      if (level === 1) { dcNew(ctx); html += `<div class="line big sp-chaser" data-a="${ctx.aid(text)}"><span class="who"></span><span class="say">${inlineMd(text)}</span></div>\n`; continue; }
      const id = ctx.aid(text, 'h'); ctx.toc.push({ id, text: strip(inlineMd(text)), level });
      dcNew(ctx);
      html += `<h${level} id="${id}" class="h${level} read-sec" data-a="${id}">${inlineMd(text)}</h${level}>\n`;
      continue;
    }
    if (/^■/.test(s)) { flushAll(); pending = null; const id = ctx.aid(s, 'h'); ctx.toc.push({ id, text: s.replace(/^■\s*/, ''), level: 3 }); dcNew(ctx); html += `<div class="scene" id="${id}" data-a="${id}">${esc(s.replace(/^■\s*/, ''))}</div>\n`; continue; }
    if (/^（[\s\S]*）$/.test(s)) {
      flushAll();
      const gmStage = det === 0 && /^（\s*→|^（GM|→\s*R\d\d|【GM】/.test(s);
      const sd = dcOn(ctx) ? (dcNew(ctx), dcBlock(ctx)) : DC_NONE;
      const st = `<div class="stage" data-a="${ctx.aid(s)}"${sd.attrs}>${sd.head}${inlineMd(s)}</div>\n`;
      html += gmStage ? mark(ctx, V('gm', { cond: '進行の注（次に読むもの）' })) + st + mark(ctx, ctx.page.vis) : st;
      continue;
    }
    if (/^\*\*【(画面|カード|公開ログ|画面の助け舟)/.test(s)) { flushAll(); pending = null; const cd = dcOn(ctx) ? (dcNew(ctx), dcBlock(ctx)) : DC_NONE; html += `<div class="screen" data-a="${ctx.aid(s)}"${cd.attrs}>${cd.head}${inlineMd(s)}</div>\n`; continue; }
    if ((m = s.match(/^\*\*([^*]{1,60})\*\*$/))) {
      flushAll();
      const label = m[1];
      const sp = label.match(/^([^（\s]{1,10})(（[^）]{1,16}）)?$/);
      if (sp && SPEAKERS[sp[1]]) { pending = { who: sp[1], mod: sp[2] ? sp[2].slice(1, -1) : '', sticky: true }; continue; }
      if (/^組の誰か/.test(label)) { pending = { who: '組の誰か', mod: label.replace(/^組の誰かが読む/, '').replace(/^[（(]|[）)]$/g, ''), sticky: true }; const gd = dcOn(ctx) ? dcBlock(ctx, { spk: '組の誰か', inline: true }) : DC_NONE; html += `<div class="cond-head" data-a="${ctx.aid(label)}"${gd.attrs}>${gd.head}${inlineMd(label)}</div>\n`; continue; }
      pending = null;
      const cd2 = dcOn(ctx) ? dcBlock(ctx) : DC_NONE;
      html += `<div class="cond-head" data-a="${ctx.aid(label)}"${cd2.attrs}>${cd2.head}${inlineMd(label)}</div>\n`;
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
  return html;
}
const inlineMk = new Marked({ gfm: true, breaks: true });
const inlineMd = (s) => inlineMk.parseInline(s);


// ---------- 比較単位（unit）: 左＝本仕様／中＝AI案／右＝実画面 の3列の単位 ----------
// 単位と本文ハッシュは work/compare_ui/extract_compare_units.py が決める（content/_ai_proposals.json の units_meta）。
// ここでは「どの要素がその単位か」を原稿の並び順で突き合わせ、data-unit / data-uhash を付けるだけ。
let AI = null;
try { AI = JSON.parse(fs.readFileSync(C('_ai_proposals.json'), 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const UNITS_META = (AI && AI.units_meta) || {};
const PAGE_UNITS = new Map();
for (const [uid, m] of Object.entries(UNITS_META)) {
  if (!PAGE_UNITS.has(m.page_id)) PAGE_UNITS.set(m.page_id, []);
  PAGE_UNITS.get(m.page_id).push({ uid, ...m });
}
for (const list of PAGE_UNITS.values()) list.sort((a, b) => a.line_start - b.line_start);
const uNorm = (s) => String(s || '').replace(/[\s\u3000*_`]/g, '');
const STRICT_UNITS = process.env.CMP_STRICT === '1';
const unitWarn = [];
const staleUnits = new Set();
const sha256 = (s) => 'sha256:' + crypto.createHash('sha256').update(s, 'utf8').digest('hex');

function markStale(p, rawSrc) {
  const list = PAGE_UNITS.get(p.id) || [];
  if (!list.length || !rawSrc) return;
  const lines = rawSrc.replace(/\r\n/g, '\n').split('\n');
  for (const u of list) {
    const part = lines.slice(u.line_start - 1, u.line_end).map((x) => x.replace(/[ \t\u3000]+$/, ''));
    if (sha256(part.join('\n')) !== u.raw_hash) staleUnits.add(u.uid);
  }
}

function unitApi(ctx) {
  const list = PAGE_UNITS.get(ctx.page.id) || [];
  const st = { list, i: 0, open: null, missing: [] };
  ctx.u = st;
  return st;
}
function uOpen(ctx, key) {
  const st = ctx.u; if (!st) return '';
  let pre = uClose(ctx);
  if (st.i >= st.list.length) { st.missing.push('extra:' + String(key).slice(0, 40)); return pre; }
  const k = uNorm(key);
  let node = st.list[st.i];
  if (uNorm(node.anchor) !== k) {
    const j = st.list.findIndex((x, idx) => idx >= st.i && uNorm(x.anchor) === k);
    if (j >= 0) { for (let n = st.i; n < j; n++) st.missing.push(st.list[n].unit_id); st.i = j; node = st.list[j]; }
    else { st.missing.push('? ' + String(key).slice(0, 30)); return pre; }
  }
  st.i++;
  st.open = node.uid;
  return pre + '<!--U:' + node.uid + '-->';
}
function uClose(ctx) {
  const st = ctx.u;
  if (!st || !st.open) return '';
  st.open = null;
  return '<!--/U-->';
}

// 単位の目印を、見せる範囲の枠の中に収める。単位が枠をまたぐときは、いちばん長い枠を入れ物にする。
function attachUnitGrids(chunks, p) {
  const segs = [];
  let openUid = null;
  chunks.forEach((c, ci) => {
    const h = c.h;
    const re = /<!--U:([^>]+?)-->|<!--\/U-->/g;
    let m; let cur = null;
    if (openUid) { cur = { uid: openUid, ci, fromOpen: false, openAt: -1, from: 0, to: null, closeAt: -1 }; }
    while ((m = re.exec(h))) {
      if (m[0] === '<!--/U-->') {
        if (cur) { cur.to = m.index; cur.closeAt = m.index; segs.push(cur); cur = null; openUid = null; }
      } else {
        if (cur) { cur.to = m.index; segs.push(cur); }
        cur = { uid: m[1], ci, fromOpen: true, openAt: m.index, from: m.index + m[0].length, to: null, closeAt: -1 };
        openUid = cur.uid;
      }
    }
    if (cur) { cur.to = h.length; segs.push(cur); }
  });
  if (!segs.length) return;
  const chars = (s) => strip(s).replace(/\s+/g, '').length;
  const isGmChunk = (ci) => { const v = (chunks[ci] && chunks[ci].v) || {}; return v.k === 'gm' || v.k === 'make'; };
  // 入れ物は「プレイヤーに見える枠」のうち、いちばん長いもの（GM注の枠を入れ物にしない）。
  // 見える枠が無い単位だけ、いちばん長い枠に入れる。
  const host = new Map();
  const byUid = new Map();
  segs.forEach((s, i) => {
    const n = chars(chunks[s.ci].h.slice(s.from, s.to));
    if (!byUid.has(s.uid)) byUid.set(s.uid, []);
    byUid.get(s.uid).push({ i, n, pl: !isGmChunk(s.ci) });
  });
  for (const [uid, arr] of byUid) {
    const pl = arr.filter((x) => x.pl && x.n > 0);
    const pick = (pl.length ? pl : arr).reduce((a, b) => (b.n > a.n ? b : a));
    host.set(uid, pick);
  }
  const openHTML = (uid) => {
    const m = UNITS_META[uid] || {};
    const stale = staleUnits.has(uid) ? ' data-ustale="1"' : '';
    const prot = m.protected ? ' data-uprot="1"' : '';
    return `<div class="cmp-grid" data-unit="${esc(uid)}" data-uhash="${esc(m.source_hash || '')}"${prot}${stale}><div class="cmp-spec">`;
  };
  const closeHTML = '</div><div class="cmp-ai" data-cmp="ai"></div><div class="cmp-shot" data-cmp="shot"></div></div>';
  const byChunk = new Map();
  segs.forEach((s, i) => {
    if (!byChunk.has(s.ci)) byChunk.set(s.ci, []);
    byChunk.get(s.ci).push({ ...s, isHost: host.get(s.uid).i === i });
  });
  for (const [ci, list] of byChunk) {
    const h = chunks[ci].h;
    let out = ''; let last = 0; let prefix = ''; let suffix = '';
    for (const s of list) {
      if (s.fromOpen) {
        out += h.slice(last, s.openAt);
        if (s.isHost) out += openHTML(s.uid);
        last = s.openAt + ('<!--U:' + s.uid + '-->').length;
      } else {
        if (s.isHost) prefix = openHTML(s.uid);
      }
      if (s.closeAt >= 0) {
        out += h.slice(last, s.closeAt);
        if (s.isHost) out += closeHTML;
        last = s.closeAt + '<!--/U-->'.length;
      } else if (s.isHost) suffix = closeHTML;
    }
    out += h.slice(last);
    chunks[ci].h = prefix + out + suffix;
  }
}

// ---------- 見せる範囲の枠 ----------
// 制作の印（【2026-11-07 …】【作者修正】【r3】【旧王国改訂 …】など）は小さな札にし、プレイヤー表示では隠す
const MAKE_TAG = /20\d\d-\d|(?:^|[・\s])r\d|作者|修正|改訂|決定|追記|指示|新規|Claude|^T\d|整合|組み直し|旧|廃止|取り消し|仮置|確認待ち|担当/;
function makeBadges(html) {
  return html.replace(/(<[^>]*>)|【([^】<>]{1,90})】/g, (m, tag, inner) => {
    if (tag) return tag;
    if (/^(GM|物語|あなたは)/.test(inner) || !MAKE_TAG.test(inner)) return m;
    return `<span class="badge make">${inner}</span>`;
  });
}
const KLABEL = { all: 'PL・全員が見る', self: 'PL・本人だけ', here: 'PL・その場にいた人だけ', gm: 'GMだけ', make: '制作' };
const KICON = { all: '◎', self: '◆', here: '◇', gm: '■', make: '▲' };
const visStats = [];
function visLabel(v, whole) {
  const who = v.k === 'self' && v.who ? '：' + v.who : '';
  const cond = v.cond && !(v.k === 'self' && v.cond === v.who) ? `<span class="vis-cond">${esc(v.cond)}</span>` : '';
  const after = v.when === 'after' ? '<span class="vis-when">推理のあと</span>' : '';
  const scope = whole ? '<span class="vis-scope">このページ全体</span>' : '';
  return `<div class="vis-label"><span class="vis-chip"><i>${KICON[v.k]}</i>${KLABEL[v.k]}${esc(who)}</span>${after}${cond}${scope}</div>` + (v.how ? `<div class="vis-how">${esc(v.how)}</div>` : '');
}
function wrapVis(html, p) {
  const parts = html.split(/<!--V:([^>]*?)-->/);
  const raw = [{ v: p.vis, h: parts[0] }];
  for (let i = 1; i < parts.length; i += 2) {
    const f = parts[i].split('|').map((x) => decodeURIComponent(x));
    raw.push({ v: V(f[0], { who: f[1], cond: f[2], when: f[3], how: f[4], card: f[5] }), h: parts[i + 1] || '' });
  }
  const chunks = [];
  for (const c of raw) {
    if (!c.h.trim()) continue;
    if (p.vis.when === 'after' && (c.v.k === 'all' || c.v.k === 'here' || c.v.k === 'self') && !c.v.when) c.v = { ...c.v, when: 'after' };
    const key = JSON.stringify(c.v);
    const last = chunks[chunks.length - 1];
    if (last && !c.v.card && !last.v.card && last.key === key) { last.h += c.h; continue; }
    chunks.push({ v: c.v, h: c.h, key });
  }
  attachUnitGrids(chunks, p);
  const whole = chunks.length === 1;
  let out = '';
  for (const c of chunks) {
    let h = c.h;
    const fold = (c.v.k === 'gm' && p.vis.k !== 'gm') || (c.v.k === 'make' && p.vis.k !== 'make');
    if (fold && !/^\s*<details/.test(h)) {
      const sum = c.v.k === 'gm' ? 'GMだけの情報（開く）' : '制作の注（開く）';
      h = `<details class="note ${c.v.k === 'gm' ? 'gm' : 'meta'} vis-fold"><summary><span class="note-chip">${KLABEL[c.v.k]}</span>${esc(c.v.cond || sum)}</summary><div class="note-body">${h}</div></details>\n`;
    }
    const who = c.v.k === 'self' ? (c.v.who === '各自' ? 'each' : WHO_KEY[c.v.who] || '') : '';
    out += `<div class="vis v-${c.v.k}${c.v.card ? ' vis-card' : ''}" data-vis="${c.v.k}" data-who="${who}" data-when="${c.v.when || ''}">${visLabel(c.v, whole && !c.v.card)}<div class="vis-body">${h}</div></div>\n`;
  }
  return { html: out, chunks };
}

// ---------- 組み立て ----------
const pages = [];
const speakerAll = {};
const TONE_BY_PC = { 1: 'mireille', 2: 'viola', 3: 'mixi', 4: 'edgar' };
const OLD_TONE_BY_PC = { 1: 'mireille', 2: 'viola', 3: 'lucia', 4: 'gald' };
const isNew = (p) => p.group !== 'ref';
// ページの頭（h1）に出す話者。HOは、そのPCのHOなので、PCの顔と名前を出す（本文の話者は システム のまま）。
// それ以外の説明・ルールのページは「システム」（人物ではない案内）。新しい人物は作らない。
const DC_PC_BY_N = { 1: 'ミレイユ', 2: 'ヴィオラ', 3: 'ミクシィ', 4: 'エドガー' };
function pageDc(p) {
  const m = p.id.match(/^n-ho-pc(\d)/);
  const name = m ? DC_PC_BY_N[m[1]] : '';
  if (!name) return { spk: DC_SYS, sk: 'sys', face: '' };
  const k = dcSk(name);
  return { spk: name, sk: k, face: DC_FACE[k] ? 'media/faces/' + DC_FACE[k] : '' };
}
function buildPage(p) {
  const ctx = makeCtx(p); ctx.badges = [];
  unitApi(ctx);
  let html = '';
  if (p.kind === 'link') {
    html = '<div class="callout"><p>改稿前（Ver3.4、2026-09-28）の制作者確認盤は別画面で開きます。27部屋・77カードの原文、推理導線、旧メモが見られます。</p><p><a class="btn primary" href="https://dungeon-of-the-murder-review.pages.dev/" target="_blank" rel="noopener">旧・制作者確認盤を開く</a></p></div>';
    ctx.h1 = '旧・制作者確認盤（Ver3.4）';
  } else {
    const src = fs.readFileSync(p.file, 'utf8').replace(/\r\n/g, '\n');
    markStale(p, src);
    if (p.kind === 'read') html = renderReading(src, ctx);
    else html = renderMd(src, ctx, { kind: p.kind });
    html += uClose(ctx);
  }
  html = makeBadges(badgeTags(html));
  html = injectNotes(html, p);   // 作者注（あれば）。原稿本文ではなく、この組み立てのときだけ差し込む
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
  const W = wrapVis(html, p);
  html = W.html;
  // 単位の付け残し・余りを数える（原稿が変わって対応がずれたら、ここで気づく）
  const expectUnits = (PAGE_UNITS.get(p.id) || []).length;
  const gotUnits = (html.match(/data-unit="/g) || []).length;
  if (expectUnits || gotUnits) {
    if (ctx.u.missing.length || expectUnits !== gotUnits) {
      unitWarn.push(`${p.id}: 単位 ${gotUnits}/${expectUnits} 付け残し=${ctx.u.missing.slice(0, 6).join(',')}`);
    }
  }
  p.unitCount = gotUnits;
  const rawSrc = p.file && fs.existsSync(p.file) ? fs.readFileSync(p.file, 'utf8') : '';
  if (isNew(p) && /2026-11-07/.test(rawSrc)) ctx.badges.push('11/7 組み直し');
  else if (isNew(p) && /2026-11-0[34]/.test(rawSrc)) ctx.badges.push('11/3〜11/4 改稿');
  if (!isNew(p) && /【作者修正/.test(rawSrc)) ctx.badges.push('作者修正（10/07）');
  for (const b of p.extraBadges || []) ctx.badges.push(b);
  if (ctx.speakers && isNew(p)) for (const [w, n] of Object.entries(ctx.speakers)) speakerAll[w] = (speakerAll[w] || 0) + n;
  const flat = (h) => strip(String(h)
    .replace(/<span class="dc-av[^"]*"[^>]*>(?:<img[^>]*>|[^<]*)<\/span>/g, '')
    .replace(/<span class="dc-name[^"]*"[^>]*>[^<]*<\/span>/g, '')).replace(/\s+/g, ' ').trim();
  const text = flat(W.chunks.map((c) => c.h).join(' '));
  // プレイヤー表示のときの検索用：PL の段だけの文（推理のあと・本人だけは分ける）
  const tp = flat(W.chunks.filter((c) => (c.v.k === 'all' || c.v.k === 'here') && c.v.when !== 'after').map((c) => c.h).join(' '));
  const ta = flat(W.chunks.filter((c) => (c.v.k === 'all' || c.v.k === 'here' || c.v.k === 'self') && c.v.when === 'after').map((c) => c.h).join(' '));
  const tw = {};
  for (const c of W.chunks) if (c.v.k === 'self' && c.v.when !== 'after') { const w = WHO_KEY[c.v.who] || (c.v.who === '各自' ? 'each' : '_'); tw[w] = ((tw[w] || '') + ' ' + flat(c.h)).trim(); }
  const kinds = {}; for (const c of W.chunks) kinds[c.v.k] = (kinds[c.v.k] || 0) + 1;
  const selfWho = [...new Set(W.chunks.filter((c) => c.v.k === 'self').map((c) => WHO_KEY[c.v.who] || (c.v.who === '各自' ? 'each' : '_')))];
  const plOpen = W.chunks.some((c) => (c.v.k === 'all' || c.v.k === 'here') && c.v.when !== 'after');
  const plAfter = W.chunks.some((c) => ['all', 'here', 'self'].includes(c.v.k) && c.v.when === 'after');
  visStats.push({ id: p.id, nav: p.nav, group: p.group, chunks: W.chunks.length, kinds, cards: ctx.cardVisList || [] });
  const rel = p.file ? path.relative(path.join(ROOT, 'content'), p.file).replace(/\\/g, '/') : '';
  const vis = { k: p.vis.k, who: WHO_KEY[p.vis.who] || '', whoName: p.vis.who, cond: p.vis.cond, when: p.vis.when, kinds, selfWho, plOpen, plAfter };
  pages.push({ id: p.id, group: p.group, sub: p.sub, nav: p.nav, kind: p.kind, audience: p.audience, vis, dc: pageDc(p), title, badges: ctx.badges, source: rel, toc: ctx.toc, html, text, tp, ta, tw, cards: ctx.cards || 0, scene: p.scene || '', gen_kind: p.gen_kind || '' });
}
for (const p of P) if (!p.gen_late) buildPage(p);   // 訂正済み・疑問だけ、ほかのページの実アンカーが要るので後で組む

// ---------- 訂正済み・疑問のページを、ほかのページの実アンカーを引いて作る ----------
const GEN_STATS = {};
{
  const changes = readJsonMaybe(path.join(A69, 'source', 'changes_before_after.json'));
  if (!changes) throw new Error('69 の changes_before_after.json が無い：訂正済みの箇所（n-fixed）を作れない（' + A69 + '）');
  const fixed = AP.buildFixedPage({
    changes, ledger: readJsonMaybe(path.join(A69, 'source', 'source_ledger_new.json')),
    tests: readJsonMaybe(path.join(A69, 'source', 'tests.json')), notes: NOTEBOOK,
    d1: readJsonMaybe(path.join(A70, 'memos_before70.json')), pages,
    gameCommit: GAME_COMMIT, generatedAt: BUILT_AT, sourceRoot: MANUSCRIPT,
  });
  fs.writeFileSync(C('訂正済みの箇所.md'), fixed.md);
  fs.writeFileSync(C('_author_fixed.json'), JSON.stringify(fixed.data, null, 1));
  GEN_STATS.fixed = {
    files: fixed.data.counts.files, units: fixed.data.counts.units,
    linked: fixed.data.units.filter((u) => u.href).length,
    d1Resolved: fixed.data.d1.resolvedEditDel, d1Unresolved: fixed.data.d1.unresolved,
    notes: fixed.data.counts.notes,
  };
  const qsrc = readJsonMaybe(C('_author_questions.json'));
  if (!qsrc) throw new Error('content/_author_questions.json が無い：疑問・矛盾・気になる所（n-questions）を作れない');
  const q = AP.buildQuestionsPage({ questions: qsrc, generatedAt: BUILT_AT });
  fs.writeFileSync(C('疑問と気になる所.md'), q.md);
  fs.writeFileSync(C('_author_questions.built.json'), JSON.stringify(q.data, null, 1));
  GEN_STATS.questions = q.data.counts;
  for (const p of P) if (p.gen_late) buildPage(p);
  // 並び：訂正済み・疑問は「今の状態」の先頭（n-now のすぐ次）へ。g-* は新しい大題のまま末尾。
  const late = pages.filter((x) => x.id === 'n-fixed' || x.id === 'n-questions');
  for (const lp of late) { const i = pages.indexOf(lp); if (i >= 0) pages.splice(i, 1); }
  const iNow = pages.findIndex((x) => x.id === 'n-now');
  pages.splice(iNow >= 0 ? iNow + 1 : 0, 0, ...late);
  console.log('訂正済みの箇所:', GEN_STATS.fixed.units, 'か所（リンク', GEN_STATS.fixed.linked + '）',
    '／疑問:', GEN_STATS.questions.items, '件（未確定', GEN_STATS.questions.undecided, '・実装差', GEN_STATS.questions.implDiff, '）');
}
const ids = new Set();
for (const p of pages) { if (ids.has(p.id)) throw new Error('ページIDの重複: ' + p.id); ids.add(p.id); }

// 作者注の差し込み結果（n-now の一覧が「#/ページ/アンカー」で飛べるように、実アンカーを書き出す）
{
  const byId = {};
  for (const h of NOTE_HITS) byId[h.note_id] = h;
  const all = (NOTEBOOK && NOTEBOOK.notes) || [];
  const out = {
    generated: new Date().toISOString(), source: '_creator_notes.json',
    total: all.length, placed: NOTE_HITS.length, missed: NOTE_MISS.length,
    counts: (NOTEBOOK && NOTEBOOK.counts) || null,
    notes: all.map((n) => ({
      id: n.id, page_id: n.page_id, section: n.section, state: n.state, state_label: n.state_label,
      anchor: byId[n.id] ? byId[n.id].anchor : '', placed: !!byId[n.id],
    })),
    miss: NOTE_MISS,
  };
  fs.writeFileSync(path.join(ROOT, 'data', 'note-anchors.json'), JSON.stringify(out, null, 1));
  console.log('作者注:', out.placed + '/' + out.total, 'か所に差し込み', out.missed ? '（未対応 ' + out.missed + '）' : '（未対応 0）');
  for (const m of NOTE_MISS) console.log('  - 未対応:', m.note_id, m.page_id, m.why);
  for (const h of NOTE_HITS) if (h.hits > 1) console.log('  - 同じ文が' + h.hits + 'か所:', h.note_id, h.page_id, h.anchor);
}

// ゲームの実際の画面（node tools/game-shots.mjs が media/gameview/ に撮る）。ページIDごとに右半分へ並べる
// 2026-11-15：撮り直しの新しい manifest（media/gameview-next/）が届いたら、そちらを必ず優先して使う。
// 旧 media/gameview/ は消さずに残す（落ちたときだけ使い、落ちたことを data に残す）。
let gameview = null;
try {
  const pick = AP.pickGameviewManifest({
    nextPath: path.join(ROOT, 'media', 'gameview-next', 'manifest.json'),
    legacyPath: path.join(ROOT, 'media', 'gameview', 'manifest.json'),
    requireNext: process.env.GAMEVIEW_REQUIRE_NEXT === '1',   // 親の最終確認では 1 にして、新しい実画面を必須にする
  });
  if (!pick.manifest) throw Object.assign(new Error('NO_MANIFEST'), { code: 'ENOENT' });
  const gv = pick.manifest;
  if (pick.fallback) console.log('実画面: 新しい manifest（media/gameview-next/）がまだ無いので、旧 media/gameview/ を使う（' + (gv.gameCommit || '?') + '）。撮り直し待ち');
  else console.log('実画面: media/gameview-next/manifest.json を使う（' + (gv.gameCommit || '?') + '）');
  let n = 0;
  for (const p of pages) {
    const list = (gv.pages || {})[p.id];
    if (list && list.length) { p.shots = list.map((x) => ({ file: x.file, caption: x.caption || '', w: x.w || 0, h: x.h || 0 })); n += list.length; }
    // 単位のあるページは、右半分の一括表示ではなく、単位ごとの実画面（unitShots）を使う
    if ((PAGE_UNITS.get(p.id) || []).length) p.shots = null;
    // ゲームの全文字のページは、その場面の画像だけを使う（別のページ・別の場面の画像で埋めない）
    if (p.scene) {
      const r = AP.sceneShots(gv, p.id, p.scene);
      if (r.shots) { p.shots = r.shots; n += r.shots.length; }
      else { p.shots = null; p.noShotReason = r.reason; }
    }
  }
  gameview = {
    builtAt: gv.builtAt || '', gameCommit: gv.gameCommit || '', importWarnings: gv.importWarnings ?? null,
    preview: gv.preview ?? null, liveDeployed: gv.liveDeployed ?? null, previewLabel: gv.previewLabel || '',
    unitShots: gv.unitShots || {}, unitNoShotReason: gv.unitNoShotReason || {},
    source: pick.source, path: pick.source === 'gameview-next' ? 'media/gameview-next/manifest.json' : 'media/gameview/manifest.json',
    fallback: !!pick.fallback,
  };
  // 撮影側と節の名づけが違っても（例 HO:…:3_companions と 3_仲間のこと）、
  // 同じページ・同じ節番号なら同じ単位として実画面を結ぶ。当てた数はログに出す（黙って混ぜない）。
  const shotAlias = [];
  for (const uid of Object.keys(UNITS_META)) {
    if (!/^HO:/.test(uid)) continue;
    const pfx = uid.replace(/_[^_:]*$/, '_');
    if (!gameview.unitShots[uid]) {
      const k = Object.keys(gameview.unitShots).find((x) => x.startsWith(pfx));
      if (k) { gameview.unitShots[uid] = gameview.unitShots[k]; shotAlias.push(uid + ' ← ' + k); }
    }
    if (!gameview.unitNoShotReason[uid]) {
      const k = Object.keys(gameview.unitNoShotReason).find((x) => x.startsWith(pfx));
      if (k) gameview.unitNoShotReason[uid] = gameview.unitNoShotReason[k];
    }
  }
  // 必須4場面（ヴィオラの説明・キャラ選択・はじめに・開始）に実画面が付いているか。
  // 撮影待ちを許すのは、この4場面以外だけ。親の最終確認（GAMEVIEW_REQUIRE_NEXT=1）では足りなければ止める。
  if (pick.source === 'gameview-next') {
    const missShots = AP.missingRequiredShots(pages);
    gameview.gtextRequiredMissing = missShots;
    if (missShots.length) {
      const msg = '新しい実画面 manifest に、必須4場面の画像が無い: ' + missShots.join(', ');
      if (process.env.GAMEVIEW_REQUIRE_NEXT === '1') { console.error(msg); process.exit(1); }
      console.warn(msg + '（撮影待ちを許すのは必須4場面以外だけ。最終確認では止まる）');
    }
  }
  if (shotAlias.length) console.log('実画面の単位名の読み替え:', shotAlias.length, '件（例 ' + shotAlias[0] + '）');
  console.log('ゲームの画面:', n, '枚', Object.keys(gv.pages || {}).filter((id) => !ids.has(id)).map((id) => '（ページが無いID ' + id + '）').join(' '));
} catch (e) { if (e.code !== 'ENOENT') throw e; }
// ページID → 原稿ファイル（比較単位の取り直しが、ページの実ファイルを引けるように）
fs.writeFileSync(path.join(ROOT, 'data', 'page-sources.json'), JSON.stringify(
  Object.fromEntries(pages.filter((p) => p.source).map((p) => [p.id, p.source])), null, 1));
const data = { version: 'dom-rv3', built: BUILT_AT, home: 'n-now', groups: GROUPS, pages, gameview,
  units: { count: Object.keys(UNITS_META).length, pages: PAGE_UNITS.size, stale: [...staleUnits].length },
  // 70：訂正済み・疑問・ゲームの全文字（UIはここから件数と版を出せる。ページ本文は pages[] が正本）
  authorPages: {
    generatedAt: BUILT_AT, gameCommit: GAME_COMMIT,
    fixed: GEN_STATS.fixed || null,
    questions: GEN_STATS.questions || null,
    gtext: GT_GROUP ? { ...GT_GROUP.stats, commit: GTEXT_COMMIT_SHORT, commitFull: GAMETEXT.commit, generatedAt: GAMETEXT.generatedAt || '' } : null,
  } };
// AI案（原稿とは別保存。採用も削除もしない。ここでは読んで並べるだけ）
const aiOut = AI ? {
  schema: AI.schema, generated_at: AI.generated_at, generator_model: AI.generator_model,
  proposals_status: AI.proposals_status, manuscript_snapshot_id: AI.manuscript_snapshot_id,
  note: AI.note, targets: AI.targets, ho_scopes: AI.ho_scopes,
  page_summaries: AI.page_summaries || {}, units_meta: AI.units_meta || {}, units: AI.units || {},
} : null;
fs.writeFileSync(path.join(ROOT, 'data', 'ai-proposals.js'),
  'window.SITE_AI_PROPOSALS=' + JSON.stringify(aiOut) + ';\n');
if (unitWarn.length) {
  console.log('比較単位の付け残し:', unitWarn.length, 'ページ');
  for (const w of unitWarn.slice(0, 12)) console.log('  -', w);
}
if (staleUnits.size) console.log('原稿が抽出時から変わった単位:', staleUnits.size, '（案は旧版として保管し、書き換えも採用もしない。作り直すときは work/compare_ui/extract_compare_units.py から）');
// 切り分け：「原稿が変わって案が旧版になった」単位は、意図した旧版なので失敗にしない（CMP_STRICT_STALE=1 で失敗にできる）。
// 単位の付け残し・余り（原稿から単位を拾えない＝構造の異常）は、今までどおり失敗にする。
if (STRICT_UNITS && (unitWarn.length || (staleUnits.size && process.env.CMP_STRICT_STALE === '1'))) {
  console.error('CMP_STRICT=1: 比較単位がそろっていません（欠落・余り ' + unitWarn.length + 'ページ／旧版の単位 ' + staleUnits.size + '件）');
  process.exit(1);
}
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

// 見せる範囲の数
const visAll = visStats.reduce((a, x) => { for (const [k, n] of Object.entries(x.kinds)) a[k] = (a[k] || 0) + n; return a; }, {});
console.log('見せる範囲の枠:', visStats.reduce((a, x) => a + x.chunks, 0), JSON.stringify(visAll));
const cardRows = visStats.flatMap((x) => x.cards.map((c) => ({ page: x.nav, ...c })));
const ck = {}; for (const c of cardRows) ck[c.k] = (ck[c.k] || 0) + 1;
console.log('カードの印:', cardRows.length, JSON.stringify(ck), '本人だけで「だれ」が空:', cardRows.filter((c) => c.k === 'self' && !c.who).length);
fs.writeFileSync(path.join(ROOT, 'tools', '_card_vis.json'), JSON.stringify(cardRows, null, 1));
