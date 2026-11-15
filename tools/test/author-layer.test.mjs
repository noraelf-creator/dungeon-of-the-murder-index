// 作者追記レイヤーの純関数テスト（node --test）
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const AL = require('../../assets/author-layer.js');

const PAGE = 'n-ho-common';
const mk = (over = {}) => AL.newRec({ pageId: PAGE, type: 'para', after: { a: 'a1', text: 'はじめの段', idx: 3 }, order: 2, title: '', body: '足した文', ...over });

test('① 直列化して戻すと同じになる（往復）', () => {
  const rec = mk();
  const memo = AL.serializeLayer(rec);
  assert.equal(memo.page_id, 'rv1-' + PAGE);
  assert.equal(memo.section_id, 'x-' + rec.uuid);
  assert.equal(memo.character, 'add');
  assert.equal(memo.resolved, false);
  const back = AL.parseLayer({ ...memo, id: 'm1', revision: 1 });
  assert.ok(back);
  assert.equal(back.uuid, rec.uuid);
  assert.equal(back.pageId, PAGE);
  assert.equal(back.type, 'para');
  assert.equal(back.body, rec.body);
  assert.equal(back.order, rec.order);
  assert.deepEqual(back.after, rec.after);
  assert.equal(back.vis, 'make');
  assert.equal(back.deleted, false);
  assert.equal(back.rev, rec.rev);
  assert.equal(back.createdAt, rec.createdAt);
});

test('② content は12000字以内。長すぎる本文は作るときに弾き、直列化でも切り詰めずエラー', () => {
  assert.throws(() => AL.newRec({ pageId: PAGE, type: 'para', body: 'あ'.repeat(10001) }), /10000|本文/);
  const ok = mk({ body: 'あ'.repeat(10000) });
  const memo = AL.serializeLayer(ok);
  assert.ok(memo.content.length <= 12000, 'plain 10000 chars fits');
  // 改行・引用符・バックスラッシュで escape が増える本文は 12000 を超える → 切り詰めずエラー
  const heavy = mk({ body: ('"\\\n'.repeat(3300)) });
  assert.ok(heavy.body.length <= 10000);
  assert.throws(() => AL.serializeLayer({ ...heavy, title: 'x'.repeat(50) }), (e) => e.code === 'too-large');
});

test('③ orderBetween', () => {
  assert.equal(AL.orderBetween(1, 2), 1.5);
  assert.equal(AL.orderBetween(null, null), 1);
  assert.equal(AL.orderBetween(3, null), 4);
  assert.equal(AL.orderBetween(null, 4), 2);
  assert.ok(AL.orderBetween(1, 1.0000001) > 1);
});

test('④ 見出しの改名で uuid と section_id が変わらない', () => {
  const rec = mk({ type: 'section', title: 'もとの見出し', body: '本文' });
  const a = AL.serializeLayer(rec);
  const b = AL.serializeLayer(AL.applyEdit(rec, { title: '新しい見出し' }));
  assert.equal(a.section_id, b.section_id);
  assert.equal(AL.parseLayer(a).uuid, AL.parseLayer(b).uuid);
  assert.equal(AL.parseLayer(b).title, '新しい見出し');
  assert.equal(a.page_id, b.page_id);
});

test('⑤ アンカーが消えたら text で探し、無ければ orphan（捨てない）', () => {
  const anchors = [
    { a: 'h1', text: '見出し', idx: 0 },
    { a: 'a9', text: 'のこった段の文です', idx: 1 },
    { a: 'a8', text: '同じ文', idx: 2 },
    { a: 'a7', text: '同じ文', idx: 3 },
  ];
  const r1 = mk({ after: { a: 'gone', text: 'のこった段の文です', idx: 0 } });
  const r2 = mk({ after: { a: 'gone', text: '同じ文', idx: 0 } });     // 2件一致 → 決めない
  const r3 = mk({ after: { a: 'gone', text: 'もう無い文', idx: 0 } });
  const r4 = mk({ after: { a: 'a9', text: 'のこった段の文です', idx: 1 } });
  const r5 = mk({ type: 'para', after: { a: '@top', text: '', idx: -1 }, order: 1 });
  const res = AL.resolvePlacements(anchors, [r1, r2, r3, r4, r5]);
  const how = new Map(res.placed.map((p) => [p.rec.uuid, p]));
  assert.equal(how.get(r1.uuid).how, 'text');
  assert.equal(how.get(r1.uuid).afterA, 'a9');
  assert.equal(how.get(r4.uuid).how, 'anchor');
  assert.equal(how.get(r5.uuid).afterA, '@top');
  assert.deepEqual(res.orphan.map((r) => r.uuid), [r2.uuid, r3.uuid]);
  assert.equal(res.placed.length + res.orphan.length, 5, '全件がどちらかに入る');
});

test('⑤b 同じ位置の追記は order 昇順、同じ order は uuid 昇順', () => {
  const anchors = [{ a: 'a1', text: 'x', idx: 0 }];
  const a = mk({ order: 3, after: { a: 'a1', text: 'x', idx: 0 } });
  const b = mk({ order: 1.5, after: { a: 'a1', text: 'x', idx: 0 } });
  const c = mk({ order: 1.5, after: { a: 'a1', text: 'x', idx: 0 } });
  const res = AL.resolvePlacements(anchors, [a, b, c]);
  const first2 = res.placed.slice(0, 2).map((p) => p.rec.uuid).sort();
  assert.deepEqual(first2, [b.uuid, c.uuid].sort());
  assert.equal(res.placed[2].rec.uuid, a.uuid);
});

test('⑥ deleted の付け外しで元に戻る', () => {
  const rec = mk({ body: '元の本文' });
  const del = AL.applyEdit(rec, { deleted: true });
  assert.equal(del.deleted, true);
  assert.equal(del.rev, rec.rev + 1);
  assert.notEqual(del.updatedAt, undefined);
  const back = AL.applyEdit(del, { deleted: false });
  assert.equal(back.body, '元の本文');
  assert.equal(back.deleted, false);
  assert.equal(AL.serializeLayer(back).section_id, 'x-' + rec.uuid);
});

test('⑦ character!=="add" の memo は null', () => {
  assert.equal(AL.parseLayer({ page_id: 'rv1-x', section_id: 'h1', content: '{}', character: 'edit' }), null);
  assert.equal(AL.parseLayer({ page_id: 'rv1-x', section_id: 'h1', content: '{}', character: '' }), null);
  assert.equal(AL.parseLayer(null), null);
});

test('⑧ 壊れた JSON は null で、例外を投げない', () => {
  for (const c of ['{', 'null', '[]', '{"v":2}', '{"v":1,"type":"nope"}', '{"v":1,"type":"para","uuid":"bad"}']) {
    let r;
    assert.doesNotThrow(() => { r = AL.parseLayer({ page_id: 'rv1-p', section_id: 'x-u', content: c, character: 'add' }); });
    assert.equal(r, null, c);
  }
  assert.ok(AL.errors.length > 0, '壊れた内容は errors に積む');
});

test('⑨ 新ページの page レコードは x-page / rv1-u-… になる', () => {
  const page = AL.newRec({ pageId: '', type: 'page', title: '新しいページ', body: '本文' });
  assert.match(page.pageId, /^u-[0-9a-f]{12}$/);
  const memo = AL.serializeLayer(page);
  assert.equal(memo.section_id, 'x-page');
  assert.equal(memo.page_id, 'rv1-' + page.pageId);
  const back = AL.parseLayer(memo);
  assert.equal(back.type, 'page');
  assert.equal(back.pageId, page.pageId);
  const block = AL.newRec({ pageId: page.pageId, type: 'para', body: '足す' });
  assert.equal(AL.serializeLayer(block).section_id, 'x-' + block.uuid);
});

test('⑩ 型・文字の検査（title/schema）', () => {
  assert.throws(() => mk({ type: 'page' }), /page/i);            // page には u- の pageId が要る
  assert.throws(() => AL.newRec({ pageId: PAGE, type: 'para', title: { a: 1 } }), /title/);
  assert.throws(() => AL.newRec({ pageId: PAGE, type: 'para', body: 3 }), /body/);
  assert.throws(() => AL.newRec({ pageId: PAGE, type: 'para', vis: 'secret' }), /vis/);
  const rec = mk();
  assert.throws(() => AL.applyEdit(rec, { type: 'page' }), /変更できない/);
  const bad = { page_id: 'rv1-p', section_id: 'x-x', character: 'add', content: JSON.stringify({ v: 1, type: 'para', uuid: 'u', pageId: 'p', order: 'x', body: 'a' }) };
  assert.equal(AL.parseLayer(bad), null);
});

test('⑪ JSON/Markdown 書き出しに全件入り、削除は印が付く', () => {
  const recs = [mk({ body: '一', order: 1 }), AL.applyEdit(mk({ body: '二', order: 2 }), { deleted: true })];
  const ex = AL.toExport(recs, { projectId: 'p1', gameCommit: 'fb478cf' });
  assert.equal(ex.schema, 'dom-author-layer-v1');
  assert.equal(ex.projectId, 'p1');
  assert.equal(ex.gameCommit, 'fb478cf');
  assert.equal(ex.records.length, 2);
  assert.ok(ex.exportedAt);
  const md = AL.toMarkdown(recs, { [PAGE]: { nav: '共通HO', title: '共通HO' } });
  assert.match(md, /^## 共通HO/m);
  assert.match(md, /- \[para\] after:a1\(はじめの段\) order:1 uuid:/);
  assert.match(md, /一/);
  assert.match(md, /~~削除予定~~/);
  assert.match(md, /二/);
});

// H1：作者が「修正案」欄に普通の文を書いた場合に、共有本文を壊さないための判定（app.js の stage/push 防御と同じ条件）
test('⑫ H1: kind=add の content が普通の文なら null（共有・下書きを上書きしない判定）', () => {
  const rec = mk();
  const memo = AL.serializeLayer(rec);
  assert.ok(AL.parseLayer(memo));   // 正しい追記は読める
  // 旧い修正案欄から普通の文を入れた状態（レビュー H1 の再現）
  assert.equal(AL.parseLayer({ ...memo, content: 'ふつうの修正案のつもりの文' }), null);
  // 途中で切れた JSON・別 section の JSON も読めない（切り詰め・取り違えを保存しない）
  assert.equal(AL.parseLayer({ ...memo, content: memo.content.slice(0, memo.content.length - 5) }), null);
  assert.equal(AL.parseLayer({ ...memo, section_id: 'x-00000000-0000-4000-a000-000000000000' }), null);
  assert.equal(AL.parseLayer({ ...memo, page_id: 'rv1-' + PAGE + 'x' }), null);
});

test('⑬ M2: 読み戻しの比較に使う content は直列化のまま（余分なキーを足さない・切り詰めない）', () => {
  const rec = mk({ body: '改行\nを含む本文' });
  const memo = AL.serializeLayer(rec);
  const back = AL.parseLayer({ ...memo, id: 'm9', revision: 7, updated_at: '2026-11-16T00:00:00.000Z' });
  assert.ok(back);
  const again = AL.serializeLayer({ ...back, pageTitle: PAGE });
  assert.equal(again.content, memo.content);   // GET で戻した内容と、送った内容が同じ文字列になる
  assert.equal(memo.content.length <= AL.MAX_CONTENT, true);
});
