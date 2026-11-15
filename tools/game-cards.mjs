// ゲーム（mm7_game_v4）の data.js から、カードの「だれが・どこで・共有できるか」の表を取り出す（読むだけ）。
// 使い方: node tools/game-cards.mjs   → content/_ゲームのカード表.json（build.mjs がカードの印に使う）
// ゲームのフォルダは書き換えない。読んだ commit を表に書く。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const DEFAULT_GAME = 'C:/00_【創作】一時フォルダ/100_【マダミス】ハーネス作成/mm7_game_v4';
// 読むゲームのフォルダは、環境変数で差し替えられる（既定は従来どおり mm7_game_v4）。
//   MM7_GAME        … このスクリプト専用（優先）
//   GAMESHOTS_GAME  … tools/game-shots.mjs と同じ変数（撮影と表を同じ worktree へ向ける）
const ENV_ROOT = process.env.MM7_GAME || process.env.GAMESHOTS_GAME || '';
const GAME = ENV_ROOT || DEFAULT_GAME;
const ROOT_SOURCE = process.env.MM7_GAME ? 'env:MM7_GAME' : (process.env.GAMESHOTS_GAME ? 'env:GAMESHOTS_GAME' : 'default');
if (ENV_ROOT && !fs.existsSync(GAME)) {
  console.error(`ゲームのフォルダが無い: ${GAME}（${ROOT_SOURCE}）`);
  process.exit(1);
}
const require = createRequire(import.meta.url);
const d = require(GAME + '/src/data.js');
let commit = '';
try { commit = execFileSync('git', ['-C', GAME, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* noop */ }
let branch = '';
try { branch = execFileSync('git', ['-C', GAME, 'branch', '--show-current'], { encoding: 'utf8' }).trim(); } catch { /* noop */ }

const where = {};
for (const [rid, r] of Object.entries(d.rooms)) {
  (r.steps || []).forEach((s, i) => {
    const put = (c, extra) => (where[c] = where[c] || []).push({ room: rid, name: r.name, depth: i + 1, ...extra });
    for (const c of s.cards || []) put(c, {});
    for (const c of s.mixiCards || []) put(c, { pc: 'PC3' });
    for (const [pc, cs] of Object.entries(s.pcCards || {})) for (const c of cs) put(c, { pc });
  });
}
const EXPERT_PC = { diagnose: 'PC1', analyze: 'PC2' };
const cards = Object.values(d.infos).map((x) => {
  const viewer = x.viewer || (x.mixiOnly ? 'PC3' : '') || (x.expertBy && x.exclusive ? EXPERT_PC[x.expertBy] || '' : '');
  return {
    id: x.id, title: x.title, category: x.category,
    viewer, // この人にだけ届く（PC1〜PC4）
    noShare: !!(x.expertOnly || x.noShare), // 専門の見立て：カードとして共有できない
    personal: !!x.personal, // 組・本人のカード：共有しない（口で伝えるのは自由）
    expertBy: x.expertBy || '',
    where: where[x.id] || [],
  };
});
const rooms = Object.fromEntries(Object.entries(d.rooms).map(([id, r]) => [id, r.name]));
const out = { source: 'mm7_game_v4 src/data.js', root: GAME, rootSource: ROOT_SOURCE,
  rootLabel: ROOT_SOURCE === 'default'
    ? '既定 mm7_game_v4（作者69のworktreeではない。worktree を読むときは MM7_GAME / GAMESHOTS_GAME で指定する）'
    : `環境変数 ${ROOT_SOURCE.replace('env:', '')} で指定されたフォルダ`,
  branch, commit, made: new Date().toISOString(), pcName: d.pcName, rooms, cards };
fs.writeFileSync(path.resolve('content/_ゲームのカード表.json'), JSON.stringify(out, null, 1));
console.log('カード', cards.length, '部屋', Object.keys(rooms).length, 'commit', branch, commit);
console.log('読んだフォルダ:', GAME, `（${ROOT_SOURCE}）`);
