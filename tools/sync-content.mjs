// 今の正本（05_完成版）から content/完成版/ へMarkdownを写す。content/ がサイトの元データ。
// 使い方: node tools/sync-content.mjs   （そのあと npm run build）
// content/今の状態_*.md と content/今の仕様（ゲーム）.md は手で作ったページ（このスクリプトは触らない）。
// 今の仕様は、作業フォルダの build_spec_now.py をゲームの commit で回した結果を Markdown にし、古い所を直したもの。
// - GM資料（メモつき）は全部写す。プレイヤー配布は、GM版に同じ物が無い分（はじめに・ルール・P10で配る）だけ写す。
// - 配布版とGM版の両方があるもの（HO・読み合わせ・カード・共通HO）は、GM版から【GM】の行を除いた文と配布版を比べ、
//   結果を content/完成版/_配布版との照合.md に書く（サイトの「このサイトについて」から見られる）。
// - 旧版（2026-10-06 の写し）は content/旧版_20261006/ に、改訂元の写しは content/参照/ にそのまま残す（このスクリプトは触らない）。
// - .private・合言葉の控え・_作業メモ は写さない。
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'C:/00_【創作】一時フォルダ/_マダミス改訂_20261004/ダンジョン・オブ・ザ・マーダー';
const SRC = ROOT + '/05_完成版';
const DST = path.resolve('content/完成版');

const rd = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
function walk(d, out = []) {
  for (const f of fs.readdirSync(d)) {
    if (f.startsWith('.')) continue; // .private など
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out); else if (f.endsWith('.md')) out.push(p);
  }
  return out;
}
function put(to, text) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, text); }

fs.rmSync(DST, { recursive: true, force: true });
// 1. GM資料（全部）
const gmFiles = walk(SRC + '/GM資料');
for (const f of gmFiles) put(path.join(DST, 'GM資料', path.relative(SRC + '/GM資料', f)), rd(f));
// 2. 変更履歴
put(path.join(DST, 'CHANGELOG.md'), rd(ROOT + '/CHANGELOG.md'));

// 3. プレイヤー配布：GM版との対応を作る
const plFiles = walk(SRC + '/プレイヤー配布');
const gmByName = new Map();
for (const f of gmFiles) gmByName.set(path.basename(f), f);
const pairs = []; const plOnly = [];
for (const f of plFiles) {
  const g = gmByName.get(path.basename(f));
  if (g) pairs.push([f, g]); else plOnly.push(f);
}
for (const f of plOnly) put(path.join(DST, 'プレイヤー配布', path.relative(SRC + '/プレイヤー配布', f)), rd(f));

// 4. 照合：GM版から【GM】の行を除き、空白を詰めて配布版と行ごとに比べる
const norm = (t) => t.split('\n')
  .filter((l) => !/^\s*>\s*【GM】/.test(l) && !/^\s*(-\s*)?【GM】/.test(l))
  .map((l) => l.replace(/【[^】]*】/g, '').replace(/\*\*[A-Z][A-Z0-9-]*(?=《)/g, '**').replace(/^>\s?/, '').replace(/\s+/g, '').trim())
  .filter((l) => l && !/^<\/?(details|summary)/.test(l))
  .join('\n');
const rows = [];
let same = 0;
for (const [pl, gm] of pairs.sort((a, b) => a[0].localeCompare(b[0], 'ja'))) {
  const a = norm(rd(gm)).split('\n'); const b = norm(rd(pl)).split('\n');
  const setB = new Set(b); const setA = new Set(a);
  const onlyGm = a.filter((l) => !setB.has(l)).length; // GM版にだけある行
  const onlyPl = b.filter((l) => !setA.has(l)).length; // 配布版にだけある行
  if (!onlyGm && !onlyPl) same++;
  // 配布版にだけある行が多いもの（表の形が違うなど）は、配布版も載せる
  if (onlyPl >= 5) { put(path.join(DST, 'プレイヤー配布', path.relative(SRC + '/プレイヤー配布', pl)), rd(pl)); plOnly.push(pl); }
  rows.push(`| ${path.relative(SRC + '/プレイヤー配布', pl).replace(/\\/g, '/')} | ${path.relative(SRC, gm).replace(/\\/g, '/')} | ${onlyGm} | ${onlyPl} |`);
}
const report = `# 配布版とGM版の照合（自動）

:::note この表について
写した日時：${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}。05_完成版の「プレイヤー配布」のうち、GM資料に同じ名前のファイルがある ${pairs.length} 件を比べた。GM版から【GM】で始まる行と制作タグを除き、行ごとに比べた数。0・0 なら、GM版の【GM】をたたんだ状態が配布版と同じ。
このサイトでは、この ${pairs.length} 件はGM版（メモつき）だけを載せている。GM版に無いファイル（${plOnly.length} 件）は、配布版をそのまま載せている。
:::

- 全部同じ（0・0）：**${same} 件**／違う行が残る：**${pairs.length - same} 件**（GM版にだけある行は、【GM】の印を付けずに書いたGM向けの段。配布版にだけある行は、配るときに言い換えた所）

| 配布版 | GM版 | GM版にだけある行 | 配布版にだけある行 |
|---|---|---|---|
${rows.join('\n')}
`;
put(path.join(DST, '_配布版との照合.md'), report);

console.log('GM資料', gmFiles.length, '／配布版のみ', plOnly.length, '／配布版とGM版の対', pairs.length, '（同じ', same, '）→', DST);
