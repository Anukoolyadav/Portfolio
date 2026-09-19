// Admin panel: Projects | Experience managers sharing one list + editor implementation.
// All data is rendered with textContent / DOM APIs — never innerHTML.
(() => {
  'use strict';

  // ── Resource configs ────────────────────────────────────────────────────────
  // Field types: text, textarea, select, month, url, lines (one per line),
  // csv (comma separated), metrics ("Label | Value" per line), toggle.
  const RESOURCES = {
    projects: {
      label: 'Projects',
      noun: 'project',
      path: '/api/admin/projects',
      itemTitle: d => d.title || '(untitled)',
      itemMeta:  d => [d.category, d.featured ? '★ featured' : ''].filter(Boolean).join(' · '),
      fields: [
        { name: 'title',      label: 'Title', type: 'text', required: true, max: 150 },
        { name: 'slug',       label: 'Slug', type: 'text', max: 80, help: 'URL id. Leave empty to generate from the title.' },
        { name: 'summary',    label: 'Summary', type: 'textarea', max: 200, rows: 2 },
        { name: 'icon',       label: 'Icon (emoji)', type: 'text', max: 16, half: true },
        { name: 'category',   label: 'Category', type: 'select', options: ['', 'ml', 'fullstack', 'research', 'game'], half: true },
        { name: 'role',       label: 'Role', type: 'text', max: 100 },
        { name: 'startDate',  label: 'Start', type: 'month', half: true },
        { name: 'endDate',    label: 'End', type: 'month', half: true, help: 'Empty = ongoing ("Present").' },
        { name: 'highlights', label: 'Highlights', type: 'lines', rows: 5, help: 'One bullet per line.' },
        { name: 'techStack',  label: 'Tech stack', type: 'csv', help: 'Comma separated.' },
        { name: 'links.github', label: 'GitHub URL', type: 'url', half: true },
        { name: 'links.live',   label: 'Live URL', type: 'url', half: true },
        { name: 'links.paper',  label: 'Paper URL', type: 'url', half: true },
        { name: 'links.video',  label: 'Video URL', type: 'url', half: true },
        { name: 'coverImage.url', label: 'Cover image URL', type: 'url', half: true },
        { name: 'coverImage.alt', label: 'Cover image alt text', type: 'text', max: 200, half: true },
        { name: 'metrics',    label: 'Metrics', type: 'metrics', rows: 3, help: 'One per line: Label | Value' },
        { name: 'body',       label: 'Case study (Markdown)', type: 'textarea', rows: 8, max: 20000 },
        { name: 'featured',   label: 'Featured', type: 'toggle', help: 'Highlight this project.' },
        { name: 'status',     label: 'Published', type: 'toggle', help: 'Off = draft (hidden from the site).' }
      ]
    },
    experience: {
      label: 'Experience',
      noun: 'experience entry',
      path: '/api/admin/experience',
      itemTitle: d => [d.company, d.role].filter(Boolean).join(' — ') || '(untitled)',
      itemMeta:  d => d.type || '',
      fields: [
        { name: 'type',      label: 'Type', type: 'select', options: ['internship', 'job'], required: true, half: true },
        { name: 'company',   label: 'Company', type: 'text', required: true, max: 100, half: true },
        { name: 'role',      label: 'Role', type: 'text', required: true, max: 100, half: true },
        { name: 'location',  label: 'Location', type: 'text', max: 100, half: true },
        { name: 'startDate', label: 'Start', type: 'month', required: true, half: true },
        { name: 'endDate',   label: 'End', type: 'month', half: true, help: 'Empty = ongoing ("Present").' },
        { name: 'highlights', label: 'Highlights', type: 'lines', rows: 5, help: 'One bullet per line.' },
        { name: 'techStack',  label: 'Tech stack', type: 'csv', help: 'Comma separated. Shown as a final "Stack: …" bullet.' },
        { name: 'links.company',     label: 'Company URL', type: 'url', half: true },
        { name: 'links.certificate', label: 'Certificate URL', type: 'url', half: true },
        { name: 'links.other',       label: 'Other URL', type: 'url' },
        { name: 'status',    label: 'Published', type: 'toggle', help: 'Off = draft (hidden from the site).' }
      ]
    }
  };

  // ── State ───────────────────────────────────────────────────────────────────
  // Auth is an httpOnly session cookie set by the server; the password is never
  // kept in JS state or storage — it lives only in the login input until submit.
  let current  = 'projects';  // active tab
  let items    = [];          // documents of the active tab
  let editing  = null;        // id being edited, or null for "new"
  let sortable = null;

  const $ = id => document.getElementById(id);

  // ── Small DOM helper ────────────────────────────────────────────────────────
  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'dataset') Object.assign(node.dataset, v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) node.append(c);
    return node;
  }

  // ── Toast ───────────────────────────────────────────────────────────────────
  let toastTimer;
  function toast(msg, type = 'success') {
    const t = $('toast');
    t.textContent = `${type === 'success' ? '✅' : '❌'} ${msg}`;
    t.className = `toast ${type} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ── API ─────────────────────────────────────────────────────────────────────
  async function api(method, url, body) {
    const opts = { method, headers: {}, credentials: 'same-origin' };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(url, opts);
    } catch {
      throw Object.assign(new Error('Network error — is the server running?'), { status: 0 });
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      showLogin('Session expired — please sign in again.');
      throw Object.assign(new Error('Unauthorized'), { status: 401, handled: true });
    }
    if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status, fields: data.fields });
    return data;
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  function showDashboard() {
    $('login-screen').hidden = true;
    $('dashboard').hidden = false;
    switchTab(current);
  }

  function showLogin(msg) {
    items = [];
    editing = null;
    $('dashboard').hidden = true;
    $('login-screen').hidden = false;
    if (msg) showLoginError(msg);
    $('passInput').focus();
  }

  async function login() {
    const input = $('passInput');
    const body = JSON.stringify({ password: input.value });
    input.value = '';                       // clear before the request even starts
    if (body === '{"password":""}') return;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body
      });
      if (res.ok) return showDashboard();
      const data = await res.json().catch(() => ({}));
      showLoginError(res.status === 401 ? 'Incorrect password.' : (data.error || `Sign-in failed (${res.status}).`));
    } catch {
      showLoginError('Could not reach the server.');
    }
  }

  function showLoginError(msg) {
    const e = $('login-error');
    e.textContent = msg;
    e.hidden = false;
    setTimeout(() => { e.hidden = true; }, 4000);
  }

  async function logout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
    } catch { /* cookie expires on its own */ }
    showLogin();
  }

  // On page load: an existing session cookie skips the login screen.
  async function checkSession() {
    try {
      const res = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if (res.ok) return showDashboard();
    } catch { /* fall through to login */ }
    showLogin();
  }

  // ── Field helpers ───────────────────────────────────────────────────────────
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  function setPath(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => (o[k] ??= {}), obj);
    target[last] = value;
  }
  const toMonth = iso => (iso ? new Date(iso).toISOString().slice(0, 7) : '');

  // Document value -> form control value
  function toInput(field, value) {
    switch (field.type) {
      case 'month':   return toMonth(value);
      case 'lines':   return (value || []).join('\n');
      case 'csv':     return (value || []).join(', ');
      case 'metrics': return (value || []).map(m => `${m.label} | ${m.value}`).join('\n');
      case 'toggle':  return field.name === 'status' ? value === 'published' : Boolean(value);
      default:        return value ?? '';
    }
  }

  // Form control value -> API value
  function fromInput(field, value) {
    switch (field.type) {
      case 'month':   return value ? `${value}-01` : (field.required ? '' : null);
      case 'lines':   return value.split('\n').map(s => s.trim()).filter(Boolean);
      case 'csv':     return value.split(',').map(s => s.trim()).filter(Boolean);
      case 'metrics': return value.split('\n').map(s => s.trim()).filter(Boolean).map(line => {
                        const i = line.indexOf('|');
                        return i === -1 ? { label: line, value: '' }
                                        : { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
                      });
      case 'toggle':  return field.name === 'status' ? (value ? 'published' : 'draft') : Boolean(value);
      default:        return value;
    }
  }

  // ── Tabs ────────────────────────────────────────────────────────────────────
  function switchTab(name) {
    current = name;
    for (const btn of document.querySelectorAll('[data-tab]')) {
      const active = btn.dataset.tab === name;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    }
    $('list-title').textContent = RESOURCES[name].label;
    openEditor(null);
    loadList();
  }

  // ── List ────────────────────────────────────────────────────────────────────
  async function loadList() {
    const list = $('itemList');
    const tab = current;
    list.replaceChildren(el('p', { class: 'empty-msg', text: 'Loading…' }));
    try {
      const data = await api('GET', RESOURCES[tab].path);
      if (tab !== current) return;   // user switched tabs meanwhile
      items = data;
      renderList();
    } catch (err) {
      if (!err.handled) list.replaceChildren(el('p', { class: 'empty-msg', text: err.message }));
    }
  }

  function renderList() {
    const R = RESOURCES[current];
    const list = $('itemList');
    if (!items.length) {
      list.replaceChildren(el('p', { class: 'empty-msg', text: `No ${R.noun}s yet. Click “New”.` }));
      return;
    }
    list.replaceChildren(...items.map(d => {
      const published = d.status === 'published';
      return el('li', { class: `item${d.id === editing ? ' active' : ''}`, dataset: { id: d.id } }, [
        el('span', { class: 'drag-handle', title: 'Drag to reorder', 'aria-hidden': 'true', text: '⠿' }),
        el('button', { class: 'item-main', type: 'button', onclick: () => openEditor(d.id) }, [
          el('span', { class: 'item-title', text: R.itemTitle(d) }),
          el('span', { class: 'item-meta' }, [
            el('span', { class: `status-dot ${published ? 'published' : 'draft'}` }),
            el('span', { text: published ? 'Published' : 'Draft' }),
            R.itemMeta(d) ? el('span', { text: ` · ${R.itemMeta(d)}` }) : null
          ])
        ]),
        el('button', {
          class: 'btn btn-ghost btn-xs', type: 'button',
          title: published ? 'Unpublish' : 'Publish',
          text: published ? 'Unpublish' : 'Publish',
          onclick: () => togglePublish(d)
        })
      ]);
    }));
    enableSorting();
  }

  function enableSorting() {
    if (sortable) sortable.destroy();
    if (typeof Sortable === 'undefined') {   // CDN blocked: list still works, just no drag
      toast('Drag-and-drop unavailable (SortableJS failed to load).', 'error');
      return;
    }
    sortable = Sortable.create($('itemList'), {
      handle: '.drag-handle',
      animation: 150,
      onEnd: saveOrder
    });
  }

  async function saveOrder(evt) {
    if (evt.oldIndex === evt.newIndex) return;
    const ids = [...$('itemList').children].map(li => li.dataset.id).filter(Boolean);
    try {
      await api('PATCH', `${RESOURCES[current].path}/reorder`, { ids });
      items.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      toast('Order saved.');
    } catch (err) {
      if (!err.handled) toast(`Reorder failed: ${err.message}`, 'error');
      loadList();   // restore the server's order
    }
  }

  async function togglePublish(d) {
    try {
      const updated = await api('PATCH', `${RESOURCES[current].path}/${d.id}/publish`, { published: d.status !== 'published' });
      toast(updated.status === 'published' ? 'Published.' : 'Unpublished (now a draft).');
      await loadList();
      if (editing === d.id) openEditor(d.id);
    } catch (err) {
      if (!err.handled) toast(err.message, 'error');
    }
  }

  // ── Editor ──────────────────────────────────────────────────────────────────
  function fieldControl(field, value) {
    const id = `f-${field.name.replace(/\./g, '-')}`;
    const common = { id, name: field.name };

    if (field.type === 'toggle') {
      const input = el('input', { ...common, type: 'checkbox', class: 'toggle-input' });
      input.checked = Boolean(value);
      return el('div', { class: 'form-group toggle-group' }, [
        el('label', { class: 'toggle-row', for: id }, [
          input,
          el('span', { class: 'toggle', 'aria-hidden': 'true' }),
          el('span', { class: 'toggle-label' }, [
            document.createTextNode(field.label),
            field.help ? el('small', { text: field.help }) : null
          ])
        ]),
        el('div', { class: 'field-error', id: `${id}-error` })
      ]);
    }

    let input;
    if (field.type === 'select') {
      input = el('select', common, field.options.map(o => el('option', { value: o, text: o || '—' })));
      input.value = value ?? '';
    } else if (['textarea', 'lines', 'metrics'].includes(field.type)) {
      input = el('textarea', { ...common, rows: field.rows || 3, maxlength: field.max });
      input.value = value;
    } else {
      const type = field.type === 'url' ? 'url' : field.type === 'month' ? 'month' : 'text';
      input = el('input', { ...common, type, maxlength: field.max, placeholder: field.type === 'url' ? 'https://…' : undefined });
      input.value = value;
    }
    if (field.required) input.required = true;

    return el('div', { class: `form-group${field.half ? ' half' : ''}` }, [
      el('label', { for: id }, [
        document.createTextNode(field.label),
        field.required ? el('span', { class: 'req', text: ' *' }) : null
      ]),
      input,
      field.help ? el('div', { class: 'helper-text', text: field.help }) : null,
      el('div', { class: 'field-error', id: `${id}-error` })
    ]);
  }

  function openEditor(id) {
    const R = RESOURCES[current];
    editing = id;
    const doc = id ? items.find(d => d.id === id) : null;
    if (id && !doc) { editing = null; return openEditor(null); }

    $('editor-title').textContent = doc ? `Edit ${R.noun}` : `New ${R.noun}`;
    $('saveLabel').textContent = doc ? 'Save changes' : `Create ${R.noun}`;
    $('deleteBtn').hidden = !doc;

    const values = doc || {};
    $('editorFields').replaceChildren(...R.fields.map(f => fieldControl(f, toInput(f, getPath(values, f.name)))));

    for (const li of $('itemList').querySelectorAll('.item')) {
      li.classList.toggle('active', li.dataset.id === id);
    }
  }

  function collectPayload() {
    const payload = {};
    for (const f of RESOURCES[current].fields) {
      const input = $(`f-${f.name.replace(/\./g, '-')}`);
      const raw = f.type === 'toggle' ? input.checked : input.value;
      setPath(payload, f.name, fromInput(f, raw));
    }
    return payload;
  }

  function clearFieldErrors() {
    for (const e of document.querySelectorAll('.field-error')) e.textContent = '';
    for (const i of document.querySelectorAll('[aria-invalid]')) i.removeAttribute('aria-invalid');
  }

  function showFieldErrors(fields = {}) {
    for (const [path, msg] of Object.entries(fields)) {
      // "links.live" -> f-links-live; "highlights.2" -> f-highlights
      const known = RESOURCES[current].fields.find(f => path === f.name || path.startsWith(`${f.name}.`));
      const id = `f-${(known ? known.name : path).replace(/\./g, '-')}`;
      const box = $(`${id}-error`);
      if (box) box.textContent = `${path} ${msg}`;
      $(id)?.setAttribute('aria-invalid', 'true');
    }
  }

  async function save(evt) {
    evt.preventDefault();
    const R = RESOURCES[current];
    clearFieldErrors();
    const btn = $('saveBtn');
    btn.disabled = true;
    try {
      const payload = collectPayload();
      const saved = editing
        ? await api('PUT', `${R.path}/${editing}`, payload)
        : await api('POST', R.path, payload);
      toast(editing ? 'Saved.' : 'Created.');
      editing = saved.id;
      await loadList();
      openEditor(saved.id);
    } catch (err) {
      if (err.handled) return;
      showFieldErrors(err.fields);
      toast(err.fields ? 'Please fix the highlighted fields.' : err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async function remove() {
    const R = RESOURCES[current];
    const doc = items.find(d => d.id === editing);
    if (!doc) return;
    if (!window.confirm(`Delete “${R.itemTitle(doc)}” permanently? This cannot be undone.`)) return;
    try {
      await api('DELETE', `${R.path}/${doc.id}`);
      toast('Deleted.');
      editing = null;
      await loadList();
      openEditor(null);
    } catch (err) {
      if (!err.handled) toast(err.message, 'error');
    }
  }

  // ── Wire up ─────────────────────────────────────────────────────────────────
  $('loginBtn').addEventListener('click', login);
  $('passInput').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  $('logoutBtn').addEventListener('click', logout);
  $('newBtn').addEventListener('click', () => openEditor(null));
  $('editorForm').addEventListener('submit', save);
  $('deleteBtn').addEventListener('click', remove);
  $('clearBtn').addEventListener('click', () => openEditor(editing));
  for (const btn of document.querySelectorAll('[data-tab]')) {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  }
  checkSession();
})();
