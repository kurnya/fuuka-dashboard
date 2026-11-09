// Dashboard Master Data Fuuka. Semua teks pengguna dirender lewat DOM (tanpa innerHTML).
(function () {
  const TABS = [
    { id: "buff", title: "Kode Buff" },
    { id: "buffland", title: "Code Buffland" },
    { id: "xtallMaster", title: "Xtall Master" },
    { id: "xtallEvent", title: "Xtall Event" },
    { id: "mq", title: "Bahan MQ" }
  ];
  const PIN_KEY = "fuuka_pin";

  const api = FuukaApi.createApi({
    getUrl: () => (window.FUUKA_CONFIG || {}).API_URL,
    fetchImpl: (...args) => fetch(...args)
  });
  const { buildBuffBody } = FuukaBuffText;
  const $ = (id) => document.getElementById(id);

  // buff disimpan sebagai kelompok [{nama, kode:[...]}], buffland sebagai baris [{label, nama}].
  // orig menyimpan salinan data terakhir dari server, dipakai untuk mendeteksi perubahan dan membatalkan.
  const state = { pin: "", tab: TABS[0].id, data: {}, orig: {}, submitted: false, busy: false };
  let fieldSeq = 0;

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
    if (tab === "buffland") return state.data.buffland.map((r, i) => ({ urutan: i + 1, label: r.label, nama: r.nama }));
    return state.data[tab].map((isi, i) => ({ urutan: i + 1, isi }));
  }

  function load(tab, rows) {
    state.data[tab] = tab === "buff"
      ? toGroups(rows)
      : tab === "buffland"
        ? rows.map((r) => ({ label: r.label, nama: r.nama }))
        : rows.map((r) => r.isi || "");
    state.orig[tab] = JSON.stringify(state.data[tab]);
  }

  function isDirty(tab) {
    return state.data[tab] !== undefined && JSON.stringify(state.data[tab]) !== state.orig[tab];
  }

  // ---- tampilan ----
  function show(which) {
    $("login").hidden = which !== "login";
    $("loading").hidden = which !== "loading";
    $("editor").hidden = which !== "editor";
  }

  function setMsg(el, text, kind) {
    el.textContent = text || "";
    el.className = "msg" + (kind ? " " + kind : "");
  }

  let toastTimer;
  function clearToast() {
    clearTimeout(toastTimer);
    $("toasts").replaceChildren();
  }

  function toast(text, opts = {}) {
    clearTimeout(toastTimer);
    const kids = [h("span", {}, text)];
    if (opts.action) {
      kids.push(h("button", { type: "button", class: "toast-action", onclick: () => { clearToast(); opts.onAction(); } }, opts.action));
    }
    $("toasts").replaceChildren(h("div", { class: "toast" + (opts.kind ? " " + opts.kind : "") }, ...kids));
    toastTimer = setTimeout(clearToast, opts.ms || 4000);
  }

  function refreshDirty() {
    const dirty = isDirty(state.tab);
    const label = $("dirty");
    label.textContent = dirty ? "Perubahan belum disimpan" : "Semua perubahan tersimpan";
    label.classList.toggle("unsaved", dirty);
    $("discard").hidden = !dirty;
    if (!dirty) resetDiscard();
    $("save").disabled = state.busy || !dirty;
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("changed", isDirty(t.dataset.tab)));
  }

  function markDirty() {
    setMsg($("msg"), "");
    refreshDirty();
  }

  function updatePreview() {
    if (state.tab !== "buff" && state.tab !== "buffland") {
      $("preview").textContent = state.data[state.tab].join("\n");
      return;
    }
    const buff = toRows("buff").filter((r) => r.nama.trim() && r.kode);
    const land = toRows("buffland").filter((r) => r.label.trim() && r.nama.trim());
    $("preview").textContent = buildBuffBody(buff, land);
  }

  function updatePageInfo() {
    const isBuff = state.tab === "buff";
    const isLand = state.tab === "buffland";
    $("page-title").textContent = isBuff ? "Kode buff" : isLand ? "Code buffland" : TABS.find((t) => t.id === state.tab).title;
    $("page-help").textContent = isBuff
      ? "Atur nama buff dan kode yang digunakan bot."
      : isLand
        ? "Atur label dan nama untuk blok code buffland."
        : "Atur baris teks yang dikirim untuk topik ini.";
  }

  function move(arr, i, d) {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  // Hapus satu item lalu tawarkan "Urungkan" lewat toast.
  function removeWithUndo(arr, idx, label) {
    const [item] = arr.splice(idx, 1);
    markDirty();
    render();
    toast(label, { action: "Urungkan", ms: 6000, onAction: () => { arr.splice(idx, 0, item); markDirty(); render(); } });
  }

  function iconBtn(label, text, onclick, extra) {
    return h("button", { type: "button", class: "icon" + (extra ? " " + extra : ""), "aria-label": label, title: label, onclick }, text);
  }

  function textInput(value, placeholder, label, oninput) {
    return h("input", { type: "text", value, placeholder, "aria-label": label, oninput });
  }

  // Pasang validasi per field. rule(nilai) mengembalikan pesan galat atau "".
  // Galat tampil setelah field disentuh (blur) atau setelah percobaan simpan.
  function validated(input, rule) {
    const id = "err-" + (++fieldSeq);
    const err = h("p", { class: "field-error", id, hidden: true });
    input.setAttribute("aria-describedby", id);
    const apply = () => {
      const msg = rule(input.value);
      const showIt = Boolean(msg) && (input.dataset.touched === "1" || state.submitted);
      input.classList.toggle("invalid", showIt);
      input.setAttribute("aria-invalid", showIt ? "true" : "false");
      err.textContent = showIt ? msg : "";
      err.hidden = !showIt;
    };
    input.addEventListener("input", apply);
    input.addEventListener("blur", () => { input.dataset.touched = "1"; apply(); });
    apply();
    return err;
  }

  const ruleNama = (v) => (v.trim() ? "" : "Nama buff tidak boleh kosong");
  const ruleKode = (v) => (/^[0-9]+$/.test(v) ? "" : "Kode harus berupa angka");
  const ruleLabel = (v) => (v.trim() ? "" : "Label tidak boleh kosong");
  const ruleLandNama = (v) => (v.trim() ? "" : "Nama tidak boleh kosong");

  function renderBuff() {
    const groups = state.data.buff;
    const wrap = h("div");
    const addBuff = () => {
      groups.push({ nama: "", kode: [""] });
      markDirty();
      render(() => {
        const heads = $("form").querySelectorAll(".group .group-head input");
        return heads[heads.length - 1];
      });
    };
    wrap.append(h("div", { class: "editor-toolbar" },
      h("div", {}, h("strong", {}, "Daftar buff"), h("span", { class: "muted" }, " Tambahkan nama dan kode buff.")),
      h("button", { type: "button", class: "add-button", onclick: addBuff }, "+ Tambah buff")
    ));
    groups.forEach((g, gi) => {
      const namaInput = textInput(g.nama, "Nama buff", "Nama buff", (e) => { g.nama = e.target.value; markDirty(); updatePreview(); });
      const namaErr = validated(namaInput, ruleNama);
      const head = h("div", { class: "group-head" },
        namaInput,
        h("span", { class: "code-count" }, `${g.kode.length} kode`),
        iconBtn("Naik", "↑", () => { move(groups, gi, -1); markDirty(); render(); }),
        iconBtn("Turun", "↓", () => { move(groups, gi, 1); markDirty(); render(); }),
        iconBtn("Hapus buff", "✕", () => removeWithUndo(groups, gi, g.nama.trim() ? `Buff "${g.nama.trim()}" dihapus.` : "Buff dihapus."), "danger")
      );
      const box = h("div", { class: "group" }, head, namaErr);
      g.kode.forEach((k, ki) => {
        const input = h("input", {
          type: "text", inputmode: "numeric", value: k, placeholder: "Kode (angka)", "aria-label": "Kode",
          oninput: (e) => {
            e.target.value = e.target.value.replace(/\D/g, "");
            g.kode[ki] = e.target.value;
            markDirty(); updatePreview();
          }
        });
        const kodeErr = validated(input, ruleKode);
        const del = iconBtn("Hapus kode", "✕", () => removeWithUndo(g.kode, ki, "Kode dihapus."), "danger");
        if (g.kode.length === 1) del.disabled = true;
        box.append(h("div", { class: "code-row" }, input, del), kodeErr);
      });
      box.append(h("div", {}, h("button", {
        type: "button",
        onclick: () => {
          g.kode.push("");
          markDirty();
          render(() => {
            const rows = $("form").querySelectorAll(".group")[gi].querySelectorAll(".code-row input");
            return rows[rows.length - 1];
          });
        }
      }, "+ kode")));
      wrap.append(box);
    });
    wrap.append(h("button", { type: "button", class: "add-button add-bottom", onclick: addBuff }, "+ Tambah buff"));
    return wrap;
  }

  function renderBuffland() {
    const rows = state.data.buffland;
    const wrap = h("div");
    const addRow = () => {
      rows.push({ label: "", nama: "" });
      markDirty();
      render(() => {
        const labels = $("form").querySelectorAll(".land-row input:first-child");
        return labels[labels.length - 1];
      });
    };
    wrap.append(h("div", { class: "editor-toolbar" },
      h("div", {}, h("strong", {}, "Daftar buffland"), h("span", { class: "muted" }, " Atur label dan nama buffland.")),
      h("button", { type: "button", class: "add-button", onclick: addRow }, "+ Tambah baris")
    ));
    rows.forEach((r, i) => {
      const labelInput = textInput(r.label, "Label (mis. MP)", "Label", (e) => { r.label = e.target.value; markDirty(); updatePreview(); });
      const namaInput = textInput(r.nama, "Nama", "Nama", (e) => { r.nama = e.target.value; markDirty(); updatePreview(); });
      const labelErr = validated(labelInput, ruleLabel);
      const namaErr = validated(namaInput, ruleLandNama);
      wrap.append(h("div", { class: "group" },
        h("div", { class: "land-row" },
          labelInput,
          namaInput,
          iconBtn("Naik", "↑", () => { move(rows, i, -1); markDirty(); render(); }),
          iconBtn("Turun", "↓", () => { move(rows, i, 1); markDirty(); render(); }),
          iconBtn("Hapus baris", "✕", () => removeWithUndo(rows, i, "Baris dihapus."), "danger")
        ),
        labelErr, namaErr
      ));
    });
    wrap.append(h("button", { type: "button", class: "add-button add-bottom", onclick: addRow }, "+ Tambah baris"));
    return wrap;
  }

  function renderXtall() {
    const lines = state.data[state.tab];
    const wrap = h("div");
    const addLine = () => {
      lines.push("");
      markDirty();
      render(() => {
        const inputs = $("form").querySelectorAll(".topic-line input");
        return inputs[inputs.length - 1];
      });
    };
    wrap.append(h("div", { class: "editor-toolbar" },
      h("div", {}, h("strong", {}, "Daftar baris"), h("span", { class: "muted" }, " Edit teks, pemisah, atau baris kosong.")),
      h("button", { type: "button", class: "add-button", onclick: addLine }, "+ Tambah baris")
    ));
    lines.forEach((line, i) => {
      const input = textInput(line, "Teks baris (kosong = pemisah)", "Isi baris", (e) => { lines[i] = e.target.value; markDirty(); updatePreview(); });
      wrap.append(h("div", { class: "topic-line" },
        input,
        iconBtn("Naik", "↑", () => { move(lines, i, -1); markDirty(); render(); }),
        iconBtn("Turun", "↓", () => { move(lines, i, 1); markDirty(); render(); }),
        iconBtn("Hapus baris", "✕", () => removeWithUndo(lines, i, "Baris dihapus."), "danger")
      ));
    });
    wrap.append(h("button", { type: "button", class: "add-button add-bottom", onclick: addLine }, "+ Tambah baris"));
    return wrap;
  }

  function renderTabs() {
    const nav = $("tabs");
    nav.replaceChildren(...TABS.map((t) => h("button", {
      type: "button", class: "tab", role: "tab", "data-tab": t.id, "aria-selected": String(t.id === state.tab),
      onclick: () => {
        if (state.tab === t.id) return;
        state.tab = t.id; state.submitted = false; clearToast(); setMsg($("msg"), ""); render();
      }
      }, h("span", {}, t.title), h("span", { class: "tab-count" }, String((state.data[t.id] || []).length)))));
  }

  // focusTarget: fungsi yang mengembalikan elemen untuk difokuskan (dan digulir ke tengah layar).
  function render(focusTarget) {
    renderTabs();
    updatePageInfo();
    $("form").replaceChildren(
      state.tab === "buff" ? renderBuff() : state.tab === "buffland" ? renderBuffland() : renderXtall()
    );
    refreshDirty();
    updatePreview();
    if (focusTarget) {
      const el = focusTarget();
      if (el) {
        el.focus({ preventScroll: true });
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }

  // ---- validasi sisi klien (server tetap memvalidasi ulang) ----
  function countProblems(tab) {
    let n = 0;
    if (tab === "buff") {
      for (const g of state.data.buff) {
        if (ruleNama(g.nama)) n++;
        for (const k of g.kode) if (ruleKode(k)) n++;
      }
    } else if (tab === "buffland") {
      for (const r of state.data.buffland) {
        if (ruleLabel(r.label)) n++;
        if (ruleLandNama(r.nama)) n++;
      }
    } else if (state.data[tab].length === 0) {
      n++;
    }
    return n;
  }

  async function save() {
    if (state.busy || !isDirty(state.tab)) return;
    const tab = state.tab;
    const problems = countProblems(tab);
    if (problems) {
      state.submitted = true;
      render(() => $("form").querySelector(".invalid"));
      return setMsg($("msg"), `${problems} isian perlu diperbaiki sebelum disimpan.`, "err");
    }
    state.busy = true;
    $("save").textContent = "Menyimpan…";
    refreshDirty();
    setMsg($("msg"), "");
    try {
      await api.save(tab, toRows(tab), state.pin);
      load(tab, await api.readAdmin(tab, state.pin));
      state.submitted = false;
      clearToast();
      render();
      toast("Tersimpan. Bot memakai data baru paling lambat 5 menit lagi.", { kind: "ok", ms: 6000 });
    } catch (e) {
      setMsg($("msg"), e.message, "err");
    } finally {
      state.busy = false;
      $("save").textContent = "Simpan";
      refreshDirty();
    }
  }

  // Batalkan butuh dua klik agar perubahan tidak hilang tanpa sengaja.
  let discardTimer;
  function resetDiscard() {
    clearTimeout(discardTimer);
    $("discard").textContent = "Batalkan";
    $("discard").classList.remove("danger");
  }

  function discard() {
    const btn = $("discard");
    if (!btn.classList.contains("danger")) {
      btn.textContent = "Klik lagi untuk batalkan";
      btn.classList.add("danger");
      discardTimer = setTimeout(resetDiscard, 3000);
      return;
    }
    resetDiscard();
    state.data[state.tab] = JSON.parse(state.orig[state.tab]);
    state.submitted = false;
    clearToast();
    setMsg($("msg"), "");
    render();
    toast("Perubahan dibatalkan.");
  }

  async function copyPreview() {
    const text = $("preview").textContent;
    try {
      await navigator.clipboard.writeText(text);
      toast("Pesan disalin.", { kind: "ok" });
    } catch (e) {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents($("preview"));
      sel.removeAllRanges();
      sel.addRange(range);
      toast("Tidak bisa menyalin otomatis. Teks sudah dipilih, tekan Ctrl+C.");
    }
  }

  async function loadAll() {
    const results = await Promise.all(TABS.map((t) => api.readAdmin(t.id, state.pin)));
    TABS.forEach((t, i) => load(t.id, results[i]));
    state.submitted = false;
    render();
    show("editor");
  }

  function logout() {
    if (Object.values(TABS).some((t) => isDirty(t.id)) && !window.confirm("Ada perubahan yang belum disimpan. Tetap keluar?")) return;
    state.pin = "";
    state.data = {};
    state.orig = {};
    clearToast();
    storage((s) => s.removeItem(PIN_KEY));
    $("pin").value = "";
    setPinVisible(false);
    setMsg($("login-msg"), "");
    clearPinInvalid();
    show("login");
    $("pin").focus();
  }

  function setPinVisible(visible) {
    $("pin").type = visible ? "text" : "password";
    const btn = $("pin-toggle");
    btn.textContent = visible ? "Sembunyikan" : "Tampilkan";
    btn.setAttribute("aria-pressed", String(visible));
    btn.setAttribute("aria-label", visible ? "Sembunyikan PIN" : "Tampilkan PIN");
  }

  function clearPinInvalid() {
    $("pin").classList.remove("invalid");
    $("pin").setAttribute("aria-invalid", "false");
  }

  function setLoginBusy(busy) {
    $("login-btn").disabled = busy;
    $("login-spinner").hidden = !busy;
    $("login-btn-text").textContent = busy ? "Memeriksa…" : "Masuk";
  }

  async function onLogin(e) {
    e.preventDefault();
    const pin = $("pin").value;
    if (!pin) {
      setMsg($("login-msg"), "Masukkan PIN terlebih dahulu.", "err");
      $("pin").classList.add("invalid");
      $("pin").setAttribute("aria-invalid", "true");
      $("pin").focus();
      return;
    }
    setLoginBusy(true);
    clearPinInvalid();
    setMsg($("login-msg"), "");
    try {
      await api.login(pin);
      state.pin = pin;
      storage((s) => s.setItem(PIN_KEY, pin));
      show("loading");
      await loadAll();
    } catch (err) {
      state.pin = "";
      show("login");
      setMsg($("login-msg"), err.message, "err");
      $("pin").classList.add("invalid");
      $("pin").setAttribute("aria-invalid", "true");
      $("pin").focus();
      $("pin").select();
    } finally {
      setLoginBusy(false);
    }
  }

  async function init() {
    $("login-form").addEventListener("submit", onLogin);
    $("pin").addEventListener("input", () => { clearPinInvalid(); setMsg($("login-msg"), ""); });
    $("pin-toggle").addEventListener("click", () => setPinVisible($("pin").type === "password"));
    $("logout").addEventListener("click", logout);
    $("save").addEventListener("click", save);
    $("discard").addEventListener("click", discard);
    $("copy").addEventListener("click", copyPreview);
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!$("editor").hidden) save();
      }
    });
    window.addEventListener("beforeunload", (e) => {
      if (TABS.some((t) => isDirty(t.id))) { e.preventDefault(); e.returnValue = ""; }
    });
    const saved = storage((s) => s.getItem(PIN_KEY));
    if (saved) {
      state.pin = saved;
      show("loading");
      try { await loadAll(); return; } catch (e) { state.pin = ""; storage((s) => s.removeItem(PIN_KEY)); }
    }
    show("login");
    $("pin").focus();
  }

  init();
})();
