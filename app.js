// Dashboard Master Data Fuuka. Semua teks pengguna dirender lewat DOM (tanpa innerHTML).
(function () {
  const TABS = [
    { id: "buff", title: "Kode Buff" },
    { id: "buffland", title: "Code Buffland" }
  ];
  const PIN_KEY = "fuuka_pin";

  const api = FuukaApi.createApi({
    getUrl: () => (window.FUUKA_CONFIG || {}).API_URL,
    fetchImpl: (...args) => fetch(...args)
  });
  const { buildBuffBody } = FuukaBuffText;
  const $ = (id) => document.getElementById(id);

  // buff disimpan sebagai kelompok [{nama, kode:[...]}], buffland sebagai baris [{label, nama}].
  const state = { pin: "", tab: TABS[0].id, data: {}, dirty: {}, busy: false };

  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children) el.append(c);
    return el;
  }

  function storage(fn) {
    try { return fn(window.sessionStorage); } catch (e) { return null; }
  }

  // ---- konversi data server <-> editor ----
  function toGroups(rows) {
    const groups = [];
    for (const r of rows) {
      const last = groups[groups.length - 1];
      if (last && last.nama === r.nama) last.kode.push(r.kode);
      else groups.push({ nama: r.nama, kode: [r.kode] });
    }
    return groups;
  }

  function toRows(tab) {
    if (tab === "buff") {
      const rows = [];
      for (const g of state.data.buff) for (const k of g.kode) rows.push({ urutan: rows.length + 1, nama: g.nama, kode: k });
      return rows;
    }
    return state.data.buffland.map((r, i) => ({ urutan: i + 1, label: r.label, nama: r.nama }));
  }

  function load(tab, rows) {
    state.data[tab] = tab === "buff" ? toGroups(rows) : rows.map((r) => ({ label: r.label, nama: r.nama }));
    state.dirty[tab] = false;
  }

  // ---- tampilan ----
  function show(which) {
    $("login").hidden = which !== "login";
    $("editor").hidden = which !== "editor";
  }

  function setMsg(el, text, kind) {
    el.textContent = text || "";
    el.className = "msg" + (kind ? " " + kind : "");
  }

  function markDirty() {
    state.dirty[state.tab] = true;
    $("dirty").hidden = false;
    setMsg($("msg"), "");
  }

  function updatePreview() {
    const buff = toRows("buff").filter((r) => r.nama.trim() && r.kode);
    const land = toRows("buffland").filter((r) => r.label.trim() && r.nama.trim());
    $("preview").textContent = buildBuffBody(buff, land);
  }

  function updatePageInfo() {
    const isBuff = state.tab === "buff";
    const count = isBuff ? state.data.buff.length : state.data.buffland.length;
    $("page-title").textContent = isBuff ? "Kode buff" : "Code buffland";
    $("page-help").textContent = isBuff
      ? "Atur nama buff dan kode yang digunakan bot."
      : "Atur label dan nama untuk blok code buffland.";
    $("item-count").textContent = count;
    $("item-label").textContent = isBuff ? "kelompok buff" : "baris buffland";
  }

  function move(arr, i, d) {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  function iconBtn(label, text, onclick, extra) {
    return h("button", { type: "button", class: "icon" + (extra ? " " + extra : ""), "aria-label": label, title: label, onclick }, text);
  }

  function textInput(value, placeholder, label, oninput, extra) {
    return h("input", { type: "text", value, placeholder, "aria-label": label, oninput, class: extra || false });
  }

  function renderBuff() {
    const groups = state.data.buff;
    const wrap = h("div");
    groups.forEach((g, gi) => {
      const head = h("div", { class: "group-head" },
        textInput(g.nama, "Nama buff", "Nama buff", (e) => { g.nama = e.target.value; markDirty(); updatePreview(); }),
        iconBtn("Naik", "↑", () => { move(groups, gi, -1); markDirty(); render(); }),
        iconBtn("Turun", "↓", () => { move(groups, gi, 1); markDirty(); render(); }),
        iconBtn("Hapus buff", "✕", () => { groups.splice(gi, 1); markDirty(); render(); }, "danger")
      );
      const box = h("div", { class: "group" }, head);
      g.kode.forEach((k, ki) => {
        const input = h("input", {
          type: "text", inputmode: "numeric", value: k, placeholder: "Kode (angka)", "aria-label": "Kode",
          oninput: (e) => {
            e.target.value = e.target.value.replace(/\D/g, "");
            g.kode[ki] = e.target.value;
            markDirty(); updatePreview();
          }
        });
        box.append(h("div", { class: "code-row" }, input,
          iconBtn("Hapus kode", "✕", () => { g.kode.splice(ki, 1); markDirty(); render(); }, "danger")));
        if (g.kode.length === 1) box.lastChild.lastChild.disabled = true;
      });
      box.append(h("div", {}, h("button", { type: "button", onclick: () => { g.kode.push(""); markDirty(); render(".group:nth-child(" + (gi + 1) + ") .code-row:last-of-type input"); } }, "+ kode")));
      wrap.append(box);
    });
    wrap.append(h("button", { type: "button", class: "add-group", onclick: () => { groups.push({ nama: "", kode: [""] }); markDirty(); render(".group:last-of-type .group-head input"); } }, "+ Tambah buff"));
    return wrap;
  }

  function renderBuffland() {
    const rows = state.data.buffland;
    const wrap = h("div");
    rows.forEach((r, i) => {
      wrap.append(h("div", { class: "land-row group" },
        textInput(r.label, "Label (mis. MP)", "Label", (e) => { r.label = e.target.value; markDirty(); updatePreview(); }),
        textInput(r.nama, "Nama", "Nama", (e) => { r.nama = e.target.value; markDirty(); updatePreview(); }),
        iconBtn("Naik", "↑", () => { move(rows, i, -1); markDirty(); render(); }),
        iconBtn("Turun", "↓", () => { move(rows, i, 1); markDirty(); render(); }),
        iconBtn("Hapus baris", "✕", () => { rows.splice(i, 1); markDirty(); render(); }, "danger")
      ));
    });
    wrap.append(h("button", { type: "button", class: "add-group", onclick: () => { rows.push({ label: "", nama: "" }); markDirty(); render(".land-row:last-of-type input"); } }, "+ Tambah baris"));
    return wrap;
  }

  function renderTabs() {
    const nav = $("tabs");
    nav.replaceChildren(...TABS.map((t) => h("button", {
      type: "button", class: "tab", role: "tab", "aria-selected": String(t.id === state.tab),
      onclick: () => { state.tab = t.id; setMsg($("msg"), ""); render(); }
    }, h("span", {}, t.title), h("span", { class: "tab-count" }, String(t.id === "buff" ? (state.data.buff || []).length : (state.data.buffland || []).length)))));
  }

  function render(focusSelector) {
    renderTabs();
    updatePageInfo();
    $("form").replaceChildren(state.tab === "buff" ? renderBuff() : renderBuffland());
    $("dirty").hidden = !state.dirty[state.tab];
    updatePreview();
    if (focusSelector) {
      const el = $("form").querySelector(focusSelector);
      if (el) el.focus();
    }
  }

  // ---- validasi sisi klien (server tetap memvalidasi ulang) ----
  function validate(tab) {
    if (tab === "buff") {
      for (const g of state.data.buff) {
        if (!g.nama.trim()) return "Ada nama buff yang kosong";
        for (const k of g.kode) if (!/^[0-9]+$/.test(k)) return `Kode "${g.nama}" harus berupa angka dan tidak boleh kosong`;
      }
    } else {
      for (const r of state.data.buffland) if (!r.label.trim() || !r.nama.trim()) return "Label dan nama buffland tidak boleh kosong";
    }
    return null;
  }

  async function save() {
    if (state.busy) return;
    const tab = state.tab;
    const galat = validate(tab);
    if (galat) return setMsg($("msg"), galat, "err");
    state.busy = true;
    $("save").disabled = true;
    setMsg($("msg"), "Menyimpan…");
    try {
      await api.save(tab, toRows(tab), state.pin);
      load(tab, await api.readAdmin(tab, state.pin));
      render();
      setMsg($("msg"), "Tersimpan. Bot memakai data baru paling lambat 5 menit lagi.", "ok");
    } catch (e) {
      setMsg($("msg"), e.message, "err");
    } finally {
      state.busy = false;
      $("save").disabled = false;
    }
  }

  async function loadAll() {
    const results = await Promise.all(TABS.map((t) => api.readAdmin(t.id, state.pin)));
    TABS.forEach((t, i) => load(t.id, results[i]));
    render();
    show("editor");
  }

  function logout() {
    state.pin = "";
    state.data = {};
    storage((s) => s.removeItem(PIN_KEY));
    $("pin").value = "";
    show("login");
    $("pin").focus();
  }

  async function onLogin(e) {
    e.preventDefault();
    const pin = $("pin").value;
    $("login-btn").disabled = true;
    setMsg($("login-msg"), "Memeriksa…");
    try {
      await api.login(pin);
      state.pin = pin;
      storage((s) => s.setItem(PIN_KEY, pin));
      await loadAll();
      setMsg($("login-msg"), "");
    } catch (err) {
      state.pin = "";
      setMsg($("login-msg"), err.message, "err");
    } finally {
      $("login-btn").disabled = false;
    }
  }

  async function init() {
    $("login-form").addEventListener("submit", onLogin);
    $("logout").addEventListener("click", logout);
    $("save").addEventListener("click", save);
    window.addEventListener("beforeunload", (e) => {
      if (Object.values(state.dirty).some(Boolean)) { e.preventDefault(); e.returnValue = ""; }
    });
    const saved = storage((s) => s.getItem(PIN_KEY));
    if (saved) {
      state.pin = saved;
      try { await loadAll(); return; } catch (e) { state.pin = ""; storage((s) => s.removeItem(PIN_KEY)); }
    }
    show("login");
    $("pin").focus();
  }

  init();
})();
