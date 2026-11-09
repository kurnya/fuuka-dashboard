// Memuat Logic.gs apa adanya (gaya Apps Script: var + function global) lewat vm.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function muat() {
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "apps-script", "Logic.gs"), "utf8"), ctx);
  return ctx;
}
const L = muat();

test("isAllowedTab: hanya tab master data yang dikenal", () => {
  assert.equal(L.isAllowedTab("buff"), true);
  assert.equal(L.isAllowedTab("buffland"), true);
  assert.equal(L.isAllowedTab("xtallMaster"), true);
  assert.equal(L.isAllowedTab("xtallEvent"), true);
  assert.equal(L.isAllowedTab("rahasia"), false);
  assert.equal(L.isAllowedTab(undefined), false);
});

test("parseRows buff: urutkan menurut urutan dan kode jadi string", () => {
  const out = L.parseRows("buff", [["urutan", "nama", "kode"], [2, "ATK", 5130123], [1, "Max HP", "1180755"]]);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), [
    { urutan: 1, nama: "Max HP", kode: "1180755" },
    { urutan: 2, nama: "ATK", kode: "5130123" }
  ]);
});

test("parseRows: baris kosong diabaikan", () => {
  const out = L.parseRows("buff", [["urutan", "nama", "kode"], ["", "", ""], [1, "STR", "1110033"], [null, null, null]]);
  assert.equal(out.length, 1);
});

test("parseRows: urutan sama tetap stabil menurut posisi baris", () => {
  const out = L.parseRows("buff", [["urutan", "nama", "kode"], [1, "A", "1"], [1, "B", "2"], [1, "C", "3"]]);
  assert.deepEqual(Array.from(out, (r) => r.nama), ["A", "B", "C"]);
});

test("parseRows buffland", () => {
  const out = L.parseRows("buffland", [["urutan", "label", "nama"], [1, "MP", "punkz"]]);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), [{ urutan: 1, label: "MP", nama: "punkz" }]);
});

test("parseRows xtall mempertahankan baris kosong", () => {
  const out = L.parseRows("xtallMaster", [["urutan", "isi"], [1, "Judul"], [2, ""], [3, "Isi"]]);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), [
    { urutan: 1, isi: "Judul" }, { urutan: 2, isi: "" }, { urutan: 3, isi: "Isi" }
  ]);
});

test("validateRows buff: valid mengembalikan null", () => {
  assert.equal(L.validateRows("buff", [{ urutan: 1, nama: "Max HP", kode: "1180755" }]), null);
});

test("validateRows buff: nama kosong ditolak", () => {
  assert.match(L.validateRows("buff", [{ urutan: 1, nama: "  ", kode: "123" }]), /nama/i);
});

test("validateRows buff: kode huruf ditolak", () => {
  assert.match(L.validateRows("buff", [{ urutan: 1, nama: "ATK", kode: "12a" }]), /kode/i);
});

test("validateRows buff: kode berspasi atau kosong ditolak", () => {
  assert.ok(L.validateRows("buff", [{ urutan: 1, nama: "ATK", kode: "12 3" }]));
  assert.ok(L.validateRows("buff", [{ urutan: 1, nama: "ATK", kode: "" }]));
});

test("validateRows buff: urutan bukan bilangan bulat ditolak", () => {
  assert.match(L.validateRows("buff", [{ urutan: 1.5, nama: "ATK", kode: "1" }]), /urutan/i);
});

test("validateRows buffland: label atau nama kosong ditolak", () => {
  assert.ok(L.validateRows("buffland", [{ urutan: 1, label: "", nama: "x" }]));
  assert.ok(L.validateRows("buffland", [{ urutan: 1, label: "MP", nama: " " }]));
  assert.equal(L.validateRows("buffland", [{ urutan: 1, label: "MP", nama: "punkz" }]), null);
});

test("validateRows: tab tidak dikenal dan rows bukan array ditolak", () => {
  assert.ok(L.validateRows("rahasia", []));
  assert.ok(L.validateRows("buff", "bukan array"));
});

test("validateRows xtall mengizinkan isi kosong untuk pemisah", () => {
  assert.equal(L.validateRows("xtallMaster", [{ urutan: 1, isi: "" }]), null);
});

test("rowsToValues: header + nomor urutan dihitung ulang 1..n", () => {
  const v = L.rowsToValues("buff", [{ urutan: 9, nama: "A", kode: "1" }, { urutan: 3, nama: "B", kode: "2" }]);
  assert.deepEqual(JSON.parse(JSON.stringify(v)), [["urutan", "nama", "kode"], [1, "A", "1"], [2, "B", "2"]]);
});

test("rowsToValues: kode ditulis sebagai teks agar angka 0 di depan tidak hilang", () => {
  const v = L.rowsToValues("buff", [{ urutan: 1, nama: "A", kode: "0123" }]);
  assert.equal(v[1][2], "0123");
  assert.equal(typeof v[1][2], "string");
});

test("checkPin: benar, salah, panjang beda, expected kosong", () => {
  assert.equal(L.checkPin("1234", "1234"), true);
  assert.equal(L.checkPin("1235", "1234"), false);
  assert.equal(L.checkPin("12345", "1234"), false);
  assert.equal(L.checkPin("", ""), false);
  assert.equal(L.checkPin("x", undefined), false);
});

test("lockState: 4 gagal belum terkunci, 5 gagal terkunci, lewat waktu terbuka", () => {
  const now = 1000000;
  assert.equal(L.lockState(4, now, 0).locked, false);
  const kunci = L.lockState(5, now, now + 600 * 1000);
  assert.equal(kunci.locked, true);
  assert.ok(kunci.retryInSec > 0 && kunci.retryInSec <= 600);
  assert.equal(L.lockState(5, now, now - 1).locked, false);
});

test("nextAttempts: gagal +1, sukses reset 0", () => {
  assert.equal(L.nextAttempts(2, false), 3);
  assert.equal(L.nextAttempts(4, true), 0);
});
