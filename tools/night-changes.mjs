// 今夜（2026-11-16 02:30 ごろ）の原稿の直しを、控え（backup_20261116/05_完成版_0230）と今の 05_完成版 の
// 行の差分から機械的に書き出す（訂正済みの箇所のページの「今夜の分」に使う）。
// 使い方:
//   node tools/night-changes.mjs --before <控えの05_完成版> --after <いまの05_完成版> \
//        --memos <work/author_memos_new.json> --bchanges <work/B_CHANGES_20261116.md> --out data/n16-changes.json
// 決めたこと:
//   - 原稿へは書かない（読むだけ）。控えも読むだけ。
//   - 数は手で書かない（ファイル数・か所数は差分から数える）。
//   - 作者の直し（共有メモ35件）の「結果」は、B の一覧（B_CHANGES_20261116.md）の列をそのまま写す（こちらで判定しない）。
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BEFORE = argOf('--before', 'C:/20_マダミス/ダンジョン・オブ・ザ・マーダー/work/backup_20261116/05_完成版_0230');
const AFTER = argOf('--after', 'C:/00_【創作】一時フォルダ/_マダミス改訂_20261004/ダンジョン・オブ・ザ・マーダー/05_完成版');
const MEMOS = argOf('--memos', 'C:/20_マダミス/ダンジョン・オブ・ザ・マーダー/work/author_memos_new.json');
const BCHANGES = argOf('--bchanges', 'C:/20_マダミス/ダンジョン・オブ・ザ・マーダー/work/B_CHANGES_20261116.md');
const OUT = argOf('--out', 'data/n16-changes.json');

const rd = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
function walk(d, out = [], base = d) {
  for (const f of fs.readdirSync(d)) {
    if (f.startsWith('.')) continue;
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p, out, base);
    else if (f.endsWith('.md')) out.push(path.relative(base, p).replace(/\\/g, '/'));
  }
  return out;
}

// 行の LCS。返り値：等しい行の並びを挟みながら、消えた行・増えた行のまとまりを作る
function diffLines(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const blocks = []; let i = 0, j = 0; let cur = null;
  const flush = () => { if (cur && (cur.before.length || cur.after.length)) blocks.push(cur); cur = null; };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { flush(); i++; j++; continue; }
    if (!cur) cur = { before: [], after: [], lineBefore: i + 1, lineAfter: j + 1 };
    if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) { cur.after.push(b[j]); j++; }
    else { cur.before.push(a[i]); i++; }
  }
  flush();
  // 等しい行が挟まっている小さな塊は、1つにまとめる（3行以内の空きは同じ変更とみなす）
  const merged = [];
  for (const b of blocks) {
    const prev = merged[merged.length - 1];
    if (prev && b.lineBefore - (prev.lineBefore + prev.before.length) <= 3) {
      const gapA = a.slice(prev.lineBefore - 1 + prev.before.length, b.lineBefore - 1);
      const gapB = b.after.length ? [] : [];
      prev.before.push(...gapA, ...b.before);
      prev.after.push(...gapA, ...b.after);
      void gapB;
    } else merged.push({ ...b, before: [...b.before], after: [...b.after] });
  }
  return merged.map((b) => ({
    op: b.before.length && b.after.length ? 'replace' : b.after.length ? 'insert' : 'delete',
    before: b.before, after: b.after, lineBefore: b.lineBefore, lineAfter: b.lineAfter,
  }));
}

const beforeFiles = new Set(walk(BEFORE));
const afterOnly = walk(AFTER);
const allFiles = [...new Set([...beforeFiles, ...afterOnly])].sort((x, y) => x.localeCompare(y, 'ja'));
const files = [];
let unitCount = 0;
for (const f of allFiles) {
  const pa = path.join(BEFORE, f), pb = path.join(AFTER, f);
  const a = fs.existsSync(pa) ? rd(pa).split('\n') : [];
  const b = fs.existsSync(pb) ? rd(pb).split('\n') : [];
  if (!fs.existsSync(pa) || !fs.existsSync(pb)) {
    if (a.join('\n') === b.join('\n')) continue;
    files.push({ file: f, status: fs.existsSync(pb) ? 'added' : 'deleted', units: [], count: 0 });
    continue;
  }
  if (a.join('\n') === b.join('\n')) continue;
  const units = diffLines(a, b);
  unitCount += units.length;
  files.push({ file: f, status: 'changed', units, count: units.length });
}

// 作者の直し（35件）と、B の一覧の「結果」列
let memos = [];
try { memos = JSON.parse(fs.readFileSync(MEMOS, 'utf8')); } catch (e) { memos = []; }
const resultById = new Map();
try {
  for (const line of rd(BCHANGES).split('\n')) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*([0-9a-f]{8})\s*\|/);
    if (!m) continue;
    const cells = line.split('|').map((s) => s.trim());
    // | # | memo id | ページ | 元の文 | 結果 | 触ったファイル |
    resultById.set(m[2], { page: cells[3], result: cells[5] || '', files: cells[6] || '' });
  }
} catch (e) { /* 一覧が無くても、メモの内容だけで作る */ }

const memosOut = memos.map((m) => {
  const short = String(m.id).slice(0, 8);
  const b = resultById.get(short) || {};
  return {
    id: m.id, short, pageId: String(m.page_id || '').replace(/^rv1-/, ''), rawPageId: m.page_id, sectionId: m.section_id,
    character: m.character || '', content: m.content || '', title: m.title || '',
    result: b.result || '', touched: b.files || '',
  };
});

const out = {
  generatedAt: new Date().toISOString(),
  before: BEFORE.replace(/\\/g, '/'), after: AFTER.replace(/\\/g, '/'),
  counts: {
    files_changed: files.filter((f) => f.units.length).length,
    units: unitCount,
    ops: files.flatMap((f) => f.units).reduce((o, u) => (o[u.op] = (o[u.op] || 0) + 1, o), {}),
    memos: memosOut.length,
  },
  files, memos: memosOut,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log('今夜の直し:', out.counts.files_changed, 'ファイル /', out.counts.units, 'か所',
  JSON.stringify(out.counts.ops), '／作者の直し', out.counts.memos, '件 →', OUT);
