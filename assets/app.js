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

  // ---------- 状態 ----------
  const S = {
    page: null, group: null, anchor: null,
    memos: new Map(),            // `${pageId}|${anchor}` -> サーバーのメモ
    drafts: LS.get('drafts', {}), // `${pageId}|${anchor}` -> 端末の下書き
    status: {},                   // key -> 'saving'|'saved'|'local'|'conflict'|'error'
    statusMsg: {},
    session: null,
    sync: { state: 'idle', last: null, error: '' },
    tab: 'write', filter: 'open', query: '', legacyCount: 0, loaded: false,
  };
  const isMobile = () => window.matchMedia('(max-width: 980px)').matches;
  const now = () => Date.now();
  const keyOf = (pageId, anchor) => pageId + '|' + anchor;
  const splitKey = (k) => { const i = k.indexOf('|'); return [k.slice(0, i), k.slice(i + 1)]; };

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
    try {
      const j = await api('/api/memos');
      const map = new Map(); let legacy = 0;
      for (const m of j.memos || []) {
        if (typeof m.page_id !== 'string' || !m.page_id.startsWith(PAGE_PREFIX)) { legacy++; continue; }
        map.set(keyOf(m.page_id.slice(PAGE_PREFIX.length), m.section_id), m);
      }
      S.memos = map; S.legacyCount = legacy; S.sync.last = new Date(); S.loaded = true;
      setSync('ok');
    } catch (e) {
      setSync(e.network ? 'local' : 'error', e.message);
    }
    refreshAll();
  }
  function entry(key) {
    const server = S.memos.get(key); const draft = S.drafts[key];
    const content = draft ? draft.content : server ? server.content : '';
    const resolved = draft ? !!draft.resolved : server ? !!server.resolved : false;
    return { key, server, draft, content, resolved, title: (draft && draft.title) || (server && server.title) || '', updated: (draft && draft.updated_at) || (server && server.updated_at) || '' };
  }
  function allKeys() { return [...new Set([...S.memos.keys(), ...Object.keys(S.drafts)])]; }
  function visibleEntries() { return allKeys().map(entry).filter((e) => (e.content || '').trim() || e.resolved); }
  function stage(key, patch) {
    const [pageId, anchor] = splitKey(key);
    const cur = entry(key);
    S.drafts[key] = {
      page_id: pageId, section_id: anchor,
      title: patch.title ?? cur.title ?? '',
      content: patch.content ?? cur.content ?? '',
      resolved: patch.resolved ?? cur.resolved ?? false,
      updated_at: new Date().toISOString(),
    };
    LS.set('drafts', S.drafts);
  }
  const timers = {};
  function schedulePush(key, delay = 1400) {
    clearTimeout(timers[key]);
    if (!canWrite()) { setStatus(key, 'local'); return; }
    setStatus(key, 'pending');
    timers[key] = setTimeout(() => push(key), delay);
  }
  async function push(key, { overwrite = false } = {}) {
    clearTimeout(timers[key]);
    const d = S.drafts[key]; if (!d) return true;
    if (!canWrite()) { setStatus(key, 'local'); return false; }
    const server = S.memos.get(key);
    const memo = { page_id: PAGE_PREFIX + d.page_id, section_id: d.section_id, title: String(d.title || '').slice(0, 600), content: String(d.content || '').slice(0, 12000), resolved: !!d.resolved, character: '', card: '' };
    setStatus(key, 'saving');
    try {
      let saved;
      if (server) saved = await api('/api/memos/' + encodeURIComponent(server.id), 'PUT', { memo, expectedRevision: server.revision });
      else saved = await api('/api/memos', 'POST', { memo: { ...memo, id: (crypto.randomUUID ? crypto.randomUUID() : 'm' + now() + Math.random().toString(16).slice(2)) } });
      S.memos.set(key, saved);
      if (S.drafts[key] && S.drafts[key].updated_at === d.updated_at) { delete S.drafts[key]; LS.set('drafts', S.drafts); }
      setStatus(key, 'saved');
      refreshMarks(); updateCounts();
      return true;
    } catch (e) {
      if (e.status === 409) {
        if (e.current) S.memos.set(key, e.current);
        if (overwrite && e.current) return push(key);
        setStatus(key, 'conflict', e.message);
      } else setStatus(key, e.network ? 'local' : 'error', e.message);
      refreshMarks(); updateCounts();
      return false;
    }
  }
  async function removeMemo(key) {
    const server = S.memos.get(key);
    if (S.drafts[key]) { delete S.drafts[key]; LS.set('drafts', S.drafts); }
    if (server) {
      if (!canWrite()) { toast('共有済みの修正案を消すには、編集キーで解除してください。'); return; }
      try { await api('/api/memos/' + encodeURIComponent(server.id), 'DELETE', { expectedRevision: server.revision }); S.memos.delete(key); toast('修正案を削除しました。'); }
      catch (e) { if (e.status === 409 && e.current) S.memos.set(key, e.current); toast(e.message); }
    }
    setStatus(key, '');
    refreshAll();
  }
  async function syncDrafts() {
    if (!canWrite()) { openKeyDialog(); return; }
    const keys = Object.keys(S.drafts); let ok = 0;
    await loadMemos(true);
    for (const k of keys) if (await push(k)) ok++;
    toast(`下書き ${ok}/${keys.length} 件を共有に送りました。`);
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
    box.innerHTML = D.groups.map((g) => {
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
        const i = p.text.toLowerCase().indexOf(q);
        const t = p.title.toLowerCase().includes(q) || p.nav.toLowerCase().includes(q);
        if (i < 0 && !t) continue;
        const start = Math.max(0, i - 30); const snip = i < 0 ? '' : p.text.slice(start, i + q.length + 50);
        hits.push({ p, snip, q });
      }
      box.innerHTML = hits.length ? hits.map(({ p, snip }) => `<a class="search-hit" href="#/${p.id}" data-search="1"><div class="sh-title">${esc(p.nav)}</div><div class="sh-snip">${highlight(snip, S.query)}</div></a>`).join('') : '<div class="empty">見つかりませんでした。</div>';
      return;
    }
    const g = groupById.get(S.group) || D.groups[0];
    $('#navGroupLabel').textContent = g.label;
    let html = ''; let lastSub = null;
    for (const p of pages.filter((x) => x.group === g.id)) {
      if (p.sub !== lastSub) { if (p.sub) html += `<div class="sub-label">${esc(p.sub)}</div>`; lastSub = p.sub; }
      const n = memoCountFor(p.id);
      const active = S.page && S.page.id === p.id;
      html += `<a class="page-link${active ? ' active' : ''}" href="#/${p.id}"><span class="p-label">${esc(p.nav)}</span>${n ? `<span class="memo-pill" title="未反映の修正案">${n}</span>` : ''}</a>`;
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

  // ---------- 本文（中央） ----------
  const AUD = { 'PL配布': 'pl', 'PL配布（本人のみ）': 'pl', 'PL配布（最後）': 'pl', 'GM専用': 'gm', '制作': 'make', '参照': 'ref' };
  function renderPage(p, anchor) {
    S.page = p; S.group = p.group;
    const g = groupById.get(p.group);
    const chips = [];
    if (p.audience) chips.push(`<span class="tagchip ${AUD[p.audience] || ''}">${esc(p.audience)}</span>`);
    for (const b of p.badges || []) chips.push(`<span class="tagchip new">${esc(b)}</span>`);
    const n = memoCountFor(p.id);
    $('#page').innerHTML = `
      <header class="page-head">
        <div class="crumbs"><span>${esc(g.label)}</span>${p.sub ? `<span>${esc(p.sub)}</span>` : ''}<span>${esc(p.nav)}</span></div>
        <h1 class="page-title">${esc(p.title)}</h1>
        <div class="page-meta">${chips.join('')}${p.source ? `<span class="src" title="元ファイル">content/${esc(p.source)}</span>` : ''}<button type="button" class="btn small" id="pageMemos">このページの修正案 ${n}</button></div>
      </header>
      <div class="page-body">${p.html}</div>`;
    document.title = p.nav + '｜ダンジョン・オブ・ザ・マーダー 制作INDEX';
    $('#pageMemos').addEventListener('click', () => { openPanel('page'); });
    refreshMarks();
    renderGroups(); renderPagesCol();
    $('#pencil').hidden = true;
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
    renderPanel();
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
    $$('.note-mark, button', clone).forEach((b) => b.remove());
    if (el.tagName === 'TR') return [...clone.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ／ ').slice(0, 240);
    if (el.tagName === 'DETAILS') { const s = clone.querySelector('summary'); return (s ? s.textContent : clone.textContent).replace(/\s+/g, ' ').trim().slice(0, 240); }
    return clone.textContent.replace(/\s+/g, ' ').trim().slice(0, 240);
  }
  function refreshMarks() {
    if (!S.page) return;
    $$('#page .has-memo').forEach((el) => el.classList.remove('has-memo', 'memo-done', 'memo-draft'));
    for (const e of visibleEntries()) {
      const [pid, a] = splitKey(e.key); if (pid !== S.page.id) continue;
      const el = findAnchor(a); if (!el) continue;
      el.classList.add('has-memo');
      if (e.resolved) el.classList.add('memo-done'); else if (e.draft && !e.server) el.classList.add('memo-draft');
      el.title = '修正案：' + (e.content || '').slice(0, 80);
    }
  }
  function selectAnchor(anchor, open = true) {
    $$('#page .is-selected').forEach((el) => el.classList.remove('is-selected'));
    S.anchor = anchor;
    if (anchor) {
      const el = findAnchor(anchor); if (el) el.classList.add('is-selected');
      const h = `#/${S.page.id}/${anchor}`; if (location.hash !== h) history.replaceState(null, '', h);
      if (open) openPanel('write');
    }
    renderPanel();
  }

  // 鉛筆ボタン（カーソルを合わせた箇所に出す）
  let hoverEl = null;
  function placePencil(el) {
    const main = $('#main'); const pen = $('#pencil');
    if (!el) { pen.hidden = true; if (hoverEl) hoverEl.classList.remove('is-hover'); hoverEl = null; return; }
    if (hoverEl && hoverEl !== el) hoverEl.classList.remove('is-hover');
    hoverEl = el; el.classList.add('is-hover');
    const mr = main.getBoundingClientRect(); const er = el.getBoundingClientRect(); const pr = $('#page').getBoundingClientRect();
    pen.style.top = (er.top - mr.top + main.scrollTop + Math.min(4, er.height / 4)) + 'px';
    pen.style.left = (Math.min(pr.right, mr.right - 10) - mr.left - 38) + 'px';
    pen.hidden = false;
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
    else body.innerHTML = allView();
    bindPanel();
    renderFoot();
  }
  function writeView() {
    const mode = canWrite() ? '' : `<div class="notice">いまは<strong>この端末の下書き</strong>として保存されます。共有するには <button type="button" class="btn small" data-act="key">編集キーで解除</button></div>`;
    if (!S.page || !S.anchor) {
      return mode + `<div class="empty-state"><div class="big">✎</div>本文の直したい段落・台詞・表の行に<br>カーソルを合わせて「✎」を押すと、<br>その箇所の修正案を書けます。<br><br>注意点（折りたたみ）の中や見出しにも書けます。</div>`;
    }
    const key = keyOf(S.page.id, S.anchor); const e = entry(key); const el = findAnchor(S.anchor);
    const ex = excerptOf(el) || (e.title.split('｜').slice(1).join('｜'));
    const conflict = S.status[key] === 'conflict' && e.server ? `<div class="notice warn conflict"><strong>ほかの端末で更新されています。</strong>共有されている内容：<pre>${esc(e.server.content || '（空）')}</pre><div class="row-actions"><button type="button" class="btn small" data-act="take">共有の内容を使う</button><button type="button" class="btn small" data-act="overwrite">自分の内容で上書き</button></div></div>` : '';
    return mode + `
      <div class="target"><div class="target-page">${esc(S.page.nav)}</div><div class="target-text">${esc(ex) || '（見出し）'}</div><a href="#/${S.page.id}/${S.anchor}" data-act="goto">本文で表示</a></div>
      ${conflict}
      <label class="field-label" for="memoText">修正案</label>
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
    const ex = (e.title || '').split('｜').slice(1).join('｜') || (onPage ? excerptOf(findAnchor(a)) : '');
    const active = S.page && S.anchor && e.key === keyOf(S.page.id, S.anchor);
    return `<button type="button" class="memo-item${active ? ' active' : ''}" data-key="${esc(e.key)}">
      <div class="mi-top">${stateLabel(e)}${lost ? '<span class="st lost" title="本文が変わったため場所が見つかりません">場所不明</span>' : ''}${showPage && p ? `<span>${esc(p.nav)}</span>` : ''}<span style="margin-left:auto">${esc(fmtTime(e.updated))}</span></div>
      ${ex ? `<div class="mi-ex">${esc(ex)}</div>` : ''}
      <div class="mi-body">${esc(e.content || '（空）')}</div></button>`;
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
      local: ['local', 'この端末に下書き保存しました（未共有）'], conflict: ['error', 'ほかの端末で更新されています。上の内容を確認してください。'], error: ['error', S.statusMsg[key] || '保存できませんでした。'],
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
      md += `\n- 対象：${ex || '（見出し・その他）'}\n  - 場所：#/${pid}/${a}\n  - 修正案：${(e.content || '').replace(/\n/g, '\n    ')}\n`;
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
      m = [null, pageById.has(old) ? old : 'about', null];
    }
    const p = pageById.get(m[1]) || pageById.get('about');
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
      if (e.target.closest('#pencil')) return;
      const el = e.target.closest('#page .page-body [data-a]');
      if (el) placePencil(el);
    });
    main.addEventListener('mouseleave', () => placePencil(null));
    $('#pencil').addEventListener('click', () => { if (hoverEl) selectAnchor(hoverEl.dataset.a); });
    $('#page').addEventListener('click', (e) => {
      const mark = e.target.closest('.note-mark');
      if (mark) { e.preventDefault(); const d = document.getElementById(mark.dataset.note); if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); d.classList.remove('flash'); void d.offsetWidth; d.classList.add('flash'); } return; }
      if (e.target.closest('a, button, summary, input, textarea')) return;
      const el = e.target.closest('.page-body [data-a]');
      if (!el) return;
      if (window.matchMedia('(hover: none)').matches) placePencil(el);
      else if (el.classList.contains('has-memo')) selectAnchor(el.dataset.a);
    });
    main.addEventListener('dblclick', (e) => {
      const el = e.target.closest('.page-body [data-a]'); if (!el || e.target.closest('summary')) return;
      selectAnchor(el.dataset.a);
    });

    // 右：修正案
    $('#panelBody').addEventListener('click', async (e) => {
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
        case 'goto': e.preventDefault(); { const el = findAnchor(S.anchor); if (el) { openParents(el); el.scrollIntoView({ block: 'center' }); flashEl(el); } } break;
        case 'save': if (key) { if (!S.drafts[key]) stage(key, { content: $('#memoText').value, title: S.page.nav + '｜' + excerptOf(findAnchor(S.anchor)).slice(0, 160) }); if (canWrite()) await push(key); else { setStatus(key, 'local'); toast('この端末に下書き保存しました。共有するには編集キーで解除してください。'); } refreshAll(); } break;
        case 'delete': if (key && confirm('この箇所の修正案を削除しますか？')) { await removeMemo(key); } break;
        case 'deselect': selectAnchor(null); history.replaceState(null, '', '#/' + S.page.id); break;
        case 'take': if (key) { delete S.drafts[key]; LS.set('drafts', S.drafts); setStatus(key, 'saved'); refreshAll(); } break;
        case 'overwrite': if (key) { await push(key, { overwrite: true }); refreshAll(); } break;
        case 'md': download(`ダンジョン・オブ・ザ・マーダー_修正案_${new Date().toISOString().slice(0, 10)}.md`, markdown(true), 'text/markdown'); break;
        case 'copy': try { await navigator.clipboard.writeText(markdown(true)); toast('未反映の修正案をMarkdownでコピーしました。'); } catch { download('修正案.md', markdown(true), 'text/markdown'); } break;
        case 'json': download(`ダンジョン・オブ・ザ・マーダー_修正案_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ schema: 'mother-president-rv1-memos', projectId: CFG.projectId, exportedAt: new Date().toISOString(), memos: [...S.memos.values()], drafts: S.drafts }, null, 2), 'application/json'); break;
        default: break;
      }
    });
    $('#panelFoot').addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]'); if (!act) return;
      if (act.dataset.act === 'reload') { await loadMemos(); toast('最新の修正案を取得しました。'); }
      if (act.dataset.act === 'syncdrafts') await syncDrafts();
    });

    window.addEventListener('hashchange', route);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.activeElement && document.activeElement.id !== 'memoText') { if (S.anchor) selectAnchor(null); } });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') loadMemos(true); });
    setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (document.activeElement && document.activeElement.id === 'memoText') return;
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
    initResizers(); bindEvents(); renderAuth();
    route();
    updateCounts();
    loadMemos();
  }
  init();
})();
