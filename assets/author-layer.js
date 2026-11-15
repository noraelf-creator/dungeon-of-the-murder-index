/* 作者追記レイヤー（純関数・DOMなし）— 作者用INDEX 70
 * memo.character==='add' の1行に、作者が足したページ／節／段落を JSON で載せる。
 * 失敗しても例外を投げず null を返し、理由を AuthorLayer.errors に積む（表示側は出さない）。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AuthorLayer = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const V = 1;
  const MAX_CONTENT = 12000;   // API の content 上限（serialize 後）
  const MAX_BODY = 10000;      // 本文の上限
  const MAX_TITLE = 600;       // memo.title の上限
  const TYPES = ['page', 'section', 'para'];
  const VIS = ['make', 'gm', 'pl'];
  const DEFAULT_VIS = 'make';
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const PAGE_U_RE = /^u-[0-9a-f]{12}$/;
  const PAGE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,149}$/;
  const KEYS = ['v', 'type', 'uuid', 'pageId', 'after', 'order', 'title', 'body', 'vis', 'deleted', 'rev', 'createdAt', 'updatedAt', 'src'];
  const DANGEROUS = ['__proto__', 'constructor', 'prototype'];
  const errors = [];

  function fail(where, why) { errors.push(where + ': ' + why); return null; }
  function isPlainObject(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function hasDangerous(x, depth = 0) {
    if (depth > 6 || !x || typeof x !== 'object') return false;
    for (const k of Object.keys(x)) {
      if (DANGEROUS.includes(k)) return true;
      if (hasDangerous(x[k], depth + 1)) return true;
    }
    return false;
  }
  function uuidv4() {
    const c = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : null;
    if (c) return c;
    // 予備（ブラウザ・node とも crypto.randomUUID がある想定。無い環境でも形は UUID v4 に合わせる）
    let s = '';
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s.slice(0, 8) + '-' + s.slice(8, 12) + '-4' + s.slice(13, 16) + '-a' + s.slice(17, 20) + '-' + s.slice(20, 32);
  }
  const pageIdForUuid = (uuid) => 'u-' + String(uuid).replace(/-/g, '').slice(0, 12);
  const sectionIdOf = (rec) => (rec.type === 'page' ? 'x-page' : 'x-' + rec.uuid);
  const pageRowId = (rec) => 'rv1-' + rec.pageId;

  function checkText(name, value, max, { allowEmpty = true } = {}) {
    if (typeof value !== 'string') throw new Error(name + ' は文字列で指定してください。');
    if (!allowEmpty && !value.trim()) throw new Error(name + ' が空です。');
    if (value.length > max) throw new Error(name + ' が長すぎます（' + max + '字まで）。');
    return value;
  }
  function checkVis(vis) {
    if (vis == null) return DEFAULT_VIS;
    if (!VIS.includes(vis)) throw new Error('vis は make / gm / pl のどれかです。');
    return vis;
  }
  function checkType(type) {
    if (!TYPES.includes(type)) throw new Error('type は page / section / para のどれかです。');
    return type;
  }
  function checkAfter(after) {
    if (after == null) return { a: '@top', text: '', idx: -1 };
    if (!isPlainObject(after)) throw new Error('after の形が違います。');
    const a = after.a == null ? '@top' : after.a;
    if (typeof a !== 'string' || !a || a.length > 180) throw new Error('after.a が不正です。');
    const text = after.text == null ? '' : after.text;
    if (typeof text !== 'string' || text.length > 80) throw new Error('after.text が不正です。');
    const idx = after.idx == null ? -1 : after.idx;
    if (!Number.isInteger(idx)) throw new Error('after.idx が不正です。');
    return { a, text: text.slice(0, 40), idx };
  }

  // レコードの型を厳しく見る（serialize 前後で共有）。壊れていれば例外。
  function assertRecord(rec, where = 'record') {
    if (!isPlainObject(rec)) throw new Error(where + ' がオブジェクトではありません。');
    const type = checkType(rec.type);
    if (typeof rec.uuid !== 'string' || !UUID_RE.test(rec.uuid)) throw new Error('uuid が不正です。');
    if (type === 'page') {
      if (typeof rec.pageId !== 'string' || !PAGE_U_RE.test(rec.pageId)) throw new Error('type=page の pageId は u-<12桁> です。');
    } else {
      if (typeof rec.pageId !== 'string' || !PAGE_ID_RE.test(rec.pageId)) throw new Error('pageId が不正です。');
    }
    checkText('title', rec.title == null ? '' : rec.title, MAX_TITLE);
    checkText('body', rec.body == null ? '' : rec.body, MAX_BODY);
    checkVis(rec.vis);
    const order = Number(rec.order);
    if (!Number.isFinite(order)) throw new Error('order が数値ではありません。');
    if (rec.deleted != null && typeof rec.deleted !== 'boolean') throw new Error('deleted が真偽値ではありません。');
    if (rec.rev != null && !Number.isInteger(rec.rev)) throw new Error('rev が整数ではありません。');
    return true;
  }

  function canonical(rec) {
    return {
      v: V, type: rec.type, uuid: rec.uuid, pageId: rec.pageId, after: checkAfter(rec.after),
      order: Number(rec.order), title: rec.title || '', body: rec.body || '', vis: checkVis(rec.vis),
      deleted: !!rec.deleted, rev: Number.isInteger(rec.rev) ? rec.rev : 1,
      createdAt: rec.createdAt || '', updatedAt: rec.updatedAt || '', src: 'author',
    };
  }

  function newRec(input = {}) {
    const type = checkType(input.type || 'para');
    let pageId = input.pageId == null ? '' : input.pageId;
    const uuid = uuidv4();
    if (type === 'page') {
      if (pageId) throw new Error('type=page のときは pageId を作りません（page 用の pageId は自動で振ります）。');
      pageId = pageIdForUuid(uuid);
    } else {
      if (typeof pageId !== 'string' || !PAGE_ID_RE.test(pageId)) throw new Error('既存ページの pageId が不正です。');
    }
    checkText('title', input.title == null ? '' : input.title, MAX_TITLE);
    checkText('body', input.body == null ? '' : input.body, MAX_BODY);
    const order = input.order == null ? 1 : Number(input.order);
    if (!Number.isFinite(order)) throw new Error('order が数値ではありません。');
    const now = new Date().toISOString();
    const rec = {
      v: V, type, uuid, pageId, after: checkAfter(input.after), order,
      title: input.title || '', body: input.body || '', vis: checkVis(input.vis),
      deleted: false, rev: 1, createdAt: now, updatedAt: now, src: 'author',
    };
    assertRecord(rec, 'newRec');
    return rec;
  }

  function orderBetween(prev, next) {
    if (prev == null && next == null) return 1;
    const p = prev == null ? null : Number(prev);
    const n = next == null ? null : Number(next);
    if (p != null && !Number.isFinite(p)) throw new Error('prev が数値ではありません。');
    if (n != null && !Number.isFinite(n)) throw new Error('next が数値ではありません。');
    if (p == null) return n / 2;
    if (n == null) return p + 1;
    if (n <= p) return p + 1;
    return (p + n) / 2;
  }

  // 既存の段(anchor)の並びに、保存済みの追記を置き直す。決まらないものは捨てずに orphan へ。
  function resolvePlacements(pageAnchors, recs) {
    const anchors = (pageAnchors || []).filter((x) => x && typeof x.a === 'string').map((x, i) => ({ a: x.a, text: String(x.text || ''), idx: Number.isInteger(x.idx) ? x.idx : i }));
    const byA = new Map(anchors.map((x) => [x.a, x]));
    const placed = []; const orphan = [];
    for (const rec of recs || []) {
      if (!rec || !rec.after) { orphan.push(rec); continue; }
      const a = rec.after.a;
      if (a === '@top') { placed.push({ rec, afterA: '@top', how: 'anchor', idx: -1 }); continue; }
      if (a && byA.has(a)) { const h = byA.get(a); placed.push({ rec, afterA: a, how: 'anchor', idx: h.idx }); continue; }
      const want = String(rec.after.text || '').slice(0, 40);
      if (want) {
        const cands = anchors.filter((x) => x.text && x.text.startsWith(want));
        if (cands.length === 1) { placed.push({ rec, afterA: cands[0].a, how: 'text', idx: cands[0].idx }); continue; }
      }
      orphan.push(rec);
    }
    placed.sort((x, y) => (x.idx - y.idx) || ((Number(x.rec.order) || 0) - (Number(y.rec.order) || 0)) || String(x.rec.uuid).localeCompare(String(y.rec.uuid)));
    return { placed, orphan };
  }

  // 編集は body / title / deleted だけ。uuid・type・pageId・section_id は変えない。
  function applyEdit(rec, patch = {}) {
    if (!isPlainObject(rec)) throw new Error('record がオブジェクトではありません。');
    if (!isPlainObject(patch)) throw new Error('patch がオブジェクトではありません。');
    for (const k of Object.keys(patch)) if (!['body', 'title', 'deleted'].includes(k)) throw new Error(k + ' は変更できない項目です。');
    const next = canonical(rec);
    if ('body' in patch) { checkText('body', patch.body, MAX_BODY); next.body = patch.body; }
    if ('title' in patch) { checkText('title', patch.title, MAX_TITLE); next.title = patch.title; }
    if ('deleted' in patch) {
      if (typeof patch.deleted !== 'boolean') throw new Error('deleted は true / false で指定してください。');
      next.deleted = patch.deleted;
    }
    next.rev = (Number.isInteger(rec.rev) ? rec.rev : 1) + 1;
    next.updatedAt = new Date().toISOString();
    next.createdAt = rec.createdAt || next.createdAt;
    assertRecord(next, 'applyEdit');
    return next;
  }

  function parseLayer(memo) {
    if (!memo || typeof memo !== 'object') return null;
    if (memo.character !== 'add') return null;
    if (typeof memo.page_id !== 'string' || !memo.page_id.startsWith('rv1-')) return fail('memo.page_id', 'rv1- で始まりません');
    const pageFromMemo = memo.page_id.slice(4);
    if (!PAGE_ID_RE.test(pageFromMemo)) return fail('memo.page_id', '形が不正');
    if (typeof memo.section_id !== 'string' || !memo.section_id) return fail('memo.section_id', '空です');
    if (typeof memo.content !== 'string') return fail('memo.content', '文字列ではありません');
    if (memo.content.length > MAX_CONTENT) return fail('memo.content', MAX_CONTENT + '字を超えています');
    let raw;
    try { raw = JSON.parse(memo.content); } catch { return fail('memo.content', 'JSON が壊れています'); }
    if (!isPlainObject(raw)) return fail('memo.content', 'オブジェクトではありません');
    if (hasDangerous(raw)) return fail('memo.content', '危険なキーがあります');
    for (const k of Object.keys(raw)) if (!KEYS.includes(k)) return fail('memo.content', '余分なキー ' + k);
    if (raw.v !== V) return fail('memo.content', 'v が ' + V + ' ではありません');
    if (!TYPES.includes(raw.type)) return fail('memo.content', 'type が不正');
    if (typeof raw.uuid !== 'string' || !UUID_RE.test(raw.uuid)) return fail('memo.content', 'uuid が不正');
    if (raw.type === 'page') {
      if (!PAGE_U_RE.test(String(raw.pageId))) return fail('memo.content', 'page の pageId が u- ではありません');
      if (memo.section_id !== 'x-page') return fail('memo.section_id', 'page は x-page のはず');
      if (raw.pageId !== pageFromMemo) return fail('memo.page_id', 'page の pageId と一致しません');
    } else {
      if (!PAGE_ID_RE.test(String(raw.pageId))) return fail('memo.content', 'pageId が不正');
      if (raw.pageId !== pageFromMemo) return fail('memo.page_id', 'pageId と一致しません');
      if (memo.section_id !== 'x-' + raw.uuid) return fail('memo.section_id', 'uuid と一致しません');
    }
    if (!isPlainObject(raw.after)) return fail('memo.content', 'after が不正');
    let after;
    try { after = checkAfter(raw.after); } catch (e) { return fail('memo.content', e.message); }
    if (!Number.isFinite(Number(raw.order))) return fail('memo.content', 'order が数値ではありません');
    if (typeof raw.title !== 'string' || raw.title.length > MAX_TITLE) return fail('memo.content', 'title が不正');
    if (typeof raw.body !== 'string' || raw.body.length > MAX_BODY) return fail('memo.content', 'body が不正');
    if (!VIS.includes(raw.vis)) return fail('memo.content', 'vis が不正（表示しません）');
    if (raw.deleted != null && typeof raw.deleted !== 'boolean') return fail('memo.content', 'deleted が不正');
    if (raw.rev != null && !Number.isInteger(raw.rev)) return fail('memo.content', 'rev が不正');
    return {
      v: V, type: raw.type, uuid: raw.uuid, pageId: raw.pageId, after, order: Number(raw.order),
      title: raw.title, body: raw.body, vis: raw.vis, deleted: !!raw.deleted,
      rev: Number.isInteger(raw.rev) ? raw.rev : 1,
      createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
      src: 'author',
    };
  }

  function serializeLayer(rec) {
    assertRecord(rec, 'serialize');
    // 呼び出し側で足した表示用の項目は content に入れない（余分なキーを作らない）
    const content = JSON.stringify(canonical(rec));
    if (content.length > MAX_CONTENT) {
      const e = new Error('共有の上限（' + MAX_CONTENT + '字）を超えるため保存できません。本文を短くしてください（この内容は切り詰めません）。');
      e.code = 'too-large'; e.size = content.length; throw e;
    }
    const head = String(rec.pageTitle || rec.pageId || '');
    const tail = String(rec.title || rec.body || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    return {
      page_id: pageRowId(rec), section_id: sectionIdOf(rec),
      title: (head + '｜' + tail).slice(0, MAX_TITLE),
      content, resolved: false, character: 'add', card: '',
    };
  }

  function toExport(recs, meta = {}) {
    return {
      schema: 'dom-author-layer-v1',
      projectId: meta.projectId || '',
      exportedAt: new Date().toISOString(),
      gameCommit: meta.gameCommit || '',
      count: (recs || []).length,
      records: (recs || []).map((r) => canonical(r)),
    };
  }

  function toMarkdown(recs, pagesById = {}) {
    const list = (recs || []).slice().sort((a, b) => String(a.pageId).localeCompare(String(b.pageId)) || ((Number(a.after && a.after.idx) || 0) - (Number(b.after && b.after.idx) || 0)) || ((Number(a.order) || 0) - (Number(b.order) || 0)) || String(a.uuid).localeCompare(String(b.uuid)));
    const day = new Date().toLocaleDateString('ja-JP');
    let md = '# 作者が足した文（作者用INDEX） ' + day + '\n\n全 ' + list.length + ' 件。原稿へは自動で入れていません（JSON とあわせて統括が反映します）。\n';
    let last = null;
    const byPage = new Map();
    for (const r of list) { if (!byPage.has(r.pageId)) byPage.set(r.pageId, []); byPage.get(r.pageId).push(r); }
    for (const [pid, arr] of byPage) {
      const p = pagesById && pagesById[pid];
      md += '\n## ' + (p ? (p.nav || p.title || pid) : pid) + '\n';
      if (p && p.source) md += '元ファイル：content/' + p.source + '\n';
      for (const r of arr) {
        const a = r.after || { a: '@top', text: '', idx: -1 };
        md += '\n- [' + r.type + '] after:' + a.a + '(' + String(a.text || '').replace(/[()\n]/g, ' ') + ') order:' + r.order + ' uuid:' + r.uuid + '\n';
        if (r.title) md += '  - 見出し：' + (r.deleted ? '~~' + r.title + '~~ ~~削除予定~~' : r.title) + '\n';
        md += '  - 本文：' + (r.deleted ? '~~' + String(r.body || '') + '~~ ~~削除予定~~' : String(r.body || '')).replace(/\n/g, '\n    ') + '\n';
        md += '  - 表示：' + { make: '▲制作', gm: '■GMだけ', pl: '◎PL可' }[r.vis] + (r.deleted ? '・削除予定' : '') + '\n';
      }
      last = pid;
    }
    if (last === null) md += '\n（追記はまだありません）\n';
    return md;
  }

  return {
    MAX_CONTENT, MAX_BODY, MAX_TITLE, V, DEFAULT_VIS, TYPES, VIS, errors,
    isAuthorMemo: (m) => !!(m && m.character === 'add'),
    pageIdFromMemo: (m) => (m && typeof m.page_id === 'string' && m.page_id.startsWith('rv1-') ? m.page_id.slice(4) : ''),
    sectionIdOf, pageRowId, pageIdForUuid,
    parseLayer, serializeLayer, newRec, orderBetween, resolvePlacements, applyEdit, toExport, toMarkdown, assertRecord,
  };
});
