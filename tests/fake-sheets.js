// Tiruan sederhana API Apps Script agar Code.gs + Logic.gs bisa dijalankan apa adanya di Node.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function buatSheet(name) {
  const sheet = {
    name,
    data: [], // data[r][c], indeks mulai 0
    fmt: {}, // fmt["r,c"] = format angka
    getName: () => name,
    getLastRow: () => sheet.data.filter((r) => r && r.some((v) => v !== "" && v != null)).length,
    getDataRange: () => ({ getValues: () => sheet.data.map((r) => r.slice()) }),
    clearContents: () => { sheet.data = []; },
    getRange(r, c, nr, nc) {
      return {
        setNumberFormat(f) {
          for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) sheet.fmt[`${r - 1 + i},${c - 1 + j}`] = f;
          return this;
        },
        clearContent() {
          for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (sheet.data[r - 1 + i]) sheet.data[r - 1 + i][c - 1 + j] = "";
          return this;
        },
        setValues(v) {
          if (sheet.failNextSetValues) {
            sheet.failNextSetValues = false;
            throw new Error("Layanan Spreadsheet gagal (simulasi)");
          }
          for (let i = 0; i < nr; i++) {
            const row = (sheet.data[r - 1 + i] = sheet.data[r - 1 + i] || []);
            for (let j = 0; j < nc; j++) {
              let val = v[i][j];
              // Seperti Google Sheets: teks angka jadi angka kecuali sel berformat teks (@).
              if (typeof val === "string" && /^\d+$/.test(val) && sheet.fmt[`${r - 1 + i},${c - 1 + j}`] !== "@") {
                val = Number(val);
              }
              row[c - 1 + j] = val;
            }
          }
          return this;
        }
      };
    }
  };
  return sheet;
}

function buatLingkungan(opsi = {}) {
  const sheets = [];
  const props = { DASHBOARD_PIN: "1234", ...(opsi.props || {}) };
  const cacheStore = {};
  // queue: hasil tryLock berurutan (mis. [true, false]); setelah habis memakai tryLockResult.
  const lock = { tryLockResult: true, held: false, queue: [] };
  const events = [];

  const ctx = vm.createContext({
    SpreadsheetApp: {
      flush: () => { events.push("flush"); },
      getActiveSpreadsheet: () => ({
        getSheets: () => sheets,
        getSheetByName: (n) => sheets.find((s) => s.name === n) || null,
        insertSheet: (n) => { const s = buatSheet(n); sheets.push(s); return s; }
      })
    },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (k in cacheStore ? cacheStore[k] : null),
        put: (k, v) => { cacheStore[k] = String(v); },
        remove: (k) => { delete cacheStore[k]; }
      })
    },
    LockService: {
      getScriptLock: () => ({
        tryLock: () => {
          const r = lock.queue.length ? lock.queue.shift() : lock.tryLockResult;
          if (r) lock.held = true;
          return r;
        },
        releaseLock: () => { lock.held = false; events.push("release"); }
      })
    },
    ContentService: {
      MimeType: { JSON: "JSON" },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } })
    },
    console
  });
  for (const f of ["Logic.gs", "Code.gs"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "apps-script", f), "utf8"), ctx, { filename: f });
  }
  const get = (n) => sheets.find((s) => s.name === n);
  const json = (out) => JSON.parse(out.text);
  const post = (body) => json(ctx.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }));
  const read = (tab) => json(ctx.doGet({ parameter: { action: "read", tab } }));
  return { ctx, sheets, props, cacheStore, lock, events, get, post, read, json };
}

module.exports = { buatLingkungan };
