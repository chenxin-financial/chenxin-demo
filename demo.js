/* ===========================================================================
   示範模式（DEMO MODE）
   ---------------------------------------------------------------------------
   GitHub Pages 只能託管靜態檔案，沒有伺服器可以跑 API。
   這支檔案攔截 fetch，用瀏覽器記憶體模擬整組後端，讓展示版的前台表單與
   後台（儀表板、名單、帳號）都能實際操作。

   ⚠️ 只用於展示。資料存在瀏覽器分頁裡（sessionStorage），關掉分頁即消失，不會送到任何地方。
   正式版請使用 site/server.js，本檔案不會被打包進正式站。
   =========================================================================== */
(() => {
  const DEMO_PASS = 'demo1234';        // 刻意與正式版預設密碼不同，避免公開展示站洩漏正式站帳密
  const TZ_MS = 8 * 3600e3;                       // 以台灣時間切日
  const localDate = ts => new Date(ts + TZ_MS).toISOString().slice(0, 10);

  /* ---------- 示範名單：分布在近 14 天 ---------- */
  const NAMES = [['王小明','先生'],['陳美玲','小姐'],['林志豪','先生'],['黃品瑄','小姐'],
    ['張家偉','先生'],['吳雅婷','小姐'],['劉建宏','先生'],['蔡佩君','小姐'],['鄭文彬','先生'],
    ['許淑芬','小姐'],['楊承翰','先生'],['周佳蓉','小姐'],['謝明軒','先生'],['洪雅雯','小姐']];
  const NOTES = {
    new:['','','名下有汽車，欲評估 200 萬','剛送出，尚未聯繫'],
    contacted:['已致電，欲整合信用卡債約 80 萬','約週三面談','留言未回，明日再撥','資料補齊中'],
    closed:['已核准 45 萬，撥款完成','核准 120 萬，對保完成','核准 30 萬'],
    invalid:['空號','非本人','重複填寫']
  };
  const PER_DAY = [2, 1, 2, 3, 3, 4, 2, 1, 0, 3, 4, 2, 6, 5];   // 由今日往回推 14 天

  let seed = 20260909;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = a => a[Math.floor(rnd() * a.length)];

  let LEADS = [], nextId = 1;
  (function build() {
    const now = Date.now();
    for (let d = 13; d >= 0; d--) {
      for (let i = 0; i < PER_DAY[d]; i++) {
        const [name, salutation] = pick(NAMES);
        const status = pick(['new','new','new','contacted','contacted','closed','invalid']);
        const t = now - d * 864e5 - Math.floor(rnd() * 9) * 36e5;
        LEADS.push({
          id: nextId++, name, salutation,
          phone: '09' + String(10000000 + Math.floor(rnd() * 89999999)),
          email: rnd() > .4 ? 'user' + nextId + '@example.com' : '',
          source: '首頁表單', status, note: pick(NOTES[status]),
          ip: '203.0.113.' + (1 + Math.floor(rnd() * 200)),
          ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
          referer: '', created_at: new Date(t).toISOString(), updated_at: new Date(t).toISOString()
        });
      }
    }
    LEADS.sort((a, b) => b.created_at.localeCompare(a.created_at));
  })();

  let USERS = [
    { id:1, username:'admin', display:'系統管理員', role:'admin', active:1,
      created_at:new Date(Date.now() - 90*864e5).toISOString(), last_login:new Date().toISOString() },
    { id:2, username:'sales01', display:'業務小林', role:'staff', active:1,
      created_at:new Date(Date.now() - 30*864e5).toISOString(), last_login:new Date(Date.now() - 2*36e5).toISOString() }
  ];
  let nextUid = 3, session = null;

  /* ---------- 跨頁保存：讓客戶在前台填的那一筆，換到後台看得到 ----------
     用 sessionStorage：同一個分頁內有效，關掉分頁就消失，不會留在裝置上。   */
  const KEY = 'cx_demo_state_v1';
  function save() {
    try { sessionStorage.setItem(KEY, JSON.stringify({
      LEADS, USERS, nextId, nextUid, sid: session ? session.id : null })); } catch {}
  }
  (function load() {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return save();
      const s = JSON.parse(raw);
      if (!Array.isArray(s.LEADS) || !Array.isArray(s.USERS)) return save();
      LEADS = s.LEADS; USERS = s.USERS;
      nextId = s.nextId || LEADS.length + 1; nextUid = s.nextUid || USERS.length + 1;
      session = s.sid ? USERS.find(u => u.id === s.sid) || null : null;
    } catch { save(); }
  })();

  /* ---------- 驗證碼（與伺服器版相同畫法） ---------- */
  let capCode = '';
  function captchaSVG() {
    capCode = String(1000 + Math.floor(Math.random() * 9000));
    const W = 132, H = 52, inks = ['#0B213F','#12325C','#1B3A63','#0E2748'];
    const r = (a, b) => a + Math.random() * (b - a);
    let noise = '';
    for (let i = 0; i < 5; i++)
      noise += '<path d="M' + r(0,20).toFixed(1) + ' ' + r(4,H-4).toFixed(1) + ' Q ' +
        r(40,90).toFixed(1) + ' ' + r(0,H).toFixed(1) + ' ' + r(W-20,W).toFixed(1) + ' ' +
        r(4,H-4).toFixed(1) + '" fill="none" stroke="rgba(201,164,106,' + r(.35,.7).toFixed(2) +
        ')" stroke-width="' + r(.8,1.8).toFixed(1) + '"/>';
    for (let i = 0; i < 26; i++)
      noise += '<circle cx="' + r(0,W).toFixed(1) + '" cy="' + r(0,H).toFixed(1) + '" r="' +
        r(.6,1.7).toFixed(1) + '" fill="rgba(11,33,63,' + r(.12,.35).toFixed(2) + ')"/>';
    const glyphs = [...capCode].map((ch, i) => {
      const x = 20 + i * 26 + r(-3,3), y = H/2 + r(6,10);
      return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) +
        '" font-family="Georgia,\'Times New Roman\',serif" font-size="' + r(26,32).toFixed(0) +
        '" font-weight="700" fill="' + inks[i % 4] + '" transform="rotate(' + r(-16,16).toFixed(1) +
        ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')">' + ch + '</text>';
    }).join('');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W +
      '" height="' + H + '"><rect width="' + W + '" height="' + H + '" fill="#FAF8F4"/>' +
      noise + glyphs + '</svg>';
  }

  /* ---------- 工具 ---------- */
  const ok = body => new Response(JSON.stringify({ ok: true, ...body }),
    { status: 200, headers: { 'Content-Type': 'application/json' } });
  const fail = (error, status = 400) => new Response(JSON.stringify({ ok: false, error }),
    { status, headers: { 'Content-Type': 'application/json' } });
  const str = (v, n) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, n);

  function filterLeads(sp) {
    const q = (sp.get('q') || '').trim(), st = sp.get('status') || 'all';
    const from = sp.get('from') || '', to = sp.get('to') || '';
    return LEADS.filter(r => {
      if (q && ![r.name, r.phone, r.email, r.note].some(v => String(v).includes(q))) return false;
      if (st !== 'all' && r.status !== st) return false;
      if (from && r.created_at < from) return false;
      if (to && r.created_at > to + 'T23:59:59.999Z') return false;
      return true;
    });
  }

  /* ---------- 路由 ---------- */
  async function route(path, method, body, sp) {
    /* 前台 */
    if (path === '/api/captcha') return ok({ token: 'demo', svg: captchaSVG() });

    if (path === '/api/leads' && method === 'POST') {
      if (str(body.website, 50)) return ok({});
      if (String(body.captcha || '').trim() !== capCode)
        return fail('驗證碼不正確或已逾時，請重新輸入。');
      const name = str(body.name, 40), phone = str(body.phone, 20), email = str(body.email, 80);
      if (!name) return fail('請填寫姓名。');
      if (!/^[0-9+\-() ]{8,20}$/.test(phone)) return fail('請填寫正確的聯絡電話。');
      if (email && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return fail('Email 格式不正確。');
      if (!body.consent) return fail('請先勾選同意提供資料。');
      const t = new Date().toISOString();
      LEADS.unshift({ id: nextId++, name, salutation: str(body.salutation, 10), phone, email,
        source: str(body.source, 40) || '首頁表單', status: 'new', note: '', ip: '（示範）',
        ua: navigator.userAgent, referer: '', created_at: t, updated_at: t });
      save();
      return ok({ demo: true });
    }

    /* 後台 */
    if (path === '/api/admin/login' && method === 'POST') {
      const u = USERS.find(x => x.username.toLowerCase() === str(body.username, 40).toLowerCase());
      if (!u || !u.active || body.password !== DEMO_PASS)
        return fail('帳號或密碼不正確。（示範版密碼為 demo1234）', 401);
      u.last_login = new Date().toISOString();
      session = u;
      save();
      return ok({ user: { id: u.id, username: u.username, display: u.display, role: u.role } });
    }

    if (!session) return fail('尚未登入或連線已逾時。', 401);
    const me = session, isAdmin = me.role === 'admin';

    if (path === '/api/admin/me')
      return ok({ user: { id: me.id, username: me.username, display: me.display, role: me.role } });
    if (path === '/api/admin/logout') { session = null; save(); return ok({}); }
    if (path === '/api/admin/password')
      return fail('示範版不開放變更密碼，正式版可正常使用。');

    if (path === '/api/admin/dashboard') {
      const today = localDate(Date.now());
      const dOf = r => localDate(Date.parse(r.created_at));
      const daysAgo = n => localDate(Date.now() - n * 864e5);
      const cnt = f => LEADS.filter(f).length;
      const map = {};
      LEADS.forEach(r => { const d = dOf(r); if (d >= daysAgo(13)) map[d] = (map[d] || 0) + 1; });
      const tally = k => LEADS.reduce((a, r) => (a[r[k]] = (a[r[k]] || 0) + 1, a), {});
      return ok({
        today,
        stats: {
          today: cnt(r => dOf(r) === today),
          yesterday: cnt(r => dOf(r) === daysAgo(1)),
          week: cnt(r => dOf(r) >= daysAgo(6)),
          prevWeek: cnt(r => dOf(r) >= daysAgo(13) && dOf(r) < daysAgo(6)),
          month: cnt(r => dOf(r) >= daysAgo(29)),
          total: LEADS.length,
          pending: cnt(r => r.status === 'new')
        },
        daily: Object.keys(map).sort().map(d => ({ d, c: map[d] })),
        byStatus: Object.entries(tally('status')).map(([status, c]) => ({ status, c })),
        bySource: Object.entries(tally('source')).map(([source, c]) => ({ source, c }))
          .sort((a, b) => b.c - a.c).slice(0, 6),
        recent: LEADS.slice(0, 8).map(({ id, name, salutation, phone, status, created_at }) =>
          ({ id, name, salutation, phone, status, created_at }))
      });
    }

    if (path === '/api/admin/leads' && method === 'GET') {
      const rows = filterLeads(sp);
      const size = Math.min(Math.max(+sp.get('size') || 10, 1), 200);
      const pages = Math.ceil(rows.length / size) || 1;
      const page = Math.min(Math.max(+sp.get('page') || 1, 1), pages);
      return ok({ rows: rows.slice((page - 1) * size, page * size),
        total: rows.length, page, size, pages });
    }

    if (path === '/api/admin/leads.csv') {
      const LABEL = { new:'未處理', contacted:'已聯繫', closed:'已成交', invalid:'無效' };
      const e = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const head = ['編號','送出時間','姓名','稱謂','電話','Email','來源','狀態','備註','IP'];
      const csv = '﻿' + [head.map(e).join(','), ...filterLeads(sp).map(r => [r.id,
        new Date(r.created_at).toLocaleString('zh-TW', { hour12: false }), r.name, r.salutation,
        r.phone, r.email, r.source, LABEL[r.status] || r.status, r.note, r.ip
      ].map(e).join(','))].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'chenxin-leads-demo-' + new Date().toISOString().slice(0, 10) + '.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return ok({});
    }

    let m;
    if ((m = path.match(/^\/api\/admin\/leads\/(\d+)$/))) {
      const r = LEADS.find(x => x.id === +m[1]);
      if (!r) return fail('找不到這筆資料。', 404);
      if (method === 'PATCH') {
        if (['new','contacted','closed','invalid'].includes(body.status)) r.status = body.status;
        if (body.note !== undefined) r.note = str(body.note, 2000);
        r.updated_at = new Date().toISOString();
        save();
        return ok({ row: r });
      }
      if (method === 'DELETE') {
        if (!isAdmin) return fail('只有管理員可以刪除名單。', 403);
        LEADS = LEADS.filter(x => x.id !== r.id);
        save();
        return ok({});
      }
    }

    if (path === '/api/admin/users') {
      if (!isAdmin) return fail('權限不足。', 403);
      if (method === 'GET')
        return ok({ rows: USERS.map(({ id, username, display, role, active, created_at, last_login }) =>
          ({ id, username, display, role, active, created_at, last_login })) });
      if (method === 'POST') {
        const username = str(body.username, 40).toLowerCase();
        if (!/^[a-z0-9_.-]{3,40}$/.test(username))
          return fail('帳號僅能使用英文、數字、底線、句點或減號，長度 3–40 字元。');
        if (String(body.password || '').length < 8) return fail('密碼至少 8 個字元。');
        if (USERS.some(u => u.username === username)) return fail('這個帳號已經存在。');
        USERS.push({ id: nextUid++, username, display: str(body.display, 40) || username,
          role: body.role === 'admin' ? 'admin' : 'staff', active: 1,
          created_at: new Date().toISOString(), last_login: null });
        save();
        return ok({});
      }
    }

    if ((m = path.match(/^\/api\/admin\/users\/(\d+)$/))) {
      if (!isAdmin) return fail('權限不足。', 403);
      const u = USERS.find(x => x.id === +m[1]);
      if (!u) return fail('找不到這個帳號。', 404);
      const admins = USERS.filter(x => x.role === 'admin' && x.active).length;
      if (method === 'PATCH') {
        let role = u.role, active = u.active;
        if (body.role === 'admin' || body.role === 'staff') role = body.role;
        if (body.active !== undefined) active = body.active ? 1 : 0;
        if (u.role === 'admin' && u.active && admins <= 1 && (role !== 'admin' || !active))
          return fail('系統必須保留至少一位啟用中的管理員。');
        if (u.id === me.id && (role !== 'admin' || !active))
          return fail('不能把自己降權或停用，請改由另一位管理員操作。');
        if (body.password !== undefined && String(body.password).length < 8)
          return fail('密碼至少 8 個字元。');
        u.role = role; u.active = active;
        if (body.display !== undefined) u.display = str(body.display, 40);
        save();
        return ok({});
      }
      if (method === 'DELETE') {
        if (u.id === me.id) return fail('不能刪除自己目前登入中的帳號。');
        if (u.role === 'admin' && u.active && admins <= 1)
          return fail('系統必須保留至少一位啟用中的管理員。');
        USERS = USERS.filter(x => x.id !== u.id);
        save();
        return ok({});
      }
    }

    return fail('not found', 404);
  }

  /* ---------- 攔截 fetch ---------- */
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input.url;
    const u = new URL(raw, location.href);
    if (!u.pathname.startsWith('/api/')) return realFetch(input, init);
    await new Promise(r => setTimeout(r, 90 + Math.random() * 160));   // 模擬網路延遲
    let body = {};
    try { body = init.body ? JSON.parse(init.body) : {}; } catch {}
    try { return await route(u.pathname, (init.method || 'GET').toUpperCase(), body, u.searchParams); }
    catch (err) { console.error('[demo]', err); return fail('示範模式發生錯誤。', 500); }
  };

  /* CSV 匯出原本是導頁下載，示範模式改成直接產生檔案 */
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn-csv');
    if (!btn) return;
    btn.onclick = () => window.fetch('/api/admin/leads.csv?' + new URLSearchParams({
      q: document.getElementById('q').value.trim(),
      status: document.getElementById('fs').value,
      from: document.getElementById('ff').value,
      to: document.getElementById('ft').value
    }).toString());
  });

  console.info('%c示範模式已啟用',
    'background:#0B213F;color:#F2DFB4;padding:4px 10px;border-radius:4px',
    '\n所有 API 由瀏覽器模擬。資料只存在這個瀏覽器分頁，關掉分頁就消失，不會送到任何伺服器。');
})();
