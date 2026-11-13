/* ゲームの写し（.gameview-build/game）のテスト用ヘルパーで、撮影に使う場面の状態を作る。
   node tools/gameshots/states.cjs <写しのゲームのフォルダ> <出力 json>
   ゲーム本体の preview/make-snapshots.js と同じ作り方（H.run＋stopAt → E.serialize）。
   ブラウザの時計で勝手に進まないよう deadline・paused を外し、撮る物以外の追加HOは読んだ扱いにする。 */
'use strict';
const fs = require('fs'), path = require('path');
const G = path.resolve(process.argv[2]), OUT = process.argv[3];
const H = require(path.join(G, 'tests', 'v4-helpers.js'));
const { basePolicy } = require(path.join(G, 'tests', 'v4-policies.js'));
const { E } = H;

function freeze(s, keepUnread) {
  const c = E.restore(E.serialize(s));
  c.deadline = null; c.paused = null;
  for (const k of Object.keys(c.addHO || {})) if (k !== keepUnread) c.addHO[k].read = true;
  return E.serialize(c);
}
const want = [
  { key: 'p2sel', hit: s => s.phase === 2 && s.stage === 'selection' },
  { key: 'addho4', hit: s => !!(s.addHO && s.addHO.PC4_2) && ['selection', 'share', 'return', 'reading'].includes(s.stage), unread: 'PC4_2' },
  { key: 'p5share', hit: s => s.phase === 5 && s.stage === 'share', share: true },
  { key: 'p10rules', hit: s => s.phase === 10 && s.stage === 'newRules' },
  { key: 'p10inv', hit: s => s.phase === 10 && s.flags.rulesShown && s.stage === 'investigate' },
];
const out = {}, info = {};
const g = H.newGame();
const pol = basePolicy('complete');
const share0 = pol.onShare;
/* 会議の見本：共有できるカードの大半を共有する（make-snapshots.js と同じ） */
pol.onShare = gg => { share0 && share0(gg); const s = gg.s; for (const pc of E.ids) { if (!E.usable(s, pc)) continue; const mine = Object.entries(s.cards).filter(([, c]) => c.status === 'PRIVATE' && c.owners.includes(pc)); for (const [id] of mine.slice(0, Math.max(0, mine.length - 2))) E.act(s, pc, 'share', { card: id }, gg.t); } };
pol.stopAt = gg => {
  const s = gg.s;
  for (const w of want) if (!out[w.key] && w.hit(s)) {
    if (w.share) pol.onShare(gg);
    out[w.key] = freeze(s, w.unread);
    info[w.key] = 'P' + s.phase + ' ' + s.stage + (s.reading ? ' ' + s.reading.id : '');
  }
  return want.every(w => out[w.key]);
};
H.run(g, pol, 6000);
const miss = want.filter(w => !out[w.key]).map(w => w.key);
fs.writeFileSync(OUT, JSON.stringify({ states: out, info, missing: miss }));
console.log(JSON.stringify({ info, missing: miss }));
