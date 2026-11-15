// 70 作者用INDEX：生成ページの材料（tools/build.mjs から呼ぶ純関数の集まり）
//
// 作るもの（作者の指示 2026-11-15）:
//   1. 訂正済みの箇所（n-fixed）  … 今回の原稿の変更を「変更前 → 変更後」の全文で並べ、反映後へリンクする
//   2. 疑問・矛盾・気になる所（n-questions）… 未確定（原稿の注・ゲーム資料）と、実装/撮影の差分を分ける
//   3. ゲームの全文字（g-<scene>）… data/game-text.json（T3 が作る）を場面ごとに分けて載せる
//
// 決めたこと:
//   - 数は手で書かない。渡された生成元（changes / tests / notes / D1 / game-text）から数える。宣言値と実数が
//     食い違ったら、実数を出しつつ declared.ok=false を残す（黙って丸めない）。
//   - 文字はすべて esc() してから出す（<script> をタグにしない）。本文は可視の文字、出典・ID・連結式は
//     details + code に逃がす。
//   - 現物（data/game-text.json・media/gameview-next/manifest.json）がまだ無いときは、勝手に空のページを作らず
//     fail-close（呼び出し側が理由つきで止まる）。旧 manifest へは落ちたことを記録して落ちる。
//   - 原稿（05_完成版）・ゲーム・D1 へは書かない。読むだけ。
import fs from 'node:fs';

export const SCHEMAS = {
  fixed: 'dom-author-fixed-v1',
  questions: 'dom-author-questions-v1',
  gameText: ['dom-game-text-v1', 'dom-game-text'],
};

// ---------- 文字 ----------
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
const unesc = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
// タグを落としてから実体参照を戻し、空白を除く（本文の検索用。順番を逆にすると <script> がタグとして消える）
export function norm(s) {
  return unesc(String(s == null ? '' : s).replace(/<[^>]*>/g, '')).replace(/\s+/g, '');
}
const pre = (s) => `<pre><code>${esc(s)}</code></pre>`;
const oneLine = (s, n = 60) => {
  const t = String(s || '')
    .replace(/【[^】]{0,60}】/g, '')       // 印は要約では落とす（本文の details には全文が出る）
    .replace(/^\s*[|>#-]+/, '')           // 表の区切り・引用の印
    .replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
};
const iso = (d) => (d instanceof Date ? d.toISOString() : String(d || ''));
const baseName = (f) => String(f == null ? '' : f).split('/').pop();

// ---------- 0b. 本文として読めるか／条件で変わる技術資料か（2026-11-16 可読性の修復） ----------
// 作者から見て「1件目が {{dgShade('PC2','avatar gd-av')}} ヴィオラ {{inline(text||'')}}」だと、
// 本文ではなくコードの一覧に見える。**中身は1件も捨てず**、読める文を先に、条件で変わる組み立て
// （{{…}} の型・コードの断片）を後ろの「たたんだ資料」に回す。
// 字は1字も変えない（escape して原文のまま置く）。件数（ID）も減らさない。
export const KIND_LABELS = {
  line: '台詞', narration: '地の文', speaker: '話者', label: '見出し', note: '補足', title: '題',
  button: 'ボタン', text: '文言', markup: '動的表示', screen: '画面', key: '項目名', doc: '資料',
  engine: '仕組み', card: 'カード', error: 'エラー', asset: '素材', ho: 'HO', room: '部屋', room_ls: '部屋',
  board: '盤面', placeholder: '記入例', attr: '補足', disgord: 'Disgord', craft: '作成', call: '呼び出し',
  option: '選択肢', condition: '条件', tutorial: '説明', rule: 'ルール', question: '問い', log: 'ログ',
  content: '内容', html: '画面', hidden: '非表示',
};
// 英語の kind を見出しにそのまま出さない（元の kind は出典 details に残す）
export function kindLabel(kind) { return KIND_LABELS[String(kind == null ? '' : kind)] || 'その他'; }

// {{ … }} を、中の { } の入れ子を数えながら落とす（function(){…} を含む型でも外の文字だけ残る）
export function stripTemplates(s) {
  const t = String(s == null ? '' : s);
  let out = '';
  let i = 0;
  while (i < t.length) {
    const j = t.indexOf('{{', i);
    if (j < 0) { out += t.slice(i); break; }
    out += t.slice(i, j);
    let d = 0; let k = j;
    for (; k < t.length; k++) {
      if (t[k] === '{') d += 1;
      else if (t[k] === '}') { d -= 1; if (d <= 0) { k += 1; break; } }
    }
    i = k;
  }
  return out;
}

// 見える文（＝作者が読める字）が残るか。タグ・型・記号だけの行は本文にしない
export function visibleProse(text) {
  const s = stripTemplates(text)
    .replace(/<[^>]*>/g, ' ')                 // HTML のタグ
    .replace(/&[a-z#0-9]+;/gi, ' ')           // 実体参照
    .replace(/[\s'"`{}()[\];:,.|/+*=<>~!?\\-]+/g, ' ');   // 組み立ての記号
  return /[\p{L}\p{N}]{2,}/u.test(s);
}

// 本文に出さず、たたんだ資料に入れる行か
export function isCodeRow(it) {
  if (!it) return true;
  const t = String(it.text == null ? '' : it.text);
  if (!t.trim()) return true;
  if (it.kind === 'markup' || it.dynamic === true || String(it.textKind || '') === 'dynamic') return true;
  // 差し込み（{{…}}）を含む行は、外に読める字が残っていても本文には出さない（画面の条件で変わる表示）
  if (/\{\{|\}\}/.test(t)) return true;
  return !visibleProse(t);
}

// 並びの順位：0＝原稿（src/manuscript.js）の静的な文、1＝ほかの静的な文、3＝たたむ資料
// 同じ順位の中は元の順（発話順・出所順）をそのまま保つ
export function readRank(it) {
  if (isCodeRow(it)) return 3;
  return /manuscript\.js$/.test(String((it && it.file) || '')) ? 0 : 1;
}
export function sortReadableFirst(items) {
  return (items || [])
    .map((it, i) => ({ it, i, r: readRank(it) }))
    .sort((a, b) => (a.r - b.r) || (a.i - b.i))
    .map((x) => x.it);
}

// ---------- 1. 訂正済み：数の集計 ----------
// changes: 69/source/changes_before_after.json（{files_changed, units, changes[]}）
// ledger : 69/source/source_ledger_new.json（{counts:{files,changed,unchanged}}）
// tests  : 69/source/tests.json（{total,passed,failed,changed_files[]}）
// notes  : content/_creator_notes.json（{counts, notes[]}）
// d1     : 70/memos_before70.json（{memos[]}）
export function summarizeChanges({ changes, ledger, tests, notes, d1 }) {
  const chs = Array.isArray(changes && changes.changes) ? changes.changes : [];
  const files = [...new Set(chs.map((c) => c.file))];
  const ops = {};
  for (const c of chs) ops[c.op] = (ops[c.op] || 0) + 1;
  const declared = {
    files: changes && changes.files_changed != null ? changes.files_changed : null,
    units: changes && changes.units != null ? changes.units : null,
  };
  declared.ok = declared.files === files.length && declared.units === chs.length;
  const noteList = (notes && notes.notes) || [];
  const noteCount = (st) => noteList.filter((n) => n.state === st).length;
  const memos = (d1 && d1.memos) || [];
  const isEditDel = (r) => r.character === 'edit' || r.character === 'del' || r.character === 'del-sec';
  const resolved = memos.filter((r) => r.resolved && isEditDel(r));
  const byPage = {};
  for (const r of resolved) {
    const p = String(r.page_id || '').replace(/^rv1-/, '');
    byPage[p] = byPage[p] || { pageId: p, edit: 0, del: 0, 'del-sec': 0, total: 0 };
    byPage[p][r.character] += 1; byPage[p].total += 1;
  }
  return {
    files: files.length, units: chs.length, ops, declared,
    changedFiles: files,
    ledger: (ledger && ledger.counts) || null,
    verified: { total: (tests && tests.total) || 0, passed: (tests && tests.passed) || 0, failed: (tests && tests.failed) || 0 },
    notes: { total: noteList.length, fixed: noteCount('fixed'), open: noteCount('open') },
    d1: {
      active: memos.length,
      resolvedEditDel: resolved.length,
      resolvedEdit: resolved.filter((r) => r.character === 'edit').length,
      resolvedDel: resolved.filter((r) => r.character === 'del').length,
      resolvedDelSec: resolved.filter((r) => r.character === 'del-sec').length,
      unresolved: memos.filter((r) => !r.resolved).length,
      unresolvedList: memos.filter((r) => !r.resolved).map((r) => ({ id: r.id, pageId: String(r.page_id || '').replace(/^rv1-/, ''), section: r.section_id, character: r.character || '(なし)' })),
      byPage: Object.values(byPage).sort((a, b) => b.total - a.total || a.pageId.localeCompare(b.pageId)),
    },
  };
}

// ページの html から、文字 → いちばん近い data-a を引ける索引を作る
export function indexPages(pages) {
  const bySource = new Map();
  const byBase = new Map();
  const byId = new Map();
  for (const p of pages || []) {
    byId.set(p.id, p);
    if (p.source) {
      if (!bySource.has(p.source)) bySource.set(p.source, []);
      bySource.get(p.source).push(p);
      const base = String(p.source).split('/').pop();
      if (!byBase.has(base)) byBase.set(base, []);
      byBase.get(base).push(p);
    }
  }
  const cached = new Map();
  const anchorsOf = (p) => {
    if (cached.has(p.id)) return cached.get(p.id);
    const html = String(p.html || '');
    // 「文字（タグを落としたもの）」と「その位置の近くの data-a」を作る
    const re = /<[^>]*>/g;
    let last = 0; let m; let cur = '';
    const chars = []; const ids = [];
    // 実体参照は1文字に戻しつつ、位置の対応（文字 → 近くの data-a）を崩さない
    const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };
    const pushText = (t) => {
      let i = 0;
      while (i < t.length) {
        const e = /^&(amp|lt|gt|quot|#39);/.exec(t.slice(i));
        if (e) { chars.push(ENT[e[1]]); ids.push(cur); i += e[0].length; continue; }
        chars.push(t[i]); ids.push(cur); i += 1;
      }
    };
    while ((m = re.exec(html))) {
      pushText(html.slice(last, m.index));
      const da = /data-a="([^"]*)"/.exec(m[0]);
      if (da) cur = da[1];
      last = m.index + m[0].length;
    }
    pushText(html.slice(last));
    const text = chars.join('');
    const flat = []; const map = [];
    for (let i = 0; i < text.length; i++) if (!/\s/.test(text[i])) { flat.push(text[i]); map.push(i); }
    const rec = { needle: flat.join(''), map, ids, chars };
    cached.set(p.id, rec);
    return rec;
  };
  // text（原稿の文）が、そのページのどこにあるか。hits は同じ文のか所数
  // 原稿の文に <…> が入っていることがある（HTMLの実体参照を戻しただけの文）ので、
  // タグを落とす前の形でも探す。どちらも無ければ「無い」と返す（勝手に近い所へ結ばない）。
  const findIn = (p, text) => {
    const rec = anchorsOf(p);
    const variants = needles(text);
    for (const want of variants) {
      let at = rec.needle.indexOf(want);
      if (at < 0) continue;
      let hits = 0; let i = at;
      while (i >= 0) { hits++; i = rec.needle.indexOf(want, i + 1); }
      return { anchor: rec.ids[rec.map[at]] || '', hits };
    }
    return { anchor: '', hits: 0 };
  };
  return { byId, bySource, byBase, findIn, anchorsOf };
}

// 原稿の1か所（before/after の行の集まり）から、本文で探す文字の候補を作る。
// 表の行（| a | b |）・見出し（##）・箇条書き（-）・強調（**…**）は、そのままでは HTML の本文に無いので、
// セル／行の中身も候補にする。長いものから試す（短すぎる候補は誤爆するので 8 文字以上）。
export function needles(text) {
  const out = [];
  const flat = (s) => String(s || '').replace(/\s+/g, '');
  const add = (s) => { const t = flat(s); if (t && t.length >= 6 && !out.includes(t)) out.push(t); };
  const strip = (s) => String(s || '')
    .replace(/【[^】]{0,80}】/g, '')        // 【GM】【作者修正】【2026-11-07 …】の印は、組み立てで別の要素になる
    .replace(/\*\*|__|`|~~|\|/g, ' ');    // 強調・コード・表の区切り
  const raw = String(text || '');
  add(raw);                       // まず原文のまま
  add(norm(raw));                 // タグを落とした形
  add(strip(raw));                // 印・強調・表の区切りを外した形
  const parts = [];
  for (const line of raw.split('\n')) {
    const l = line.replace(/^\s*(#{1,6}\s*|[-*+]\s+|>\s*)/, '');
    parts.push(l, strip(l));
    for (const cell of l.split('|')) parts.push(cell, strip(cell));
  }
  // 文単位（長いものから）。印を外すと一致することが多い
  for (const s of raw.split(/[。\n]/)) parts.push(s, strip(s));
  const cand = parts.map((s) => s.trim()).filter((s) => flat(s).length >= 10)
    .sort((a, b) => flat(b).length - flat(a).length);
  for (const c of cand) {
    add(c); add(strip(c));
    const t = flat(strip(c));
    if (t.length > 32) add(t.slice(0, 32));   // 長すぎる文は頭だけでも探す（最後の手段）
  }
  return out;
}

// ---------- 1b. 訂正済みページ（Markdown） ----------
// pages: build が組み上げたページ（{id, nav, source, html}）。source は content/ からの相対
// mapAfter: 変更後の文 → どのページのどのアンカーか。既定は pages の source 一致 + 本文検索
export function buildFixedPage({ changes, ledger, tests, notes, d1, pages, gameCommit, generatedAt, sourceRoot, night }) {
  const S = summarizeChanges({ changes, ledger, tests, notes, d1 });
  const ix = indexPages(pages || []);
  const root = String(sourceRoot || '');
  const chs = (changes && changes.changes) || [];
  const units = [];
  for (let i = 0; i < chs.length; i++) {
    const c = chs[i];
    const rel = '完成版/' + String(c.file || '').replace(/^.*?05_完成版\//, '');
    const base = String(c.file || '').split('/').pop();
    let cand = ix.bySource.get(rel) || ix.bySource.get(String(c.file)) || [];
    let via = 'source';
    // 配布版（プレイヤー配布/…）はサイトにGM版だけを載せているので、同じ名前のファイルのページへ結ぶ（同じ本文）
    if (!cand.length) { cand = ix.byBase.get(base) || []; via = 'basename'; }
    let pageId = ''; let anchor = ''; let hits = 0; let whyMissing = '';
    const afterText = (c.after || []).join('\n');
    if (c.op === 'delete' || !afterText.trim()) {
      whyMissing = '反映後の文がページ本文に無い（削除・改稿で消えた）';
      via = '';
    } else {
      for (const p of cand) {
        const r = ix.findIn(p, afterText);
        if (r.anchor) { pageId = p.id; anchor = r.anchor; hits = r.hits; break; }
      }
      if (!pageId) { via = ''; whyMissing = cand.length ? '反映後の文がページ本文に無い（表の組み方・改行の違い）' : 'この原稿ファイルを表示しているページが無い'; }
    }
    units.push({
      no: i + 1, file: c.file, op: c.op, pageId, anchor, hits, via,
      href: pageId && anchor ? `#/${pageId}/${anchor}` : '',
      whyMissing, rawSource: root ? root.replace(/\/$/, '') + '/' + c.file : '',
      before: (c.before || []).join('\n'), after: afterText,
    });
  }
  const byFile = [];
  for (const f of S.changedFiles) {
    const us = units.filter((u) => u.file === f);
    byFile.push({ file: f, units: us, count: us.length, linked: us.filter((u) => u.href).length });
  }
  // ---------- 0. 今夜（2026-11-16）の直し ----------
  // night: tools/night-changes.mjs が作る data/n16-changes.json（控えと今の原稿の行の差分・作者の直し35件）
  // ここでも、リンクは「反映後の文」をページ本文から探して data-a を引く（見つからなければ理由を書く）。
  const nightFiles = [];
  const nightMemos = [];
  let nightUnitCount = 0;
  if (night && Array.isArray(night.files)) {
    for (const f of night.files) {
      const rel = '完成版/' + String(f.file || '');
      const base = String(f.file || '').split('/').pop();
      let cand = ix.bySource.get(rel) || [];
      let via = 'source';
      if (!cand.length) { cand = ix.byBase.get(base) || []; via = 'basename'; }
      const units = [];
      for (const u of f.units || []) {
        const afterText = (u.after || []).join('\n');
        let pageId = ''; let anchor = ''; let hits = 0; let whyMissing = '';
        if (!afterText.trim()) whyMissing = '反映後の文が無い（削除）';
        else {
          for (const pg of cand) {
            const rr = ix.findIn(pg, afterText);
            if (rr.anchor) { pageId = pg.id; anchor = rr.anchor; hits = rr.hits; break; }
          }
          if (!pageId) { via = ''; whyMissing = cand.length ? '反映後の文がページ本文に無い（表の組み方・改行の違い）' : 'この原稿ファイルを表示しているページが無い'; }
        }
        units.push({ op: u.op, lineBefore: u.lineBefore, pageId, anchor, hits, via, whyMissing,
          href: pageId && anchor ? `#/${pageId}/${anchor}` : '',
          before: (u.before || []).join('\n'), after: afterText });
      }
      nightUnitCount += units.length;
      nightFiles.push({ file: f.file, status: f.status || 'changed', units, count: units.length, linked: units.filter((u) => u.href).length });
    }
    // 作者の直し35件の「この場所」：D1 の section_id は、いまのビルドの data-a と一致しない（作り方が違う）。
    // そこで、今夜の差分の「変更前」に注の文（削除の注は見出しの文）が入っているかを手がかりに、実際のアンカーへ結ぶ。
    // 結べないときは、ページの頭へ。勝手に別の場所へ結ばない。
    const normKey = (s) => norm(s);
    for (const m of night.memos || []) {
      const pg = ix.byId.get(m.pageId);
      const content = String(m.content || '').trim();
      const isDel = /^(削除|全て削除|全削除)$/.test(content);
      const raw = isDel ? String(m.title || '').split('｜').slice(1).join('｜') : content;
      // 注の文は複数行のことが多い。1行ずつ（長い行から）当てる。1行でも見つかれば、その変更の場所へ結ぶ。
      const keys = String(raw || '').split('\n').map(normKey).filter((k) => k.length >= 10).sort((a, b) => b.length - a.length);
      let hit = null; let hitFile = '';
      for (const key of keys) {
        for (const f of nightFiles) {
          for (const u of f.units) {
            if (normKey(u.before).includes(key) || normKey(u.after).includes(key)) { hit = u; hitFile = f.file; break; }
          }
          if (hit) break;
        }
        if (hit) break;
      }
      // 差分に無いときは、いまのページ本文に注の文（1行）を探す（作者の直しが、そのまま残っている行）
      let pageAnchor = ''; let pageHits = 0;
      if (!(hit && hit.href) && pg) {
        for (const key of keys) {
          for (const line of String(raw).split('\n')) {
            if (normKey(line) !== key) continue;
            const rr = ix.findIn(pg, line);
            if (rr.anchor) { pageAnchor = rr.anchor; pageHits = rr.hits; break; }
          }
          if (pageAnchor) break;
        }
      }
      const href = hit && hit.href ? hit.href : (pageAnchor ? `#/${m.pageId}/${pageAnchor}` : (pg ? `#/${m.pageId}` : ''));
      nightMemos.push({ ...m, isDel, href, via: hit && hit.href ? 'diff' : (pageAnchor ? 'page-text' : (hit ? 'diff-unlinked' : 'page')),
        pageNav: pg ? pg.nav : '', pageExists: !!pg, diffFile: hitFile,
        note: (hit && hit.href) || pageAnchor ? '' : (isDel ? '削除したので、その場所はいま空（ページの頭へ）' : 'この文は、原稿のどこにも見つからない（作者の文と、原稿に入った文が違う可能性）') });
    }
  }
  const hasNight = nightUnitCount > 0 || nightMemos.length > 0;
  const nightLinked = nightFiles.reduce((n, f) => n + f.linked, 0);
  const s = S;
  const L = [];
  // 日付は日本時間で出す（UTC のままだと、夜の作業が前の日付になる）
  const jstDate = generatedAt ? new Date(generatedAt).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }) : '';
  L.push(`# 訂正済みの箇所（${jstDate}）`, '');
  L.push(':::note このページの読み方');
  L.push('**今回すでに直した所**の記録。本文（左の原稿のページ）とも、[疑問・矛盾・気になる所](#/n-questions)とも別のページ。');
  L.push(`- 原稿の変更：**${s.files} ファイル / ${s.units} か所**（変更前 → 変更後の全文は [2 節](#/n-fixed/full-changes)）`);
  L.push(`- 原稿の検証：**${s.verified.passed} / ${s.verified.total} 合格**（不合格 ${s.verified.failed}）`);
  L.push(`- 作者の注：確定 **${s.notes.fixed}** 件／未確定 **${s.notes.open}** 件（未確定は疑問のページ）`);
  L.push(`- 共有保存（D1）で resolved になった edit/del：**${s.d1.resolvedEditDel}** 行。**これはDBの状態で、原稿への反映とは別**（下の 4 節）`);
  L.push(`- ゲームの基準：\`${esc(gameCommit || '(未取得)')}\``);
  if (hasNight) L.push(`- **今夜（2026-11-16）の直し**：原稿 ${nightFiles.filter((f) => f.count).length} ファイル / ${nightUnitCount} か所。作者の直し **${nightMemos.length} 件**の反映先へ飛べる（[0 節](#/n-fixed/night-16)）`);
  if (!s.declared.ok) L.push(`- ⚠ 変更データの宣言値（${s.declared.files} ファイル / ${s.declared.units} か所）と実数（${s.files} / ${s.units}）が違う。**実数を出している**`);
  L.push(':::', '');
  L.push('<!--vis:make-->', '');
  // 0. 今夜（2026-11-16）の直し：作者の直し35件の反映先と、原稿の変更（今夜の分）
  if (hasNight) {
    const KINDS = { edit: '直す', del: '削除', 'del-sec': '節ごと削除' };
    L.push('<p data-a="night-16"><b>0. 今夜（2026-11-16）の直し</b>：作者が INDEX に付けた直しの反映先と、今夜の原稿の変更。下の 2 節（11/14→11/15 の分）とは別の節。</p>', '');
    L.push(`## 0. 今夜（2026-11-16）の直し（原稿 ${nightFiles.filter((f) => f.count).length} ファイル・${nightUnitCount} か所／作者の直し ${nightMemos.length} 件）`, '');
    L.push(':::note この節の読み方');
    L.push('- 上（0-1）が**作者の直し 35 件**。押すと、その文がある（あった）ページの位置へ飛ぶ。');
    L.push('- 下（0-2）が**今夜の原稿の変更**。色々な変更をまとめて、ファイル別に「変更前 → 変更後」で出している。');
    L.push('- 「結果」の列は、包B（原稿担当）の一覧 `B_CHANGES_20261116.md` の列をそのまま写している（こちらで判定していない）。');
    L.push(':::');
    L.push('');
    // 0-1. 作者の直し35件
    L.push(`### 0-1. 作者の直し（${nightMemos.length} 件）と反映先`, '');
    L.push('| # | 直し | ページ | 何を | 結果（包Bの一覧から） | この場所 |', '|---|---|---|---|---|---|');
    nightMemos.forEach((m, i) => {
      const isDel = /^(削除|全て削除|全削除)$/.test(String(m.content || '').trim());
      const what = oneLine(isDel ? String(m.title || '').split('｜').slice(1).join('｜') : m.content, 40);
      const mark = m.via === 'diff' || m.via === 'page-text' ? '' : (m.note ? `（${m.note}）` : '');
      L.push(`| ${i + 1} | <code>${esc(m.short)}</code> | ${m.pageExists ? esc(m.pageNav) : `<code>${esc(m.pageId)}</code>（今のページに無い）`} | ${esc(KINDS[m.character] || m.character || '（種類なし）')}：${esc(what)} | ${esc(m.result || '—')} | ${m.href ? `<a href="${esc(m.href)}">開く</a>${mark}` : `（ページが無い）${mark}`} |`);
    });
    L.push('');
    // 0-2. 今夜の原稿の変更（ファイル別）
    L.push(`### 0-2. 今夜の原稿の変更（${nightFiles.filter((f) => f.count).length} ファイル・${nightUnitCount} か所・リンク ${nightLinked}）`, '');
    L.push('控え `work/backup_20261116/05_完成版_0230` と、いまの `05_完成版` の行の差分。作り直すとき：`node tools/night-changes.mjs`（原稿は読むだけ）。', '');
    for (const f of nightFiles) {
      if (!f.count) continue;
      L.push(`#### ${esc(baseName(f.file))}（${f.count} か所${f.linked ? `・リンク ${f.linked}` : ''}）`, '');
      L.push(`<details class="note meta"><summary>出典（原稿のファイル）</summary><code>${esc(f.file)}</code></details>`, '');
      for (const u of f.units) {
        const head = `${u.op === 'delete' ? '削除' : u.op === 'insert' ? '追加' : '置き換え'}｜${oneLine(u.after || u.before, 44)}`;
        L.push(`<details class="fixunit"><summary>${esc(head)}</summary>`);
        L.push(`<p><b>この場所</b>：${u.href ? `<a href="${esc(u.href)}">${esc((ix.byId.get(u.pageId) || {}).nav || u.pageId)}</a>` : esc(u.whyMissing || 'リンクなし')}${u.hits > 1 ? `（同じ文が ${u.hits} か所。最初の1つに結んだ）` : ''}</p>`);
        L.push(`<p><b>原稿</b>：<code>${esc(f.file)}</code>（変更前の ${u.lineBefore} 行目あたり）</p>`);
        L.push('<p>変更前</p>', pre(u.before || '(なし)'), '<p>変更後</p>', pre(u.after || '(なし)'));
        L.push('</details>', '');
      }
    }
  }
  // 1. 数（機械の集計。本文ではないので、既定で閉じた details に畳む）
  L.push('## 1. 数（生成元から集計）', '');
  L.push('数の内訳は、たたんだ「数の出どころ」に置いてある（機械の集計で、本文ではない）。', '');
  L.push('<details class="note meta"><summary>数の出どころ（機械集計・内訳）</summary>', '');
  L.push('| 見る所 | 数 | 出どころ |', '|---|---:|---|');
  L.push(`| 変更したファイル | ${s.files} | changes_before_after.json（一意の file） |`);
  L.push(`| 変更したか所 | ${s.units} | changes_before_after.json（changes の件数） |`);
  L.push(`| 　内訳 | ${Object.entries(s.ops).map(([k, v]) => `${esc(k)} ${v}`).join('／')} | 同上 |`);
  if (s.ledger) L.push(`| 原稿全体のファイル | ${s.ledger.files}（変更 ${s.ledger.changed}／不変 ${s.ledger.unchanged}） | source_ledger_new.json |`);
  L.push(`| 検証 | ${s.verified.passed} / ${s.verified.total} 合格（不合格 ${s.verified.failed}） | tests.json |`);
  L.push(`| 作者の注 | 確定 ${s.notes.fixed}／未確定 ${s.notes.open}（計 ${s.notes.total}） | content/_creator_notes.json |`);
  L.push(`| 共有保存（D1）の生きている行 | ${s.d1.active} | 70/memos_before70.json |`);
  L.push(`| 　resolved の edit/del | ${s.d1.resolvedEditDel}（edit ${s.d1.resolvedEdit}／del ${s.d1.resolvedDel}／del-sec ${s.d1.resolvedDelSec}） | 同上 |`);
  L.push(`| 　未 resolved | ${s.d1.unresolved} | 同上 |`);
  L.push('');
  L.push('</details>', '');
  L.push('<p data-a="full-changes"><b>全文</b>：このすぐ下の「2. 変更した箇所」に、変更前 → 変更後をファイル別に出している。</p>', '');
  // 2. 変更（ファイル別・全文）
  L.push(`## 2. 変更した箇所（${s.files} ファイル・${s.units} か所。変更前 → 変更後）`, '');
  L.push('「この場所」を押すと、反映後の文が出ているページの位置へ飛ぶ。飛べない所は理由を書いてある（勝手に別の場所へ結ばない）。', '');
  for (const f of byFile) {
    // 見出しは末尾の名前だけ（階層の長い path で折り返さない）。path は出典 details に残す
    L.push(`### ${esc(baseName(f.file))}（${f.count} か所${f.linked ? `・リンク ${f.linked}` : ''}）`, '');
    L.push(`<details class="note meta"><summary>出典（原稿のファイル）</summary><code>${esc(f.file)}</code></details>`, '');
    for (const u of f.units) {
      const head = `#${u.no} ${u.op === 'delete' ? '削除' : u.op === 'insert' ? '追加' : '置き換え'}｜${oneLine(u.after || u.before, 48)}`;
      L.push(`<details class="fixunit"><summary>${esc(head)}</summary>`);
      L.push(`<p><b>この場所</b>：${u.href ? `<a href="${esc(u.href)}">${esc((ix.byId.get(u.pageId) || {}).nav || u.pageId)}</a>` : esc(u.whyMissing || 'リンクなし')}` +
        `${u.hits > 1 ? `（同じ文が ${u.hits} か所。最初の1つに結んだ）` : ''}</p>`);
      L.push(`<p><b>原稿</b>：<code>${esc(u.file)}</code>${u.rawSource ? `　<b>実ファイル</b>：<code>${esc(u.rawSource)}</code>` : ''}</p>`);
      L.push('<p>変更前</p>', pre(u.before || '(なし)'), '<p>変更後</p>', pre(u.after || '(なし)'));
      L.push('</details>', '');
    }
  }
  // 3. 作者注（確定）
  L.push(`## 3. 作者の注（確定 ${s.notes.fixed} 件）`, '');
  L.push('原稿の本文には書かず、サイトの該当箇所に折りたたみで置いた注のうち、**確定したもの**。未確定は [疑問・矛盾・気になる所](#/n-questions)。', '');
  const fixedNotes = ((notes && notes.notes) || []).filter((n) => n.state === 'fixed');
  L.push('| 注 | ページ | 状態 | この場所 |', '|---|---|---|---|');
  for (const n of fixedNotes) L.push(`| ${esc(n.section || n.id)} | <code>${esc(n.page_id)}</code> | ${esc(n.state_label || '確定')} | <a href="#/${esc(n.page_id)}/cnote-${esc(n.id)}">開く</a> |`);
  L.push('');
  // 4. D1
  L.push(`## 4. 共有保存（D1）で resolved になった訂正・削除（${s.d1.resolvedEditDel} 行）`, '');
  L.push('**これはDB（共有保存）の状態で、原稿への反映とは別の数え方**。D1 で resolved でも、原稿に入れたかは別に確かめる必要がある（逆も同じ）。原稿側は 2 節のとおり今回の変更で反映済み。', '');
  L.push(`未 resolved：${s.d1.unresolved} 行（${s.d1.unresolvedList.map((r) => `<code>${esc(r.pageId)}</code>/${esc(r.section)}・${esc(r.character)}`).join('、')}）。**DB が未 resolved でも、原稿では反映済み**（DB の更新は公開後）。`, '');
  L.push('| ページ | edit | del | del-sec | 合計 | 開く |', '|---|---:|---:|---:|---:|---|');
  for (const r of s.d1.byPage) L.push(`| <code>${esc(r.pageId)}</code> | ${r.edit} | ${r.del} | ${r['del-sec']} | ${r.total} | ${ix.byId.has(r.pageId) ? `<a href="#/${esc(r.pageId)}">開く</a>` : '（今のページに無いID）'} |`);
  L.push('');
  // 5. 資料
  L.push('## 5. 元にした資料', '');
  L.push('- `69/source/changes_before_after.json`（変更前・変更後）／`69/source/source_ledger_new.json`（原稿のSHA）／`69/source/tests.json`（検証）');
  L.push('- `content/_creator_notes.json`（作者の注。正本は 69/source/CREATOR_NOTES.json）／`70/memos_before70.json`（共有保存の写し）');
  L.push('- 今夜（11/16）の分：`data/n16-changes.json`（控えと今の原稿の差分・作者の直し35件）。作り直し：`node tools/night-changes.mjs`');
  L.push('- 数の作り直し：`node tools/build.mjs`（このページは build が生成する。手で直さない）');
  return {
    md: L.join('\n') + '\n',
    data: { schema: SCHEMAS.fixed, generatedAt: iso(generatedAt), gameCommit: gameCommit || '', counts: s, d1: s.d1, files: byFile, units,
      night: hasNight ? { before: night.before, after: night.after, files: nightFiles, memos: nightMemos, counts: { files: nightFiles.filter((f) => f.count).length, units: nightUnitCount, linked: nightLinked, memos: nightMemos.length } } : null },
  };
}

// ---------- 2. 疑問・矛盾・気になる所 ----------
// questions: content/_author_questions.json（作者の注の open と、ゲーム資料の「作者確認待ち」を写したもの）
// 規則: 質問文をAIが作らない。引用（quote）と出典（source）が無い項目は出さない（drop に残す）。
export function buildQuestionsPage({ questions, generatedAt }) {
  if (!questions || typeof questions !== 'object') throw new Error('questions が無い');
  if (questions.schema && questions.schema !== SCHEMAS.questions) throw new Error('未知の schema: ' + questions.schema);
  const srcGroups = Array.isArray(questions.groups) ? questions.groups : [];
  const dropped = [];
  const groups = [];
  for (const g of srcGroups) {
    const items = [];
    for (const it of (g.items || [])) {
      const closed = it.state === 'fixed' || /解消済|確定済み|回答済/.test(String(it.status || ''));
      if (closed) { dropped.push({ id: it.id, why: '確定・解消済み（疑問として復活させない）' }); continue; }
      if (!String(it.quote || '').trim() || !String(it.source || '').trim()) { dropped.push({ id: it.id, why: '引用か出典が無い（AIが文を作らない規則）' }); continue; }
      items.push({
        id: it.id, title: it.title || it.id, quote: it.quote, source: it.source,
        where: it.where || '', href: it.href || '', status: it.status || '',
      });
    }
    if (!items.length) continue;
    groups.push({ id: g.id, label: g.label || g.id, kind: g.kind === 'impl-diff' ? 'impl-diff' : 'undecided', items });
  }
  const items = groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.id, kind: g.kind })));
  const L = [];
  L.push(`# 疑問・矛盾・気になる所（${String(generatedAt || '').slice(0, 10)}）`, '');
  L.push(':::note このページの読み方');
  L.push('本文にも、[訂正済みの箇所](#/n-fixed)にも混ぜていない。**まだ決まっていないこと**と、**原稿とゲームの差**を分けてある。');
  L.push('- 引用は元の注・原文・記録のまま。**こちらで質問文を作り足していない**（意味を決めない）。');
  L.push('- 各項目の「この場所」から、注が出ているページの位置へ飛べる。');
  L.push(`- ゲームの基準：\`${esc(questions.gameCommit || '(未取得)')}\``);
  if (dropped.length) L.push(`- 確定・解消済み、または引用の無い項目 ${dropped.length} 件は出していない（下の 4 節）`);
  L.push(':::', '');
  L.push('<!--vis:make-->', '');
  groups.forEach((g, gi) => {
    L.push(`## ${gi + 1}. ${g.label}（${g.items.length} 件）`, '');
    if (g.kind === 'impl-diff') L.push('**分類：原稿とゲームの差**。まだ原稿がゲームに入っていない／実画面が撮れていない、などの状態。未確定の仕様（上の節）とは別。', '');
    else L.push('**分類：まだ決まっていない**（作者の返答待ち）。', '');
    g.items.forEach((it, i) => {
      L.push(`### ${gi + 1}-${i + 1}. ${it.title}`, '');
      L.push(`- 状態：${esc(it.status || '未確定')}`);
      L.push(`- 出典：<code>${esc(it.source)}</code>`);
      if (it.where) L.push(`- どこ：${esc(it.where)}`);
      if (it.href) L.push(`- この場所：<a href="${esc(it.href)}">開く</a>`);
      L.push('', '引用（原文のまま）', '');
      L.push(`> ${String(it.quote).split('\n').join('\n> ')}`, '');
    });
  });
  if (!groups.length) L.push('（いま出せる項目が無い。`content/_author_questions.json` を見る）', '');
  if (dropped.length) {
    L.push(`## ${groups.length + 1}. 出していない項目（${dropped.length} 件）`, '');
    L.push('確定・解消済みのもの、引用か出典が無いもの。**過去に解消した疑問を今の疑問として復活させない**ため、ここに残す。', '');
    L.push('| 項目 | 理由 |', '|---|---|');
    for (const d of dropped) L.push(`| <code>${esc(d.id)}</code> | ${esc(d.why)} |`);
    L.push('');
  }
  return {
    md: L.join('\n') + '\n',
    data: {
      schema: SCHEMAS.questions, generatedAt: iso(generatedAt), gameCommit: questions.gameCommit || '',
      counts: { groups: groups.length, items: items.length, undecided: items.filter((x) => x.kind !== 'impl-diff').length, implDiff: items.filter((x) => x.kind === 'impl-diff').length, dropped: dropped.length },
      groups, items, dropped,
    },
  };
}

// ---------- 3. ゲームの全文字 ----------
export const REQUIRED_SCENES = ['viola', 'charsel', 'intro', 'start'];
export const SCENE_LABELS = {
  viola: 'ヴィオラの説明', charsel: 'キャラ選択（最初の画面）', intro: 'はじめに', start: 'ゲーム開始',
  other: 'そのほかの画面',
  // 収録元の場面名が増えたら、ここに足す（無い名前は、その名前のまま出す。勝手に別の名前にしない）
  board: '盤面（見取り図）', ho: 'HO', read: '読み合わせ', card: 'カード', skill: '技能', item: '品',
  room: '部屋', explore: '探索', huddle: '密談', ls: 'ライブセレクション', help: 'ヘルプ',
  ed: 'エンディング', phase: 'フェイズ', toast: '知らせ', error: 'エラー', log: 'ログ', title: 'タイトル',
};

export function parseGameText(raw) {
  let d;
  if (typeof raw === 'string') {
    try { d = JSON.parse(raw); } catch (e) { throw new Error('game-text.json が JSON として読めない: ' + e.message); }
  } else d = raw;
  if (d.schema && !SCHEMAS.gameText.includes(d.schema)) throw new Error('未知の schema: ' + d.schema + '（game-text の作りが変わった。読まずに止める）');
  if (!d.commit) throw new Error('game-text に commit が無い（どの版の文字か分からないので止める）');
  if (!Array.isArray(d.items)) throw new Error('game-text の items が配列でない');
  const commit = String(d.commit);
  return {
    schema: d.schema || '', commit,
    // 画面に出すのは短い commit（T3 が commitShort を出す。無ければ先頭7字）
    commitShort: String(d.commitShort || commit.slice(0, 7)),
    generatedAt: d.generatedAt || '', items: d.items,
    scenes: Array.isArray(d.scenes) ? d.scenes : [],
  };
}

// 場面ごとに分け、多すぎる場面は chunkSize 件ずつに割る（1ページが大きくなりすぎないように）
export function groupGameText(gt, { chunkSize = 150, scenes = [], labels = {}, scenesMeta } = {}) {
  const d = gt && gt.items ? gt : parseGameText(gt);
  // T3 の抽出は場面の meta（id・page 名・題・件数）を持つ。page 名は g-lines-lspre のように
  // 「g-<scene>」と一致しないことがあるので、meta があれば必ずそれを使う（撮影側のページ名と食い違わせない）。
  const meta = Array.isArray(scenesMeta) ? scenesMeta : (Array.isArray(d.scenes) ? d.scenes : []);
  const metaById = new Map(meta.map((m) => [m.id, m]));
  const allowed = new Set([...REQUIRED_SCENES, ...scenes, ...meta.map((m) => m.id)]);
  const byScene = new Map();
  const unmapped = new Set();
  for (const it of d.items) {
    let sc = String(it.scene || '');
    if (!sc) sc = 'other';
    if (sc !== 'other' && !allowed.has(sc)) { unmapped.add(sc); sc = 'other'; }
    if (!byScene.has(sc)) byScene.set(sc, []);
    byScene.get(sc).push(it);
  }
  // 並び：meta の順（＝収録元の順。必須4場面が先頭）→ meta に無い場面（名前順）→ other
  const order = [
    ...meta.map((m) => m.id).filter((s) => byScene.has(s)),
    ...REQUIRED_SCENES.filter((s) => byScene.has(s) && !metaById.has(s)),
    ...[...byScene.keys()].filter((s) => s !== 'other' && !metaById.has(s) && !REQUIRED_SCENES.includes(s)).sort(),
    ...(byScene.has('other') ? ['other'] : []),
  ];
  const pages = [];
  for (const scene of order) {
    // 必須4場面（ヴィオラ・キャラ選択・はじめに・開始）は、作者が最初に読む面。
    // 原稿の静的な文 → ほかの静的な文 → 条件で変わる組み立て、の順に**表示だけ**並べ替える
    // （stable。同じ順位の中の発話順・出所順は動かさない。data 側の items は書き換えない）。
    const src = byScene.get(scene);
    const items = REQUIRED_SCENES.includes(scene) ? sortReadableFirst(src) : src;
    const m = metaById.get(scene);
    const base = (m && m.page) || 'g-' + scene;
    const name = (m && m.title) || labels[scene] || SCENE_LABELS[scene] || scene;
    const parts = Math.max(1, Math.ceil(items.length / chunkSize));
    for (let i = 0; i < parts; i++) {
      pages.push({
        id: i === 0 ? base : `${base}-${i + 1}`,
        scene, part: i + 1, parts,
        label: name + (parts > 1 ? `（${i + 1}/${parts}）` : ''),
        items: items.slice(i * chunkSize, (i + 1) * chunkSize),
      });
    }
  }
  const counts = {};
  for (const [k, v] of byScene) counts[k] = v.length;
  // meta の宣言件数と実数が違えば残す（どちらかを黙って採らない）
  const metaMismatch = [];
  for (const m of meta) {
    const actual = (byScene.get(m.id) || []).length;
    if (m.count != null && Number(m.count) !== actual) metaMismatch.push({ scene: m.id, declared: Number(m.count), actual });
  }
  return {
    pages,
    stats: {
      commit: d.commit, commitShort: d.commitShort || '', generatedAt: d.generatedAt, total: d.items.length,
      byScene: counts, pages: pages.length, unmappedScenes: [...unmapped], metaMismatch,
    },
  };
}

export function buildGameTextPage({ page, commit, generatedAt, notice }) {
  if (!page || !Array.isArray(page.items)) throw new Error('page が無い');
  if (!commit) throw new Error('commit が無い（どの版か分からないので止める）');
  const L = [];
  L.push(`# ゲームの全文字：${page.label || page.scene}（${commit}）`, '');
  L.push(':::note このページについて');
  L.push('ゲームの画面に出る文字を、コードから機械的に抜いて並べたもの。**原稿の本文ではない**（原稿は左の「HO」「読み合わせ」「カード」など）。**作者が足す文（サイトの別レイヤー）とも別**で、ここは読むだけ。');
  L.push(`- このページ：**${page.items.length} 件**${page.parts > 1 ? `（${page.part} / ${page.parts}）` : ''}／場面 \`${esc(page.scene)}\``);
  L.push(`- 出典：\`git show ${esc(commit)}:<file>\`。文字は1字も変えていない`);
  if (notice) L.push(`- ${notice}`);
  L.push('- 先に「本文」を出す。画面の条件によって変わる組み立て（差し込みの型）は、下の「条件によって変わる表示・技術資料（参考）」にたたんである（開くと原文のまま見える）');
  L.push('- 出典の行・ID・連結式（テンプレート）は、各件の「出典」を開くと見える（本文の見える文字と分けてある）');
  L.push(':::', '');
  L.push('<!--vis:make-->', '');
  // 本文（読める文）と、条件で変わる技術資料（コードの断片）に分ける。件数はどちらも減らさない
  const rows = page.items.map((it, i) => ({ it, no: i + 1, code: isCodeRow(it) }));
  const body = rows.filter((r) => !r.code);
  const tech = rows.filter((r) => r.code);
  let sec = 0;
  if (body.length) {
    L.push(`## ${++sec}. 本文（${body.length} 件）`, '');
    for (const r of body) {
      const it = r.it;
      const bits = [];
      if (it.kind) bits.push(kindLabel(it.kind));
      // 話者の行は本文が話者名なので、同じ名前を2度書かない
      if (it.speaker && it.kind !== 'speaker') bits.push('話者：' + esc(it.speaker));
      L.push(`**${page.part > 1 ? `${page.part}-` : ''}${r.no}**${bits.length ? '　' + bits.join('　') : ''}`, '');
      const text = String(it.text == null ? '' : it.text).split('\n').map(esc).join('<br>');
      L.push(text, '');
      L.push(metaLine(it, page), '');
    }
  }
  if (tech.length) {
    L.push(`## ${++sec}. 条件によって変わる表示・技術資料（参考）（${tech.length} 件）`, '');
    if (!body.length) L.push('このページは、条件によって変わる表示（コードの断片）だけ。**作者が読む本文ではない**。開くと原文のまま見える。', '');
    L.push('画面の条件で変わる組み立て（差し込みの型）と、コードから抜いた断片。**本文として読むものではない**ので、たたんである。開くと原文（1字も変えていない）が見える。', '');
    for (const r of tech) {
      const it = r.it;
      L.push(`**${page.part > 1 ? `${page.part}-` : ''}${r.no}**　${kindLabel(it.kind)}`, '');
      // 改行は実体参照にして1行に保つ（raw HTML の塊の中で Markdown に切り替わらないように）
      const raw = esc(String(it.text == null ? '' : it.text)).replace(/\r?\n/g, '&#10;');
      L.push(`<details class="gt-code"><summary>コード（原文）を開く</summary><pre><code>${raw}</code></pre></details>`, '');
      L.push(metaLine(it, page), '');
    }
  }
  const text = page.items.map((x) => String(x.text == null ? '' : x.text)).join(' ');
  return {
    md: L.join('\n') + '\n',
    data: {
      schema: 'dom-gtext-page-v1', id: page.id, scene: page.scene, part: page.part, parts: page.parts,
      count: page.items.length, bodyCount: body.length, techCount: tech.length, commit, generatedAt: iso(generatedAt),
    },
    text,
  };
}

// 1件分の「出典」details（ID・ファイル・行・区分は英語のまま。元データを変えない）
function metaLine(it, page) {
  const line = (it.line != null && it.line !== '') ? it.line : (it.loc && it.loc.line != null ? it.loc.line : '');
  const meta = [`<code>${esc(it.id || '')}</code>`];
  if (it.kind) meta.push(`<code>${esc(it.kind)}</code>`);
  if (it.file) meta.push(`<code>${esc(it.file)}</code>${line !== '' ? ' 行 ' + esc(line) : ''}`);
  if (it.category) meta.push(`<code>${esc(it.category)}</code>`);
  if (it.variant) meta.push(`<code>${esc(it.variant)}</code>`);
  if (it.subscene && it.subscene !== page.scene) meta.push(`<code>${esc(it.subscene)}</code>`);
  if (it.extra) meta.push(`<code>${esc(typeof it.extra === 'string' ? it.extra : JSON.stringify(it.extra))}</code>`);
  if (it.template) meta.push(`<code>${esc(String(it.template).slice(0, 300))}${String(it.template).length > 300 ? '…' : ''}</code>`);
  return `<details class="note meta"><summary>出典</summary>${meta.join('　')}</details>`;
}

// ---------- 4. 実画面の manifest（新 → 旧の順。落ちたら記録する） ----------
export function pickGameviewManifest({ nextPath, legacyPath, requireNext = false } = {}) {
  const read = (p) => {
    if (!p) return null;
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  };
  const next = read(nextPath);
  const legacy = read(legacyPath);
  if (next) {
    return { source: 'gameview-next', manifest: next, path: nextPath, legacyCommit: (legacy && legacy.gameCommit) || '', fallback: false, requireNext: !!requireNext };
  }
  if (requireNext) throw new Error('media/gameview-next/manifest.json が無い（親の最終確認には新しい実画面が要る。取れたら置く）');
  if (legacy) {
    return { source: 'gameview', manifest: legacy, path: legacyPath, legacyCommit: '', fallback: true, requireNext: !!requireNext };
  }
  return { source: null, manifest: null, path: '', legacyCommit: '', fallback: false, requireNext: !!requireNext };
}

// 必須の4場面（ヴィオラの説明・キャラ選択・はじめに・開始）に実画面が付いているか。
// 撮影待ちを許すのは、この4場面**以外**だけ（親の最終確認で使う）。
export const REQUIRED_SHOT_PAGES = ['g-viola', 'g-charsel', 'g-intro', 'g-start'];
export function missingRequiredShots(pages, required = REQUIRED_SHOT_PAGES) {
  const has = (id) => (pages || []).some((p) => (p.id === id || String(p.id).startsWith(id + '-')) && Array.isArray(p.shots) && p.shots.length);
  return required.filter((id) => !has(id));
}

// そのページ（場面）の実画面だけを返す。別ページ・別場面の画像で埋めない
export function sceneShots(manifest, pageId, scene) {
  if (!manifest) return { shots: null, reason: '撮影待ち（実画面の manifest が無い）' };
  const pages = manifest.pages || {};
  const scenes = manifest.scenes || {};
  const base = String(pageId || '').replace(/-\d+$/, '');
  const cand = [pages[pageId], pages[base], pages['g-' + scene], scenes[scene]];
  for (const list of cand) {
    if (Array.isArray(list) && list.length) return { shots: list.map((x) => ({ file: x.file, caption: x.caption || '', w: x.w || 0, h: x.h || 0 })), reason: '' };
  }
  return { shots: null, reason: `撮影待ち（場面 ${scene} の実画面がまだ manifest に無い）` };
}

// ---------- 5. 手元での下見（build を走らせずに、実データで生成物を確かめる） ----------
// 使い方: node tools/author-pages.mjs --check [--out <dir>]
// - build が使うのと同じ関数を、実データ（69 の変更・作者注・D1 の写し・data/site-data.js のページ）で走らせる
// - 書き出す先は 70/pages/out（INDEX の content/ は触らない）。build の本番生成は content/ に書く
// - data/game-text.json がまだ無ければ、その旨を出して g-* は作らない（fail-close の確認になる）
async function cli(argv) {
  const fsx = fs;
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const ROOT = process.cwd();
  const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const A69 = process.env.AUTHOR_PAGES_69 || 'C:/00_【創作】一時フォルダ/100_【マダミス】ハーネス作成/work_claude_opus_20261015/69_author_decisions_20261115';
  const A70 = process.env.AUTHOR_PAGES_70 || 'C:/00_【創作】一時フォルダ/100_【マダミス】ハーネス作成/work_claude_opus_20261015/70_author_index_editor_20261115';
  const OUT = path.resolve(arg('--out', path.join(A70, 'pages', 'out')));
  const readJ = (p) => { try { return JSON.parse(fsx.readFileSync(p, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } };
  const rep = { at: new Date().toISOString(), indexRoot: ROOT, a69: A69, a70: A70, out: OUT, wrote: [], problems: [] };
  // 69 の成果
  const changes = readJ(path.join(A69, 'source', 'changes_before_after.json'));
  const ledger = readJ(path.join(A69, 'source', 'source_ledger_new.json'));
  const tests = readJ(path.join(A69, 'source', 'tests.json'));
  const notes = readJ(path.join(ROOT, 'content', '_creator_notes.json'));
  const d1 = readJ(path.join(A70, 'memos_before70.json'));
  // build が組み上げたページ（前回の build の結果。html からアンカーを引くため）
  let pages = [];
  try {
    const js = fsx.readFileSync(path.join(ROOT, 'data', 'site-data.js'), 'utf8');
    const d = JSON.parse(js.replace(/^window\.SITE_DATA=/, '').replace(/;\s*$/, ''));
    pages = (d.pages || []).map((p) => ({ id: p.id, nav: p.nav, source: p.source, html: p.html }));
    rep.siteData = { built: d.built, pages: pages.length };
  } catch (e) { rep.problems.push('data/site-data.js が読めない（アンカーの対応は空になる）: ' + e.message); }
  fsx.mkdirSync(OUT, { recursive: true });
  if (changes) {
    const r = buildFixedPage({ changes, ledger, tests, notes, d1, pages, gameCommit: (notes && notes.gameCommit) || 'fb478cf', generatedAt: rep.at, sourceRoot: 'C:/00_【創作】一時フォルダ/_マダミス改訂_20261004/ダンジョン・オブ・ザ・マーダー/05_完成版' });
    fsx.writeFileSync(path.join(OUT, 'n-fixed.md'), r.md);
    fsx.writeFileSync(path.join(OUT, 'n-fixed.json'), JSON.stringify(r.data, null, 1));
    rep.wrote.push(path.join(OUT, 'n-fixed.md'));
    rep.fixed = { counts: r.data.counts, linked: r.data.units.filter((u) => u.href).length, units: r.data.units.length };
  } else rep.problems.push('69/source/changes_before_after.json が無い');
  const q = readJ(path.join(ROOT, 'content', '_author_questions.json'));
  if (q) {
    const r = buildQuestionsPage({ questions: q, generatedAt: rep.at });
    fsx.writeFileSync(path.join(OUT, 'n-questions.md'), r.md);
    fsx.writeFileSync(path.join(OUT, 'n-questions.json'), JSON.stringify(r.data, null, 1));
    rep.wrote.push(path.join(OUT, 'n-questions.md'));
    rep.questions = r.data.counts;
  } else rep.problems.push('content/_author_questions.json が無い');
  const gtRaw = fsx.existsSync(path.join(ROOT, 'data', 'game-text.json')) ? fsx.readFileSync(path.join(ROOT, 'data', 'game-text.json'), 'utf8') : null;
  if (!gtRaw) {
    rep.problems.push('data/game-text.json がまだ無い（T3 の生成待ち。g-* は作らず、build はここで止まる）');
  } else {
    const gt = parseGameText(gtRaw);
    // build と同じ割り方（200件/ページ・収録元の場面 meta）で下見する。違う割り方だとページ数を突き合わせられない
    const g = groupGameText(gt, {
      chunkSize: Number(process.env.GTEXT_CHUNK || 200),
      scenesMeta: gt.scenes,
      scenes: [...new Set(gt.items.map((x) => String(x.scene || '')).filter((x) => x && x !== 'other'))],
    });
    fsx.mkdirSync(path.join(OUT, 'gtext'), { recursive: true });
    // 前回の下見の残りを消す（chunk を変えたときに古いページが混ざり、ID の数え上げが二重になる）
    for (const f of fsx.readdirSync(path.join(OUT, 'gtext'))) {
      if (/^g-[^/]+\.md$/.test(f)) fsx.rmSync(path.join(OUT, 'gtext', f));
    }
    for (const p of g.pages) {
      const r = buildGameTextPage({ page: p, commit: gt.commit, generatedAt: rep.at });
      fsx.writeFileSync(path.join(OUT, 'gtext', p.id + '.md'), r.md);
      rep.wrote.push(path.join(OUT, 'gtext', p.id + '.md'));
    }
    rep.gtext = { commit: gt.commit, stats: g.stats, pages: g.pages.map((p) => ({ id: p.id, label: p.label, count: p.items.length })) };
  }
  fsx.writeFileSync(path.join(OUT, 'check-report.json'), JSON.stringify(rep, null, 1));
  console.log(JSON.stringify({ out: OUT, fixed: rep.fixed, questions: rep.questions, gtext: rep.gtext && { commit: rep.gtext.commit, total: rep.gtext.stats.total, pages: rep.gtext.pages.length }, problems: rep.problems }, null, 1));
  return rep;
}
if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--check')) await cli(process.argv.slice(2));
}
