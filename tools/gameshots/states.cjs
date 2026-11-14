/* ゲームの写し（.gameview-build/game）のテスト用ヘルパーで、撮影に使う場面の状態を作る。
   node tools/gameshots/states.cjs <写しのゲームのフォルダ> <出力 json>
   ゲーム本体の preview/make-snapshots.js と同じ作り方（H.run＋stopAt → E.serialize）。
   ブラウザの時計で勝手に進まないよう deadline・paused を外し、撮る物以外の追加HOは読んだ扱いにする。

   2026-11-14（3列比較の右列＝全カード・HO・部屋・品の実画面を1対1で撮るため）に2つ足した。
   - full  ：選ぶフェイズの状態に「全部屋に入った」「全カードが誰かの手元」「全追加HOが届いた」「全品をPC1が持つ」を重ねた物。
             画面は実物の描画のまま（状態だけを「全部そろった」にする。原稿をHTMLに写したりはしない）。
   - allho ：追加HOの窓（.modal.on.addho）を1通ずつ出すための、読み合わせの段の状態（全部の追加HOが未読）。
   どちらも E.restore(E.serialize(...)) を通してから返す（engine の検査に合わない状態は作らない）。 */
'use strict';
const fs = require('fs'), path = require('path');
const G = path.resolve(process.argv[2]), OUT = process.argv[3];
const H = require(path.join(G, 'tests', 'v4-helpers.js'));
const { basePolicy } = require(path.join(G, 'tests', 'v4-policies.js'));
const dm = require(path.join(G, 'src', 'data.js'));
const D = dm.D || dm;
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
  { key: 'full', hit: s => s.phase >= 5 && s.stage === 'selection', explode: 'full' },
  { key: 'allho', hit: s => s.phase === 4 && s.stage === 'reading' && s.reading && s.reading.id === 'R07', explode: 'allho' },
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
    out[w.key] = w.explode ? explode(s, w.explode) : freeze(s, w.unread);
    info[w.key] = 'P' + s.phase + ' ' + s.stage + (s.reading ? ' ' + s.reading.id : '');
  }
  return want.every(w => out[w.key]);
};

/* 全部そろった状態を作る（3列比較の右列を1対1で撮るため）。画面は実物の描画のまま、状態だけを「全部そろった」にする。
   - 部屋：全部に入った（公開文 .ri-desc が出る）
   - カード：D.infos の全枚を誰かの手元に（viewer 指定のカードはその人へ）
   - 追加HO：D.addHO の全キーが未読で届いている
   - 所持品：PC1 が全種を持つ（品の一覧の節ごとに撮るため。種類の順に並べる） */
function explode(s, mode) {
  const c = E.restore(E.serialize(s));
  c.deadline = null; c.paused = null;
  for (const id of Object.keys(c.rooms)) {
    const d = D.rooms[id];
    c.rooms[id] = Object.assign({}, c.rooms[id], {
      state: 'CLEARED', entered: true, depth: d.maxDepth, visitCount: 1, trapTriggered: false, lsTriggered: false,
    });
    c.enteredBy = c.enteredBy || {};
    for (const pc of E.ids) c.enteredBy[pc] = (c.enteredBy[pc] || []).concat([id]).filter((x, i, a) => a.indexOf(x) === i);
  }
  c.addHO = {};
  Object.keys(D.addHO).forEach((k, i) => {
    c.addHO[k] = { pc: D.addHO[k].pc, order: i, read: false, phase: 1, showAt: 0 };
  });
  const pcs = E.ids;
  let n = 0;
  for (const [id, d] of Object.entries(D.infos)) {
    let pc = (d.viewer && pcs.includes(d.viewer) && d.viewer) || (d.expertFor && d.expertFor.find(x => pcs.includes(x))) || null;
    if (!pc) pc = pcs[n++ % pcs.length];
    c.cards[id] = { status: 'PRIVATE', owner: pc, owners: [pc], got: { [pc]: 1 } };
  }
  const order = ['consume', 'treasure', 'dual', 'equipment', 'key', 'material'];
  const itemIds = Object.keys(D.items).sort((a, b) => {
    const ia = order.indexOf((D.items[a] || {}).type), ib = order.indexOf((D.items[b] || {}).type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  c.inventory = itemIds.map((id, i) => ({ uid: 'SHOT' + String(i + 1).padStart(3, '0'), id, owner: 'PC1', used: false, submitted: false, equipped: false }));
  c.secret = c.secret || {};
  if (c.secret.poisonUid === undefined) c.secret.poisonUid = null;
  /* 文が状態で変わるカード（6枚）に、それらしい値を持たせる（原稿の文がそのまま出るように） */
  c.leonPreSeen = { PC1: 3, PC2: 3, PC3: 3, PC4: 3 };
  c.glitchPhases = [4, 5];
  c.lobby = c.lobby || {};
  c.lobby.supplies = Object.assign({ PC1: 'potion', PC2: 'mana', PC3: 'buff', PC4: 'potion' }, c.lobby.supplies || {});
  if (mode === 'allho') { /* 窓を出す段でも、全部を未読のまま置く（読んだ扱いにしない） */ }
  return E.serialize(c);
}
H.run(g, pol, 6000);
const miss = want.filter(w => !out[w.key]).map(w => w.key);
fs.writeFileSync(OUT, JSON.stringify({ states: out, info, missing: miss }));
console.log(JSON.stringify({ info, missing: miss }));
