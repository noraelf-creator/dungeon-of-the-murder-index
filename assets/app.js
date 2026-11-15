/* ダンジョン・オブ・ザ・マーダー 制作INDEX 改訂版 — 画面と修正案（Cloudflare D1共有＋端末内下書き） */
(() => {
  'use strict';
  const D = window.SITE_DATA;
  const CFG = window.SITE_CONFIG || {};
  const PREFIX = 'dom-rv1:';
  const PAGE_PREFIX = CFG.pagePrefix || 'rv1-';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(PREFIX + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch { /* 容量不足などは無視 */ } },
    del(k) { try { localStorage.removeItem(PREFIX + k); } catch { /* noop */ } },
  };
  const pages = D.pages;
  const pageById = new Map(pages.map((p) => [p.id, p]));
  // AI案（原稿とは別保存。D1のメモにも端末の下書きにも混ぜない）
  const AI = window.SITE_AI_PROPOSALS || null;
  const AI_UNITS = (AI && AI.units) || {};
  const AI_META = (AI && AI.units_meta) || {};
  const AI_PAGE = (AI && AI.page_summaries) || {};
  const AI_TARGETS = (AI && AI.targets) || {};
  const GVPREV = 'プレビュー（ゲーム f56e412 ＋ 11/14本仕様原稿・本番未デプロイ）';
  const groupById = new Map(D.groups.map((g) => [g.id, g]));
  const pageIndex = new Map(pages.map((p, i) => [p.id, i]));

  const ICONS = {
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 12h6M9.5 15.5h6"/>',
    chat: '<path d="M5 5h14v10H9l-4 4z"/><path d="M9 9.5h6M9 12h4"/>',
    cards: '<rect x="4" y="6" width="11" height="14" rx="2"/><path d="M8 3h10a2 2 0 0 1 2 2v12"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H20M17 12v3M20 12v2"/>',
    check: '<circle cx="12" cy="12" r="8"/><path d="M8.5 12.2l2.4 2.4 4.8-4.8"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="15" cy="9" r="1"/><circle cx="9" cy="15" r="1"/>',
    books: '<path d="M5 4h4v16H5zM10 4h4v16h-4z"/><path d="M15.5 5.5l3.5-1 3 15-3.5 1z"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
  };
  const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  // Discord風の丸いアイコン（ゲームの既存の顔画像。顔が分からない人とシステムは文字の丸）
  const dcAvHTML = (d) => (d && d.face
    ? `<span class="dc-av" aria-hidden="true"><img src="${esc(d.face)}" alt="" width="44" height="44"></span>`
    : `<span class="dc-av dc-txt" aria-hidden="true">${esc(!d || d.spk === 'システム' ? 'DM' : String(d.spk).slice(0, 1))}</span>`);

  // ---------- 状態 ----------
  const S = {
    page: null, group: null, anchor: null, fixing: null,
    memos: new Map(),            // `${pageId}|${anchor}` -> サーバーのメモ
    drafts: LS.get('drafts', {}), // `${pageId}|${anchor}` -> 端末の下書き
    status: {},                   // key -> 'saving'|'saved'|'local'|'conflict'|'error'
    statusMsg: {},
    session: null,
    sync: { state: 'idle', last: null, error: '' },
    tab: 'write', filter: 'open', query: '', legacyCount: 0, loaded: false,
    view: LS.get('view', 'all'), hideAfter: LS.get('hideAfter', true), shots: LS.get('shots', true),
    aiView: LS.get('aiView', true),
  };
  const isMobile = () => window.matchMedia('(max-width: 980px)').matches;
  const now = () => Date.now();
  const keyOf = (pageId, anchor) => pageId + '|' + anchor;
  const splitKey = (k) => { const i = k.indexOf('|'); return [k.slice(0, i), k.slice(i + 1)]; };

  // ---------- 見せる範囲（プレイヤーが見る情報だけ／この人物として見る） ----------
  const WHO_NAME = { mireille: 'ミレイユ', viola: 'ヴィオラ', mixi: 'ミクシィ', edgar: 'エドガー' };
  const VK = { all: ['◎', 'PL・全員が見る', '全員'], self: ['◆', 'PL・本人だけ', '本人'], here: ['◇', 'PL・その場にいた人だけ', 'その場'], gm: ['■', 'GMだけ', 'GM'], make: ['▲', '制作', '制作'] };
  const plMode = () => S.view !== 'all';
  const persona = () => (S.view.startsWith('pl:') ? S.view.slice(3) : '');
  function pageVisible(p) {
    if (!plMode()) return true;
    const v = p.vis || {};
    if (v.plOpen) return true;
    if (v.plAfter && !S.hideAfter) return true;
    const who = persona();
    return (v.selfWho || []).some((w) => !who || w === who || w === 'each');
  }
  function searchText(p) {
    if (!plMode()) return p.text;
    const who = persona(); const tw = p.tw || {};
    let t = p.tp || '';
    for (const [w, x] of Object.entries(tw)) if (!who || w === who || w === 'each') t += ' ' + x;
    if (!S.hideAfter) t += ' ' + (p.ta || '');
    return t;
  }
  function pageTag(p) {
    const v = p.vis || {}; const k = VK[v.k] ? v.k : 'make';
    const label = k === 'self' && v.whoName ? v.whoName : VK[k][2];
    const others = Object.keys(v.kinds || {}).filter((x) => x !== k && VK[x]);
    return `<span class="pv v-${k}" title="${esc(VK[k][1])}">${esc(label)}</span>` + (others.length ? `<span class="pdots">${others.map((x) => `<i class="v-${x}" title="${esc(VK[x][1])}もある"></i>`).join('')}</span>` : '');
  }
  // 作者注（制作の注）は、プレイヤー表示では DOM から外す（CSS で隠すだけにしない）。
  // 「すべて表示」へ戻したときは、外した注を戻すためにページを組み直す。
  let notesStripped = false;
  function stripNotesInDom() {
    if (!plMode()) return;
    const ns = $$('#page [data-cnote]');
    if (!ns.length) return;
    for (const n of ns) n.remove();
    notesStripped = true;
  }
  function applyCreatorNotes() {
    const notes = $$('[data-cnote]');
    if (!plMode()) {
      if (notesStripped) { notesStripped = false; if (S.page) renderPage(S.page, S.anchor); }
      return;
    }
    if (!notes.length) return;
    for (const n of notes) n.remove();
    notesStripped = true;
  }
  function applyView() {
    const b = document.body;
    b.classList.toggle('cmp-no-ai', !S.aiView);
    b.classList.toggle('cmp-no-shot', !S.shots);
    b.classList.toggle('pl-mode', plMode());
    b.classList.toggle('hide-after', plMode() && S.hideAfter);
    for (const w of Object.keys(WHO_NAME)) b.classList.toggle('as-' + w, persona() === w);
    const sel = $('#viewMode'); if (sel) sel.value = S.view;
    const ha = $('#hideAfter'); if (ha) ha.checked = S.hideAfter;
    const aw = $('#afterWrap'); if (aw) aw.hidden = !plMode();
    // R2：「作者が足した文」タブは PL／本人表示では出さない（追記の一覧・書き出しへの入口にしない）
    const addedTab = document.querySelector('.tab[data-tab="added"]');
    if (addedTab) addedTab.hidden = plMode();
    if (plMode() && S.tab === 'added') S.tab = 'all';
    applyCreatorNotes();
    if (S.page) { if (S.page.authorPage) renderAuthorPage(S.page, S.anchor); else renderAuthorLayer(S.page); }
    const bn = $('#modeBanner');
    if (bn) {
      bn.hidden = !plMode();
      if (plMode()) bn.innerHTML = `<strong>プレイヤー表示中${persona() ? '（' + esc(WHO_NAME[persona()]) + 'として）' : '（4人分）'}</strong>：■GMだけ・▲制作${persona() ? '・ほかの人の◆本人だけ' : ''}${S.hideAfter ? '・推理のあと（真相・ED）' : ''}を隠しています。◇その場にいた人だけの情報は、その場にいた人だけが知ります。<button type="button" class="btn small" data-view="all">すべて表示に戻す</button>`;
    }
  }
  // 本文が空のページ（節をほかへ移した・原稿の更新待ちなど）は、本文と分けた案内だけを出す。
  // 章の本文は作らない（原稿担当が反映する）。移した先は、目次と「このサイトの使い方」から辿れる。
  function checkEmptyPage() {
    const body = $('#page .page-body'); if (!body) return;
    const old = $('#page .page-empty'); if (old) old.remove();
    if (String(body.textContent || '').replace(/\s+/g, '').length > 8) return;
    body.insertAdjacentHTML('beforebegin', `<div class="page-empty" role="note"><b>この項目の本文はいまありません</b><span>節をほかのページへ移した、または原稿の更新待ちです（本文の移動は原稿担当が反映します。ここで文章は作りません）。移した先は左の目次から探せます。分からないときは、統括（親）にこのページ名を知らせてください。</span><span class="pe-links"><button type="button" class="btn small" data-act="open-nav">目次を開く</button><a class="btn small" href="#/about">このサイトの使い方</a></span></div>`);
  }
  function checkHiddenPage() {
    const body = $('#page .page-body'); if (!body) return;
    const old = $('#page .pl-empty'); if (old) old.remove();
    if (!plMode()) return;
    const shown = $$('.page-body > .vis', $('#page')).filter((el) => getComputedStyle(el).display !== 'none');
    if (!shown.length) body.insertAdjacentHTML('beforebegin', `<div class="pl-empty">このページには、いまの表示（プレイヤーが見る情報${persona() ? '・' + esc(WHO_NAME[persona()]) + 'として' : ''}）で見られる段がありません。<button type="button" class="btn small" data-view="all">すべて表示に戻す</button></div>`);
  }

  // ---------- 編集キー（セッション） ----------
  function loadSession() {
    const own = LS.get('session', null);
    if (own && own.projectId === CFG.projectId && own.expiresAt > now()) return own;
    try {
      const legacy = JSON.parse(localStorage.getItem(CFG.legacySessionKey) || 'null');
      if (legacy && legacy.projectId === CFG.projectId && legacy.expiresAt > now() && /^[a-f0-9]{64}$/.test(legacy.token || '')) { LS.set('session', legacy); return legacy; }
    } catch { /* noop */ }
    return null;
  }
  S.session = loadSession();
  const canWrite = () => !!(S.session && S.session.expiresAt > now() && /^https:\/\//.test(CFG.memoApi || ''));

  async function api(path, method = 'GET', body) {
    if (!/^https:\/\//.test(CFG.memoApi || '')) { const e = new Error('共有保存は準備中です。修正案はこの端末に保存されます（「すべて」から書き出せます）。'); e.network = true; throw e; }
    const url = CFG.memoApi.replace(/\/$/, '') + path + (path.includes('?') ? '&' : '?') + 'projectId=' + encodeURIComponent(CFG.projectId);
    const headers = { 'Content-Type': 'application/json' };
    if (S.session) headers.Authorization = 'Bearer ' + S.session.token;
    let res;
    try {
      res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify({ ...body, projectId: CFG.projectId }), signal: AbortSignal.timeout(15000) });
    } catch {
      const e = new Error('通信できませんでした。入力は端末内に残っています。'); e.network = true; throw e;
    }
    let j = {}; try { j = await res.json(); } catch { /* noop */ }
    if (!res.ok) {
      if (j.code === 'AUTH_REQUIRED') { S.session = null; LS.del('session'); renderAuth(); }
      const e = new Error(j.error || ('エラー ' + res.status)); e.status = res.status; e.current = j.current; throw e;
    }
    return j;
  }

  // ---------- 修正案の読み込み・保存 ----------
  function setSync(state, msg = '') {
    S.sync.state = state; S.sync.error = msg;
    const el = $('#syncState');
    const t = { idle: '', loading: '読み込み中', ok: canWrite() ? '共有中' : '閲覧中', local: '端末内のみ', error: '同期エラー' }[state] || '';
    el.className = 'sync ' + state;
    el.innerHTML = `<span class="t">${esc(t)}</span>`;
    el.title = msg || (S.sync.last ? '最終取得 ' + S.sync.last.toLocaleTimeString('ja-JP') : '');
  }
  async function loadMemos(quiet = false) {
    if (!quiet) setSync('loading');
    let ok = false;
    try {
      const j = await api('/api/memos');
      const map = new Map(); let legacy = 0;
      for (const m of j.memos || []) {
        if (typeof m.page_id !== 'string' || !m.page_id.startsWith(PAGE_PREFIX)) { legacy++; continue; }
        map.set(keyOf(m.page_id.slice(PAGE_PREFIX.length), m.section_id), m);
      }
      S.memos = map; S.legacyCount = legacy; S.sync.last = new Date(); S.loaded = true;
      ok = true;
      setSync('ok');
      settleSentDrafts();   // R3：送信済みの追記下書きは、同じ id・本文を読み戻せたときだけ消す
      syncAuthorPages();   // 共有の追記から、作者のページを目次・検索・URLへ載せ直す
      if (S.page && S.page.authorPage) {
        const cur = pageById.get(S.page.id);
        if (cur && cur !== S.page) renderPage(cur, S.anchor);
        else if (S.page.pending) renderAuthorPage(S.page, S.anchor);
      } else if (S.page) {
        renderAuthorLayer(S.page);   // 共有の追記は読み込みが後になる。本文が出たあとで置き直す
      }
    } catch (e) {
      setSync(e.network ? 'local' : 'error', e.message);
      ok = false;
    }
    refreshAll();
    return ok;   // M2：読み戻しの成否を呼び出し側が見られるようにする（失敗を成功として扱わない）
  }
  function entry(key) {
    const server = S.memos.get(key); const draft = S.drafts[key];
    const content = draft ? draft.content : server ? server.content : '';
    const resolved = draft ? !!draft.resolved : server ? !!server.resolved : false;
    const raw = draft && draft.kind != null ? draft.kind : server ? (server.character || '') : '';
    return { key, server, draft, content, resolved, kind: kindOf(raw, content, key), title: (draft && draft.title) || (server && server.title) || '', updated: (draft && draft.updated_at) || (server && server.updated_at) || '' };
  }
  // 種類：'' 修正案／'edit' 直した文／'del' 削除の印／'del-sec' 見出しの節ごと削除。前に「削除」とだけ書いた修正案も削除の印として扱う
  const DEL_WORDS = /^(削除|全て削除|すべて削除|この項目自体を削除|この節を削除)$/;
  function kindOf(raw, content, key) {
    if (raw === 'edit' || raw === 'del' || raw === 'del-sec' || raw === 'add') return raw;
    const isHead = /^h/.test(splitKey(key)[1]);
    if (DEL_WORDS.test(String(content || '').trim())) return isHead ? 'del-sec' : 'del';
    return '';
  }
  const KIND_LABEL = { '': '修正案', edit: '直した文', del: '削除の印', 'del-sec': '節ごと削除', add: '作者の追記' };
  function allKeys() { return [...new Set([...S.memos.keys(), ...Object.keys(S.drafts)])]; }
  // 作者の追記（kind='add'）は、既存の修正案一覧・件数・書き出しから外す（専用タブだけに出す）
  function visibleEntries() { return allKeys().map(entry).filter((e) => e.kind !== 'add' && ((e.content || '').trim() || e.resolved)); }
  function stage(key, patch) {
    const [pageId, anchor] = splitKey(key);
    const cur = entry(key);
    const next = {
      page_id: pageId, section_id: anchor,
      title: patch.title ?? cur.title ?? '',
      content: patch.content ?? cur.content ?? '',
      resolved: patch.resolved ?? cur.resolved ?? false,
      kind: patch.kind ?? (cur.draft && cur.draft.kind != null ? cur.draft.kind : (cur.server ? (cur.server.character || '') : '')),
      updated_at: new Date().toISOString(),
    };
    // H1：作者の追記（kind='add'）は JSON だけ。普通の文や壊れた JSON で下書き・共有を上書きしない。
    // 読めない既存の下書きがあっても、ここで止めるので値はそのまま残る（書き換える手段を旧欄に作らない）。
    if (next.kind === 'add' && !authorLayerOk(pageId, anchor, next.content)) {
      setStatus(key, 'error', '作者の追記は JSON のまま保存します。この欄では書き換えられません（追記タブから直してください）。');
      return false;
    }
    // R1：この下書きが土台にした共有 revision を保持する。poll で S.memos が進んでも書き換えない。
    //   新しい下書きは「いま見えている revision（共有が無ければ null）」を土台にする。
    //   既にある下書きは土台を引き継ぐ（この版より前の下書きは土台不明のまま＝送信前に確認）。
    const prevDraft = S.drafts[key];
    if (prevDraft && Object.prototype.hasOwnProperty.call(prevDraft, 'baseRevision')) next.baseRevision = prevDraft.baseRevision;
    else if (!prevDraft && patch && Object.prototype.hasOwnProperty.call(patch, 'baseRevision')) next.baseRevision = patch.baseRevision;
    else if (!prevDraft) next.baseRevision = cur.server && typeof cur.server.revision === 'number' ? cur.server.revision : null;
    S.drafts[key] = next;
    LS.set('drafts', S.drafts);
    return true;
  }
  const timers = {};
  function schedulePush(key, delay = 1400) {
    clearTimeout(timers[key]);
    if (!canWrite()) { setStatus(key, 'local'); return; }
    setStatus(key, 'pending');
    timers[key] = setTimeout(() => push(key), delay);
  }
  // R1：下書きが土台にした共有 revision。known:false は「この版より前の下書きで、土台が分からない」。
  function draftBase(d, server) {
    if (!d) return { known: false, value: undefined };
    if (Object.prototype.hasOwnProperty.call(d, 'baseRevision')) return { known: true, value: d.baseRevision };
    if (!server) return { known: true, value: null };   // 共有が無い＝上書きする相手がいない
    return { known: false, value: undefined };
  }
  // 送ると他の端末の更新（または削除）を消してしまう下書きか。確認なしでは送らない。
  function draftStale(key) {
    const d = S.drafts[key]; if (!d) return false;
    const server = S.memos.get(key);
    const b = draftBase(d, server);
    const rev = server && typeof server.revision === 'number' ? server.revision : null;
    if (server) return !b.known || b.value !== rev;
    return b.known && b.value !== null;   // 共有が消されているのに、共有版を土台にしている
  }
  async function push(key, { overwrite = false, confirmOverwrite = false } = {}) {
    clearTimeout(timers[key]);
    const d = S.drafts[key]; if (!d) return true;
    if (!canWrite()) { setStatus(key, 'local'); return false; }
    const server = S.memos.get(key);
    const serverRev = server && typeof server.revision === 'number' ? server.revision : null;
    // L2/R1：409 のあとや、下書きの土台が現在の revision と違うときは、共有側を見ないまま上書きしない。
    //   自動保存（schedulePush）・一括同期（syncDrafts）は confirmOverwrite を渡さない＝確認も出さずに止める。
    if (!overwrite && (draftStale(key) || S.status[key] === 'conflict')) {
      const msg = '共有側が更新されています。内容を確認してから保存し直してください。';
      if (!confirmOverwrite) { setStatus(key, 'conflict', msg); refreshMarks(); updateCounts(false); return false; }
      const show = String((server && server.content) || '（共有にありません。ほかの端末で消された可能性があります）').slice(0, 400);
      if (!window.confirm('共有側が更新されています。\n\n共有側の内容：\n' + show + '\n\n自分の内容で上書きしますか？（キャンセルすると下書きのまま残します）')) {
        setStatus(key, 'conflict', msg); refreshMarks(); updateCounts(false); return false;
      }
      // 明示の承諾があったときだけ、いま見えている共有 revision を新しい土台にする（その間に進んでいれば API が 409 で止める）
      d.baseRevision = serverRev;
      LS.set('drafts', S.drafts);
    }
    if (overwrite) { d.baseRevision = serverRev; LS.set('drafts', S.drafts); }
    // 追記は JSON なので、12000字で切ると復元できなくなる。切らずに止める（入力は下書きに残す）
    if (d.kind === 'add' && String(d.content || '').length > 12000) {
      setStatus(key, 'error', '共有の上限12000字を超えるため送れません（切り詰めていません）。本文を短くしてください。');
      refreshMarks(); updateCounts();
      return false;
    }
    // H1：作者の追記が JSON として読めない content は共有へ送らない（既存の正しい共有本文を壊さない）
    if (d.kind === 'add' && !authorLayerOk(d.page_id, d.section_id, d.content)) {
      setStatus(key, 'error', '作者の追記が JSON として読めないため、共有へ送りません（切り詰めていません。下書きは残しています）。');
      refreshMarks(); updateCounts();
      return false;
    }
    const memo = { page_id: PAGE_PREFIX + d.page_id, section_id: d.section_id, title: String(d.title || '').slice(0, 600), content: String(d.content || '').slice(0, 12000), resolved: !!d.resolved, character: String(d.kind || '').slice(0, 80), card: '' };
    const baseNow = draftBase(d, S.memos.get(key));
    setStatus(key, 'saving');
    try {
      let saved;
      if (server) {
        // R1：expectedRevision は「下書きの土台」から固定する（ポーリングで進んだ revision を勝手に使わない）
        saved = await api('/api/memos/' + encodeURIComponent(server.id), 'PUT', { memo, expectedRevision: baseNow.known ? baseNow.value : serverRev });
      } else if (d.sentId) {
        // R3：送信済みだがまだ読み戻せていない下書きは、POST で二重に作らず同じ id へ送る
        saved = await api('/api/memos/' + encodeURIComponent(d.sentId), 'PUT', { memo, expectedRevision: baseNow.known ? baseNow.value : (d.sentRevision ?? null) });
      } else saved = await api('/api/memos', 'POST', { memo: { ...memo, id: (crypto.randomUUID ? crypto.randomUUID() : 'm' + now() + Math.random().toString(16).slice(2)) } });
      S.memos.set(key, saved);
      if (d.kind === 'add') {
        // R3：応答だけで下書きを消さない。fresh GET で同じ id・本文を読み戻せたときだけ消す（loadMemos が行う）。
        //   再送で二重に作らないよう、送った id と revision を下書きに残す。
        const cur = S.drafts[key] || d;
        cur.baseRevision = typeof saved.revision === 'number' ? saved.revision : cur.baseRevision;
        cur.sentId = saved.id || cur.sentId || null;
        cur.sentRevision = typeof saved.revision === 'number' ? saved.revision : (cur.sentRevision ?? null);
        cur.sentAt = new Date().toISOString();
        if (!S.drafts[key]) S.drafts[key] = cur;
        LS.set('drafts', S.drafts);
        setStatus(key, 'unconfirmed');
        refreshMarks(); updateCounts();
        return true;
      }
      if (S.drafts[key] && S.drafts[key].updated_at === d.updated_at) { delete S.drafts[key]; LS.set('drafts', S.drafts); }
      setStatus(key, 'saved');
      refreshMarks(); updateCounts();
      return true;
    } catch (e) {
      if (e.status === 409) {
        if (e.current) S.memos.set(key, e.current);
        // 409 では土台を進めない（次に保存したとき、共有側を見せる確認を出す）
        if (overwrite && e.current) { d.baseRevision = e.current.revision; LS.set('drafts', S.drafts); return push(key); }
        setStatus(key, 'conflict', e.message);
      } else setStatus(key, e.network ? 'local' : 'error', e.message);
      refreshMarks(); updateCounts();
      return false;
    }
  }
  async function removeMemo(key) {
    const server = S.memos.get(key);
    if (server) {
      // L1：共有側を消せないなら、端末の下書きも消さない（消したつもりで未共有の編集を失わない）
      if (!canWrite()) { toast('共有済みの修正案を消すには、編集キーで解除してください。'); return false; }
      try { await api('/api/memos/' + encodeURIComponent(server.id), 'DELETE', { expectedRevision: server.revision }); S.memos.delete(key); toast('修正案を削除しました。'); }
      catch (e) { if (e.status === 409 && e.current) S.memos.set(key, e.current); toast(e.message); refreshAll(); return false; }
    }
    if (S.drafts[key]) { delete S.drafts[key]; LS.set('drafts', S.drafts); }
    setStatus(key, '');
    refreshAll();
    return true;
  }
  // R3：送信の応答だけで下書きを消さない。fresh GET で同じ id・同じ本文を読み戻せたものだけ消す。
  //   読めない・届いていない下書きはそのまま残す（「確認未完了」の状態を保つ）。
  function settleSentDrafts() {
    let changed = false;
    for (const [key, d] of Object.entries(S.drafts)) {
      if (!d || d.kind !== 'add' || !d.sentId) continue;
      const got = S.memos.get(key);
      if (got && got.id === d.sentId && String(got.content || '') === String(d.content || '')) {
        delete S.drafts[key]; changed = true;
        S.status[key] = 'saved'; S.statusMsg[key] = '';
      }
    }
    if (changed) LS.set('drafts', S.drafts);
  }
  async function syncDrafts() {
    if (!canWrite()) { openKeyDialog(); return; }
    const keys = Object.keys(S.drafts); let ok = 0; const held = []; const pending = [];
    await loadMemos(true);
    for (const k of keys) {
      if (!S.drafts[k]) continue;
      // R1：土台が違う／分からない下書きは、確認を自動で出さずに残す（相手の更新を黙って消さない）
      if (draftStale(k) || S.status[k] === 'conflict') { held.push(k); continue; }
      if (S.drafts[k].kind === 'add') {
        // R3：追記は送信→GET読み戻し（saveAddRecord）を通し、確認できたものだけ数える
        const res = await saveAddRecord(k);
        if (res && res.ok && !res.local) ok++; else held.push(k);
        continue;
      }
      const want = String(S.drafts[k].content || '');
      if (!(await push(k))) { held.push(k); continue; }
      pending.push([k, want]);
    }
    // 応答だけでは成功総数に入れない。読み戻しで同じ内容を確認できたものだけ数える
    const loaded = pending.length ? await loadMemos(true) : true;
    for (const [k, want] of pending) {
      const got = S.memos.get(k);
      if (loaded && got && String(got.content || '') === want) ok++; else held.push(k);
    }
    toast(`下書き ${ok}/${keys.length} 件を共有に送りました。` + (held.length ? ` ${held.length} 件は確認待ち（相手の更新・読み戻し待ち）で残しています。` : ''));
    refreshAll();
  }
  function setStatus(key, st, msg = '') {
    S.status[key] = st; S.statusMsg[key] = msg;
    if (S.page && key === keyOf(S.page.id, S.anchor)) renderSaveState();
  }

  // ---------- 目次（左） ----------
  function memoCountFor(pageId) {
    let n = 0; for (const e of visibleEntries()) if (splitKey(e.key)[0] === pageId && !e.resolved) n++; return n;
  }
  function renderGroups() {
    const box = $('#navGroups');
    box.innerHTML = D.groups.filter((g) => pages.some((p) => p.group === g.id && pageVisible(p))).map((g) => {
      const has = pages.some((p) => p.group === g.id && memoCountFor(p.id) > 0);
      return `<button type="button" class="group-btn${S.group === g.id ? ' active' : ''}" data-group="${g.id}" title="${esc(g.label)}">${svg(g.icon)}<span class="g-label">${esc(g.label)}</span>${has ? '<span class="g-dot" title="未反映の修正案あり"></span>' : ''}</button>`;
    }).join('');
  }
  function renderPagesCol() {
    const box = $('#navPages');
    if (S.query) {
      $('#navGroupLabel').textContent = '検索結果';
      const q = S.query.toLowerCase();
      const hits = [];
      for (const p of pages) {
        if (!pageVisible(p)) continue;
        const tx = searchText(p);
        const i = tx.toLowerCase().indexOf(q);
        const t = p.title.toLowerCase().includes(q) || p.nav.toLowerCase().includes(q);
        if (i < 0 && !t) continue;
        const start = Math.max(0, i - 30); const snip = i < 0 ? '' : tx.slice(start, i + q.length + 50);
        hits.push({ p, snip, q });
      }
      box.innerHTML = hits.length ? hits.map(({ p, snip }) => `<a class="search-hit" href="#/${p.id}" data-search="1"><div class="sh-title">${esc(p.nav)}</div><div class="sh-snip">${highlight(snip, S.query)}</div></a>`).join('') : '<div class="empty">見つかりませんでした。</div>';
      return;
    }
    const g = groupById.get(S.group) || D.groups[0];
    $('#navGroupLabel').textContent = g.label;
    let html = ''; let lastSub = null;
    for (const p of pages.filter((x) => x.group === g.id && pageVisible(x))) {
      if (p.sub !== lastSub) { if (p.sub) html += `<div class="sub-label">${esc(p.sub)}</div>`; lastSub = p.sub; }
      const n = memoCountFor(p.id);
      const active = S.page && S.page.id === p.id;
      html += `<a class="page-link${active ? ' active' : ''}" href="#/${p.id}">${pageTag(p)}<span class="p-label">${esc(p.nav)}</span>${n ? `<span class="memo-pill" title="未反映の修正案">${n}</span>` : ''}</a>`;
      if (active && p.toc.length) {
        html += '<div class="toc">' + p.toc.slice(0, 80).map((t) => `<a href="#/${p.id}/${t.id}" class="lv${t.level}" data-toc="${t.id}">${esc(t.text)}</a>`).join('') + '</div>';
      }
    }
    box.innerHTML = html;
  }
  function highlight(text, q) {
    if (!q) return esc(text);
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }


  // ---------- 3列比較（左＝本仕様／中＝AI案／右＝実画面） ----------
  const ACTION = {
    delete: ['削除提案', 'del'], shorten: ['削減案', 'short'], proofread: ['校正案', 'proof'], keep: ['現行維持', 'keep'],
  };
  const num = (n) => (n == null ? '—' : Number(n).toLocaleString('ja-JP'));
  const sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n).toLocaleString('ja-JP');
  const unitShotsOf = (uid) => ((D.gameview && D.gameview.unitShots) || {})[uid] || [];
  const noShotReason = (uid) => ((D.gameview && D.gameview.unitNoShotReason) || {})[uid] || '';

  function aiPanelHTML(uid, el, meta, prop) {
    const uhash = el.dataset.uhash || '';
    if (!prop) {
      return `<div class="cmp-empty"><b>AI案はまだありません（未生成）</b><span>この単位の案は Hydrogen（agy gemini-4-hydrogen-high）が作ります。ここに空の案や現行の複製は置きません。</span>${meta && meta.protected ? '<span class="cmp-prot">保護された単位（削除の提案はしません）</span>' : ''}</div>`;
    }
    const old = prop.source_hash && uhash && prop.source_hash !== uhash;
    const [label, cls] = ACTION[prop.action] || ['AI案', 'keep'];
    const del = prop.action === 'delete';
    const facts = (prop.kept_protected_facts || []).map((f) => `<li>${esc(f)}</li>`).join('');
    return `<div class="cmp-ai-head"><span class="cmp-badge ${cls}">${esc(label)}</span>` +
      `<span class="cmp-chars">現行 ${num(prop.source_chars)}字 → AI案 ${num(prop.proposed_chars)}字（差 ${sign(prop.delta_chars)}字）</span></div>` +
      (old ? '<div class="cmp-warn">⚠ 原稿更新済み（旧版へのAI案）: 本文のハッシュが案の生成元と違います。採用しないでください。</div>' : '') +
      (el.dataset.ustale === '1' ? '<div class="cmp-warn">⚠ この単位の本文は、案を作ったときの原稿から変わっています（再抽出が要ります）。</div>' : '') +
      (del ? '<div class="cmp-del">この項目ごと削除を提案</div>' : `<div class="cmp-text">${esc(prop.proposed_text || '')}</div>`) +
      (prop.reason ? `<div class="cmp-reason"><b>理由</b>${esc(prop.reason)}</div>` : '') +
      (facts ? `<div class="cmp-facts"><b>保護した推理事実</b><ul>${facts}</ul></div>` : '') +
      `<div class="cmp-actions">${del ? '' : `<button type="button" class="btn small" data-act="copyai" data-copy-unit="${esc(uid)}">AI案を「直す」欄に写す</button>`}<span class="cmp-src">${esc(prop.generator_model || '')}${AI && AI.generated_at ? '・' + esc(String(AI.generated_at).slice(0, 16).replace('T', ' ')) : ''}</span></div>`;
  }

  // 右の列の札：どのゲームの commit を撮ったか、本番か未デプロイのプレビューか、撮影日時。撮っていない所は「撮影待ち」。
  function shotMetaHTML() {
    const gv = D.gameview || {};
    const when = gv.builtAt ? new Date(gv.builtAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    const mode = gv.liveDeployed ? '本番' : '未デプロイのプレビュー';
    return `<div class="cmp-shot-head"><b class="gv-t">ゲームの実際の画面</b>` +
      `<span class="gv-tag" data-game-commit="${esc(gv.gameCommit || '')}">ゲーム ${esc(gv.gameCommit || 'commit不明')}</span>` +
      `<span class="gv-tag gv-mode${gv.liveDeployed ? ' live' : ''}">${esc(mode)}</span>` +
      (when ? `<span class="gv-when">撮影 ${esc(when)}</span>` : '') +
      (gv.previewLabel ? `<span class="gv-when">${esc(gv.previewLabel)}</span>` : '') + '</div>';
  }
  function shotPanelHTML(uid) {
    const shots = unitShotsOf(uid);
    if (shots.length) {
      return shotMetaHTML() +
        shots.map((x, i) => `<figure class="cmp-fig"><a href="${esc(x.file)}" target="_blank" rel="noopener"><img src="${esc(x.file)}" alt="${esc(x.caption || '')}" loading="${i < 2 ? 'eager' : 'lazy'}"${x.w ? ` width="${x.w}" height="${x.h}"` : ''}></a><figcaption>${esc(x.caption || '')}</figcaption></figure>`).join('');
    }
    const r = noShotReason(uid);
    return shotMetaHTML() + `<div class="cmp-noshot"><b>撮影待ち（この単位の実画面はまだありません）</b><span>${esc(r || '撮る対象に入っていない（ほかの画像で代用しません）')}</span><span class="gv-when">版：ゲーム ${esc((D.gameview && D.gameview.gameCommit) || 'commit不明')}${D.gameview && D.gameview.builtAt ? '・' + esc(new Date(D.gameview.builtAt).toLocaleDateString('ja-JP')) : ''}</span></div>`;
  }
  // AI案は消さない。左の本文（.cmp-spec）の下の <details class="ai-fold"> に移す（データは build のまま）
  function foldAiIntoSpec(spec, ai) {
    if (!spec || !ai) return;
    let fold = spec.querySelector(':scope > details.ai-fold');
    if (!fold) {
      fold = document.createElement('details'); fold.className = 'ai-fold';
      const sum = document.createElement('summary'); sum.textContent = 'AI案（参考・未採用）';
      fold.appendChild(sum);
      fold.appendChild(document.createElement('div')).className = 'ai-fold-body';
      spec.appendChild(fold);
    }
    const box = fold.querySelector('.ai-fold-body');
    if (box) box.innerHTML = ai.innerHTML;
    ai.remove();
  }

  function enhanceUnits(p) {
    const nodes = $$('#page .page-body [data-unit]');
    if (!nodes.length) return;
    for (const el of nodes) {
      const uid = el.dataset.unit;
      const meta = AI_META[uid] || null;
      const prop = AI_UNITS[uid] || null;
      const ai = el.querySelector(':scope > .cmp-ai') || el.querySelector('.cmp-ai');
      const shot = el.querySelector(':scope > .cmp-shot') || el.querySelector('.cmp-shot');
      if (ai) {
        ai.innerHTML = aiPanelHTML(uid, el, meta, prop);
        ai.dataset.state = prop ? 'has' : 'none'; ai.dataset.action = prop ? prop.action : '';
        foldAiIntoSpec(el.querySelector(':scope > .cmp-spec'), ai);   // 中央の列をやめ、左の本文の下に閉じる
      }
      if (shot) {
        shot.innerHTML = shotPanelHTML(uid);
        shot.dataset.state = unitShotsOf(uid).length ? 'has' : 'reason';
      }
    }
  }

  function summaryHTML(p) {
    const s = AI_PAGE[p.id];
    const ids = [...p.html.matchAll(/data-unit="([^"]+)"/g)].map((m) => m[1]);
    const nUnits = ids.length;
    const shots = ids.reduce((a, uid) => a + unitShotsOf(uid).length, 0);
    const have = ids.filter((uid) => AI_UNITS[uid]).length;
    const parts = [];
    parts.push(`<span class="cmp-sum-unit">単位 ${nUnits}（実画面 ${shots}枚）</span>`);
    // 案の3状態を別々に数える：いまの原稿に一致する案／原稿更新前の案（旧版）／未作成。旧版を「未生成」と呼ばない。
    let cur = 0; let stale = 0; let none = 0;
    if (s) {
      cur = s.proposed_units || 0; stale = s.stale_units || 0; none = s.no_proposal_units || 0;
    } else {
      for (const uid of ids) {
        const m = AI_META[uid];
        if (!AI_UNITS[uid] || (m && m.proposal === 'none')) none++;
        else if (m && m.proposal_stale) stale++;
        else cur++;
      }
    }
    if (s) {
      parts.push(`<span>このページ ${s.scope_label}：現行 <b>${num(s.source_chars)}字</b></span>`);
    }
    parts.push(`<span class="cmp-sum-ai" data-cur="${cur}" data-stale="${stale}" data-none="${none}" data-total="${nUnits}">` +
      `AI案：現行版に一致 <b>${cur}</b>／原稿更新前の案（旧版）<b>${stale}</b>／未作成 <b>${none}</b>（計 ${nUnits}単位）</span>`);
    if (s) {
      if (!stale && !none && s.proposed_chars_sum_all_units_if_all_proposed != null) {
        parts.push(`<span class="cmp-sum-adopt">AI案を全採用 <b>${num(s.proposed_chars_sum_all_units_if_all_proposed)}字</b>（差 ${sign(s.delta_chars || 0)}字）</span>`);
      } else {
        parts.push(`<span class="cmp-sum-scope">字数の削減効果は出しません（原稿更新前の案・未作成が ${stale + none}単位あるため、案の字数を全採用の字数として数えない。現行 ${num(s.source_chars)}字は全${nUnits}単位ぶん）</span>`);
      }
    }
    if (p.kind === 'card' && AI_TARGETS.cards_fixed_target) {
      // M3：この「残り」は 2026/11/09 の従来集計（66_text_volume_20261109）の値で、いまの原稿の残りではない。
      // 現在値を偽って出さないよう、出典と日付を明示する（数は targets のまま。ここで作り直さない）。
      const off = AI_TARGETS.official || {};
      const oldCards = Number.isFinite(Number(off.cards_total)) ? num(off.cards_total) : '';
      parts.push(`<span>全カードの固定目標 <b>${num(AI_TARGETS.cards_fixed_target)}字</b>。残りの参考値 <b>${num(AI_TARGETS.cards_remaining_now_official)}字</b>は、<b>2026/11/09 時点の従来scope集計</b>（66_text_volume_20261109${oldCards ? '＝ゲームに入るカード' + oldCards + '枚ぶん' : ''}）の値で、<b>いまの原稿の残りではありません</b>。最新は n-textcut / n-now の計測を参照</span>`);
      // 採用後の「残り」は従来集計では未算出（比較単位の差を足すと別スコープの数字になる）。比較単位の差だけ出す
      if (AI_TARGETS.cards_delta_all_proposed_units != null) {
        parts.push(`<span class="cmp-sum-scope">比較単位でのAI案全採用差 <b>${sign(AI_TARGETS.cards_delta_all_proposed_units)}字</b>（配布版と集計範囲が異なるため、従来集計での採用後残は未算出）</span>`);
      }
    }
    if (AI && AI.ho_scopes && p.kind === 'ho' && s) {
      parts.push(`<span class="cmp-sum-scope">HOの範囲：${esc(s.scope_label)}（共通HO ${num(AI.ho_scopes.common_ho)}字／初期HO ${num(AI.ho_scopes.pc_initial)}字／追加HO ${num(AI.ho_scopes.pc_extra)}字は足し合わせない）</span>`);
    }
    if (!s && !have) parts.push('<span class="cmp-sum-miss">AI案はまだありません（未作成）</span>');
    return `<div class="cmp-summary">${parts.join('')}</div>`;
  }

  // ---------- 本文（中央） ----------
  const AUD = { 'PL配布': 'pl', 'PL配布（本人のみ）': 'pl', 'PL配布（最後）': 'pl', 'GM専用': 'gm', '制作': 'make', '参照': 'ref' };
  function renderPage(p, anchor) {
    if (AL && p && p.authorPage) { renderAuthorPage(p, anchor); return; }
    S.page = p; S.group = p.group;
    const g = groupById.get(p.group);
    const chips = [];
    const pv = p.vis || {}; const pk = VK[pv.k] ? pv.k : 'make';
    chips.push(`<span class="tagchip vis-tag v-${pk}">${VK[pk][0]} ${esc(VK[pk][1])}${pk === 'self' && pv.whoName ? '：' + esc(pv.whoName) : ''}${pv.when === 'after' ? '（推理のあと）' : ''}</span>`);
    const kc = Object.entries(pv.kinds || {}).filter(([k]) => VK[k]).map(([k, n]) => `<span class="kc v-${k}">${VK[k][0]}${esc(VK[k][2])} ${n}</span>`).join('');
    for (const b of p.badges || []) chips.push(`<span class="tagchip new">${esc(b)}</span>`);
    const n = memoCountFor(p.id);
    const dc = p.dc || { spk: 'システム', sk: 'sys', face: '' };
    const unitPage = /data-unit="/.test(p.html);
    const unitShotCount = unitPage ? Object.entries((D.gameview && D.gameview.unitShots) || {})
      .filter(([uid]) => (AI_META[uid] || {}).page_id === p.id).reduce((a, [, v]) => a + v.length, 0) : 0;
    $('#page').innerHTML = `
      <header class="page-head">
        <div class="crumbs"><span>${esc(g.label)}</span>${p.sub ? `<span>${esc(p.sub)}</span>` : ''}<span>${esc(p.nav)}</span></div>
        <div class="dc-page" data-sk="${esc(dc.sk)}">${dcAvHTML(dc)}<div class="dc-page-body"><div class="dc-name">${esc(dc.spk)}</div><h1 class="page-title">${esc(p.title)}</h1></div></div>
        <div class="vis-legend"><span class="lg-t">印</span><span class="kc v-all">◎PL・全員が見る</span><span class="kc v-self">◆PL・本人だけ</span><span class="kc v-here">◇PL・その場にいた人だけ</span><span class="kc v-gm">■GMだけ（赤枠・たたみ）</span><span class="kc v-make">▲制作</span><a href="#/about">印の見方</a><span class="lg-n">このページの段：${kc}</span></div>
        <div class="page-meta">${chips.join('')}${p.source ? `<span class="src" title="元ファイル">content/${esc(p.source)}</span>` : ''}<button type="button" class="btn small" id="pageMemos">このページの修正案 ${n}</button>${plMode() ? '' : '<button type="button" class="btn small" id="pageAdd" title="このページの末尾に作者の追記を足す">＋このページに足す</button>'}${unitPage ? `<button type="button" class="btn small${S.aiView ? ' on' : ''}" id="btnAi" title="中央のAI案を隠す／並べる">AI案 ${S.aiView ? 'を隠す' : 'を並べる'}</button><button type="button" class="btn small${S.shots ? ' on' : ''}" id="btnShots" title="右の実画面を隠す／並べる">実際の画面 ${S.shots ? 'を隠す' : 'を並べる'}（${unitShotCount}枚）</button>` : (p.shots ? `<button type="button" class="btn small${S.shots ? ' on' : ''}" id="btnShots" title="ゲームで撮った実際の画面を右半分に並べる">実際の画面 ${S.shots ? 'を隠す' : 'を並べる'}（${p.shots.length}枚）</button>` : '')}</div>
      </header>
      ${unitPage ? `${summaryHTML(p)}<div class="page-body">${p.html}</div>` : (p.shots && S.shots ? `<div class="split"><div class="page-body">${p.html}</div>${shotsHTML(p)}</div>` : `<div class="page-body">${p.html}</div>`)}`;
    document.body.classList.toggle('has-shots', !!(p.shots && S.shots));
    document.body.classList.toggle('cmp-on', unitPage);
    if (unitPage) { enhanceUnits(p); }
    if ($('#btnAi')) $('#btnAi').addEventListener('click', () => { S.aiView = !S.aiView; LS.set('aiView', S.aiView); const a = S.anchor; renderPage(p, a); });
    if ($('#btnShots')) $('#btnShots').addEventListener('click', () => { S.shots = !S.shots; LS.set('shots', S.shots); const a = S.anchor; renderPage(p, a); });
    if ($('#pageAdd')) $('#pageAdd').addEventListener('click', () => openComposer({ mode: 'new', type: 'para', pageId: p.id, pos: 'end' }));
    document.title = p.nav + '｜ダンジョン・オブ・ザ・マーダー 制作INDEX';
    $('#pageMemos').addEventListener('click', () => { openPanel('page'); });
    checkHiddenPage();
    checkEmptyPage();
    refreshMarks();
    renderGroups(); renderPagesCol();
    $('#pencil').hidden = true; if ($('#editBar')) $('#editBar').hidden = true; S.fixing = null;
    const main = $('#main');
    if (anchor) {
      requestAnimationFrame(() => {
        const el = findAnchor(anchor);
        if (el) {
          openParents(el);
          el.scrollIntoView({ block: 'center' });
          if (/^h/.test(anchor) && !S.memos.get(keyOf(p.id, anchor)) && !S.drafts[keyOf(p.id, anchor)]) { selectAnchor(null, false); flashEl(el); }
          else selectAnchor(anchor, false);
        }
      });
    } else { main.scrollTop = 0; selectAnchor(null, false); }
    if (S.query) highlightInPage(S.query);
    stripNotesInDom();   // プレイヤー表示のときは、組み立て直した本文からも注を外す
    renderAuthorLayer(p);   // 左の本文の後ろに「作者の追記」を置く（PL表示では vis=pl 以外を出さない）
    renderPanel();
  }
  // ゲームの実際の画面（右半分）
  function shotsHTML(p) {
    const gv = D.gameview || {};
    const when = gv.builtAt ? new Date(gv.builtAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    return `<aside class="gv" aria-label="ゲームの実際の画面"><div class="gv-head"><b>ゲームの実際の画面</b><small>今の原稿をゲーム${gv.gameCommit ? '（' + esc(gv.gameCommit) + '）' : ''}に取り込んで撮影${when ? '・' + esc(when) : ''}。押すと大きく開く</small></div>` +
      p.shots.map((x, i) => `<figure class="gv-shot"><a href="${esc(x.file)}" target="_blank" rel="noopener"><img src="${esc(x.file)}" alt="${esc(x.caption)}" loading="${i < 2 ? 'eager' : 'lazy'}"${x.w ? ` width="${x.w}" height="${x.h}"` : ''}></a><figcaption>${esc(x.caption)}</figcaption></figure>`).join('') + '</aside>';
  }
  function findAnchor(a) { return a ? $(`#page [data-a="${CSS.escape(a)}"]`) : null; }
  function openParents(el) { for (let d = el.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) d.open = true; }
  function flashEl(el) { el.classList.add('is-selected'); setTimeout(() => el.classList.remove('is-selected'), 1400); }
  function highlightInPage(q) {
    const body = $('#page .page-body'); if (!body || !q) return;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const lower = q.toLowerCase(); let first = null; const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const i = node.nodeValue.toLowerCase().indexOf(lower);
      if (i < 0) continue;
      const vb = node.parentElement && node.parentElement.closest('.vis');
      if (plMode() && vb && getComputedStyle(vb).display === 'none') continue;
      const mark = document.createElement('mark'); mark.className = 'hl';
      const after = node.splitText(i); after.splitText(q.length);
      mark.textContent = after.nodeValue; after.replaceWith(mark);
      if (!first) first = mark;
    }
    if (first) { openParents(first); first.scrollIntoView({ block: 'center' }); }
  }
  function excerptOf(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    $$('.note-mark, button, .dc-av, .dc-name', clone).forEach((b) => b.remove());
    if (el.tagName === 'TR') return [...clone.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ／ ').slice(0, 240);
    if (el.tagName === 'DETAILS') { const s = clone.querySelector('summary'); return (s ? s.textContent : clone.textContent).replace(/\s+/g, ' ').trim().slice(0, 240); }
    return clone.textContent.replace(/\s+/g, ' ').trim().slice(0, 240);
  }
  function refreshMarks() {
    if (!S.page) return;
    $$('#page .has-memo').forEach((el) => el.classList.remove('has-memo', 'memo-done', 'memo-draft'));
    $$('#page .edit-view').forEach((el) => el.remove());
    $$('#page .edit-old, #page .mark-del, #page .mark-del-sec, #page .mark-del-head').forEach((el) => el.classList.remove('edit-old', 'mark-del', 'mark-del-sec', 'mark-del-head', 'mark-done'));
    const all = $$('#page .page-body [data-a]');
    for (const e of visibleEntries()) {
      const [pid, a] = splitKey(e.key); if (pid !== S.page.id) continue;
      const el = findAnchor(a); if (!el) continue;
      el.classList.add('has-memo');
      if (e.resolved) el.classList.add('memo-done'); else if (e.draft && !e.server) el.classList.add('memo-draft');
      el.title = KIND_LABEL[e.kind] + '：' + (e.content || '').slice(0, 80);
      if (e.resolved) continue;   // 反映済みは印だけ
      if (e.kind === 'edit' && !el.classList.contains('is-editing')) {
        el.classList.add('edit-old');
        el.insertAdjacentElement('afterend', editViewEl(el, e));
      } else if (e.kind === 'del') {
        el.classList.add('mark-del');
      } else if (e.kind === 'del-sec') {
        el.classList.add('mark-del', 'mark-del-head');
        const lv = headLevel(el); const i = all.indexOf(el);
        for (let j = i + 1; j < all.length; j++) {
          const x = all[j]; const l = headLevel(x);
          if (l && l <= lv) break;
          x.classList.add('mark-del-sec');
        }
      }
    }
  }
  function headLevel(el) { const m = /^H([1-6])$/.exec(el.tagName); return m ? +m[1] : 0; }
  // 直した文の表示（元の段のすぐ後ろ。表の行・箇条の中でも崩れないように同じ種類の要素で包む）
  function editViewEl(el, e) {
    const body = `<div class="ev-head"><span class="ev-tag">直した文</span>${e.draft && !e.server ? '<span class="ev-draft">下書き</span>' : ''}<button type="button" class="ev-btn" data-ev="fix" data-a="${esc(el.dataset.a)}">もう一度直す</button><button type="button" class="ev-btn" data-ev="undo" data-a="${esc(el.dataset.a)}">元に戻す</button></div><div class="ev-text">${esc(e.content)}</div>`;
    return wrapLike(el, 'edit-view', body);
  }
  function wrapLike(el, cls, inner) {
    let w;
    if (el.tagName === 'TR') { w = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = el.children.length || 1; td.innerHTML = inner; w.appendChild(td); }
    else if (el.tagName === 'LI') { w = document.createElement('li'); w.innerHTML = inner; }
    else { w = document.createElement('div'); w.innerHTML = inner; }
    w.className = cls; w.dataset.for = el.dataset.a;
    return w;
  }
  // 元の段の文（直すときの初めの文）。ボタン・注意点の印を除き、改行を残す
  function plainOf(el) {
    const c = el.cloneNode(true);
    $$('.note-mark, button, .vis-label, .dc-av, .dc-name', c).forEach((b) => b.remove());
    if (el.tagName === 'TR') return [...c.children].map((td) => td.innerText.trim()).join(' ｜ ');
    const box = document.createElement('div'); box.style.cssText = 'position:absolute;left:-9999px;white-space:normal;width:600px'; box.appendChild(c); document.body.appendChild(box);
    const t = c.innerText.replace(/\n{3,}/g, '\n\n').trim(); box.remove();
    return t;
  }
  // ---------- その場で直す ----------
  function startFix(a, initial = null) {
    if (isAuthorAnchor(a)) { openComposer({ mode: 'edit', key: keyOf(S.page.id, a) }); return; }
    const el = findAnchor(a); if (!el) return;
    cancelFix();
    const key = keyOf(S.page.id, a); const e = entry(key);
    const start = initial != null ? initial : e.kind === 'edit' && e.content ? e.content : plainOf(el);
    el.classList.add('is-editing');
    $$(`#page .edit-view[data-for="${CSS.escape(a)}"]`).forEach((x) => x.remove());
    const box = wrapLike(el, 'inline-edit', `<div class="ie-head">この段をその場で直す<span class="ie-hint">Ctrl+Enter で保存／Esc でやめる</span></div><textarea class="ie-text" rows="3"></textarea><div class="ie-actions"><button type="button" class="btn small primary" data-ie="save">保存</button><button type="button" class="btn small" data-ie="cancel">やめる</button>${e.kind === 'edit' ? '<button type="button" class="btn small danger" data-ie="undo">元の文に戻す</button>' : ''}<span class="ie-orig">元：${esc(excerptOf(el).slice(0, 70))}${excerptOf(el).length > 70 ? '…' : ''}</span></div>`);
    el.insertAdjacentElement('afterend', box);
    const ta = $('.ie-text', box); ta.value = start;
    const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(600, ta.scrollHeight + 4) + 'px'; };
    ta.addEventListener('input', fit); fit(); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); saveFix(a, ta.value); }
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cancelFix(); }
    });
    S.fixing = a; placePencil(null);
  }
  function cancelFix() {
    if (!S.fixing) return;
    $$('#page .inline-edit').forEach((x) => x.remove());
    $$('#page .is-editing').forEach((x) => x.classList.remove('is-editing'));
    S.fixing = null; refreshMarks();
  }
  async function saveFix(a, text) {
    if (isAuthorAnchor(a)) {
      // 既存の「直す」は、追記の同じレコードの本文を書き換える（別の edit memo を作らない）
      const hit = authorEntries().find((x) => x.key === keyOf(S.page.id, a));
      if (!hit) return;
      let rec, memo;
      try { rec = AL.applyEdit(hit.rec, { body: text }); memo = AL.serializeLayer({ ...rec, pageTitle: pageTitleOf(rec.pageId) }); }
      catch (e) { toast(e.message); return; }
      stage(hit.key, { kind: 'add', content: memo.content, title: memo.title, resolved: false });
      cancelFix();
      const res = await saveAddRecord(hit.key);
      toast(res.message); refreshAll();
      if (S.page) renderAuthorLayer(S.page);
      return;
    }
    const el = findAnchor(a); const key = keyOf(S.page.id, a);
    const orig = plainOf(el);
    if (text.trim() === orig.trim()) { toast('元の文と同じなので、保存しませんでした。'); cancelFix(); return; }
    stage(key, { kind: 'edit', content: text, resolved: false, title: S.page.nav + '｜' + orig.slice(0, 560) });
    cancelFix();
    if (canWrite()) await push(key); else { setStatus(key, 'local'); toast('この端末に下書き保存しました。共有するには編集キーで解除してください。'); }
    refreshAll();
  }
  async function undoFix(a) {
    const key = keyOf(S.page.id, a);
    if (!confirm('この段の直した文を消して、元の文に戻しますか？')) return;
    cancelFix(); await removeMemo(key);
  }
  async function toggleDel(a) {
    if (isAuthorAnchor(a)) {
      const hit = authorEntries().find((x) => x.key === keyOf(S.page.id, a));
      if (hit) await setAuthorDeleted(hit.key, !hit.rec.deleted);
      return;
    }
    const el = findAnchor(a); if (!el) return;
    const key = keyOf(S.page.id, a); const e = entry(key);
    if (e.kind === 'del' || e.kind === 'del-sec') { if (await removeMemo(key)) toast('削除の印を外しました。'); return; }
    if (e.server || e.draft) { if ((e.content || '').trim() && !confirm('この段には' + KIND_LABEL[e.kind] + 'があります。削除の印に置き換えますか？')) return; }
    const sec = !!headLevel(el);
    stage(key, { kind: sec ? 'del-sec' : 'del', content: sec ? '削除（この見出しの節ごと）' : '削除', resolved: false, title: S.page.nav + '｜' + plainOf(el).slice(0, 560) });
    if (canWrite()) await push(key); else { setStatus(key, 'local'); toast('この端末に下書き保存しました。共有するには編集キーで解除してください。'); }
    refreshAll();
  }
  function selectAnchor(anchor, open = true) {
    $$('#page .is-selected').forEach((el) => el.classList.remove('is-selected'));
    S.anchor = anchor;
    if (anchor) {
      const el = findAnchor(anchor); if (el) el.classList.add('is-selected');
      const h = `#/${S.page.id}/${anchor}`; if (location.hash !== h) history.replaceState(null, '', h);
      // H1：作者の追記（x-…）は旧「修正案」欄に生JSONを出さない。追記のフォームへ回す
      if (isAuthorAnchor(anchor)) {
        const hit = authorEntries().find((x) => x.key === keyOf(S.page.id, anchor));
        if (open) { if (hit) openComposer({ mode: 'edit', key: hit.key }); else openPanel('added'); }
        renderPanel();
        return;
      }
      if (open) openPanel('write');
    }
    renderPanel();
  }

  // 鉛筆ボタン（カーソルを合わせた箇所に出す）
  let hoverEl = null;
  function placePencil(el) {
    const main = $('#main'); const pen = $('#pencil');
    // H1：作者の追記ブロック（.ablock / x-…）には鉛筆を出さない。直すのは追記ブロックの「直す」ボタンだけ。
    if (el && (el.closest('.ablock') || isAuthorAnchor(el.dataset && el.dataset.a))) el = null;
    if (!el) { pen.hidden = true; const bar = $('#editBar'); if (bar) bar.hidden = true; if (hoverEl) hoverEl.classList.remove('is-hover'); hoverEl = null; return; }
    if (hoverEl && hoverEl !== el) hoverEl.classList.remove('is-hover');
    hoverEl = el; el.classList.add('is-hover');
    const mr = main.getBoundingClientRect(); const er = el.getBoundingClientRect();
    // 3列のときは、鉛筆と直す／削除のバーを左列（.cmp-spec）の右端に出す。中央・右の列には被せない
    const spec = el.closest ? el.closest('.cmp-spec') : null;
    const pr = (spec || (document.body.classList.contains('has-shots') && $('#page .page-body') ? $('#page .page-body') : $('#page'))).getBoundingClientRect();
    pen.style.top = (er.top - mr.top + main.scrollTop + Math.min(4, er.height / 4)) + 'px';
    pen.style.left = (Math.min(pr.right, mr.right - 10) - mr.left - 38) + 'px';
    pen.hidden = false;
    const bar = $('#editBar');
    if (bar) {
      const e = entry(keyOf(S.page.id, el.dataset.a)); const isDel = e.kind === 'del' || e.kind === 'del-sec';
      const db = $('[data-bar="del"]', bar); db.textContent = isDel ? '削除を外す' : (headLevel(el) ? '節ごと削除' : '削除'); db.classList.toggle('on', isDel);
      bar.style.top = pen.style.top; bar.style.left = (parseFloat(pen.style.left) - bar.offsetWidth - 4) + 'px';
      bar.hidden = false;
      bar.style.left = (parseFloat(pen.style.left) - bar.offsetWidth - 4) + 'px';
    }
  }

  // ---------- 修正案（右） ----------
  function openPanel(tab) {
    if (tab) S.tab = tab;
    document.body.classList.remove('panel-collapsed');
    if (isMobile()) { document.body.classList.add('panel-open'); document.body.classList.remove('nav-open'); $('#scrim').hidden = false; }
    LS.set('panelCollapsed', false);
    renderPanel();
  }
  function closePanel() {
    if (isMobile()) { document.body.classList.remove('panel-open'); $('#scrim').hidden = !document.body.classList.contains('nav-open'); return; }
    document.body.classList.add('panel-collapsed'); LS.set('panelCollapsed', true);
  }
  function renderPanel() {
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === S.tab));
    const body = $('#panelBody');
    if (S.tab === 'write') body.innerHTML = writeView();
    else if (S.tab === 'page') body.innerHTML = listView(visibleEntries().filter((e) => S.page && splitKey(e.key)[0] === S.page.id), true);
    else if (S.tab === 'added') body.innerHTML = addedView();
    else body.innerHTML = allView();
    bindPanel();
    renderFoot();
  }
  function writeView() {
    const mode = canWrite() ? '' : `<div class="notice">いまは<strong>この端末の下書き</strong>として保存されます。共有するには <button type="button" class="btn small" data-act="key">編集キーで解除</button></div>`;
    // H1：作者の追記は JSON。旧「修正案」欄には絶対に出さない（生JSONを普通文で置き換えさせない）
    if (S.page && S.anchor && isAuthorAnchor(S.anchor)) {
      const hit = authorEntries().find((x) => x.key === keyOf(S.page.id, S.anchor));
      return mode + `<div class="notice">ここは<strong>作者の追記</strong>です。この欄では編集しません（追記はJSONで保存するため）。</div>
        <div class="row-actions"><button type="button" class="btn small primary" data-act="ab-open">${hit ? '追記として直す' : '追記タブで確かめる'}</button><button type="button" class="btn small" data-act="deselect">選択を解除</button></div>`;
    }
    if (!S.page || !S.anchor) {
      return mode + `<div class="empty-state"><div class="big">✎</div>本文の直したい段落・台詞・表の行に<br>カーソルを合わせて「✎」を押すと、<br>その箇所の修正案を書けます。<br><br>本文をそのまま書き直すときは「直す」（段をダブルクリックでも）、消したい段には「削除」で印を付けます。見出しの「節ごと削除」は、次の同じ大きさの見出しまでに印が付きます。</div>`;
    }
    const key = keyOf(S.page.id, S.anchor); const e = entry(key); const el = findAnchor(S.anchor);
    const ex = excerptOf(el) || (e.title.split('｜').slice(1).join('｜'));
    const conflict = S.status[key] === 'conflict' && e.server ? `<div class="notice warn conflict"><strong>ほかの端末で更新されています。</strong>共有されている内容：<pre>${esc(e.server.content || '（空）')}</pre><div class="row-actions"><button type="button" class="btn small" data-act="take">共有の内容を使う</button><button type="button" class="btn small" data-act="overwrite">自分の内容で上書き</button></div></div>` : '';
    return mode + `
      <div class="target"><div class="target-page">${esc(S.page.nav)}</div><div class="target-text">${esc(ex) || '（見出し）'}</div><a href="#/${S.page.id}/${S.anchor}" data-act="goto">本文で表示</a></div>
      ${conflict}
      ${e.kind ? `<div class="notice">この段は<strong>${esc(KIND_LABEL[e.kind])}</strong>です。${e.kind === 'edit' ? '本文の「もう一度直す」か、下の欄で直せます。' : '本文の「削除を外す」で外せます。'}</div>` : ''}
      <label class="field-label" for="memoText">${esc(e.kind === 'edit' ? '直した文' : '修正案')}</label>
      <textarea id="memoText" class="memo-input" placeholder="どう直したいかを書いてください。&#10;例：「〇〇」を「△△」にする／この台詞はルークに言わせたい">${esc(e.content)}</textarea>
      <div class="seg" role="group" aria-label="状態"><button type="button" data-st="open" class="${!e.resolved ? 'on open' : ''}">未反映</button><button type="button" data-st="done" class="${e.resolved ? 'on done' : ''}">反映済み</button></div>
      <div id="saveState" class="save-state"></div>
      <div class="row-actions"><button type="button" class="btn small primary" data-act="save">保存</button>${(e.server || e.draft) ? '<button type="button" class="btn small danger" data-act="delete">削除</button>' : ''}<button type="button" class="btn small" data-act="deselect">選択を解除</button></div>`;
  }
  function stateLabel(e) {
    if (e.resolved) return '<span class="st done">反映済み</span>';
    if (e.draft && (!e.server || e.draft.content !== e.server.content || !!e.draft.resolved !== !!e.server.resolved)) return '<span class="st draft">下書き</span>';
    return '<span class="st open">未反映</span>';
  }
  function fmtTime(s) { if (!s) return ''; const d = new Date(s); return isNaN(d) ? '' : d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  function sortByDoc(list) {
    return list.sort((a, b) => {
      const [pa, aa] = splitKey(a.key); const [pb, ab] = splitKey(b.key);
      if (pa !== pb) return (pageIndex.get(pa) ?? 999) - (pageIndex.get(pb) ?? 999);
      if (S.page && pa === S.page.id) {
        const ea = findAnchor(aa); const eb = findAnchor(ab);
        if (ea && eb) return ea.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
      }
      return (a.updated || '').localeCompare(b.updated || '');
    });
  }
  function itemHtml(e, showPage) {
    const [pid, a] = splitKey(e.key); const p = pageById.get(pid);
    const onPage = S.page && pid === S.page.id; const lost = onPage && !findAnchor(a);
    // 反映済みで、本文が変わって旧い場所が無くなったものは「場所不明」にしない（作者の履歴を失わない）
    const lostTag = lost ? (e.resolved
      ? '<span class="st old" title="本仕様に反映済み。本文が変わったので旧い位置は見つかりません">本仕様へ反映済み（旧位置）</span>'
      : '<span class="st lost" title="本文が変わったため場所が見つかりません。要確認">場所不明（要確認）</span>') : '';
    const ex = (e.title || '').split('｜').slice(1).join('｜') || (onPage ? excerptOf(findAnchor(a)) : '');
    const active = S.page && S.anchor && e.key === keyOf(S.page.id, S.anchor);
    return `<button type="button" class="memo-item${active ? ' active' : ''}" data-key="${esc(e.key)}">
      <div class="mi-top">${stateLabel(e)}<span class="st kind k-${e.kind || 'note'}">${esc(KIND_LABEL[e.kind])}</span>${lostTag}${showPage && p ? `<span>${esc(p.nav)}</span>` : ''}<span style="margin-left:auto">${esc(fmtTime(e.updated))}</span></div>
      ${ex ? `<div class="mi-ex">${esc(ex)}</div>` : ''}
      <div class="mi-body${e.kind === 'del' || e.kind === 'del-sec' ? ' is-del' : ''}">${esc(e.content || '（空）')}</div></button>`;
  }
  function listView(list, onPage) {
    if (!list.length) return `<div class="empty-state">${onPage ? 'このページの修正案はまだありません。' : '修正案はまだありません。'}</div>`;
    return sortByDoc(list).map((e) => itemHtml(e, !onPage)).join('');
  }
  function allView() {
    const list = visibleEntries();
    const f = S.filter;
    const shown = list.filter((e) => f === 'all' || (f === 'open' ? !e.resolved : e.resolved));
    const counts = { open: list.filter((e) => !e.resolved).length, done: list.filter((e) => e.resolved).length, all: list.length };
    let html = `<div class="filters">${[['open', '未反映'], ['done', '反映済み'], ['all', 'すべて']].map(([k, l]) => `<button type="button" class="chip${f === k ? ' on' : ''}" data-filter="${k}">${l} ${counts[k]}</button>`).join('')}</div>
      <div class="export"><button type="button" class="btn small" data-act="md">未反映をMarkdownで保存</button><button type="button" class="btn small" data-act="copy">Markdownをコピー</button><button type="button" class="btn small" data-act="json">JSONバックアップ</button></div>`;
    if (!shown.length) return html + '<div class="empty-state">該当する修正案はありません。</div>';
    const byPage = new Map();
    for (const e of sortByDoc(shown)) { const pid = splitKey(e.key)[0]; if (!byPage.has(pid)) byPage.set(pid, []); byPage.get(pid).push(e); }
    for (const [pid, arr] of byPage) {
      const p = pageById.get(pid);
      html += `<div class="group-title">${esc(p ? (groupById.get(p.group).label + '｜' + p.nav) : pid)}</div>` + arr.map((e) => itemHtml(e, false)).join('');
    }
    if (S.legacyCount) html += `<p class="empty">他の版のメモ ${S.legacyCount} 件は <a href="${esc(CFG.v2Url || 'v2/')}" target="_blank" rel="noopener">旧INDEX</a> で見られます。</p>`;
    return html;
  }
  function renderSaveState() {
    const el = $('#saveState'); if (!el || !S.page || !S.anchor) return;
    const key = keyOf(S.page.id, S.anchor); const st = S.status[key]; const e = entry(key);
    const t = {
      saving: ['', '保存中…'], pending: ['', '入力中…（自動で保存します）'], saved: ['ok', '共有に保存しました' + (e.server ? '（' + fmtTime(e.server.updated_at) + '）' : '')],
      local: ['local', 'この端末に下書き保存しました（未共有）'], unconfirmed: ['local', '共有へ送信しました（読み戻しの確認が未完了）。下書きは残しています'], conflict: ['error', 'ほかの端末で更新されています。上の内容を確認してください。'], error: ['error', S.statusMsg[key] || '保存できませんでした。'],
    }[st];
    if (t) { el.className = 'save-state ' + t[0]; el.textContent = t[1]; return; }
    if (e.draft && canWrite()) { el.className = 'save-state local'; el.textContent = '未送信の下書きがあります。「保存」で共有に送ります。'; return; }
    if (e.draft) { el.className = 'save-state local'; el.textContent = 'この端末の下書き（未共有）'; return; }
    if (e.server) { el.className = 'save-state ok'; el.textContent = '共有済み（' + fmtTime(e.server.updated_at) + '）'; return; }
    el.className = 'save-state'; el.textContent = '';
  }
  function renderFoot() {
    const drafts = Object.keys(S.drafts).length;
    const parts = [];
    parts.push(`<span>${canWrite() ? '共有保存：解除済み' : '共有保存：閲覧のみ'}</span>`);
    if (S.sync.last) parts.push(`<span>取得 ${esc(S.sync.last.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }))}</span>`);
    parts.push('<button type="button" class="btn" data-act="reload">最新を取得</button>');
    if (drafts) parts.push(`<button type="button" class="btn${canWrite() ? ' primary' : ''}" data-act="syncdrafts">下書き ${drafts} 件を共有へ送る</button>`);
    $('#panelFoot').innerHTML = parts.join('');
  }
  function currentKey() { return S.page && S.anchor ? keyOf(S.page.id, S.anchor) : null; }
  function bindPanel() {
    const ta = $('#memoText');
    if (ta) {
      renderSaveState();
      ta.addEventListener('input', () => {
        const key = currentKey(); if (!key) return;
        const el = findAnchor(S.anchor);
        stage(key, { content: ta.value, title: S.page.nav + '｜' + excerptOf(el).slice(0, 160) });
        schedulePush(key); refreshMarks(); updateCounts(false);
      });
      ta.addEventListener('blur', () => { const key = currentKey(); if (key && S.drafts[key] && canWrite()) push(key); });
    }
  }
  function updateCounts(full = true) {
    const n = visibleEntries().filter((e) => !e.resolved).length;
    $('#memoCount').textContent = n; $('#stripCount').textContent = n;
    if (full) { renderGroups(); renderPagesCol(); const b = $('#pageMemos'); if (b && S.page) b.textContent = 'このページの修正案 ' + memoCountFor(S.page.id); }
  }
  function refreshAll() { refreshMarks(); updateCounts(); renderPanel(); }

  // ---------- エクスポート ----------
  function download(name, text, type) {
    const blob = new Blob([text], { type }); const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function markdown(onlyOpen = true) {
    const list = sortByDoc(visibleEntries().filter((e) => !onlyOpen || !e.resolved));
    const day = new Date().toLocaleDateString('ja-JP');
    let md = `# ダンジョン・オブ・ザ・マーダー 修正案${onlyOpen ? '（未反映）' : ''} ${day}\n\n全 ${list.length} 件。サイト：${location.origin + location.pathname}\n`;
    let last = '';
    for (const e of list) {
      const [pid, a] = splitKey(e.key); const p = pageById.get(pid);
      if (pid !== last) { md += `\n## ${p ? groupById.get(p.group).label + '｜' + p.nav : pid}\n${p && p.source ? `元ファイル：content/${p.source}\n` : ''}`; last = pid; }
      const ex = (e.title || '').split('｜').slice(1).join('｜');
      md += `\n- 対象：${(ex || '（見出し・その他）').replace(/\n/g, '\n    ')}\n  - 場所：#/${pid}/${a}\n  - 種類：${KIND_LABEL[e.kind]}\n  - ${e.kind === 'edit' ? '直した文' : '修正案'}：${(e.content || '').replace(/\n/g, '\n    ')}\n`;
    }
    return md;
  }

  // ---------- 編集キー ----------
  function renderAuth() {
    const b = $('#btnKey');
    $('#keyLabel').textContent = canWrite() ? '解除済み' : '編集キー';
    b.classList.toggle('on', canWrite());
    setSync(S.sync.state === 'idle' ? 'idle' : S.sync.state, S.sync.error);
  }
  function openKeyDialog() {
    const dlg = $('#keyDialog');
    if (canWrite()) {
      $('#keyBody').innerHTML = `<p>この端末は解除済みです（期限：${esc(new Date(S.session.expiresAt).toLocaleDateString('ja-JP'))}）。修正案は共有保存（Cloudflare D1）に保存されます。</p>`;
      $('#keyActions').innerHTML = '<button type="button" class="btn danger" data-k="lock">この端末をロックする</button><button type="submit" class="btn primary" value="close">閉じる</button>';
    } else {
      $('#keyBody').innerHTML = `<p>作者用の編集キーを入れると、修正案がほかの端末と共有されます（30日間有効）。閲覧だけならキーは要りません。</p><input type="password" id="keyInput" autocomplete="current-password" placeholder="編集キー"><p id="keyErr" class="save-state error"></p>`;
      $('#keyActions').innerHTML = '<button type="submit" class="btn" value="cancel">キャンセル</button><button type="button" class="btn primary" data-k="unlock">解除する</button>';
    }
    dlg.showModal();
    const inp = $('#keyInput'); if (inp) { inp.focus(); inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); unlock(); } }); }
  }
  async function unlock() {
    const inp = $('#keyInput'); if (!inp || !inp.value) return;
    try {
      const s = await api('/api/auth/unlock', 'POST', { key: inp.value });
      S.session = s; LS.set('session', s); inp.value = '';
      $('#keyDialog').close(); renderAuth(); toast('解除しました。修正案は共有に保存されます。');
      await loadMemos(true);
      if (Object.keys(S.drafts).length) await syncDrafts();
    } catch (e) { $('#keyErr').textContent = e.message; }
  }
  async function lock() {
    try { if (S.session) await api('/api/auth/lock', 'POST', {}); } catch { /* noop */ }
    S.session = null; LS.del('session'); $('#keyDialog').close(); renderAuth(); renderPanel(); toast('この端末をロックしました。');
  }

  // ---------- トースト ----------
  let toastTimer = null;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600); }

  // ---------- 作者追記レイヤー（character='add'。既存の修正案と混ぜない） ----------
  const AL = window.AuthorLayer || null;
  const AUTHOR_GROUP = { id: 'author-added', label: '作者のページ', icon: 'doc' };
  const AUTHOR_TYPE_LABEL = { page: 'ページ', section: '節', para: '段落' };
  const AUTHOR_VIS_LABEL = { make: '▲制作', gm: '■GMだけ', pl: '◎PL可' };
  const isAuthorAnchor = (a) => /^x-/.test(String(a || ''));
  const authorTypeOf = (rec) => AUTHOR_TYPE_LABEL[rec && rec.type] || '追記';
  const cssEsc = (s) => (window.CSS && CSS.escape ? CSS.escape(String(s)) : String(s).replace(/["\\]/g, '\\$&'));
  const pageTitleOf = (pageId) => { const p = pageById.get(pageId); return p ? p.nav.replace(/^★\s*/, '') : pageId; };

  // 追記レコード（memo.character='add' と下書き kind='add'）を読む。壊れたものは表示しない（AuthorLayer.errors に理由）。
  // 追記(kind='add')の content が読める JSON かどうか。stage/push の防御に使う（H1）。
  function authorLayerOk(pageId, sectionId, content) {
    if (!AL) return false;
    return !!AL.parseLayer({ page_id: PAGE_PREFIX + pageId, section_id: sectionId, content: String(content ?? ''), character: 'add' });
  }
  function authorEntries() {
    if (!AL) return [];
    const out = [];
    for (const key of allKeys()) {
      const e = entry(key);
      if (e.kind !== 'add') continue;
      const [pid, sid] = splitKey(key);
      const rec = AL.parseLayer({ page_id: PAGE_PREFIX + pid, section_id: sid, content: e.content, character: 'add' });
      if (!rec) continue;
      out.push({ rec, key, e });
    }
    return out;
  }
  // 作者の新しいページ（u-…）を、既存の pages / 目次 / 検索 / ルーティングに載せる。build で焼かれていなくても復元する。
  function syncAuthorPages() {
    if (!AL) return;
    const recs = authorEntries();
    const keep = pages.filter((p) => !p.authorPage);
    const pseudo = recs.filter((x) => x.rec.type === 'page' && !x.rec.deleted).map(({ rec }) => {
      const blocks = recs.filter((x) => x.rec.type !== 'page' && x.rec.pageId === rec.pageId);
      return {
        id: rec.pageId, group: AUTHOR_GROUP.id, nav: '★ ' + (rec.title || '無題'), title: rec.title || '（無題）',
        kind: 'author', authorPage: true, vis: { k: rec.vis === 'pl' ? 'all' : 'make', plOpen: rec.vis === 'pl' }, toc: [], html: '', shots: null, source: '',
        text: [rec.title, rec.body].concat(blocks.map((b) => (b.rec.title || '') + ' ' + (b.rec.body || ''))).join(' '),
      };
    });
    pages.length = 0;
    for (const p of keep) pages.push(p);
    for (const p of pseudo) pages.push(p);
    pageById.clear(); pages.forEach((p) => pageById.set(p.id, p));
    pageIndex.clear(); pages.forEach((p, i) => pageIndex.set(p.id, i));
    if (!D.groups.some((g) => g.id === AUTHOR_GROUP.id)) D.groups.push(AUTHOR_GROUP);
    if (!groupById.has(AUTHOR_GROUP.id)) groupById.set(AUTHOR_GROUP.id, AUTHOR_GROUP);
  }
  function authorStub(id) {
    const stub = { id, group: AUTHOR_GROUP.id, nav: '★ 読み込み中', title: '読み込み中', kind: 'author', authorPage: true, pending: true, vis: { k: 'make' }, toc: [], html: '', shots: null, source: '', text: '' };
    pages.push(stub); pageById.set(stub.id, stub); pageIndex.set(stub.id, pages.length - 1);
    if (!D.groups.some((g) => g.id === AUTHOR_GROUP.id)) D.groups.push(AUTHOR_GROUP);
    if (!groupById.has(AUTHOR_GROUP.id)) groupById.set(AUTHOR_GROUP.id, AUTHOR_GROUP);
    return stub;
  }
  function pageAnchors(host) {
    const box = host || $('#page .page-body');
    if (!box) return [];
    return $$('[data-a]', box).filter((el) => !el.closest('.ablock')).map((el, i) => ({ a: el.dataset.a, text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), idx: i }));
  }
  function authorStatusOf(item) {
    if (item.rec.deleted) return '削除予定';
    if (item.e.draft && !item.e.server) return '下書き';
    if (item.e.draft) return '下書き（共有は旧い内容）';
    return '共有済み';
  }
  function elText(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; n.textContent = text; return n; }
  function authorBlockEl(item, how) {
    const { rec, key } = item;
    const el = document.createElement('div');
    el.className = 'ablock' + (rec.deleted ? ' is-deleted' : '') + (rec.type === 'section' ? ' ab-section' : '') + (rec.vis === 'pl' && plMode() ? ' ab-ok-pl' : '');
    el.dataset.a = AL.sectionIdOf(rec);
    el.dataset.layer = 'author';
    el.dataset.type = rec.type;
    el.dataset.key = key;
    const head = document.createElement('div'); head.className = 'ab-head';
    head.appendChild(elText('span', 'ab-badge', '作者の追記'));
    head.appendChild(elText('span', 'ab-meta', authorTypeOf(rec) + '・' + (AUTHOR_VIS_LABEL[rec.vis] || '▲制作')));
    head.appendChild(elText('span', 'ab-meta ab-st', authorStatusOf(item) + (how === 'text' ? '・位置を推定' : '') + (how === 'none' ? '・位置不明' : '')));
    if (!plMode()) {
      const tools = document.createElement('span'); tools.className = 'ab-tools';
      const mk = (act, label, cls) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small' + (cls ? ' ' + cls : ''); b.dataset.ab = act; b.dataset.key = key; b.textContent = label; return b; };
      tools.appendChild(mk('edit', '直す'));
      tools.appendChild(mk('toggle-del', rec.deleted ? '削除を戻す' : '削除の印'));
      tools.appendChild(mk('add-after', '後ろに足す'));
      tools.appendChild(mk('purge', '完全に消す', 'danger'));
      head.appendChild(tools);
    }
    el.appendChild(head);
    if (rec.title) el.appendChild(elText('div', 'ab-title', rec.title));
    const body = document.createElement('div'); body.className = 'ab-body';
    const text = String(rec.body || '');
    if (!text.trim() && !rec.title) body.appendChild(elText('span', 'ab-empty', '（本文はまだありません）'));
    else text.split('\n').forEach((line, i) => { if (i) body.appendChild(document.createElement('br')); body.appendChild(document.createTextNode(line)); });
    el.appendChild(body);
    return el;
  }
  function renderAuthorLayer(p = S.page, hostSel = '#page .page-body') {
    if (!AL || !p) return;
    const host = $(hostSel);
    if (!host) return;
    $$('.ablock, #authorOrphans, .ab-foot', host).forEach((n) => n.remove());
    const all = authorEntries().filter((x) => x.rec.pageId === p.id && x.rec.type !== 'page');
    const shown = all.filter((x) => (plMode() ? x.rec.vis === 'pl' && !x.rec.deleted : true));
    if (!shown.length) return;
    const anchors = pageAnchors(host);
    const chain = shown.filter((x) => isAuthorAnchor(x.rec.after && x.rec.after.a));
    const plain = shown.filter((x) => !isAuthorAnchor(x.rec.after && x.rec.after.a));
    const res = AL.resolvePlacements(anchors, plain.map((x) => x.rec));
    const byUuid = new Map(plain.map((x) => [x.rec.uuid, x]));
    const children = new Map();
    for (const x of chain) {
      const parent = String(x.rec.after.a).slice(2);
      if (!children.has(parent)) children.set(parent, []);
      children.get(parent).push(x);
    }
    for (const arr of children.values()) arr.sort((a, b) => ((Number(a.rec.order) || 0) - (Number(b.rec.order) || 0)) || String(a.rec.uuid).localeCompare(String(b.rec.uuid)));
    const emitted = new Set();
    const emit = (item, afterEl, how) => {
      if (emitted.has(item.key)) return afterEl;
      emitted.add(item.key);
      const el = authorBlockEl(item, how);
      if (afterEl) afterEl.insertAdjacentElement('afterend', el); else host.insertBefore(el, host.firstElementChild);
      let last = el;
      for (const child of (children.get(item.rec.uuid) || [])) last = emit(child, last, 'anchor');
      return last;
    };
    const groups = new Map();
    for (const it of res.placed) { if (!groups.has(it.afterA)) groups.set(it.afterA, []); groups.get(it.afterA).push(it); }
    for (const it of (groups.get('@top') || [])) { const item = byUuid.get(it.rec.uuid); if (item) emit(item, null, it.how); }
    for (const [a, arr] of groups) {
      if (a === '@top') continue;
      const anchorEl = host.querySelector('[data-a="' + cssEsc(a) + '"]');
      let last = anchorEl;
      for (const it of arr) {
        const item = byUuid.get(it.rec.uuid); if (!item) continue;
        last = emit(item, last, it.how);
      }
    }
    // 置き場所が決まらないものは、捨てずに「位置不明」の箱へ（件数も出す）
    const lost = shown.filter((x) => !emitted.has(x.key));
    const orphanBox = () => {
      let box = $('.ab-orphan', host);
      if (!box) { box = document.createElement('div'); box.className = 'ab-orphan'; box.id = 'authorOrphans'; host.appendChild(box); box.appendChild(elText('div', 'ab-orphan-head', '')); }
      return box;
    };
    if (lost.length) {
      const box = orphanBox();
      const head = $('.ab-orphan-head', box);
      if (head) head.textContent = '位置不明の追記（本文が変わって置き場所が決まらないもの）' + lost.length + '件';
      for (const item of lost) { const el = authorBlockEl(item, 'none'); el.classList.add('ab-lost'); box.appendChild(el); }
    }
    if (!plMode()) {
      const drafts = all.filter((x) => x.e.draft && !x.e.server).length;
      const shared = all.filter((x) => x.e.server).length;
      const dels = all.filter((x) => x.rec.deleted).length;
      host.appendChild(elText('div', 'ab-foot', '作者の追記 ' + all.length + '件（共有 ' + shared + '／下書き ' + drafts + '／削除予定 ' + dels + '／位置不明 ' + res.orphan.length + '）'));
    }
  }

  // 追記を足す／直す画面（フォームはダイアログ。編集中の再取得で壊さない）
  const C = { open: false, mode: 'new', type: 'para', pageId: '', anchor: null, chainUuid: '', key: null, tempUuid: null };
  function composerBasePageId() { return C.pageId || (S.page ? S.page.id : ''); }
  function composerAfter() {
    const pos = $('#addPos').value;
    const type = $('#addType').value;
    if (type === 'page') return { a: '@top', text: '', idx: -1 };
    if (pos === 'top') return { a: '@top', text: '', idx: -1 };
    if (pos === 'after' && C.anchor) {
      if (isAuthorAnchor(C.anchor)) return { a: C.anchor, text: '', idx: -1 };
      const el = $(`#page .page-body [data-a="${cssEsc(C.anchor)}"]`);
      const text = el ? (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40) : '';
      const idx = pageAnchors().findIndex((x) => x.a === C.anchor);
      return { a: C.anchor, text, idx: idx < 0 ? -1 : idx };
    }
    if (pos === 'chain' && C.chainUuid) return { a: 'x-' + C.chainUuid, text: '', idx: -1 };
    const anchors = pageAnchors();
    const last = anchors.length ? anchors[anchors.length - 1] : null;
    return last ? { a: last.a, text: last.text, idx: last.idx } : { a: '@top', text: '', idx: -1 };
  }
  function composerOrder(after) {
    if (!AL) return 1;
    const pageId = composerBasePageId();
    const sibs = authorEntries().filter((x) => x.rec.pageId === pageId && x.rec.type !== 'page' && x.rec.after && x.rec.after.a === after.a).map((x) => Number(x.rec.order) || 0);
    if (after.a === '@top') return AL.orderBetween(null, sibs.length ? Math.min(...sibs) : null);
    return AL.orderBetween(sibs.length ? Math.max(...sibs) : null, null);
  }
  function composerRecord() {
    const type = $('#addType').value;
    const heading = $('#addHeading').value;
    const body = $('#addBody').value;
    const vis = $('#addVis').value;
    if (C.mode === 'edit' && C.key) {
      const hit = authorEntries().find((x) => x.key === C.key);
      if (!hit) throw new Error('この追記が見つかりません。読み込み直してください。');
      const rec = AL.applyEdit(hit.rec, { body, title: heading });
      return { rec: { ...rec, vis: hit.rec.vis }, pageTitle: pageTitleOf(rec.pageId), edit: true };
    }
    if (type === 'page' && !(heading || '').trim()) throw new Error('新しいページには見出し（ページ名）を入れてください。');
    const after = composerAfter();
    const order = composerOrder(after);
    const pageId = type === 'page' ? '' : composerBasePageId();
    const rec = AL.newRec({ pageId, type, after, order, title: heading, body, vis });
    return { rec, pageTitle: type === 'page' ? '' : pageTitleOf(rec.pageId) };
  }
  function refreshAddInfo() {
    const info = $('#addInfo'); if (!info) return;
    const type = $('#addType').value;
    const pos = $('#addPos');
    if (type === 'page') { pos.value = 'top'; pos.disabled = true; } else if (C.mode !== 'edit') pos.disabled = false;
    if ($('#addHeading')) $('#addHeading').disabled = type === 'para';
    const body = $('#addBody') ? $('#addBody').value : '';
    let size = 0; let err = '';
    try {
      const { rec, pageTitle } = composerRecord();
      size = AL.serializeLayer({ ...rec, pageTitle }).content.length;
    } catch (e) { err = e.message; }
    const room = AL.MAX_CONTENT - size;
    const cls = err ? 'save-state error' : room < 400 ? 'save-state local' : 'save-state';
    info.className = cls;
    if (err) info.textContent = err;
    else info.textContent = '本文 ' + body.length + '／' + AL.MAX_BODY + '字。共有の保存は ' + size + '／' + AL.MAX_CONTENT + '字（残り ' + room + '字）。' + (body.length > AL.MAX_BODY ? ' 本文が長すぎます。' : '');
    const save = $('[data-add="save"]'); if (save) save.disabled = !!err || body.length > AL.MAX_BODY;
  }
  function openComposer(opts = {}) {
    if (!AL) { toast('作者の追記はこの版では使えません。'); return; }
    if (plMode()) { toast('プレイヤー表示中は追記を編集しません。表示を「すべて表示」に戻してから操作してください。'); return; }
    if (!S.page) return;
    const dlg = $('#addDialog'); if (!dlg) return;
    C.open = true; C.mode = opts.mode === 'edit' ? 'edit' : 'new'; C.key = opts.key || null;
    C.anchor = opts.anchor || null; C.chainUuid = opts.chainUuid || '';
    C.pageId = opts.pageId || S.page.id;
    C.tempUuid = '00000000-0000-4000-a000-000000000000';
    $('#addType').value = opts.type || 'para';
    $('#addPos').value = opts.pos || (C.anchor ? 'after' : 'end');
    $('#addHeading').value = ''; $('#addBody').value = ''; $('#addVis').value = 'make';
    $('#addType').disabled = C.mode === 'edit'; $('#addPos').disabled = C.mode === 'edit'; $('#addVis').disabled = C.mode === 'edit';
    const purge = $('[data-add="purge"]'); if (purge) purge.hidden = true;
    if (C.mode === 'edit') {
      const hit = authorEntries().find((x) => x.key === C.key);
      if (!hit) { C.open = false; toast('この追記が見つかりません。読み込み直してください。'); return; }
      C.pageId = hit.rec.pageId;
      // R1：編集を始めた時点の共有 revision を土台として覚える（フォームを開いている間に相手が更新しても、
      //   保存時にそのまま上書きしない。土台は開いたときの revision に固定）
      const srv = S.memos.get(C.key);
      C.baseRevision = srv && typeof srv.revision === 'number' ? srv.revision : null;
      $('#addType').value = hit.rec.type; $('#addHeading').value = hit.rec.title; $('#addBody').value = hit.rec.body; $('#addVis').value = hit.rec.vis;
      $('#addTitle').textContent = '作者の追記を直す（' + authorTypeOf(hit.rec) + '）';
      if (purge) purge.hidden = false;
    } else {
      $('#addTitle').textContent = '作者の追記を足す（' + (opts.type === 'page' ? '新しいページ' : pageTitleOf(C.pageId)) + '）';
    }
    refreshAddInfo();
    if (!dlg.open) dlg.showModal();
    const ta = $('#addBody'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }
  function closeComposer() { const dlg = $('#addDialog'); if (dlg && dlg.open) dlg.close(); C.open = false; C.key = null; C.anchor = null; C.chainUuid = ''; }
  // 共有の保存は、成功の応答だけで「共有済み」としない。GET で読み戻して、同じ ID・同じ内容を確かめる。
  // GET が失敗したら「送信済・確認未完了」として下書きを戻す（古い S.memos を確認の証拠にしない）。
  async function saveAddRecord(key) {
    const d = S.drafts[key];
    const want = d ? String(d.content || '') : '';
    const snapshot = d ? { ...d } : null;
    if (want.length > AL.MAX_CONTENT) return { ok: false, state: 'error', message: '共有の上限 ' + AL.MAX_CONTENT + '字を超えるため送れません（切り詰めません）' };
    const wasWritable = canWrite();
    const ok = await push(key, { confirmOverwrite: true });
    if (!ok) {
      const st = S.status[key];
      // R3：解除済み（認証あり）で通信に失敗したときは、フォームを閉じずに端末の下書きとして残す
      if (st === 'local' && wasWritable) return { ok: false, state: 'local', message: '共有へ送れませんでした（通信）。入力は端末の下書きに残しています' };
      if (st === 'local') return { ok: true, local: true, message: 'この端末にだけ保存しました（未共有）。' };
      return { ok: false, state: st, message: st === 'conflict' ? 'ほかの端末で更新されています。下書きは残しています。' : (S.statusMsg[key] || '保存できませんでした。下書きは残しています。') };
    }
    if (!canWrite()) return { ok: true, local: true, message: 'この端末にだけ保存しました（未共有）。' };
    // 送信の応答（POST/PUT）の ID。読み戻しが同じ ID・同じ内容のときだけ「確認済み」と言う
    const sent = S.memos.get(key);
    const sentId = sent ? sent.id : null;
    const loaded = await loadMemos(true);
    const restoreDraft = () => {
      if (S.drafts[key] || !snapshot) return;
      S.drafts[key] = snapshot; LS.set('drafts', S.drafts);
    };
    if (!loaded) {
      restoreDraft();
      setStatus(key, 'error', '送信は成功しましたが、読み戻しで確認できませんでした。');
      return { ok: false, state: 'unconfirmed', message: '共有への送信は成功しましたが、読み戻しで確認できませんでした（確認未完了）。下書きは残しています。' };
    }
    const got = S.memos.get(key);
    if (!got) { restoreDraft(); setStatus(key, 'error', '読み戻せませんでした。'); return { ok: false, state: 'error', message: '共有に保存した追記を読み戻せませんでした' }; }
    if ((sentId && got.id !== sentId) || String(got.content || '') !== want) {
      restoreDraft();
      setStatus(key, 'conflict', '読み戻した内容が保存した内容と一致しません');
      return { ok: false, state: 'conflict', message: '読み戻した内容が保存した内容と一致しません' };
    }
    setStatus(key, 'saved');
    updateCounts(false);
    return { ok: true, message: '共有に保存し、読み戻しで確認しました（' + fmtTime(got.updated_at) + '）。' };
  }
  async function saveComposer() {
    const info = $('#addInfo');
    let built;
    try { built = composerRecord(); } catch (e) { info.className = 'save-state error'; info.textContent = e.message; return; }
    let memo;
    try { memo = AL.serializeLayer({ ...built.rec, pageTitle: built.pageTitle }); } catch (e) {
      info.className = 'save-state error';
      info.textContent = (e.code === 'too-large' ? e.message + '（' + e.size + '字）' : e.message) + ' 入力はそのまま残しています。';
      return;   // 切り詰めて保存しない
    }
    const rec = built.rec;
    const key = keyOf(rec.pageId, AL.sectionIdOf(rec));
    const isNewPage = rec.type === 'page' && !(S.page && S.page.id === rec.pageId);
    const stagePatch = { kind: 'add', content: memo.content, title: memo.title, resolved: false };
    if (C.mode === 'edit' && Object.prototype.hasOwnProperty.call(C, 'baseRevision')) stagePatch.baseRevision = C.baseRevision;
    stage(key, stagePatch);
    info.className = 'save-state'; info.textContent = '保存中…';
    const res = await saveAddRecord(key);
    if (!res.ok) {
      info.className = 'save-state ' + (res.state === 'local' ? 'local' : 'error');
      info.textContent = res.message + '（入力はこのまま残しています。もう一度「保存」で送れます）';
      syncAuthorPages(); renderGroups(); renderPagesCol();
      return;
    }
    closeComposer();
    syncAuthorPages(); renderGroups(); renderPagesCol();
    if (isNewPage) { location.hash = '#/' + rec.pageId; }
    else if (S.page) { if (S.page.authorPage) renderAuthorPage(S.page, S.anchor); else renderAuthorLayer(S.page); refreshMarks(); }
    renderPanel(); updateCounts();
    toast(res.message);
  }
  async function setAuthorDeleted(key, deleted) {
    const hit = authorEntries().find((x) => x.key === key);
    if (!hit) return;
    const rec = AL.applyEdit(hit.rec, { deleted });
    let memo;
    try { memo = AL.serializeLayer({ ...rec, pageTitle: pageTitleOf(rec.pageId) }); } catch (e) { toast(e.message); return; }
    stage(key, { kind: 'add', content: memo.content, title: memo.title, resolved: false });
    const res = await saveAddRecord(key);
    toast(res.message);
    if (S.page) { if (S.page.authorPage) renderAuthorPage(S.page, S.anchor); else renderAuthorLayer(S.page); }
    refreshMarks(); renderPanel(); updateCounts();
  }
  async function purgeAuthor(key) {
    if (!confirm('この追記を完全に消しますか？（1/2）戻せるのは「削除の印」までです。')) return;
    if (!confirm('共有の記録も消します。元に戻せません。本当に消しますか？（2/2）')) return;
    const ok = await removeMemo(key);
    syncAuthorPages(); renderGroups(); renderPagesCol();
    if (S.page) { if (S.page.authorPage) renderAuthorPage(S.page, S.anchor); else renderAuthorLayer(S.page); }
    refreshMarks(); renderPanel(); updateCounts();
    // L1：消せなかったのに「完全に消しました」と言わない（下書きも残っている）
    if (ok) toast('追記を完全に消しました。');
    else toast('追記を消せませんでした。下書き・共有の記録はそのまま残しています。');
  }
  // PL／本人表示で、作者ページ（vis=make・gm）を直接URLで開いたときの表示。
  // 見出し・説明・crumbs・document.title に、作者の make 情報を出さない（M1）。vis=pl のページは通常表示。
  function renderAuthorPageLimited() {
    $('#page').innerHTML = `
      <header class="page-head">
        <div class="crumbs"><span>${esc(AUTHOR_GROUP.label)}</span><span>制作向け</span></div>
        <h1 class="page-title">制作の記録</h1>
        <div class="vis-legend"><span class="lg-t">印</span><span class="kc v-make">▲制作</span></div>
        <div class="page-meta"><span class="tagchip vis-tag v-make">▲制作</span></div>
      </header>
      <div class="page-body"><div class="pl-empty" data-layer="author">このページは制作向けのため、いまの表示（プレイヤーが見える情報）では表示しません。<button type="button" class="btn small" data-view="all">すべて表示に戻す</button></div></div>`;
    document.title = '制作の記録｜ダンジョン・オブ・ザ・マーダー 制作INDEX';
    $('#pencil').hidden = true;
    if ($('#editBar')) $('#editBar').hidden = true;
    S.fixing = null; S.anchor = null;
    renderGroups(); renderPagesCol(); renderPanel();
  }
  function renderAuthorPage(p, anchor) {
    S.page = p; S.group = p.group;
    const hit = authorEntries().find((x) => x.rec.type === 'page' && x.rec.pageId === p.id);
    const rec = hit ? hit.rec : null;
    // 権限の判定は、ヘッダを組み立てる前。PL／本人表示では make・gm の作者ページを出さない
    if (plMode() && !(rec && rec.vis === 'pl' && !rec.deleted)) { renderAuthorPageLimited(); return; }
    const g = groupById.get(p.group);
    $('#page').innerHTML = `
      <header class="page-head">
        <div class="crumbs"><span>${esc(g ? g.label : '作者のページ')}</span><span>${esc(p.nav)}</span></div>
        <h1 class="page-title"></h1>
        <div class="vis-legend"><span class="lg-t">印</span><span class="kc v-make">▲制作</span><span class="ab-note">作者が足したページです。原稿へは自動で入りません。</span></div>
        <div class="page-meta"><span class="tagchip vis-tag v-make">▲制作</span><span class="src">#/${esc(p.id)}</span>
          ${plMode() ? '' : '<button type="button" class="btn small" id="pageAdded">作者が足した文</button>'}
          <span id="authorPageTools"${plMode() ? ' hidden' : ''}><button type="button" class="btn small" id="authorPageEdit"${rec ? '' : ' disabled'}>ページ名と説明を直す</button><button type="button" class="btn small" id="pageAdd">＋このページに足す</button></span>
        </div>
      </header>
      <div class="page-body"><div class="ab-intro" id="authorIntro"></div><div id="authorBlocks"></div></div>`;
    $('#page .page-title').textContent = (rec && rec.title) || (hit ? '（無題）' : '読み込み中');
    const intro = $('#authorIntro');
    if (rec && rec.body) {
      const t = String(rec.body);
      t.split('\n').forEach((line, i) => { if (i) intro.appendChild(document.createElement('br')); intro.appendChild(document.createTextNode(line)); });
      if (rec.deleted) intro.classList.add('is-deleted');
    } else intro.textContent = hit ? '（このページの説明はまだありません。「ページ名と説明を直す」で足せます）' : '（読み込み中）';
    document.title = ((rec && rec.title) || p.nav) + '｜ダンジョン・オブ・ザ・マーダー 制作INDEX';
    const pageAdd = $('#pageAdd'); if (pageAdd) pageAdd.addEventListener('click', () => openComposer({ mode: 'new', type: 'para', pageId: p.id, pos: 'end' }));
    const pageEdit = $('#authorPageEdit'); if (pageEdit) pageEdit.addEventListener('click', () => { const h = authorEntries().find((x) => x.rec.type === 'page' && x.rec.pageId === p.id); if (h) openComposer({ mode: 'edit', key: h.key }); });
    if ($('#pageAdded')) $('#pageAdded').addEventListener('click', () => openPanel('added'));
    renderAuthorLayer(p, '#authorBlocks');
    renderGroups(); renderPagesCol();
    if (anchor) requestAnimationFrame(() => { const el = findAnchor(anchor); if (el) { openParents(el); el.scrollIntoView({ block: 'center' }); } });
    else $('#main').scrollTop = 0;
    renderPanel();
  }

  // タブ「作者が足した文」— 既存の修正案・場所不明・書き出しとは別に扱う
  function authorItemHtml(item) {
    const { rec, key } = item;
    const p = pageById.get(rec.pageId);
    const st = authorStatusOf(item);
    const ex = String(rec.body || '').replace(/\s+/g, ' ').slice(0, 120);
    return `<div class="memo-item ab-item${rec.deleted ? ' is-deleted' : ''}" data-key="${esc(key)}" data-ab-item="1">
      <div class="mi-top"><span class="st ${st === '共有済み' ? 'done' : 'draft'}">${esc(st)}</span><span class="st kind k-add">${esc(authorTypeOf(rec))}</span><span>${esc(AUTHOR_VIS_LABEL[rec.vis] || '▲制作')}</span><span>${esc(p ? p.nav : rec.pageId)}</span><span style="margin-left:auto">${esc(fmtTime(item.e.updated))}</span></div>
      ${rec.title ? `<div class="mi-ex">${esc(rec.title)}</div>` : ''}
      <div class="mi-body">${esc(ex || '（本文なし）')}</div>
      <div class="ab-actions"><button type="button" class="btn small" data-ab="edit" data-key="${esc(key)}">直す</button><button type="button" class="btn small" data-ab="toggle-del" data-key="${esc(key)}">${rec.deleted ? '削除を戻す' : '削除の印'}</button><button type="button" class="btn small danger" data-ab="purge" data-key="${esc(key)}">完全に消す</button><button type="button" class="btn small" data-ab="goto" data-key="${esc(key)}">本文で表示</button></div>
    </div>`;
  }
  function addedView() {
    // R2：PL／本人表示では、作者追記の一覧・件数・生データ・書き出しを出さない（汎用の案内だけ）。
    //   本文中の vis=pl の追記は本文側（renderAuthorLayer）で今までどおり見せる。
    if (plMode()) return '<div class="notice">作者が足した文の一覧・書き出しは、いまの表示（プレイヤーが見る情報）では出しません。表示を「すべて表示」に戻すと操作できます。</div>';
    const list = authorEntries();
    const bad = AL ? AL.errors.length : 0;
    const drafts = list.filter((x) => x.e.draft && !x.e.server).length;
    const shared = list.filter((x) => x.e.server).length;
    const dels = list.filter((x) => x.rec.deleted).length;
    let html = `<div class="notice">作者が足したページ・節・段落は、ここにだけ出します（修正案・場所不明・既存の書き出しには混ぜません）。原稿へは自動で入りません。</div>
      <div class="filters"><span class="chip on">全 ${list.length}</span><span class="chip">共有 ${shared}</span><span class="chip">下書き ${drafts}</span><span class="chip">削除予定 ${dels}</span>${bad ? `<span class="chip">読めない追記 ${bad}</span>` : ''}</div>
      <div class="export"><button type="button" class="btn small" data-act="a-json">追記をJSONで保存</button><button type="button" class="btn small" data-act="a-md">追記をMarkdownで保存</button><button type="button" class="btn small" data-act="a-copy">Markdownをコピー</button></div>`;
    // H1：JSONとして読めない追記の下書きは、黙って捨てず中身を見せて書き出せるようにする（値の保全）。
    const broken = Object.entries(S.drafts).filter(([k, d]) => {
      if (!d || d.kind !== 'add') return false;
      const [pid, sid] = splitKey(k);
      return !authorLayerOk(pid, sid, d.content);
    });
    if (broken.length) {
      html += `<div class="notice warn"><strong>読めない追記の下書き ${broken.length}件</strong>（JSONとして読めないため共有へは送りません。中身はそのまま残しています）` +
        broken.map(([k, d]) => `<details><summary>${esc(k)}</summary><pre class="ab-raw">${esc(String(d.content || ''))}</pre><button type="button" class="btn small danger" data-ab="drop-broken" data-key="${esc(k)}">この下書きを端末から消す</button></details>`).join('') + '</div>';
    }
    if (!list.length) return html + '<div class="empty-state">作者が足した文はまだありません。本文の段にカーソルを合わせて「＋足す」、または目の上の「＋」で新しいページを足せます。</div>';
    html += sortByDoc(list.map((x) => ({ ...x.e, key: x.key, kind: 'add' }))).map((e) => {
      const item = list.find((x) => x.key === e.key);
      return item ? authorItemHtml(item) : '';
    }).join('');
    const lost = list.filter((x) => S.page && x.rec.pageId === S.page.id && !findAnchor(AL.sectionIdOf(x.rec)));
    if (lost.length) html += `<p class="empty">このページで位置が見つからない追記：${lost.length}件（本文の中の「位置不明」の箱に出しています）</p>`;
    return html;
  }
  function exportAuthorJson() {
    if (plMode()) { toast('プレイヤー表示中は作者の追記を書き出しません。'); return; }
    const recs = authorEntries().map((x) => ({ ...x.rec, pageTitle: pageTitleOf(x.rec.pageId) }));
    const data = AL.toExport(recs.map((r) => ({ ...r })), { projectId: CFG.projectId, gameCommit: (D.gameview && D.gameview.gameCommit) || '' });
    download(`作者が足した文_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
  }
  function exportAuthorMd() {
    if (plMode()) { toast('プレイヤー表示中は作者の追記を書き出しません。'); return; }
    const recs = authorEntries().map((x) => x.rec);
    const byId = {}; for (const p of pages) if (!p.authorPage) byId[p.id] = p;
    download(`作者が足した文_${new Date().toISOString().slice(0, 10)}.md`, AL.toMarkdown(recs, byId), 'text/markdown');
  }

  // ---------- ルーティング ----------
  function route() {
    const h = decodeURIComponent(location.hash || '');
    const banner = $('#legacyBanner');
    banner.hidden = true;
    let m = h.match(/^#\/([^/]+)(?:\/(.+))?$/);
    if (!m) {
      const old = h.replace(/^#/, '');
      if (old && !pageById.has(old)) {
        banner.innerHTML = `「#${esc(old)}」は旧版のページです。<a href="${esc((CFG.v2Url || 'v2/') + '#' + old)}" target="_blank" rel="noopener">旧・制作者確認盤（Ver3.4）を開く</a>`;
        banner.hidden = false;
      }
      m = [null, pageById.has(old) ? old : (D.home || 'about'), null];
    }
    if (AL && !pageById.has(m[1]) && /^u-[0-9a-f]{12}$/.test(m[1])) authorStub(m[1]);   // 追記の読み込み待ち。あとで syncAuthorPages が本物に置き換える
    const p = pageById.get(m[1]) || pageById.get(D.home || 'about');
    if (p.kind === 'link' && p.id === 'ref-v2') { /* 案内ページとして表示 */ }
    if (S.page && S.page.id === p.id) {
      if (m[2]) { const el = findAnchor(m[2]); if (el) { openParents(el); el.scrollIntoView({ block: 'center' }); if (!/^h/.test(m[2])) selectAnchor(m[2], false); else flashEl(el); } }
      return;
    }
    renderPage(p, m[2]);
    if (isMobile()) { document.body.classList.remove('nav-open'); $('#scrim').hidden = !document.body.classList.contains('panel-open'); }
  }

  // ---------- サイズ変更 ----------
  const LIM = { nav: [250, 720], groups: [92, 240], panel: [280, 720] };
  function applySizes() {
    const sz = LS.get('sizes', {});
    const r = document.documentElement.style;
    if (sz.nav) r.setProperty('--nav-w', sz.nav + 'px');
    if (sz.groups) r.setProperty('--groups-w', sz.groups + 'px');
    if (sz.panel) r.setProperty('--panel-w', sz.panel + 'px');
  }
  function initResizers() {
    $$('[data-resize]').forEach((h) => {
      h.addEventListener('pointerdown', (ev) => {
        if (isMobile()) return;
        ev.preventDefault();
        const kind = h.dataset.resize; const startX = ev.clientX;
        const cs = getComputedStyle(document.documentElement);
        const start = parseFloat(cs.getPropertyValue(kind === 'nav' ? '--nav-w' : kind === 'groups' ? '--groups-w' : '--panel-w')) || 300;
        h.classList.add('dragging'); document.body.classList.add('resizing'); h.setPointerCapture(ev.pointerId);
        const move = (e) => {
          const dx = e.clientX - startX;
          let v = kind === 'panel' ? start - dx : start + dx;
          const [lo, hi] = LIM[kind]; v = Math.max(lo, Math.min(hi, v));
          if (kind === 'groups') { const navW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-w')) || 400; v = Math.min(v, navW - 140); }
          document.documentElement.style.setProperty(kind === 'nav' ? '--nav-w' : kind === 'groups' ? '--groups-w' : '--panel-w', v + 'px');
        };
        const up = () => {
          h.classList.remove('dragging'); document.body.classList.remove('resizing');
          h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
          const cs2 = getComputedStyle(document.documentElement);
          LS.set('sizes', { nav: parseFloat(cs2.getPropertyValue('--nav-w')), groups: parseFloat(cs2.getPropertyValue('--groups-w')), panel: parseFloat(cs2.getPropertyValue('--panel-w')) });
        };
        h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
      });
      h.addEventListener('dblclick', () => { LS.del('sizes'); document.documentElement.removeAttribute('style'); });
    });
  }

  // ---------- イベント ----------
  function bindEvents() {
    $('#navGroups').addEventListener('click', (e) => {
      const b = e.target.closest('[data-group]'); if (!b) return;
      S.group = b.dataset.group; S.query = ''; $('#q').value = '';
      renderGroups(); renderPagesCol();
    });
    $('#navPages').addEventListener('click', (e) => {
      const t = e.target.closest('[data-toc]');
      if (t && S.page) { e.preventDefault(); const el = findAnchor(t.dataset.toc); if (el) { openParents(el); el.scrollIntoView({ block: 'start' }); flashEl(el); } if (isMobile()) toggleNav(false); }
    });
    $('#btnNav').addEventListener('click', () => toggleNav());
    $('#navClose').addEventListener('click', () => toggleNav(false));
    $('#navOpen').addEventListener('click', () => toggleNav(true));
    $('#btnPanel').addEventListener('click', () => {
      const collapsed = isMobile() ? !document.body.classList.contains('panel-open') : document.body.classList.contains('panel-collapsed');
      if (collapsed) openPanel(S.anchor ? 'write' : 'all'); else closePanel();
    });
    $('#panelStrip').addEventListener('click', () => openPanel());
    $('#panelClose').addEventListener('click', () => closePanel());
    $('#scrim').addEventListener('click', () => { document.body.classList.remove('nav-open', 'panel-open'); $('#scrim').hidden = true; });
    $$('.tab').forEach((t) => t.addEventListener('click', () => { S.tab = t.dataset.tab; renderPanel(); }));
    $('#btnKey').addEventListener('click', openKeyDialog);
    $('#keyActions').addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]'); if (!k) return;
      if (k.dataset.k === 'unlock') unlock(); else if (k.dataset.k === 'lock') lock();
    });
    let qTimer = null;
    $('#q').addEventListener('input', (e) => {
      clearTimeout(qTimer);
      qTimer = setTimeout(() => { S.query = e.target.value.trim(); renderPagesCol(); if (S.query && isMobile()) toggleNav(true); }, 180);
    });
    $('#q').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; S.query = ''; renderPagesCol(); } });
    $('#navPages').addEventListener('click', (e) => { if (e.target.closest('[data-search]')) setTimeout(() => highlightInPage(S.query), 50); });

    // 本文：鉛筆ボタン・注意点の印
    const main = $('#main');
    main.addEventListener('mouseover', (e) => {
      if (e.target.closest('#pencil, #editBar, .inline-edit, .edit-view')) return;
      const el = e.target.closest('#page .page-body [data-a]');
      if (el) placePencil(el);
    });
    main.addEventListener('mouseleave', () => placePencil(null));
    $('#pencil').addEventListener('click', () => { if (hoverEl) selectAnchor(hoverEl.dataset.a); });
    $('#editBar').addEventListener('click', (e) => {
      const b = e.target.closest('[data-bar]'); if (!b || !hoverEl) return;
      const a = hoverEl.dataset.a;
      if (b.dataset.bar === 'add') openComposer({ mode: 'new', type: 'para', pageId: S.page.id, anchor: a, pos: 'after' });
      else if (b.dataset.bar === 'fix') startFix(a); else if (b.dataset.bar === 'del') toggleDel(a);
    });
    const navAdd = $('#navAddPage');
    if (navAdd) navAdd.addEventListener('click', () => openComposer({ mode: 'new', type: 'page' }));
    $('#page').addEventListener('click', (e) => {
      const ab = e.target.closest('[data-ab]');
      if (ab) {
        const key = ab.dataset.key;
        if (ab.dataset.ab === 'edit') openComposer({ mode: 'edit', key });
        else if (ab.dataset.ab === 'toggle-del') setAuthorDeleted(key, !(authorEntries().find((x) => x.key === key) || { rec: {} }).rec.deleted);
        else if (ab.dataset.ab === 'add-after') { const hit = authorEntries().find((x) => x.key === key); openComposer({ mode: 'new', type: 'para', pageId: hit ? hit.rec.pageId : S.page.id, chainUuid: hit ? hit.rec.uuid : '', pos: 'chain' }); }
        else if (ab.dataset.ab === 'purge') purgeAuthor(key);
        return;
      }
      const mark = e.target.closest('.note-mark');
      if (mark) { e.preventDefault(); const d = document.getElementById(mark.dataset.note); if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash'); } return; }
      const ie = e.target.closest('[data-ie]');
      if (ie) { const box = ie.closest('.inline-edit'); const a = box.dataset.for; if (ie.dataset.ie === 'save') saveFix(a, $('.ie-text', box).value); else if (ie.dataset.ie === 'cancel') cancelFix(); else undoFix(a); return; }
      const ev = e.target.closest('[data-ev]');
      if (ev) { if (ev.dataset.ev === 'fix') startFix(ev.dataset.a); else undoFix(ev.dataset.a); return; }
      // AI案を「直す」欄に写す（作者が押したときだけ。自動保存はしない）
      const cp = e.target.closest('[data-act="copyai"]');
      if (cp) {
        const u = cp.closest('.cmp-grid[data-unit]');
        const prop = AI_UNITS[cp.dataset.copyUnit];
        const anchorEl = u && u.querySelector('.cmp-spec [data-a]');
        if (!prop || !anchorEl) { toast('この単位には写せる本文がありません。'); return; }
        if (prop.action === 'delete') { toast('削除の提案は写せません。'); return; }
        startFix(anchorEl.dataset.a, prop.proposed_text || '');
        return;
      }
      if (e.target.closest('a, button, summary, input, textarea, .inline-edit, .edit-view')) return;
      const el = e.target.closest('.page-body [data-a]');
      if (!el) return;
      if (window.matchMedia('(hover: none)').matches) placePencil(el);
      else if (el.classList.contains('has-memo')) selectAnchor(el.dataset.a);
    });
    main.addEventListener('dblclick', (e) => {
      if (e.target.closest('.inline-edit, .edit-view')) return;
      const el = e.target.closest('.page-body [data-a]'); if (!el || e.target.closest('summary')) return;
      startFix(el.dataset.a);
    });

    // 右：修正案
    $('#panelBody').addEventListener('click', async (e) => {
      const ab = e.target.closest('[data-ab]');
      if (ab) {
        const key = ab.dataset.key;
        if (ab.dataset.ab === 'edit') openComposer({ mode: 'edit', key });
        else if (ab.dataset.ab === 'toggle-del') setAuthorDeleted(key, !(authorEntries().find((x) => x.key === key) || { rec: {} }).rec.deleted);
        else if (ab.dataset.ab === 'purge') purgeAuthor(key);
        else if (ab.dataset.ab === 'drop-broken') { if (confirm('この読めない下書きを端末から消しますか？（共有には送っていません）')) { delete S.drafts[key]; LS.set('drafts', S.drafts); renderPanel(); updateCounts(); } }
        else if (ab.dataset.ab === 'goto') { const hit = authorEntries().find((x) => x.key === key); if (hit) { location.hash = '#/' + hit.rec.pageId + '/' + AL.sectionIdOf(hit.rec); } }
        return;
      }
      const abItem = e.target.closest('[data-ab-item]');
      if (abItem) {
        const hit = authorEntries().find((x) => x.key === abItem.dataset.key);
        if (hit) location.hash = '#/' + hit.rec.pageId + '/' + AL.sectionIdOf(hit.rec);
        return;
      }
      const item = e.target.closest('.memo-item');
      if (item) {
        const [pid, a] = splitKey(item.dataset.key);
        if (!S.page || S.page.id !== pid) { location.hash = `#/${pid}/${a}`; S.tab = 'write'; return; }
        const el = findAnchor(a); if (el) { openParents(el); el.scrollIntoView({ block: 'center' }); }
        selectAnchor(a); S.tab = 'write'; renderPanel(); return;
      }
      const f = e.target.closest('[data-filter]'); if (f) { S.filter = f.dataset.filter; renderPanel(); return; }
      const st = e.target.closest('[data-st]');
      if (st) {
        const key = currentKey(); if (!key) return;
        const el = findAnchor(S.anchor);
        stage(key, { resolved: st.dataset.st === 'done', title: S.page.nav + '｜' + excerptOf(el).slice(0, 160), content: ($('#memoText') || {}).value ?? entry(key).content });
        await push(key); renderPanel(); refreshMarks(); updateCounts(); return;
      }
      const act = e.target.closest('[data-act]'); if (!act) return;
      const key = currentKey();
      switch (act.dataset.act) {
        case 'key': openKeyDialog(); break;
        case 'ab-open': { const k = S.page && S.anchor ? keyOf(S.page.id, S.anchor) : ''; const hit = authorEntries().find((x) => x.key === k); if (hit) openComposer({ mode: 'edit', key: hit.key }); else openPanel('added'); } break;
        case 'goto': e.preventDefault(); { const el = findAnchor(S.anchor); if (el) { openParents(el); el.scrollIntoView({ block: 'center' }); flashEl(el); } } break;
        case 'save': if (key) { if (!S.drafts[key]) stage(key, { content: $('#memoText').value, title: S.page.nav + '｜' + excerptOf(findAnchor(S.anchor)).slice(0, 160) }); if (canWrite()) await push(key, { confirmOverwrite: true }); else { setStatus(key, 'local'); toast('この端末に下書き保存しました。共有するには編集キーで解除してください。'); } refreshAll(); } break;
        case 'delete': if (key && confirm('この箇所の修正案を削除しますか？')) { await removeMemo(key); } break;
        case 'deselect': selectAnchor(null); history.replaceState(null, '', '#/' + S.page.id); break;
        case 'take': if (key) { delete S.drafts[key]; LS.set('drafts', S.drafts); setStatus(key, 'saved'); refreshAll(); } break;
        case 'overwrite': if (key) { await push(key, { overwrite: true }); refreshAll(); } break;
        case 'md': download(`ダンジョン・オブ・ザ・マーダー_修正案_${new Date().toISOString().slice(0, 10)}.md`, markdown(true), 'text/markdown'); break;
        case 'copy': try { await navigator.clipboard.writeText(markdown(true)); toast('未反映の修正案をMarkdownでコピーしました。'); } catch { download('修正案.md', markdown(true), 'text/markdown'); } break;
        case 'json': download(`ダンジョン・オブ・ザ・マーダー_修正案_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ schema: 'mother-president-rv1-memos', projectId: CFG.projectId, exportedAt: new Date().toISOString(), memos: [...S.memos.values()].filter((m) => m.character !== 'add'), drafts: Object.fromEntries(Object.entries(S.drafts).filter(([, d]) => d.kind !== 'add')) }, null, 2), 'application/json'); break;
        case 'a-json': exportAuthorJson(); break;
        case 'a-md': exportAuthorMd(); break;
        case 'a-copy': try { await navigator.clipboard.writeText(AL.toMarkdown(authorEntries().map((x) => x.rec), Object.fromEntries([...pageById].filter(([, v]) => !v.authorPage)))); toast('作者が足した文をMarkdownでコピーしました。'); } catch { exportAuthorMd(); } break;
        default: break;
      }
    });
    $('#panelFoot').addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]'); if (!act) return;
      if (act.dataset.act === 'reload') {
        // R3：取得できなかったのに「取得しました」と言わない
        const loaded = await loadMemos();
        toast(loaded ? '最新の修正案を取得しました。' : '最新を取得できませんでした。表示はそのままです。');
      }
      if (act.dataset.act === 'syncdrafts') await syncDrafts();
    });

    // 作者の追記：ダイアログ（入力中の自動再取得では壊さない）
    const addForm = $('#addForm');
    if (addForm) {
      addForm.addEventListener('click', (e) => {
        const b = e.target.closest('[data-add]'); if (!b) return;
        if (b.dataset.add === 'save') saveComposer();
        else if (b.dataset.add === 'cancel') closeComposer();
        else if (b.dataset.add === 'purge') { const k = C.key; closeComposer(); if (k) purgeAuthor(k); }
      });
      for (const id of ['#addBody', '#addHeading', '#addType', '#addPos', '#addVis']) {
        const el = $(id); if (!el) continue;
        el.addEventListener('input', refreshAddInfo); el.addEventListener('change', refreshAddInfo);
      }
      const ta2 = $('#addBody');
      if (ta2) ta2.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveComposer(); } });
      $('#addDialog').addEventListener('close', () => { C.open = false; });
    }

    $('#viewMode').addEventListener('change', (e) => { S.view = e.target.value; LS.set('view', S.view); applyView(); renderGroups(); renderPagesCol(); checkHiddenPage(); });
    $('#hideAfter').addEventListener('change', (e) => { S.hideAfter = e.target.checked; LS.set('hideAfter', S.hideAfter); applyView(); renderGroups(); renderPagesCol(); checkHiddenPage(); });
    document.addEventListener('click', (e) => { if (e.target.closest('[data-act="open-nav"]')) { toggleNav(true); return; } });
    document.addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (!b) return; S.view = b.dataset.view; LS.set('view', S.view); applyView(); renderGroups(); renderPagesCol(); checkHiddenPage(); });
    window.addEventListener('hashchange', route);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.fixing) { cancelFix(); return; } if (e.key === 'Escape' && document.activeElement && document.activeElement.id !== 'memoText') { if (S.anchor) selectAnchor(null); } });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !S.fixing && !C.open) loadMemos(true); });
    setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (document.activeElement && document.activeElement.id === 'memoText') return;
      if (S.fixing || C.open) return;   // 追記の入力中は取り直さない（フォームを壊さない）
      loadMemos(true);
    }, 45000);
    window.addEventListener('resize', () => placePencil(null));
  }
  function toggleNav(force) {
    if (isMobile()) {
      const open = force ?? !document.body.classList.contains('nav-open');
      document.body.classList.toggle('nav-open', open); document.body.classList.remove('panel-open');
      $('#scrim').hidden = !open; return;
    }
    const collapse = force === undefined ? !document.body.classList.contains('nav-collapsed') : !force;
    document.body.classList.toggle('nav-collapsed', collapse); LS.set('navCollapsed', collapse);
  }

  // ---------- 起動 ----------
  function init() {
    applySizes();
    if (LS.get('navCollapsed', false)) document.body.classList.add('nav-collapsed');
    if (LS.get('panelCollapsed', true)) document.body.classList.add('panel-collapsed');
    if (window.AuthorLayer) syncAuthorPages();   // 端末の下書きにある作者のページを、読み込み前から目次に出す
    const qv = new URLSearchParams(location.search).get('view');
    if (qv && /^(all|pl|pl:(mireille|viola|mixi|edgar))$/.test(qv)) S.view = qv;
    initResizers(); bindEvents(); renderAuth(); applyView();
    route();
    updateCounts();
    loadMemos();
  }
  init();
})();
