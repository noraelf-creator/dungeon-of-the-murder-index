// ゲーム文字データ抽出の機械検査（TDD）。
// 実行: node --test tools/test/game-text.test.mjs
//
// 方針:
//  - fixture で AST の形（object spread / optional chaining / 連結 / テンプレート / markup / 属性 /
//    コメント / role）を固定する。
//  - 実物は pinned commit だけを git show で読み、必須4場面・分母 9272・取りこぼし 0 を確かめる。
//  - 別枝（impl-txt / impl-eng / author69）のファイルは一切読まない。

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

import {
  DEFAULT_COMMIT,
  DEFAULT_GAME,
  JP_RE,
  decodeJsString,
  decodeJsBody,
  parseJsSource,
  extractJsSource,
  extractHtmlSource,
  extractCssSource,
  assignScene,
  buildGameText,
  listGameTextSources,
  SCENES,
} from '../game-text.mjs';

const FIXTURE = `
// 日本語コメントは internal（本文ではない）
const LB_TAB_HEAD = {intro:'はじめに', commonHO:'共通HO', phaseTable:'フェイズ進行表'};
const spread = {...LB_TAB_HEAD, skill:'技能'};
const opt = (obj) => obj?.name ?? '名前なし';
const ui = {start:'Start Game', roomId:'roomId', path:'assets/cutin/sk_charge.webp'};
function charSelect(name, count){
  const label = 'キャラクターを選ぶ';
  const html = '<button title="画面の説明（誰か落ちたときも）" aria-label="資料">資料</button>';
  const dyn = '「' + name + '」を手に入れた';
  const tpl = \`\${count}人そろった\`;
  const esc = '一行目\\n二行目\\u3042';
  const same1 = '重複する文';
  const same2 = '重複する文';
  console.log('ログ：' + name);
  throw new Error('エラーです');
  return label;
}
`;

function fixtureExtract() {
  return extractJsSource({ file: 'src/fixture.js', content: FIXTURE });
}

const byText = (items, t) => items.filter((i) => i.text === t);
const findItem = (items, t) => items.find((i) => i.text === t);

test('parser: object spread と optional chaining を解析できる（esprima では止まる形）', () => {
  const parsed = parseJsSource(FIXTURE, 'src/fixture.js');
  assert.ok(parsed.ast);
  assert.equal(typeof parsed.parserVersion, 'string');
  assert.ok(parsed.parserVersion.length > 0);
  assert.equal(parsed.errors.length, 0);
});

test('fixture: 日本語リテラルと短い英語UIを取り、識別子・パスは理由付きで落とす', () => {
  const { items, skipped } = fixtureExtract();
  assert.ok(findItem(items, 'はじめに'), 'はじめに が取れていない');
  assert.ok(findItem(items, '技能'));
  assert.ok(findItem(items, '名前なし'));
  assert.ok(findItem(items, 'キャラクターを選ぶ'));
  assert.ok(findItem(items, 'Start Game'), '短い英語UIが取れていない');

  const reasons = Object.fromEntries(skipped.map((s) => [s.text, s.reason]));
  assert.equal(reasons['roomId'], 'code_identifier');
  assert.equal(reasons['assets/cutin/sk_charge.webp'], 'asset_path_or_url');
  assert.ok(Object.keys(reasons).length >= 2);
});

test('fixture: 日本語コメントは本文にせず internal として別集計する', () => {
  const { items, internal } = fixtureExtract();
  assert.equal(internal.comments, 1);
  assert.equal(items.some((i) => i.text.includes('日本語コメントは internal')), false);
});

test('fixture: 連結は1つの式としてまとめ、完成文と偽らず {{式}} を残す', () => {
  const { items, stats } = fixtureExtract();
  const it = findItem(items, '「{{name}}」を手に入れた');
  assert.ok(it, '連結の代表文が無い');
  assert.equal(it.dynamic, true);
  assert.equal(it.static, false);
  assert.equal(it.textKind, 'concat');
  assert.equal(it.fragments.length, 2);
  assert.match(it.template, /\+/);
  assert.ok(stats.concatParentLiterals >= 2);
  assert.ok(stats.dynamicGroups >= 2);
});

test('fixture: テンプレートリテラルは quasi を fragment にし、式は placeholder にする', () => {
  const { items } = fixtureExtract();
  const it = findItem(items, '{{count}}人そろった');
  assert.ok(it, 'テンプレートの代表文が無い');
  assert.equal(it.textKind, 'template');
  assert.equal(it.dynamic, true);
  assert.equal(it.fragments.length, 1);
  assert.equal(it.fragments[0].text, '人そろった');
});

test('fixture: コード内のHTML markup は plain な見える文字だけを text にし、生HTMLは data に残す', () => {
  const { items } = fixtureExtract();
  const it = findItem(items, '資料');
  assert.ok(it, 'markup の見える文字が無い');
  assert.equal(it.textKind, 'markup');
  assert.equal(it.markup.tag, 'button');
  assert.equal(it.markup.attrs['aria-label'], '資料');
  assert.equal(it.markup.attrs.title, '画面の説明（誰か落ちたときも）');
  assert.match(it.sourceRaw, /<button /);
  assert.equal(it.text.includes('<'), false, 'text に生HTMLを入れてはいけない');

  const attr = findItem(items, '画面の説明（誰か落ちたときも）');
  assert.ok(attr, 'markup の属性文字が独立して取れていない');
});

test('fixture: 同じ文字でも出典が違えば dedup せず別 item にする', () => {
  const { items } = fixtureExtract();
  const same = byText(items, '重複する文');
  assert.equal(same.length, 2);
  assert.notEqual(same[0].id, same[1].id);
  assert.notEqual(same[0].sourcePath, same[1].sourcePath);
});

test('fixture: JS エスケープは decoded 値で照合する（raw の substring 判定では誤FAILする）', () => {
  assert.equal(decodeJsString("'a\\nb'"), 'a\nb');
  assert.equal(decodeJsString("'\\u3042'"), 'あ');
  assert.equal(decodeJsString("'\\t'"), '\t');
  assert.equal(decodeJsBody('一行目\\n二行目\\u3042'), '一行目\n二行目あ');
  assert.equal(decodeJsString('"\\u{1F44D}"'), '👍');

  const { items, escapeCheck } = fixtureExtract();
  const it = findItem(items, '一行目\n二行目あ');
  assert.ok(it, 'エスケープされた文字列が decoded で取れていない');
  assert.equal(FIXTURE.includes(it.text), false, 'raw に decoded 値は無い（だから substring 判定は誤り）');
  assert.equal(escapeCheck.checked > 0, true);
  assert.deepEqual(escapeCheck.mismatch, []);
});

test('fixture: role と sourcePath を親ノードから機械的に付ける', () => {
  const { items } = fixtureExtract();
  const intro = findItem(items, 'はじめに');
  assert.equal(intro.role, 'prop:intro');
  assert.match(intro.sourcePath, /LB_TAB_HEAD\.intro/);

  const call = findItem(items, 'ログ：{{name}}');
  assert.ok(call, 'console.log の連結が無い');
  assert.equal(call.dynamic, true);
  assert.match(call.role, /^call:/);
});

test('coverage: AST の文字列ノードは fragment か skip のどちらか一方に必ず入る', () => {
  const { items, skipped, stats } = fixtureExtract();
  const fragCount = items.reduce((n, i) => n + i.fragments.length, 0);
  assert.equal(fragCount, stats.fragments);
  assert.equal(stats.literalNodes, fragCount + skipped.length);
  assert.equal(stats.unaccounted, 0);
  for (const s of skipped) assert.ok(s.reason, '理由の無い skip: ' + s.text);
});

test('HTML: <title> / 属性 / 見える文字 / 実体参照 / インラインJS を分けて取る', () => {
  const html = `<!doctype html><html lang="ja"><head><title>題名 — ゲーム</title></head>
<body><div id="app" title="資料"><p>本文&amp;続き</p>
<button aria-label="選ぶ" placeholder="名前">はじめる</button>
<script>window.L = {say:'台詞です'};</script>
<style>.a::before{content:"表示する文"}</style>
</div></body></html>`;
  const { items, stats } = extractHtmlSource({ file: 'src/x.html', content: html });
  assert.ok(findItem(items, '題名 — ゲーム'));
  assert.equal(findItem(items, '題名 — ゲーム').kind, 'title');
  assert.ok(findItem(items, '資料'));
  assert.ok(findItem(items, '本文&続き'), '実体参照が decoded されていない');
  assert.ok(findItem(items, '選ぶ'));
  assert.ok(findItem(items, '名前'));
  assert.ok(findItem(items, '台詞です'), 'インラインJSが取れていない');
  assert.ok(findItem(items, '表示する文'), 'style の content が取れていない');
  assert.equal(stats.unaccounted, 0);
});

test('CSS: content の見える文字だけを取り、他の宣言は text にしない', () => {
  const css = `.x{color:red;content:"見出しの文"}.y::after{content:'続き'}`;
  const { items, skipped } = extractCssSource({ file: 'src/x.css', content: css });
  assert.deepEqual(items.map((i) => i.text), ['見出しの文', '続き']);
  assert.deepEqual(skipped, []);
});

test('scene: 4つの必須場面は JSON path / 関数名の規則だけで決まる', () => {
  assert.deepEqual(
    ['viola', 'charsel', 'intro', 'start'].map((s) => SCENES[s].required),
    [true, true, true, true]
  );
  const cases = [
    [{ file: 'src/manuscript.js', sourcePath: 'M7Manuscript.guide.sections[0].lines[0].text' }, 'viola'],
    [{ file: 'src/manuscript.js', sourcePath: 'M7Manuscript.documents.intro.body' }, 'intro'],
    [{ file: 'src/manuscript.js', sourcePath: 'M7Manuscript.readings.R00.lines[2].text' }, 'start'],
    [{ file: 'src/app.js', sourcePath: 'CHARSEL_T.PC1.bio', rootName: 'charSelect' }, 'charsel'],
    [{ file: 'src/app.js', sourcePath: 'x', rootName: 'startParty' }, 'start'],
    [{ file: 'src/app.js', sourcePath: 'x', rootName: 'violaLine' }, 'viola'],
    [{ file: 'src/manuscript.js', sourcePath: 'M7Manuscript.cards.C1.text' }, 'card'],
    [{ file: 'src/manuscript.js', sourcePath: 'M7Manuscript.ho.PC1.title' }, 'ho'],
    [{ file: 'assets/ls_pre/P3/lines_p3pre.js', sourcePath: 'LINES.C1.narr' }, 'lines_lspre'],
  ];
  for (const [item, want] of cases) assert.equal(assignScene(item).scene, want, JSON.stringify(item));
});

test('buildGameText: 必須項目と件数の形（fixture だけで）', () => {
  const out = buildGameText({
    commit: DEFAULT_COMMIT,
    generatedAt: '2026-01-01T00:00:00.000Z',
    files: [{ path: 'src/fixture.js', content: FIXTURE, decision: { include: true, role: 'runtime_source' } }],
  });
  assert.equal(out.data.commit, DEFAULT_COMMIT);
  assert.equal(out.data.generatedAt, '2026-01-01T00:00:00.000Z');
  assert.ok(Array.isArray(out.data.items) && out.data.items.length > 0);
  for (const it of out.data.items) {
    for (const k of ['id', 'scene', 'file', 'kind', 'speaker', 'text']) {
      assert.equal(typeof it[k], 'string', `${it.id} の ${k} が文字列でない`);
    }
    assert.ok(it.category, `${it.id} に category が無い`);
    assert.ok(it.sourcePath, `${it.id} に sourcePath が無い`);
    assert.ok(it.loc && it.loc.line > 0, `${it.id} に loc が無い`);
  }
  assert.equal(out.coverage.totals.unaccounted, 0);
  assert.ok(Array.isArray(out.coverage.files) && out.coverage.files.length === 1);
  assert.ok(out.coverage.skipReasons && Object.keys(out.coverage.skipReasons).length > 0);
});

test('buildGameText: 除外ファイルは『読んだが数えない』理由付きで残す', () => {
  const out = buildGameText({
    commit: DEFAULT_COMMIT,
    generatedAt: '2026-01-01T00:00:00.000Z',
    files: [
      { path: 'src/fixture.js', content: FIXTURE, decision: { include: true, role: 'runtime_source' } },
      { path: 'dist/app.js', content: FIXTURE, decision: { include: false, role: 'build_artifact', reason: 'build_artifact_duplicate' } },
    ],
  });
  const dist = out.coverage.files.find((f) => f.path === 'dist/app.js');
  assert.ok(dist);
  assert.equal(dist.decision, 'exclude');
  assert.equal(dist.reason, 'build_artifact_duplicate');
  assert.equal(out.data.items.some((i) => i.file === 'dist/app.js'), false);
});

// ---- 実物（pinned commit だけ） -------------------------------------------

const GAME = process.env.M7_GAME || DEFAULT_GAME;
const REAL = fs.existsSync(GAME);

const INTAKE_JP = {
  'src/manuscript.js': 4833,
  'src/app.js': 1635,
  'src/data.js': 1999,
  'src/engine.js': 638,
  'src/board.js': 74,
  'src/roomplans.js': 92,
};

let realOut = null;
function real() {
  if (!realOut) {
    realOut = buildGameText({
      commit: DEFAULT_COMMIT,
      generatedAt: '2026-11-16T00:00:00.000Z',
      gameDir: GAME,
    });
  }
  return realOut;
}

test('real: commit は pinned で、必須4場面に文字がある', { skip: !REAL }, () => {
  const { data } = real();
  assert.equal(data.commit, DEFAULT_COMMIT);
  assert.equal(data.commitShort, 'fb478cf');
  for (const s of ['viola', 'charsel', 'intro', 'start']) {
    assert.ok(data.counts.byScene[s] > 0, `${s} が 0 件`);
  }
});

test('real: ヴィオラは M.guide の12節すべてを出典つきで含む', { skip: !REAL }, () => {
  const { data } = real();
  const secs = new Set();
  for (const it of data.items) {
    if (it.file !== 'src/manuscript.js') continue;
    const m = /^M7Manuscript\.guide\.sections\[(\d+)\]/.exec(it.sourcePath);
    if (m) secs.add(Number(m[1]));
  }
  assert.equal(secs.size, 12, 'guide の節数が12でない: ' + [...secs].join(','));
  assert.ok(data.items.some((i) => i.scene === 'viola' && i.kind === 'line'));
});

test('real: 全 item は出典の raw に実在し、静的文は decoded 値と一致する', { skip: !REAL }, () => {
  const { data, sources } = real();
  for (const it of data.items) {
    const src = sources.get(it.file);
    assert.ok(src, '出典が読めない: ' + it.file);
    assert.ok(src.includes(it.sourceRaw), `raw が見つからない: ${it.id}`);
    for (const f of it.fragments) {
      assert.ok(src.includes(f.raw), `fragment raw が見つからない: ${f.id}`);
      if (f.jsKind) {
        const decoded = f.jsKind === 'template' ? decodeJsBody(f.raw) : decodeJsString(f.raw);
        assert.equal(decoded, f.text, `escape 不一致: ${f.id}`);
      }
    }
  }
});

test('real: 分母 9272 とファイル別の日本語文字列数が intake と一致する', { skip: !REAL }, () => {
  const { coverage } = real();
  for (const [file, want] of Object.entries(INTAKE_JP)) {
    const f = coverage.files.find((x) => x.path === file);
    assert.ok(f, file + ' が無い');
    assert.equal(f.units.jpLiterals, want, `${file}: intake ${want} / 実測 ${f.units.jpLiterals}`);
  }
  const html = coverage.files.find((x) => x.path === 'src/index.html');
  assert.equal(html.units.jpLiterals, 1);
  assert.equal(coverage.denominator.core.measured, 9272);
  assert.equal(coverage.denominator.core.expected, 9272);
  assert.equal(coverage.denominator.core.match, true);
});

test('real: 連結は 531 リテラル（intake 実測）と一致し、テンプレートは実測 0', { skip: !REAL }, () => {
  const { coverage } = real();
  const app = coverage.files.find((x) => x.path === 'src/app.js');
  assert.equal(app.units.concatParentLiterals, 531);
  assert.ok(app.units.dynamicGroups > 300);
  assert.equal(app.units.templateLiterals, 0, 'app.js にテンプレートリテラルは無い（intake の 2 は誤り）');
});

test('real: どの文字も fragment か skip のどちらかで、unaccounted は 0', { skip: !REAL }, () => {
  const { coverage } = real();
  assert.equal(coverage.totals.unaccounted, 0);
  assert.ok(coverage.totals.literalNodes > 30000);
  const reasons = coverage.skipReasons;
  assert.ok(reasons.code_identifier.count > 1000);
  for (const [name, r] of Object.entries(reasons)) {
    assert.ok(r.meaning && r.meaning.length > 0, name + ' に意味が無い');
  }
  assert.equal(coverage.unknownScenes, 0);
});

test('real: 同じ文でも別の出典なら別 item（勝手に dedup しない）', { skip: !REAL }, () => {
  const { data } = real();
  const byTextMap = new Map();
  for (const it of data.items) {
    if (!byTextMap.has(it.text)) byTextMap.set(it.text, []);
    byTextMap.get(it.text).push(it);
  }
  const dup = [...byTextMap.values()].find((l) => l.length > 1 && new Set(l.map((x) => x.sourcePath)).size > 1);
  assert.ok(dup, '同じ文の別出典が1件も無い（取り方が怪しい）');
  assert.ok(new Set(dup.map((x) => x.id)).size === dup.length);
  assert.equal(new Set(data.items.map((x) => x.id)).size, data.items.length, 'id が重複している');
});

test('real: 出典は git ls-tree で枚挙し、除外も理由付きで残す', { skip: !REAL }, () => {
  const list = listGameTextSources(GAME, DEFAULT_COMMIT);
  assert.ok(list.length > 30);
  const dist = list.find((f) => f.path === 'dist/app.js');
  assert.equal(dist.include, false);
  assert.equal(dist.reason, 'build_artifact');
  const review = list.find((f) => f.path.startsWith('src/review-'));
  assert.equal(review.include, false);
  assert.equal(review.reason, 'author_tool');
  const scripts = list.find((f) => f.path.startsWith('scripts/'));
  assert.equal(scripts.include, false);
  assert.equal(scripts.reason, 'build_script');
  for (const f of list.filter((x) => x.include)) {
    assert.ok(/\.(js|mjs|html|css)$/.test(f.path), ' runtime 収録元の拡張子が変: ' + f.path);
    assert.ok(!f.path.includes('private/'), 'private を読んではいけない');
  }
});

test('real: text に生の HTML タグを入れない（markup は見える文字だけ）', { skip: !REAL }, () => {
  const { data } = real();
  const bad = data.items.filter((i) => /<[a-zA-Z][\w:-]*[\s>/]/.test(i.text));
  assert.deepEqual(bad.map((i) => i.id).slice(0, 5), []);
  const markup = data.items.filter((i) => i.kind === 'markup');
  assert.ok(markup.length > 0);
  assert.ok(markup.every((i) => typeof i.markup.html === 'string' && i.markup.html.includes('<')));
});

test('real: 1場面・1ファイルで読める views があり、範囲は items と一致する', { skip: !REAL }, () => {
  const { data } = real();
  const sceneViews = data.views.filter((v) => v.id.startsWith('scene:'));
  const fileViews = data.views.filter((v) => v.id.startsWith('file:'));
  for (const s of data.scenes) {
    assert.ok(sceneViews.some((v) => v.scene === s.id), 'scene view が無い: ' + s.id);
    for (const f of s.files) {
      assert.ok(data.views.some((v) => v.id === `scene-file:${s.id}:${f.file}`), 'scene-file view が無い: ' + s.id + '/' + f.file);
    }
  }
  assert.equal(fileViews.length, new Set(data.items.map((i) => i.file)).size);
  for (const v of data.views) {
    if (v.scene) {
      for (let k = v.from; k < v.to; k++) assert.equal(data.items[k].scene, v.scene);
    }
    if (v.file) {
      const segs = v.segments || [{ from: v.from, to: v.to }];
      let n = 0;
      for (const s of segs) {
        for (let k = s.from; k < s.to; k++) {
          assert.equal(data.items[k].file, v.file);
          n++;
        }
      }
      assert.equal(n, v.count);
    }
  }
});

test('real: 場面の一覧と代表例を出せる（親が g-<scene> を登録するため）', { skip: !REAL }, () => {
  const { data } = real();
  assert.ok(Array.isArray(data.scenes) && data.scenes.length >= 8);
  for (const s of data.scenes) {
    assert.ok(s.id && s.title && typeof s.count === 'number');
    assert.equal(s.count, data.counts.byScene[s.id] || 0);
  }
  const viola = data.scenes.find((s) => s.id === 'viola');
  assert.equal(viola.required, true);
  assert.ok(viola.samples.length > 0 && viola.samples.length <= 5);
  assert.ok(viola.samples[0].text.length > 0);
  assert.ok(Array.isArray(data.views) && data.views.length >= data.scenes.length);
});
