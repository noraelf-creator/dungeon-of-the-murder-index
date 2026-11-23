// 3章版（ch3）のゲームから、章ごとに「HO・読み合わせ・カード・地図」の md を機械的に作る。
// 使い方:
//   node tools/ch3-game.mjs
//   node tools/ch3-game.mjs --game "C:/…/mm7_wt_integ_20261120"
//   node tools/ch3-game.mjs --out content/3章版ゲーム
// 出す物: content/3章版ゲーム/00_全体.md 〜 06_第3章.md（07 は手書きの案なので触らない）
// 文はすべてゲームのデータ（src/data.js・src/chapters3.js・src/engine.js・src/board.js）から取る。手で写した文は置かない。
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve('.');
const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith('--' + k + '='));
  if (a) return a.slice(('--' + k + '=').length);
  const i = process.argv.indexOf('--' + k);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return d;
};
const GAME = path.resolve(arg('game', 'C:/00_【創作】一時フォルダ/100_【マダミス】ハーネス作成/mm7_wt_integ_20261120'));
const OUT = path.resolve(arg('out', path.join(ROOT, 'content', '3章版ゲーム')));
const require_ = createRequire(import.meta.url);
const D = require_(path.join(GAME, 'src', 'data.js'));
const ENGINE_SRC = fs.readFileSync(path.join(GAME, 'src', 'engine.js'), 'utf8');
const BOARD_SRC = fs.readFileSync(path.join(GAME, 'src', 'board.js'), 'utf8');

// ---------- 生成元 ----------
function gitCommit() {
  try { return execFileSync('git', ['-C', GAME, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return '(取れなかった)'; }
}
function gitBranch() {
  try { return execFileSync('git', ['-C', GAME, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim(); }
  catch { return '(取れなかった)'; }
}
const COMMIT = gitCommit();
const BRANCH = gitBranch();
const NOW = new Date();
const STAMP = `${NOW.getFullYear()}-${String(NOW.getMonth() + 1).padStart(2, '0')}-${String(NOW.getDate()).padStart(2, '0')} ${String(NOW.getHours()).padStart(2, '0')}:${String(NOW.getMinutes()).padStart(2, '0')}`;

// ---------- 小物 ----------
const P = D.provisional.ch3 || {};
const PC = ['PC1', 'PC2', 'PC3', 'PC4'];
const pcName = (pc) => (D.pcName && D.pcName[pc]) || pc;
const inf = (id) => D.infos[id] || null;
const isDeleted = (id) => (D.deletedCards || []).includes(id);
const alive = (id) => !!inf(id) && !isDeleted(id);           // データにあり、いまの版で消していないカード
const itemName = (k) => (D.items[k] ? D.items[k].name : k);
const statName = (s) => (D.statNames && D.statNames[s]) || s;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cell = (s) => String(s == null ? '' : s).replace(/\|/g, '／').replace(/\n/g, ' ');
const uniq = (a) => [...new Set(a)];
const floorName = (f) => (f === 'U' ? '上層' : '下層');

// 文の改行はそのまま残す（作者は改行の位置を見る）
function block(text, indent = '') {
  return String(text == null ? '' : text).split(/\r?\n/).filter((l, i, a) => !(l === '' && a[i - 1] === ''))
    .map((l) => (indent ? indent + l : l)).join('\n');
}
// データの中の見出し（## など）を、ページの節より下げる（節の構造を壊さないため）
function demote(text, to = 5) {
  return String(text == null ? '' : text).split(/\r?\n/).map((l) => {
    const m = l.match(/^(#{1,6})\s+(.*)$/);
    return m ? '#'.repeat(Math.min(to, m[1].length + 2)) + ' ' + m[2] : l;
  }).join('\n');
}

// ---------- 部屋の格子（board.js の GC をそのまま読む） ----------
const GC = JSON.parse(BOARD_SRC.match(/var GC=(\[\[[\s\S]*?\]\]);/)[1]);
const ROOM_IDS = Object.keys(D.rooms);
if (GC.length !== ROOM_IDS.length) throw new Error('board.js の GC と部屋の数が違う: ' + GC.length + ' / ' + ROOM_IDS.length);
const POS = {};
ROOM_IDS.forEach((id, i) => {
  const g = GC[i];
  POS[id] = id[0] === 'U' ? [7 - g[1], g[0]] : [g[1], g[0] - 5];
});
const ROOM_N = (id) => (D.rooms[id] ? D.rooms[id].name : id);

// ---------- カードの集め方 ----------
/* 1件＝1配布。同じカードが別の条件でも出るなら、その数だけ並べる（枚数はIDの種類で数える） */
function mkCard(id, o) {
  const x = inf(id);
  return { id, title: x ? x.title : '(題なし)', text: x ? x.text : '', deleted: isDeleted(id), ...o };
}
function stepCond(r, i, st) {
  const parts = [`深度${i + 1}「${st.action || '調査'}」`];
  if (st.stat) parts.push(`${statName(st.stat)}${st.need}以上`);
  if (st.key) parts.push(`鍵《${itemName(st.key)}》`);
  if (st.gate) parts.push('扉を開く段（カードは出ない）');
  if (st.sense) parts.push('リックと同行して感応');
  if (st.hard) parts.push('むずかしい段');
  return parts.join('／');
}
function roomCards(floor, opts = {}) {
  const exclude = opts.exclude || [];
  const secretExclude = opts.secretExclude || [];
  const out = [];
  for (const r of Object.values(D.rooms)) {
    if (r.id[0] !== floor || r.fixed || exclude.includes(r.id)) continue;
    (r.steps || []).forEach((st, i) => {
      for (const c of st.cards || []) if (alive(c)) out.push(mkCard(c, { room: r.id, depth: i + 1, who: 'その段を調べた人（同じ部屋にいた全員）', cond: stepCond(r, i, st), src: 'room' }));
      for (const c of st.mixiCards || []) if (alive(c)) out.push(mkCard(c, { room: r.id, depth: i + 1, who: 'ミクシィだけ（その場にいれば）', cond: stepCond(r, i, st), src: 'room' }));
      if (!opts.noPc) for (const [pc, list] of Object.entries(st.pcCards || {})) for (const c of list) if (alive(c)) out.push(mkCard(c, { room: r.id, depth: i + 1, who: `${pcName(pc)}だけ（その場にいれば）`, cond: stepCond(r, i, st), src: 'room' }));
    });
    if (r.secret && !secretExclude.includes(r.id)) {
      for (const c of r.secret.cards || []) if (alive(c)) out.push(mkCard(c, {
        room: r.id, depth: null, who: '秘密区画を開けた人（同じ部屋にいた全員）',
        cond: `秘密区画（${r.secret.key ? `鍵《${itemName(r.secret.key)}》` : '鍵なし'}）・深度${r.maxDepth}まで調べたあと`, src: 'secret',
      }));
    }
  }
  for (const [room, o] of Object.entries(D.ch3.place || {})) {
    if (room[0] !== floor) continue;
    for (const [d, L] of Object.entries(o)) for (const x of L) if (alive(x.id)) out.push(mkCard(x.id, {
      room, depth: Number(d),
      who: x.to === 'room' ? 'その段に届いた人と、同じ部屋にいた仲間' : `${pcName(x.to)}だけ（その場にいれば）`,
      cond: `深度${d}${x.to === 'room' ? '（部屋の段の置き場）' : `・${pcName(x.to)}がその場にいれば`}`, src: 'place',
    }));
  }
  return out;
}
// 章の外から配るカード（読み合わせのあと・休憩・決まった調査など）
function extra(id, who, cond, room = null) {
  return mkCard(id, { room, depth: null, who, cond, src: 'event' });
}

// LS×3 の結果で配り直すカード（旧 LS②・LS④ の組のカード）
function regroupCards(key) {
  const map = (D.ch3.regroup || {})[key] || {};
  const def = D.liveSelections[key === 'CH1' ? 'CH1_LS3' : 'CH2_LS3'] || {};
  const out = [];
  for (const [choice, ids] of Object.entries(map)) {
    for (const id of ids) if (alive(id)) out.push(extra(id,
      `LS×3「${def.name || key}」で「${(def.options || {})[choice] || choice}」を1回でも選んだ人`,
      `${key === 'CH1' ? '第1章' : '第2章'}・LS×3 の結果で配り直す（旧 LS${key === 'CH1' ? '②' : '④'} の組のカード）`));
  }
  return out;
}

// 第3章の決まった調査（engine の ch3Fixed と同じ順・同じ深さ）
function invCards(key) {
  const d = D.investigations[key]; if (!d) return [];
  let cards = [...(d.cards || [])];
  if (key === 'belongings') cards = [...cards, ...((D.ch3.gameOnlyInv || {}).belongings || []).filter((id) => !cards.includes(id))];
  if (d.p11Cards) cards = [...cards, ...d.p11Cards];   // ch3 の LP は 11 なので p11Cards が付く
  return cards.filter((c) => c && c !== false);
}
function fixedInvestigationCards() {
  const out = [];
  const name = (k) => (D.investigations[k] || {}).name || k;
  for (const [key, depth] of Object.entries(D.ch3.fixedInv || {})) {
    const cards = invCards(key);
    for (let i = 0; i < depth && i < cards.length; i++) {
      const id = cards[i];
      if (!alive(id)) continue;
      out.push(mkCard(id, { room: 'L12', depth: i + 1, who: '全員（全員に共有）', cond: `決まった調査「${name(key)}」深度${i + 1}`, src: 'fixed', grp: 'fixed' }));
    }
  }
  for (const id of D.ch3.fixedCards || []) if (alive(id)) out.push({ ...extra(id, '全員（全員に共有）', '決まった調査のあと（決まった調査の記録として）', 'L12'), grp: 'fixed' });
  for (const id of D.ch3.fixedIfEdgarLate || []) if (alive(id)) out.push({ ...extra(id, '全員（全員に共有）', 'エドガーの先着に失敗した回だけ', 'L12'), grp: 'fixed' });
  return out;
}
// 部屋LS の報酬で配る記録片（REC-*）
function roomLsRecCards(floor, exclude = []) {
  const out = [];
  for (const id of ROOM_IDS) {
    if (id[0] !== floor || exclude.includes(id)) continue;
    const ls = D.roomLS[id]; if (!ls) continue;
    for (const [k, v] of Object.entries(ls.reward || {})) {
      if (!v || !v.rec || !alive(v.rec)) continue;
      out.push(mkCard(v.rec, {
        room: id, depth: null, who: '部屋LS に成功した人（同じ部屋にいた全員）',
        cond: `部屋LS「${ls.scene}」で「${k === 'wait' ? '待つ' : k}」を選んで成功`, src: 'roomls',
      }));
    }
  }
  return out;
}
// 分断 LS（P6）のカード（3章版でも LS③ として残っている）
function splitLsCards() {
  const out = [];
  if (alive('INFO-P6-A')) out.push(extra('INFO-P6-A', '「追跡者と戦う」を選んで成功した組の全員', 'LS③（守護者門）で「A 追跡者と戦う」に成功した回', 'U12'));
  if (alive('INFO-P6-M')) out.push(extra('INFO-P6-M', 'ミクシィだけ', 'LS③ でミクシィが隠し部屋に入った回', 'U12'));
  return out;
}
// 選ぶ調査（2回）で行ける所と、深く調べたときに出るカード
function pickInvestigationCards() {
  const out = [];
  // 部屋（U7・U10・U9・L4・L14）。U10/U9/L4 の浅い段は第1・2章で取れるが、残った段もここで取れる
  for (const room of ['U7', 'U10', 'U9', 'L4', 'L14']) {
    const r = D.rooms[room]; if (!r) continue;
    (r.steps || []).forEach((st, i) => {
      for (const c of st.cards || []) if (alive(c)) out.push(mkCard(c, { room, depth: i + 1, who: 'その部屋を選んだ人（深度まで進んだ人）', cond: `選ぶ調査で「${r.name}」→ ${stepCond(r, i, st)}`, src: 'pick', grp: 'pick' }));
      for (const c of st.mixiCards || []) if (alive(c)) out.push(mkCard(c, { room, depth: i + 1, who: 'ミクシィだけ（その部屋を選んだ回）', cond: `選ぶ調査で「${r.name}」→ ${stepCond(r, i, st)}`, src: 'pick', grp: 'pick' }));
      for (const [pc, list] of Object.entries(st.pcCards || {})) for (const c of list) if (alive(c)) out.push(mkCard(c, { room, depth: i + 1, who: `${pcName(pc)}だけ（その部屋を選んだ回）`, cond: `選ぶ調査で「${r.name}」→ ${stepCond(r, i, st)}`, src: 'pick', grp: 'pick' }));
    });
    if (r.secret) for (const c of r.secret.cards || []) if (alive(c)) out.push(mkCard(c, {
      room, depth: null, who: '秘密区画を開けた人（同じ部屋にいた全員）',
      cond: `選ぶ調査で「${r.name}」→ 秘密区画（${r.secret.key ? `鍵《${itemName(r.secret.key)}》` : '鍵なし'}）`, src: 'pick', grp: 'pick',
    }));
  }
  // 救難所（U7）を第3章で調べたときだけ出るカード（engine の investigateRoom）
  out.push(mkCard('INFO-E-BOTTLE', { room: 'U7', depth: null, who: 'その部屋を選んだ人だけ（ヒントは出ない）', cond: '選ぶ調査で「救難所」を調べた回', src: 'pick', grp: 'pick' }));
  out.push(mkCard('INFO-E-GAUNTLET', { room: 'U7', depth: null, who: '調べた人だけ', cond: '先着に失敗した回に、選ぶ調査で「救難所」を調べた回', src: 'pick', grp: 'pick' }));
  // 所持品・現場を深く調べる（決まった調査の深さの続き）
  for (const key of ['belongings', 'scene']) {
    const d = D.investigations[key]; if (!d) continue;
    const cards = invCards(key);
    const from = (D.ch3.fixedInv || {})[key] || 0;
    for (let i = from; i < cards.length; i++) {
      const id = cards[i]; if (!alive(id) || id === 'INFO-E-DISGORD2') continue;   // DISGORD2 は「通話を見返す」で配る
      out.push(mkCard(id, { room: 'L12', depth: i + 1, who: 'その調査を選んだ人（判定に通った人）', cond: `選ぶ調査「${d.name}」深度${i + 1}${(d.depthNo || [])[i] ? `（原稿の深度${d.depthNo[i]}）` : ''}`, src: 'pick', grp: 'deep' }));
    }
  }
  // 通話を見返す
  for (const id of ['INFO-E-DISGORD2', 'INFO-E-SNAPLOG']) if (alive(id)) out.push({ ...extra(id, '「通話を見返す」を選んだ人', '選ぶ調査「通話を見返す」（条件なし）', 'L12'), grp: 'calls' });
  return out;
}
// 遺体を《聖女の診断》で診た回（ミレイユ）・魔力を解析した回（ヴィオラ）。engine の bodyDiag／bodyExpert と同じ
function diagnoseCards() {
  const out = [];
  if (alive('INFO-E-DIAGNOSIS')) out.push({ ...extra('INFO-E-DIAGNOSIS', 'ミレイユだけ', '《聖女の診断》1回目（遺体を深度2まで調べたあと）', 'L12'), grp: 'skill' });
  for (const id of (D.ch3.gameOnlyInv || {}).body || []) if (alive(id)) out.push({ ...extra(id, 'ミレイユだけ', '《聖女の診断》1回目（ゲームだけのカード）', 'L12'), grp: 'skill' });
  if (alive('INFO-E-CAUSE')) out.push({ ...extra('INFO-E-CAUSE', 'ミレイユだけ', '《聖女の診断》2回目（1回目のあと）', 'L12'), grp: 'skill' });
  if (alive('INFO-E-CONTAMINATION')) out.push({ ...extra('INFO-E-CONTAMINATION', 'ヴィオラだけ', '《魔力解析》で遺体を調べた回（遺体を深度2まで調べたあと）', 'L12'), grp: 'skill' });
  if (alive('INFO-E-WAVE1')) out.push({ ...extra('INFO-E-WAVE1', 'ヴィオラだけ', '《魔力解析》で《空き瓶の山》を調べた回（瓶を持っているとき）', 'L12'), grp: 'skill' });
  return out;
}

// ---------- 章のモデル ----------
const CH = [
  {
    key: 'op', no: '00', file: '01_OP.md', id: 'n-c3g-op', title: 'OP（HO → R00 → 最初の話）',
    floors: ['U'], readings: ['R00'], note: 'OP では探索をしない（地図は「第1章で使う上層」を先に出しておく）',
  },
  {
    key: 'ch1', no: '01', file: '02_第1章.md', id: 'n-c3g-ch1', title: '第1章（上層）',
    floors: ['U'], readings: ['W4-1', 'W4-2', 'W6-1', 'W6-2'],
  },
  { key: 'rest1', no: '02', file: '03_休憩1.md', id: 'n-c3g-rest1', title: '休憩1（追加HO・まとめ①）', floors: ['U'], readings: [] },
  {
    key: 'ch2', no: '03', file: '04_第2章.md', id: 'n-c3g-ch2', title: '第2章（下層）',
    floors: ['L'], readings: ['W7-1', 'W7-2', 'R11b', 'W8-1', 'W8-5', 'R18-1'],
  },
  { key: 'rest2', no: '04', file: '05_休憩2.md', id: 'n-c3g-rest2', title: '休憩2（追加HO・まとめ②）', floors: ['L'], readings: [] },
  {
    key: 'ch3', no: '05', file: '06_第3章.md', id: 'n-c3g-ch3', title: '第3章（上下層）',
    floors: ['U', 'L'], readings: ['R18-2', 'R19', 'R20', 'R21', 'R22', 'R23'],
  },
];

// カード（配布の単位）
const CARDS = {};
CARDS.ch1 = [
  ...roomCards('U', { exclude: ['U7'], secretExclude: ['U9'] }),
  ...roomLsRecCards('U'),
  ...(D.ch3.rescueCards || []).filter(alive).map((id) => extra(id, '全員（全員に共有）', '救出の読み合わせ（W6-1／W6-2）のあと')),
  ...regroupCards('CH1'),
];
const arrive = D.ch3.arriveL0 || {};
CARDS.ch2 = [
  ...roomCards('L', { exclude: ['L14'], secretExclude: ['L4'] }),
  ...roomLsRecCards('L'),
  ...Object.entries(arrive).filter(([k]) => k !== 'all').flatMap(([pc, ids]) => (ids || []).filter(alive).map((id) => extra(id, `${pcName(pc)}だけ`, '第2章・L0 守護研究前室に着いたとき'))),
  ...((arrive.all) || []).filter(alive).map((id) => extra(id, '全員（全員に共有）', '第2章・L0 守護研究前室に着いたとき（探索⑤の報告を閉じるまでに必ず読める）')),
  ...splitLsCards(),
  ...(D.rooms.U12 && D.rooms.U12.steps ? D.rooms.U12.steps.flatMap((s) => s.cards || []).filter(alive).map((id) => extra(id, '全員（全員に共有）', '第2章・守護者門に着いたとき（W7-1／W7-2 の前）')) : []),
  ...regroupCards('CH2'),
  ...(D.ch3.bodyCards || []).filter(alive).map((id) => extra(id, '全員（全員に共有）', 'リックの遺体を見つけたとき（第2章の終わり・R18-1 の前）', 'L12')),
];
CARDS.ch3 = [
  ...fixedInvestigationCards(),
  ...pickInvestigationCards(),
  ...diagnoseCards(),
];
CARDS.op = [];
CARDS.rest1 = [];
CARDS.rest2 = [];

const uniqIds = (list) => uniq(list.map((c) => c.id));

// ---------- 読み合わせの描き方 ----------
function lineToMd(l) {
  if (!l) return '';
  const t = l.t;
  const text = l.text == null ? '' : String(l.text);
  if (t === 'scene') return `**${text}**`;
  if (t === 'heading') return `### ${text}`;
  if (t === 'line') return l.speaker ? `**${l.speaker}**「${text}」` : text;
  if (t === 'stage') return text;
  if (t === 'screen') return `> 【画面】${text}`;
  if (t === 'fx') return `> 【演出${l.fx ? '：' + l.fx : ''}】${text}`;
  if (t === 'cond') return `> 条件：${l.when || l.cond || ''}${text ? '　' + text : ''}`;
  if (t === 'card') return `> 《${l.title || l.cardId || ''}》${text ? '　' + text : ''}`;
  if (t === 'narration') return text;
  if (t === 'table') {
    const rows = l.rows || [];
    if (!rows.length) return '';
    const head = rows[0].map((c) => cell(c)).join(' | ');
    const body = rows.slice(1).map((r) => r.map((c) => cell(c)).join(' | '));
    return [`| ${head} |`, `|${rows[0].map(() => '---').join('|')}|`, ...body.map((r) => `| ${r} |`)].join('\n');
  }
  return text;
}
function readingMd(id, opts = {}) {
  const r = D.readings[id];
  if (!r) return `（${id} の読み合わせがデータに無い）`;
  const lines = (r.lines || []).map(lineToMd).filter((x) => x !== '');
  return [
    `### ${id}　${r.title}`,
    opts.cond ? `> 流れる条件：${opts.cond}` : '',
    r.note ? `> 場所：${String(r.note).replace(/\n/g, ' ')}` : '',
    '',
    lines.join('\n\n'),
  ].filter((x) => x !== '').join('\n');
}
function ch3TextMd(id, heading, opts = {}) {
  const x = D.ch3.item(id);
  if (!x) return `### ${heading}\n（${id} がデータに無い）`;
  return [`### ${heading}（${id}）`, opts.cond ? `> 流れる条件：${opts.cond}` : '', '', demote(x.text, 6)].filter((x2) => x2 !== '').join('\n');
}

// ---------- 地図 ----------
function svgMap(floor, counts) {
  const ids = ROOM_IDS.filter((id) => id[0] === floor);
  const CW = 78, CHh = 54, BX = 64, BY = 40, PAD = 8;
  const cols = Math.max(...ids.map((id) => POS[id][0])) + 1;
  const rows = Math.max(...ids.map((id) => POS[id][1])) + 1;
  const W = PAD * 2 + cols * CW, H = PAD * 2 + rows * CHh;
  const cx = (id) => PAD + POS[id][0] * CW + CW / 2;
  const cy = (id) => PAD + POS[id][1] * CHh + CHh / 2;
  const parts = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${floorName(floor)}の地図" style="max-width:${W}px;height:auto">`);
  // 通路
  const lines = [];
  for (const rt of D.routes || []) {
    if (!POS[rt.from] || !POS[rt.to]) continue;
    if (rt.from[0] !== floor || rt.to[0] !== floor) continue;
    const dash = rt.humanOnly ? ' stroke-dasharray="5 4"' : '';
    lines.push(`<line x1="${cx(rt.from)}" y1="${cy(rt.from)}" x2="${cx(rt.to)}" y2="${cy(rt.to)}" stroke="var(--line, #999)" stroke-width="1"${dash}/>`);
  }
  parts.push(`<g>${lines.join('')}</g>`);
  // 部屋
  const boxes = [];
  for (const id of ids) {
    const r = D.rooms[id];
    const x = PAD + POS[id][0] * CW + (CW - BX) / 2;
    const y = PAD + POS[id][1] * CHh + (CHh - BY) / 2;
    const n = counts[id] || 0;
    const dash = r.fixed ? ' stroke-dasharray="3 3"' : '';
    boxes.push(`<rect x="${x}" y="${y}" width="${BX}" height="${BY}" rx="3" fill="none" stroke="var(--ink, #333)" stroke-width="${n ? 1.5 : 1}"${dash}/>`);
    boxes.push(`<text x="${x + 4}" y="${y + 11}" font-size="8" fill="var(--muted, #666)">${esc(id)}</text>`);
    const nm = r.name;
    // 部屋の名を2行に分ける。末尾の決まった語（回廊・工房・機関室…）の前で切る。切れないときは真ん中で切る
    const SUF = ['大広間', '機関室', '武器庫', '礼拝堂', '碑文室', '記録庫', '監視室', '救難所', '宝物庫', '秘蔵庫', '前室', '祭壇', '回廊', '詰所', '工房', '区画', '書庫', '倉庫', '控室', '水路', '門'];
    let lines2 = [nm];
    if (nm.length > 4) {
      const hit = SUF.find((s) => nm.endsWith(s) && nm.length - s.length >= 2);
      lines2 = hit ? [nm.slice(0, nm.length - hit.length), hit] : [nm.slice(0, Math.ceil(nm.length / 2)), nm.slice(Math.ceil(nm.length / 2))];
      if (lines2[0].length > 6 || lines2[1].length > 6) lines2 = [nm.slice(0, 4), nm.slice(4)];
    }
    const cxr = x + BX / 2;
    const ty = lines2.length > 1 ? y + 21 : y + 25;
    lines2.forEach((ln, li) => boxes.push(`<text x="${cxr}" y="${ty + li * 10}" font-size="8.5" text-anchor="middle" fill="var(--ink, #333)">${esc(ln)}</text>`));
    if (n) {
      boxes.push(`<rect x="${x + BX - 24}" y="${y + 3}" width="21" height="12" rx="2" fill="none" stroke="var(--ink, #333)"/>`);
      boxes.push(`<text x="${x + BX - 13.5}" y="${y + 12}" font-size="8" text-anchor="middle" fill="var(--ink, #333)">${n}枚</text>`);
    }
  }
  parts.push(`<g>${boxes.join('')}</g>`);
  parts.push('</svg>');
  // 1行にする（marked の生の HTML としてそのまま通すため）
  return parts.join('');
}
function mapSection(floors, cards) {
  const counts = {};
  for (const c of cards) if (c.room) counts[c.room] = (counts[c.room] || 0) + 1;
  const out = [];
  for (const f of floors) {
    out.push(`### ${floorName(f)}（${f}）`);
    out.push(svgMap(f, counts));
    out.push(`> 四角＝部屋、線＝通路（点線＝人が1人ずつしか通れない抜け道）、破線の四角＝入口・通路・門など調べる段のない部屋。右上の「N枚」は、この章でその部屋に置かれるカードの配布数（同じカードを別の条件でも配るときは、その数だけ数える）。文字は CSS の色（var(--ink)・var(--line)・var(--muted)）を使い、背景は塗っていない。`);
  }
  return out.join('\n\n');
}

// 部屋LS（その章の部屋ごと）
function roomLsTable(floors) {
  const rows = [];
  for (const id of ROOM_IDS) {
    if (!floors.includes(id[0])) continue;
    const ls = D.roomLS[id];
    if (!ls) continue;
    const r = D.rooms[id];
    const opt = (k) => {
      const o = ls[k]; if (!o) return '—';
      const bits = [];
      if (o.count) bits.push(`${o.count}人`);
      if (o.stat) bits.push(`${statName(o.stat)}${o.need}以上`);
      if (o.dmg) bits.push(`失敗で${o.dmg}`);
      if (o.guard) bits.push('身を守る');
      return `${o.label}${bits.length ? `（${bits.join('・')}）` : ''}`;
    };
    const reward = () => {
      const rw = ls.reward || {};
      const items = (o) => (o && o.items ? o.items.map(itemName).join('・') : '');
      const bits = [];
      for (const k of ['A', 'B', 'C']) {
        const w = rw[k]; if (!w) continue;
        const t = [items(w), w.merit ? `功績+${w.merit}` : ''].filter(Boolean).join('・');
        if (t) bits.push(`${k}:${t}`);
      }
      if (rw.great && rw.great.swap) bits.push(`大成功:${rw.great.swap.map(itemName).join('・')}に入れ替え`);
      if (rw.wait) bits.push(`待つ:${items(rw.wait) || '—'}`);
      return bits.length ? bits.join('／') : '—';
    };
    const cond = [];
    if (ls.great) cond.push('大成功 ' + Object.entries(ls.great).map(([k, v]) => `${k}${v}以上`).join('・'));
    if (ls.waitWins) cond.push('待つでも成功');
    if (ls.mixiC) cond.push('ミクシィに専用の手');
    if (ls.magic) cond.push('魔法で代用できる');
    rows.push(`| ${id} ${cell(r.name)} | ${cell(ls.scene)} | ${cell(opt('A'))} | ${cell(opt('B'))} | ${cell(opt('C'))} | ${cell(reward())}${cond.length ? '／' + cell(cond.join('・')) : ''} |`);
  }
  if (!rows.length) return '（この章の部屋に部屋LSは無い）';
  return ['| 部屋 | 場面 | A | B | C | 報酬・条件 |', '|---|---|---|---|---|---|', ...rows].join('\n');
}

// ---------- HO ----------
const SEC_LABEL = { goals: 'あなたの目的', knows: 'あなたが知っていること', secrets: 'あなたの秘密', skills: '技能', companions: '仲間のこと', hiddenSkills: '隠し技能（このHOだけの技能）', speech: '話し方', steps: '立ち回り', hiding: '隠すこと', notice: '注意', disgord: '《Disgord》' };
function hoMd(pc) {
  const h = D.ho[pc]; if (!h) return `### ${pc}\n（HO がデータに無い）`;
  const out = [`### ${pc}　${h.title}`];
  out.push(`#### HO の本文`);
  out.push(demote(h.body, 6));
  const seen = new Set();
  for (const s of h.sections || []) {
    seen.add(s.key);
    out.push(`#### ${s.heading}`);
    out.push(demote(s.text, 6));
  }
  for (const k of ['goals', 'knows', 'secrets', 'skills', 'companions', 'hiddenSkills', 'speech', 'steps', 'hiding', 'notice', 'disgord']) {
    if (seen.has(k)) continue;
    const v = h[k];
    if (!v || !String(v).trim()) continue;
    out.push(`#### ${SEC_LABEL[k] || k}`);
    out.push(demote(v, 6));
  }
  return out.filter((x) => x !== '').join('\n\n');
}
function goalMd(id, label) {
  const x = D.ch3.item(id);
  return x ? [`#### ${label}（${id}）`, demote(x.text, 6)].join('\n') : '';
}
function addHoMd(key) {
  const h = D.addHO[key]; if (!h) return `（${key} がデータに無い）`;
  return [`#### ${pcName(h.pc)}　${h.title}（版 ${key}）`, h.when ? `> 配る所：${h.when}` : '', demote(h.body, 5)].filter((x) => x !== '').join('\n\n');
}

// ---------- 章の中身 ----------
function chapterSections(ch) {
  const sec = [];
  // ---- HO ----
  const ho = ['## HO'];
  if (ch.key === 'op') {
    ho.push(`**この章で読む HO：共通HO（ギルドの依頼書）1本＋4人の基本HO 4本（目的は W2-1〜W2-4 の文）**`);
    ho.push('### 共通HO（ギルドからの依頼書）');
    ho.push(demote((D.documents.commonHO || {}).body || '（共通HO がデータに無い）', 5));
    ho.push(goalMd('W1-1', '全体の目標（共通HO・全員）'));
    ho.push(...PC.map((pc) => hoMd(pc)));
    ho.push('### 4人の目的（W2-1〜W2-4）');
    for (const pc of PC) ho.push(goalMd(D.ch3.goals.mine[pc], `${pcName(pc)}の目的`));
    ho.push(ch3TextMd('N6', 'エドガーの籠手の留め金（OP のエドガーの説明欄に1行）'));
  } else if (ch.key === 'ch1' || ch.key === 'ch2' || ch.key === 'ch3') {
    ho.push('**この章で新しく配る HO は無い**（基本HO は [01_OP](#/n-c3g-op)、追加HO は [03_休憩1](#/n-c3g-rest1)・[05_休憩2](#/n-c3g-rest2) で配る）。章の目標を画面に出す。');
    ho.push(goalMd(ch.key === 'ch1' ? 'W9-1' : ch.key === 'ch2' ? 'W9-2' : 'W9-3', 'この章の目標（画面の文）'));
    const chNo = ch.key === 'ch1' ? 1 : ch.key === 'ch2' ? 2 : 3;
    const withSection = PC.filter((pc) => new RegExp('【第' + chNo + '章で】').test(String((D.ch3.item(D.ch3.goals.mine[pc]) || {}).text || '')));
    if (withSection.length) {
      ho.push(`#### 各PCの「第${chNo}章で」の欄（基本HO・目的の W2-1〜W2-4 から）`);
      for (const pc of withSection) {
        const id = D.ch3.goals.mine[pc]; const x = D.ch3.item(id);
        const m = String(x.text).match(new RegExp('【第' + chNo + '章で】\n([\s\S]*)$'));
        ho.push(`- **${pcName(pc)}**：${m ? block(m[1]).replace(/\n/g, ' ') : '（この章の欄がデータに無い）'}`);
      }
    } else {
      ho.push(`> 基本HO の目的（W2-1〜W2-4）には【第1章で】の欄しか無い（第${chNo}章の欄はデータに無い）。この章の目標は、上の W9-${chNo} を見る。`);
    }
  } else {
    const n = ch.key === 'rest1' ? 1 : 2;
    const keys = Object.keys(D.addHO).filter((k) => k.startsWith('CH3_R' + n + '_'));
    ho.push(`**この章で配る HO：追加HO ${keys.length}本（1人1本。版が分かれる人は、その版のぶんだけ全文を出す）**`);
    ho.push(`> 配り方：ゲームが状態から自動で決める。どの版を配るかは、下の「配る所」に書いた条件で決まる（版のキーの後ろは、PCと条件の名残）。`);
    for (const k of keys) {
      ho.push(addHoMd(k));
    }
  }
  sec.push(ho.join('\n\n'));

  // ---- 読み合わせ ----
  const rd = ['## 読み合わせ'];
  const usedRead = new Set();
  if (ch.key === 'op') {
    rd.push('**流れる順：HO を読む → 練習 → R00（作戦室 → 《Disgord》の起動 → 通話）**');
    usedRead.add('R00');
  } else if (ch.key === 'ch1') {
    rd.push('**流れる順：探索①〜④（各回の報告）→ 推理会議 → 1室を指名 → W4-1／W4-2 → LS×3「中央封鎖路の再生体」→ W6-1／W6-2（救出）**');
    rd.push('### 指名（1-7）');
    rd.push(['全員が伏せて1室を選び、そろったら一斉に公開する。割れたら1回だけ選び直し、それでも割れたら最も多い部屋に決まる。', '',
      '| 画面の文 | 文 |', '|---|---|',
      `| 選ぶときの案内 | ${cell(D.text['ch3.pickLead'] || '')} |`,
      `| 指図（1行） | ${cell(D.text['ch3.pickTodo'] || '')} |`,
      `| 割れたとき | ${cell(D.text['ch3.pickSplit'] || '')} |`,
      `| 選び直しても割れたとき | ${cell(D.text['ch3.pickSplit2'] || '')} |`,
    ].join('\n'));
    rd.push(ch3TextMd('W11-1', 'エドガーが伏せて出す欄（探索①〜④の報告のたび・1回だけ）'));
    rd.push(ch3TextMd('W11-2', '先着に成功したときの知らせ（エドガーだけ）', { cond: '探索③の報告を閉じるまでに救難所（U7）を出せた回' }));
    rd.push(ch3TextMd('W11-3', '先着に遅れたときの知らせ（エドガーだけ）', { cond: '探索③の報告を閉じるまでに救難所を出せなかった回' }));
    rd.push(readingMd('W4-1', { cond: '指名が当たり（救難所 U7）だった回' }));
    rd.push(readingMd('W4-2', { cond: '指名が外れた回' }));
    rd.push(ch3TextMd('W5-1', 'LS×3「中央封鎖路の再生体」の場面と選択肢（3回・各20秒・相談不可）'));
    rd.push(ch3TextMd('W5-2', 'LS×3 各回の結果（A・B・C）'));
    rd.push(ch3TextMd('W5-3', 'LS×3 各回の結果（W・様子を見る）'));
    rd.push(ch3TextMd('W5-4', 'LS×3 撃退の結果（3回終了後）'));
    rd.push(ch3TextMd('N4-1', 'エドガーの初対面の場面（エドガーだけ）', { cond: '先着に成功した回（LS 1回目の結果のすぐあと）' }));
    rd.push(ch3TextMd('N4-2', 'エドガーの初対面の場面（エドガーだけ）', { cond: '先着に失敗した回（LS 3回目の結果のすぐあと）' }));
    rd.push(readingMd('W6-1', { cond: '先着に成功した回' }));
    rd.push(readingMd('W6-2', { cond: '先着に失敗した回' }));
    usedRead.add('W6-1'); usedRead.add('W6-2');
  } else if (ch.key === 'ch2') {
    rd.push('**流れる順：守護者門で W7-1／W7-2 → LS③（分断）→ R11b → 探索①〜⑤ → W8-1 → LS×3「排水門の前」→ W8-5 → R18-1（遺体）**');
    rd.push(readingMd('W7-1', { cond: 'エドガーの先着に成功した回' }));
    rd.push(readingMd('W7-2', { cond: 'エドガーの先着に失敗した回' }));
    rd.push(`### LS③（分断・P6）について\n読み合わせは無い（分断のあとの組ごとの読み合わせは流れから外した）。結果のあと、下層へ降りた所で R11b を読む。`);
    rd.push(goalMd('W9-2', '第2章の目標（作戦会議の画面）'));
    rd.push(readingMd('R11b'));
    rd.push(goalMd('W13-1', '排水門が開かない理由（画面の文）'));
    rd.push(ch3TextMd('W8-1', '2-10 隔離排水区画の場面（LS×3 の前）'));
    rd.push(ch3TextMd('W8-2', 'LS×3「排水門の前」の場面と選択肢（3回・各20秒・相談不可）'));
    rd.push(ch3TextMd('W8-3', 'LS×3 各回の結果（A・B・C・W）'));
    rd.push(ch3TextMd('W8-4', 'LS×3 撃退の結果（3回終了後）'));
    rd.push(readingMd('W8-5'));
    rd.push(readingMd('R18-1', { cond: 'W8-5 のあと（第2章の終わり）' }));
  } else if (ch.key === 'ch3') {
    rd.push('**流れる順：R18-2 → 決まった調査（遺体・所持品・現場）→ 選ぶ調査2回 → 議論 → R19（決戦前）→ 最終戦（R20）→ R21（真相）→ R22（ED共通）→ R23（ED個別）**');
    rd.push(readingMd('R18-2'));
    rd.push(goalMd('W9-3', '第3章の目標'));
    rd.push(goalMd('W13-1', '排水門が開かない理由'));
    rd.push(ch3TextMd('W12-1', '決まった調査の案内（画面）'));
    rd.push(ch3TextMd('W12-2', '選ぶ調査の案内（画面）'));
    rd.push(readingMd('R19'));
    rd.push(readingMd('R20'));
    rd.push(readingMd('R21', { cond: '帰還できた回（完全排除・部分排除）だけ。完全な敗北の回は読まない' }));
    rd.push(readingMd('R22', { cond: '結果に応じて1つだけ読む（ED-1・ED-2 は R21 のあと、ED-3 は R21 を読まずにこれだけ）' }));
    rd.push(readingMd('R23', { cond: '帰還できた回だけ。各PCの本人が読む（条件に当てはまる段だけ）' }));
  } else {
    rd.push('**この章では読み合わせを読まない**（追加HO と、確定情報のまとめだけ）。');
    rd.push(`### 確定情報のまとめ（${ch.key === 'rest1' ? 'W14-1' : 'W14-2'}）`);
    rd.push(demote((D.ch3.item(ch.key === 'rest1' ? 'W14-1' : 'W14-2') || {}).text || '', 5));
  }
  // 章の途中で読む文（W9-1 など）を、読み合わせの下の小節に
  if (ch.key === 'ch1') rd.push(goalMd('W9-1', '第1章の目標（1-1 の画面）'));
  if (ch.key === 'ch2') rd.push('');
  // LS×3 の判定の決まり（〔仮〕の数値から）
  if (ch.key === 'ch1' || ch.key === 'ch2') {
    const key = ch.key === 'ch1' ? 'CH1' : 'CH2';
    const def = D.liveSelections[ch.key === 'ch1' ? 'CH1_LS3' : 'CH2_LS3'] || {};
    const T = (D.ch3.ls3Texts || {})[key] || {};
    const trows = Object.entries(T).map(([k, v]) => `| ${cell(k)} | ${cell(v)} |`);
    if (trows.length) {
      rd.push(['### LS×3 の各回の文（ゲームが画面に出す文）',
        '`D.ch3.ls3Texts`。上の W5-2／W5-3（第1章）・W8-3（第2章）は原稿の parts で、ゲームはそれに `fixes` を当てた文を出す。食い違って見える所は、この表が実際に出る文。',
        '', '| 手 | 文 |', '|---|---|', ...trows].join('\n'));
    }
    const rows = [
      '| 項目 | 決まり（〔仮〕の値） |', '|---|---|',
      `| 回数 | 3回（各${P.ls3Seconds || '?'}秒・相談不可） |`,
      `| 成功の数え方 | ${ch.key === 'ch1' ? `毎回、決まった手（${(P.ch1Keys || []).join('→')}）を${P.ch1Need}人以上が選ぶと成功（エドガーの抜ける回はその人を除く）` : `3つの手のうち、根拠のカードを読んでいる人が${P.ch2Need}人以上なら成功`} |`,
      `| 3回の終わり | ${P.ls3GoodWins}回以上成功で「撃退」、${P.ls3GoodWins}回未満でも撃退（被害大・全員に${P.ls3BadEndDmg}のダメージ） |`,
      `| 傷・功績 | 失敗した回は選んだ人に${P.ls3FailDmg}、成功した回は功績+${P.ls3WinMerit}。撃退で全員に功績+${P.ls3RepelMerit} |`,
      `| 「様子を見る」 | 判定から抜ける（エドガーだけ文が違う） |`,
    ];
    rd.push([`### LS×3 の判定の決まり（${def.name || key}）`, rows.join('\n')].join('\n\n'));
  }
  sec.push(rd.join('\n\n'));

  // ---- カード ----
  const cards = CARDS[ch.key] || [];
  const ids = uniqIds(cards);
  const cd = ['## カード'];
  cd.push(`**この章で手に入るカード：${ids.length}枚**（配布の単位は${cards.length}回。同じカードを別の条件でも配るときは、枚数は1枚と数え、下に配布の行を分けて書く）`);
  if (ch.key === 'op') {
    cd.push('OP で配るカードは無い（支給品はカードではなく、HO を読むときに1人1つ選ぶ品）。');
  } else if (ch.key === 'rest1' || ch.key === 'rest2') {
    cd.push('この章で配るカードは無い（追加HO はカードではない）。');
  }
  if (ch.key === 'ch1') {
    const base = uniqIds(roomCards('U', { exclude: ['U7'], secretExclude: ['U9'] }));
    const rec = uniqIds(roomLsRecCards('U'));
    const res = (D.ch3.rescueCards || []).filter(alive);
    const rg = regroupCards('CH1');
    cd.push(`> 数え方：上層の部屋の段のカード${base.length}枚（U7 救難所と U9 の秘密区画は第3章で取るので、ここには入れない）＋部屋LS の報酬の記録片${rec.length}枚＋救出のカード${res.length}枚＋LS×3 の結果で配り直すカード${uniqIds(rg).length}枚（配布${rg.length}行）。`);
    cd.push(`> sim-ch3.js の floorCards の分母は${base.length}枚（部屋の段のカードだけ。部屋LSの記録片・救出・配り直しは別に数える）。`);
    cd.push(`> 探索は${P.ch1Rounds}回（1回${P.roundMinutes}分＝選ぶ${P.roundSteps.pick}・探索${P.roundSteps.explore}・報告${P.roundSteps.report}）。`);
  }
  if (ch.key === 'ch2') {
    const base = uniqIds(roomCards('L', { exclude: ['L14'], secretExclude: ['L4'] }));
    const simBase = uniqIds(roomCards('L', { exclude: ['L14'], secretExclude: ['L4'], noPc: true }));
    const rec = uniqIds(roomLsRecCards('L'));
    const pcOnly = base.filter((id) => !simBase.includes(id));
    const arr = uniq(Object.values(arrive).flat().filter(alive));
    const gateIds = uniq(((D.rooms.U12 || {}).steps || []).flatMap((s) => s.cards || []).filter(alive));
    const ls3c = uniqIds(splitLsCards());
    const body = (D.ch3.bodyCards || []).filter(alive);
    cd.push(`> 数え方：下層の部屋の段のカード${base.length}枚（L14 古い宝物庫と L4 の秘密区画は第3章で取るので、ここには入れない）＋部屋LS の報酬の記録片${rec.length}枚＋L0 で配る${arr.length}枚＋LS③のカード${ls3c.length}枚＋守護者門の${gateIds.length}枚＋遺体の${body.length}枚＝${base.length + rec.length + arr.length + ls3c.length + gateIds.length + body.length}枚。LS×3 の結果で配り直すカードは、この章には無い（regroup.CH2 が空）。`);
    cd.push(`> sim-ch3.js の floorCards の分母は${simBase.length}枚（${base.length}枚のうち、PC専用の段のカード${pcOnly.length}枚＝${pcOnly.join('・')} を除いた数。sim は「その部屋に誰かが届いたか」だけを見て、PC専用の段は数えない）。`);
    cd.push(`> 探索は${P.ch2Rounds}回。`);
  }
  if (ch.key === 'ch3') {
    cd.push(`> 数え方：決まった調査のカード${fixedInvestigationCards().length}行＋選ぶ調査（2回）で行ける所のカード＋遺体を《聖女の診断》で診た回のカード。第3章は「決まった調査（全員・共有）」と「選ぶ調査2回（各自）」に分かれる。`);
  }
  // 部屋→深度の順に並べる（部屋の並びはデータの順）
  const cardBlock = (c) => [
    `#### ${c.id}　《${c.title}》`,
    [`- 受け取る：${c.who}`, `- 条件：${c.cond}`, c.deleted ? '- **このカードはいまの版で消している（deletedCards）**' : ''].filter(Boolean).join('\n'),
    c.text && String(c.text).trim() ? demote(block(c.text), 6) : '（本文はデータに空。ゲームがその場で組み立てるカード）',
  ].join('\n\n');
  const roomOrder = (list) => ROOM_IDS.filter((id) => list.some((c) => c.room === id));
  const sortDepth = (list) => list.slice().sort((a, b) => (a.depth || 99) - (b.depth || 99));
  const eventsOf = (list) => list.filter((c) => !(c.room && D.rooms[c.room]));
  if (ch.key === 'ch3') {
    const groups = [['fixed', '決まった調査（全員・共有）'], ['pick', '選ぶ調査（2回）で行ける部屋'], ['deep', '選ぶ調査で深く調べる（所持品・現場）'], ['calls', '「通話を見返す」'], ['skill', '技能で取るカード（診断・解析）']];
    for (const [g, label] of groups) {
      const list = cards.filter((c) => (c.grp || 'pick') === g);
      if (!list.length) continue;
      cd.push(`### ${label}（${uniqIds(list).length}枚）`);
      for (const rid of roomOrder(list)) {
        const sub = sortDepth(list.filter((c) => c.room === rid));
        cd.push(`**${rid}　${ROOM_NAMEC(rid)}（${floorName(rid[0])}）・${sub.length}枚**`);
        for (const c of sub) cd.push(cardBlock(c));
      }
      for (const c of eventsOf(list)) cd.push(cardBlock(c));
    }
  } else {
    const byRoom = new Map();
    for (const c of cards) {
      if (!(c.room && D.rooms[c.room])) continue;
      if (!byRoom.has(c.room)) byRoom.set(c.room, []);
      byRoom.get(c.room).push(c);
    }
    for (const rid of ROOM_IDS.filter((id) => byRoom.has(id))) {
      const list = sortDepth(byRoom.get(rid));
      cd.push(`### ${rid}　${ROOM_NAMEC(rid)}（${floorName(rid[0])}・${list.length}枚）`);
      for (const c of list) cd.push(cardBlock(c));
    }
    const events = eventsOf(cards);
    if (events.length) {
      cd.push('### 部屋の外で配るカード');
      for (const c of events) cd.push(cardBlock(c));
    }
  }
  if (ch.key === 'ch3') {
    cd.push(`#### 補足：《とっさの判断の記録》（INFO-E-SNAPLOG）の組み立て方`);
    cd.push(['このカードの文はデータに固定で持たず、ゲームが記録から組み立てる。使う文は次のとおり。', '',
      `- 前置き：${D.text['ch3.rec.lead'] || ''}`,
      `- 選ばなかった人の表示：${D.text['ch3.rec.none'] || ''}`,
      `- 締め：${D.text['ch3.rec.close'] || ''}`,
      `- LS の名前と手の文：${['P1', 'CH1_LS3', 'P6', 'CH2_LS3'].map((k) => `${(D.liveSelections[k] || {}).name || k}（${Object.values((D.liveSelections[k] || {}).options || {}).join('・')}）`).join('／')}`,
    ].join('\n'));
  }
  sec.push(cd.join('\n\n'));

  // ---- 地図 ----
  const mp = ['## 地図'];
  if (!ch.floors.length) {
    mp.push('（この章では地図を使わない）');
  } else {
    if (ch.note) mp.push(`> ${ch.note}`);
    mp.push(mapSection(ch.floors, cards));
    mp.push(['### 部屋LS（この章の部屋）', roomLsTable(ch.floors)].join('\n\n'));
  }
  sec.push(mp.join('\n\n'));

  // ---- どこにも配られないカード ----
  sec.push(unusedSection());
  return sec.join('\n\n');
}
const ROOM_NAMEC = (id) => (D.rooms[id] ? D.rooms[id].name : id);

function unusedSection() {
  const used = new Set();
  for (const k of Object.keys(CARDS)) for (const c of CARDS[k]) used.add(c.id);
  const all = Object.keys(D.infos).filter((id) => alive(id));
  const rest = all.filter((id) => !used.has(id));
  const droppedLs = ((D.ch3.dropped || {}).ls || []);
  const rows = rest.map((id) => {
    const inEngine = ENGINE_SRC.includes(id);
    const x = inf(id);
    const m = id.match(/^INFO-(P\d+)-/);
    const why = (x && x.endingOnly) ? 'エンディング専用'
      : (m && droppedLs.includes(m[1])) ? `3章版から外した LS（${m[1]}）のカード`
        : inEngine ? 'engine.js にIDがある（技能・分岐など）' : 'データのどこからも配られない（どこにも出ない）';
    return `| ${id} | 《${cell(x.title)}》 | ${why} |`;
  });
  return ['## どこにも配られないカード（点検）',
    `D.infos のカード（${all.length}枚。deletedCards の${(D.deletedCards || []).length}枚は除く）のうち、この3章版の流れのどの章にも出てこないカードは **${rest.length}枚**。`,
    rest.length ? ['| ID | 題 | 見立て |', '|---|---|---|', ...rows].join('\n') : '**0件。**（D.infos のカードはすべて、どれかの章に出る）',
    '> 見立ては、engine.js の文字にそのIDがあるかだけを見たもの。3章版の流れで実際に配るかは、技能を使う・分岐に入るなど、その場の条件による（このページ群のカードの節に無いカードは、この流れでは出ない）。',
  ].join('\n\n');
}

// ---------- 00 全体 ----------
function allPage() {
  const out = [];
  out.push(`# 3章版ゲーム（章ごと：HO・読み合わせ・カード・地図）`);
  out.push(`- 生成元：\`${GAME.replace(/\\/g, '/')}\`（branch \`${BRANCH}\`・HEAD \`${COMMIT}\`）
- 作った日時：${STAMP}
- 作った物：\`tools/ch3-game.mjs\`（ゲームのデータから機械的に作る。手で写した文は置いていない）
- 見る人：作者（GM専用の情報を含む。PL には配らない）`);
  out.push(`> このページ群は、ゲームの \`src/data.js\`・\`src/chapters3.js\`・\`src/engine.js\`・\`src/board.js\` を読んで作った。**ゲームはまだ本番に出していない**（作業版 integ の ${COMMIT}）。`);

  out.push(`## 章の並びと目安時間`);
  const rows = [
    '| 章 | ページ | 何をするか | 目安（〔仮〕の数値から計算できる分） |', '|---|---|---|---|',
    `| OP | [01_OP](#/n-c3g-op) | HO を読む → R00 → 最初の話 | データに時間の値が無い |`,
    `| 第1章（上層） | [02_第1章](#/n-c3g-ch1) | 探索${P.ch1Rounds}回 → 推理会議 → 指名 → W4 → LS×3 → 救出 | 探索 ${P.ch1Rounds}回×${P.roundMinutes}分＝${P.ch1Rounds * P.roundMinutes}分＋指名・LS×3（各${P.ls3Seconds}秒×3）＋読み合わせ |`,
    `| 休憩1 | [03_休憩1](#/n-c3g-rest1) | 追加HO 1人1本／確定情報のまとめ① | データに時間の値が無い |`,
    `| 第2章（下層） | [04_第2章](#/n-c3g-ch2) | 守護者門 → LS③ → 探索${P.ch2Rounds}回 → W8-1 → LS×3 → W8-5 → R18-1 | 探索 ${P.ch2Rounds}回×${P.roundMinutes}分＝${P.ch2Rounds * P.roundMinutes}分＋LS③・LS×3（各${P.ls3Seconds}秒×3）＋読み合わせ |`,
    `| 休憩2 | [05_休憩2](#/n-c3g-rest2) | 追加HO 1人1本／確定情報のまとめ② | データに時間の値が無い |`,
    `| 第3章（上下層） | [06_第3章](#/n-c3g-ch3) | 決まった調査 → 選ぶ調査${P.ch3Picks}回 → 議論 → R19・R20 → ED | 選ぶ調査${P.ch3Picks}回（1回の長さの値はデータに無い） |`,
  ];
  out.push(rows.join('\n'));
  out.push(`> 章全体の目安（60分・65分など）は、ゲームのデータに値が無い（人が書いた「3章の流れと目標」にだけある）。ここには計算できる分だけを出した。`);

  out.push(`## 各章の目標`);
  out.push(`### 全体の目標（第1・2章）\n${demote(D.ch3.goals.overall, 5)}`);
  out.push(`### 全体の目標（第3章）\n${demote(D.ch3.goals.overall3, 5)}`);
  out.push(['### 章ごとの目標', '| 章 | 目標（画面の文） |', '|---|---|',
    `| 第1章 | ${cell((D.ch3.item('W9-1') || {}).text || '')} |`,
    `| 第2章 | ${cell((D.ch3.item('W9-2') || {}).text || '')} |`,
    `| 第3章 | ${cell((D.ch3.item('W9-3') || {}).text || '')} |`].join('\n'));
  out.push(['### 4人の目的（W2-1〜W2-4）', ...PC.map((pc) => `**${pcName(pc)}**（${D.ch3.goals.mine[pc]}）\n\n${demote((D.ch3.item(D.ch3.goals.mine[pc]) || {}).text || '', 5)}`)].join('\n\n'));

  out.push(`## 章ごとのカードの枚数`);
  out.push(['| 章 | 枚（IDの種類） | 配布の行 | 数え方 |', '|---|---|---|---|',
    `| OP | 0 | 0 | カードを配らない |`,
    `| 第1章 | ${uniqIds(CARDS.ch1).length} | ${CARDS.ch1.length} | 上層の部屋の段21枚＋部屋LSの記録片＋救出＋LS×3の配り直し |`,
    `| 休憩1 | 0 | 0 | カードを配らない |`,
    `| 第2章 | ${uniqIds(CARDS.ch2).length} | ${CARDS.ch2.length} | 下層の部屋の段34枚（うち2枚はPC専用）＋部屋LSの記録片＋L0＋LS③＋門＋遺体 |`,
    `| 休憩2 | 0 | 0 | カードを配らない |`,
    `| 第3章 | ${uniqIds(CARDS.ch3).length} | ${CARDS.ch3.length} | 決まった調査＋選ぶ調査＋深く調べる＋通話＋技能（診断・解析） |`].join('\n'));
  out.push(`> 突き合わせ：sim-ch3.js の floorCards は第1章 21枚・第2章 32枚を分母にする（部屋の段のカードだけ。救出・部屋LSの記録片・L0・門・遺体・第3章は別に数える）。第2章の32枚は、下層の部屋の段34枚からPC専用の段2枚（ミレイユ・エドガー）を除いた数。`);

  out.push(`## 各ページ`);
  out.push(['- [01_OP](#/n-c3g-op)　HO・R00・地図（上層の入口まで）',
    '- [02_第1章](#/n-c3g-ch1)　上層の探索・指名・LS×3・救出',
    '- [03_休憩1](#/n-c3g-rest1)　追加HO（エドガーは OK／NG の2版）',
    '- [04_第2章](#/n-c3g-ch2)　下層・守護者門・LS×3・遺体',
    '- [05_休憩2](#/n-c3g-rest2)　追加HO（ヴィオラは ENH／NOTE／NONOTE の3版）',
    '- [06_第3章](#/n-c3g-ch3)　決まった調査・選ぶ調査・最終戦・ED',
    '- [07_案_リックの隠れ場所](#/n-c3g-hide)　作者用手書きの案（このページ群の生成には入らない）'].join('\n'));
  out.push(`## 数え方と出どころ`);
  out.push(['- HO：`D.ho[PC].sections`（見出しと本文）と、HO の本文・目的の `D.ch3.item(W2-1〜W2-4)`。共通HO は `D.documents.commonHO.body`。',
    '- 追加HO：`D.addHO["CH3_R1_…"]`・`D.addHO["CH3_R2_…"]`（`src/data.js` の `CH3_ADDHO` から作られる）。',
    '- 読み合わせ：`D.readings[id].lines`（場面・ト書き・台詞・画面・演出・条件の行をそのまま）。LS×3 の場面と結果は `D.ch3.item("W5-1"〜"W5-4")`・`W8-1`〜`W8-5`。指名とエドガーの欄は `W11-1`〜`W11-3`・`D.text["ch3.pick*"]`。',
    '- カード：`D.rooms[*].steps[*].cards／mixiCards／pcCards`・`D.rooms[*].secret.cards`・`D.ch3.place`・`D.ch3.rescueCards`・`D.ch3.arriveL0`・`D.ch3.bodyCards`・`D.ch3.fixedCards`・`D.ch3.fixedIfEdgarLate`・`D.ch3.fixedInv`・`D.ch3.gameOnlyInv`・`D.ch3.regroup`・`D.investigations`。本文は `D.infos[id].text`。',
    '- 地図：`src/board.js` の `GC` 配列（部屋の格子位置）と `D.routes`（通路）。部屋の名前は `D.rooms[id].name`。',
    '- 部屋LS：`D.roomLS[id]`（場面・A/B/C・報酬）。',
    '- 枚数の分母：`scripts/sim-ch3.js` の `floorCards`（1〜22行）。'].join('\n'));
  return out.join('\n\n') + '\n';
}

// ---------- 書く ----------
fs.mkdirSync(OUT, { recursive: true });
const written = [];
function write(name, text) {
  const p = path.join(OUT, name);
  fs.writeFileSync(p, text.replace(/\r\n/g, '\n'), 'utf8');
  written.push({ name, bytes: Buffer.byteLength(text, 'utf8'), p });
}
write('00_全体.md', allPage());
for (const ch of CH) {
  const head = [`# ${ch.title}`, `- 生成元：\`${GAME.replace(/\\/g, '/')}\`（branch \`${BRANCH}\`・HEAD \`${COMMIT}\`）`, `- 作った日時：${STAMP}`, `- ページ：${ch.id}　／　[全体の目次](#/n-c3g-all)`].join('\n');
  write(ch.file, head + '\n\n' + chapterSections(ch) + '\n');
}

// ---------- 点検の出力 ----------
const summary = {
  commit: COMMIT, branch: BRANCH, out: OUT,
  files: written.map((w) => ({ name: w.name, bytes: w.bytes })),
  cards: Object.fromEntries(CH.map((ch) => [ch.key, { ids: uniqIds(CARDS[ch.key] || []).length, rows: (CARDS[ch.key] || []).length }])),
  readings: Object.fromEntries(CH.map((ch) => [ch.key, uniq((ch.readings || []).concat(ch.key === 'ch1' ? ['W4-1', 'W4-2', 'W6-1', 'W6-2', 'N4-1', 'N4-2', 'W5-1', 'W5-2', 'W5-3', 'W5-4', 'W11-1', 'W11-2', 'W11-3'] : ch.key === 'ch2' ? ['W8-1', 'W8-2', 'W8-3', 'W8-4'] : ch.key === 'ch3' ? ['W12-1', 'W12-2'] : ['W14-1'])).length])),
  missing: {
    readings: CH.flatMap((ch) => (ch.readings || []).filter((id) => !D.readings[id])),
    cards: CH.flatMap((ch) => (CARDS[ch.key] || []).filter((c) => !inf(c.id)).map((c) => c.id + '@' + ch.key)),
  },
};
console.log(JSON.stringify(summary, null, 1));
for (const w of written) console.log(`${w.name}\t${w.bytes} bytes`);
console.log('カード：' + CH.map((ch) => `${ch.key}=${uniqIds(CARDS[ch.key] || []).length}枚/${(CARDS[ch.key] || []).length}行`).join(' '));
