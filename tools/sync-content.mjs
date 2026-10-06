// 改訂フォルダ（作業の正本）から content/ へMarkdownを写す。content/ がサイトの元データ。
// 使い方: node tools/sync-content.mjs
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:/00_【創作】一時フォルダ/_マダミス改訂_20261004/ダンジョン・オブ・ザ・マーダー';
const DST = path.resolve('content/改訂版');
const REF = path.resolve('content/参照');
const copies = [
  ['PROJECT_MASTER.md', 'PROJECT_MASTER.md'],
  ['REPORT.md', 'REPORT.md'],
  ['CHANGELOG.md', 'CHANGELOG.md'],
  ['00_INVENTORY.md', '00_INVENTORY.md'],
  ['01_正本', '01_正本'],
  ['02_チェック', '02_チェック'],
  ['03_改稿', '03_改稿'],
  ['04_仮想プレイ', '04_仮想プレイ'],
  ['05_完成版/GM資料/00_配布物の一覧と配るタイミング.md', '05_完成版/配布物の一覧と配るタイミング.md'],
];
// 改訂元（Ver3.4）の仕様メモ。読み取り専用の写し
const refCopies = [
  ['_作業メモ/原本展開_Ver3.4_REVIEW_CLOUD/CHATGPT_HANDOFF.md', 'Ver3.4_引き継ぎ（CHATGPT_HANDOFF）.md'],
  ['_作業メモ/原本展開_Ver3.4_REVIEW_CLOUD/README.md', 'Ver3.4_README.md'],
];
function copy(from, to) {
  const st = fs.statSync(from);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(from)) copy(path.join(from, f), path.join(to, f));
  } else if (from.endsWith('.md')) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, fs.readFileSync(from, 'utf8').replace(/\r\n/g, '\n'));
  }
}
fs.rmSync(DST, { recursive: true, force: true });
for (const [a, b] of copies) copy(path.join(SRC, a), path.join(DST, b));
fs.mkdirSync(REF, { recursive: true });
for (const [a, b] of refCopies) copy(path.join(SRC, a), path.join(REF, b));
let n = 0; (function count(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? count(p) : n++; } })(DST);
console.log('copied', n, 'files into', DST);
