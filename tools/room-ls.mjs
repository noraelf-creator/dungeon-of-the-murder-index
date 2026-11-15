// 部屋ライブセレクションの早見表（1部屋1枚）を、ゲームの src/data.js から機械的に作る。
// 使い方: node tools/room-ls.mjs --data <ゲームの src/data.js> [--out content/部屋LS_早見表.md]
// 2026-11-16 作者「部屋ライブセレクションの作者用INDEXが非常にわかりづらいのでそこは改善してください」。
//
// 決めたこと:
//   - 数値は手で書かない。ROOM_TUNE（ls.dmg・ls.C・entry・depth）と roomLS（A/B/C・reward・great・wait・mixiC）から作る。
//     ゲームの値が変わったら、このコマンドを流し直す（build でも、data.js があれば自動で作り直す）。
//   - A が新しく作った文（C の12選択肢・仕組みの文・品の鑑定の一文）には「新しく作った文（作者確認）」の印を付ける。
//   - 原稿（05_完成版）・ゲーム・D1 へは書かない。読むだけ。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve('.');
const DEFAULT_DATA = 'C:/00_【創作】一時フォルダ/100_【マダミス】ハーネス作成/mm7_wt_n16_rules/src/data.js';
const OUT_MD = path.join(ROOT, 'content', '部屋LS_早見表.md');
const OUT_JSON = path.join(ROOT, 'data', 'room-ls.json');
const NEW_MARK = '★新しく作った文（作者確認）';

const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DATA = argOf('--data', process.env.ROOM_LS_DATA || DEFAULT_DATA);
const OUT = argOf('--out', OUT_MD);

const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const STAT = { atk: '攻撃', dex: '器用', agi: '素早', int: '頭脳' };
const statName = (k) => STAT[k] || k || '';

function loadGame(dataPath) {
  const D = require(dataPath);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(dataPath)).digest('hex');
  return { D, sha };
}

// 品：名前（値G）。値の無い消費財は名前だけ
function itemName(D, id) {
  const it = D.items[id];
  return it ? it.name : id;
}
function itemText(D, id) {
  const it = D.items[id];
  if (!it) return '〈' + id + '〉';
  return it.value ? `〈${esc(it.name)}〉（${it.value}G）` : `〈${esc(it.name)}〉`;
}
function recName(D, id) {
  const c = D.infos && D.infos[id];
  const t = c && (c.title || c.name);
  return t ? `記録片《${esc(t)}》` : `記録片（${id}）`;
}
function rewardText(D, rw) {
  if (!rw) return '';
  const out = [];
  if (rw.merit) out.push(`功績+${rw.merit}`);
  if (rw.allMerit) out.push(`全員に功績+${rw.allMerit}`);
  for (const it of rw.items || []) out.push(itemText(D, it));
  if (rw.rec) out.push(recName(D, rw.rec));
  if (rw.peek) out.push('この先の部屋の中身をのぞける');
  return out.join('・');
}
function greatText(D, g) {
  if (!g) return '';
  const out = [];
  if (g.swap) out.push(`${itemText(D, g.swap[1])}に入れ替わる`);
  for (const it of g.add || []) out.push(`${itemText(D, it)}が増える`);
  if (g.keyItem) out.push(`${itemText(D, g.keyItem)}（持っていなければ）`);
  if (g.merit) out.push(`功績+${g.merit}`);
  if (g.allMerit) out.push(`全員に功績+${g.allMerit}`);
  if (g.peek) out.push('この先の部屋の中身をのぞける');
  if (g.resonance) out.push('《共鳴》の効果も付く');
  return out.join('・');
}

function build(opts = {}) {
  const dataPath = opts.dataPath || DATA;
  const outPath = opts.outPath || OUT;
  const { D, sha } = loadGame(dataPath);
  const T = D.ROOM_TUNE;
  const dmg = T.ls.dmg;
  const rooms = Object.keys(D.roomLS);
  const rows = [];
  lines = [];
  const out = [];
  const L = (s = '') => out.push(s);

  const dataMtime = fs.statSync(DATA).mtime.toISOString().slice(0, 16).replace('T', ' ');
  L('# 部屋ライブセレクション 早見表（1部屋1枚）');
  L();
  L(':::note このページについて');
  L(`ゲームの \`src/data.js\` から**機械的に作った**表です（数値を手で写していません）。元にしたファイル：\`${dataPath.replace(/\\/g, '/')}\``);
  L(`（sha256 \`${sha.slice(0, 16)}…\`、ファイルの日時 ${dataMtime}）。作った日：${new Date().toISOString().slice(0, 16).replace('T', ' ')}。`);
  L(`作り直すとき：\`node tools/room-ls.mjs --data <ゲームの src/data.js>\`（\`npm run build\` でも、data.js があれば作り直します）。`);
  L('**傷の値は Grok のテストプレイを見て調整中**です。ゲームの `ROOM_TUNE.ls.dmg` の1か所を直して作り直すと、この表もその値になります。');
  L('原文（長い方）は「部屋ライブセレクション一覧（原文）」のページです。この表は、その中身を1部屋ずつに分けて、数値だけを並べたものです。');
  L('**注意**：原稿の「部屋ライブセレクション一覧」は 2026-11-15 22:37 のままで、まだ C が「退避」のままです（ゲームの作り直しに、原稿が追いついていない）。**いまの決まりは、この表（ゲームの data.js）が正**です。原稿をどう直すかは統括の判断です。');
  L(':::');
  L();
  L('## 部屋LSの共通の決まり');
  L();
  L('- **退避の選択肢はありません。** C は「身を守る」。能力の合計が条件に届けば傷が小さく、届かなければ中くらい。**どちらでも得るものはありません**（ミクシィの宝だけは別）。');
  L('- **A・B は、届かなくても選んだ品は手に入ります。** そのかわり傷が大きく（下の表の「届かないとき」）、功績と大成功は付きません。');
  L('- **時間切れ（何も押さずに20秒）** は「身を守れない」扱いで、時間切れの傷を負います。**U6 と L1 だけは「様子を見る」が正解**で、時間切れに傷はなく、報酬が入ります。');
  L('- 能力の合計は、**同じ選択をした人の合計**（《限定解除》は2人分）。リックが同行しているときは、リックも同じ選択をして合計に加わります。頭脳の判定は、魔力で攻める人が入ると必要値が1下がります。');
  L(`- 印：**${NEW_MARK}**＝A（ルール担当）が新しく作った文。作者の確認待ちです。`);
  L('- 大成功は、その選択肢が届いたときの上乗せ（A が届かなかったときは、B の大成功が付く）。');
  L();
  L('### 傷の値（`ROOM_TUNE.ls.dmg`・いまの値）');
  L();
  L('| 何をしたか | 上層 U | 下層 L |');
  L('|---|---|---|');
  L(`| 届いた（A・B 成功。崩れの中で受ける傷） | ${dmg.U.ok} | ${dmg.L.ok} |`);
  L(`| 届かないまま品を取った（A・B 失敗。大きな傷） | ${dmg.U.short} | ${dmg.L.short} |`);
  L(`| C で身を守れた（何も得ない） | ${dmg.U.guardOk} | ${dmg.L.guardOk} |`);
  L(`| C で身を守れなかった（何も得ない） | ${dmg.U.guardShort} | ${dmg.L.guardShort} |`);
  L(`| 時間切れ（様子を見る。身を守れない） | ${dmg.U.timeout} | ${dmg.L.timeout} |`);
  L();
  L('## 部屋ごとの表');
  L();

  const json = { generatedAt: new Date().toISOString(), source: dataPath.replace(/\\/g, '/'), sourceSha256: sha, tuning: { dmg: { U: dmg.U, L: dmg.L }, entry: T.entry, depth: T.depth }, rooms: [] };
  const newLabels = [];

  for (const rid of rooms) {
    const def = D.roomLS[rid];
    const tier = rid[0] === 'L' ? 'L' : 'U';
    const TD = dmg[tier];
    const roomName = (D.rooms[rid] && D.rooms[rid].name) || '';
    L(`### ${rid} ${esc(roomName)} ― ${esc(def.name)}`);
    L();
    L(`**どんな場面か**：${esc(def.scene)}`);
    L();
    const meta = [];
    if (T.entry[rid]) meta.push(`**入るには${statName(T.entry[rid].stat)}${T.entry[rid].need}が要る**（一緒に入る人の合計。一度開いた部屋は、以後は一人でも入れる）`);
    const dep = T.depth[rid];
    if (dep) meta.push('**難しい情報**：' + Object.entries(dep).map(([n, g]) => `深度${n}は${statName(g.stat)}${g.need}が要る`).join('・'));
    if (def.magic) meta.push('魔力で攻める人がこの判定に入ると、頭脳の必要値が1下がる');
    if (def.waitWins) meta.push('**この部屋は「様子を見る」（時間切れ）が正解**。A・B は届かない');
    if (meta.length) { L('- ' + meta.join('／')); L(); }

    L('| 選択肢 | 文 | 条件 | 届いたとき | 届かないとき |');
    L('|---|---|---|---|---|');
    for (const k of ['A', 'B']) {
      const o = def[ k ];
      const cond = k === 'A' ? `2人以上・${statName(o.stat)}の合計${o.need}以上` : `1人以上・${statName(o.stat)}の合計${o.need}以上`;
      const condShown = o.never ? '**この部屋では届かない**（選ぶと必ず大きな傷）' : cond;
      const got = o.never ? '—' : [rewardText(D, def.reward[k]) || '得るものなし'];
      const gth = !o.never && def.great && def.great[k] != null ? `／**大成功**（合計${def.great[k]}以上）：${greatText(D, def.reward.great)}` : '';
      const dmgText = (n) => (n ? `HP−${n}` : '傷なし');
      const ok = o.never ? '—' : `${dmgText(TD.ok)}・${got.join('')}${gth}`;
      // 届かないときは、傷のあとに「取れる品」を書く。品が無い部屋（U6・L1 の A・B）は、そう書く
      const shortItems = (def.reward[k] && (def.reward[k].items || []).length)
        ? '品は取れる（' + (def.reward[k].items || []).map((x) => itemText(D, x)).join('・') + '）'
        : (def.reward[k] && def.reward[k].rec ? '記録片は取れる（' + recName(D, def.reward[k].rec) + '）' : '得るものなし');
      const ng = `${dmgText(TD.short)}・${shortItems}・功績なし`;
      L(`| **${k}** | ${esc(o.label)} | ${condShown} | ${ok} | ${ng} |`);
    }
    const c = def.C;
    const cCond = c.guard ? `1人以上・${statName(c.stat)}の合計${c.need}以上` : 'なし';
    const dm = (n) => (n ? `HP−${n}` : '傷なし');
    L(`| **C** | ${esc(c.label)} ${NEW_MARK} | ${cCond} | ${dm(TD.guardOk)}・何も得ない | ${dm(TD.guardShort)}・何も得ない |`);
    const wait = def.reward.wait;
    const tOut = def.waitWins
      ? `傷なし・${rewardText(D, wait) || '得るものなし'}`
      : (TD.timeout ? `HP−${TD.timeout}・何も得ない` : '傷なし・何も得ない');
    L(`| **時間切れ**（様子を見る） | 何も押さずに20秒${def.waitWins ? '（この部屋はこれが正解）' : '（身を守れない）'} | — | ${tOut} | — |`);
    L();
    if (def.mixiC) { L(`- ミクシィが C を選んだとき：${itemText(D, def.mixiC)} を追加で得る（ほかの人には入らない）`); L(); }
    newLabels.push({ room: rid, label: c.label });
    json.rooms.push({
      id: rid, roomName, sceneName: def.name, scene: def.scene, tier,
      entry: T.entry[rid] || null, depth: T.depth[rid] || null, magic: !!def.magic, waitWins: !!def.waitWins,
      A: { label: def.A.label, stat: def.A.stat, need: def.A.need, never: !!def.A.never, ok: TD.ok, short: TD.short, reward: def.reward.A || null, greatAt: def.great && def.great.A != null ? def.great.A : null, great: def.reward.great || null },
      B: { label: def.B.label, stat: def.B.stat, need: def.B.need, never: !!def.B.never, ok: TD.ok, short: TD.short, reward: def.reward.B || null, greatAt: def.great && def.great.B != null ? def.great.B : null, great: def.reward.great || null },
      C: { label: def.C.label, stat: def.C.stat, need: def.C.need, guard: !!def.C.guard, guardOk: TD.guardOk, guardShort: TD.guardShort, newText: true },
      timeout: { damage: def.waitWins ? 0 : TD.timeout, reward: def.waitWins ? (wait || null) : null },
      mixiC: def.mixiC || null,
    });
  }

  // A が新しく作った文（作者確認）の一覧：C の12選択肢・仕組みの文・品の鑑定の一文
  L('## A が新しく作った文（作者の確認待ち）');
  L();
  L(`上の表の **${NEW_MARK}** の印と同じものです。原作者の文ではないので、そのまま使ってよいかを見てください。`);
  L();
  L('### 1. C（身を守る）の選択肢 12 本');
  L();
  for (const x of newLabels) L(`- ${x.room}：${esc(x.label)}`);
  L();
  L('### 2. 仕組みの文');
  L();
  L('- 入るには〇〇N が要る（一緒に入る人の合計）');
  L('- 〇〇N が要る何かがある（この先、深度あとN段）／この部屋には、まだ深度があとN段');
  L('- 〇〇でないと分からない何かがある。');
  L('- 届かなかったが、品は手に入れた（大きな傷を負った）。／届かなくても品は手に入るが、大きな傷を負う');
  L('- 〇〇N 以上なら傷が小さい（何も得られない）');
  L();
  L('### 3. 品の鑑定の一文（新しく足した10品）');
  L();
  L('<details><summary>10品の一文を開く</summary>');
  L();
  for (const id of ['knightRing', 'gildedHelm', 'archiveSeal', 'guardLamp', 'sunkenGold', 'silverPendant', 'gildedTome', 'ceremonialSword', 'royalGoblet', 'ancientCore']) {
    const it = D.items[id];
    if (it && it.flavor) L(`- ${esc(it.name)}（${it.value}G）：${esc(it.flavor)}`);
  }
  L();
  L('</details>');
  L();
  L(':::note 数え方');
  L(`部屋の数：${rooms.length}（部屋LSがある部屋）。表の行：${rooms.length} × 4（A・B・C・時間切れ）。`);
  L(`A・B が「届かない」部屋：${rooms.filter((r) => D.roomLS[r].A.never || D.roomLS[r].waitWins).join('・') || 'なし'}（様子を見るが正解の部屋）。`);
  L(':::');
  L();

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out.join('\n'));
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(json, null, 1));
  return { rooms: rooms.length, file: outPath, json: OUT_JSON, sha };
}

let lines = [];
if (process.argv[1] && /room-ls\.mjs$/.test(process.argv[1].replace(/\\/g, '/'))) {
  const r = build();
  console.log('部屋LS 早見表:', r.rooms, '部屋 →', r.file, '／', r.json, '（data.js', r.sha.slice(0, 12) + '）');
}
export { build };
