// Menjalankan Code.gs + Logic.gs apa adanya di atas tiruan Apps Script (tests/fake-sheets.js).
const test = require("node:test");
const assert = require("node:assert/strict");
const { buatLingkungan } = require("./fake-sheets.js");

function baru() {
  const env = buatLingkungan();
  env.ctx.setup();
  return env;
}

test("setup(): membuat semua tab master dengan seed, aman dijalankan ulang", () => {
  const { ctx, sheets, get } = baru();
  assert.deepEqual(sheets.map((s) => s.name), ["buff", "buffland", "xtallMaster", "xtallEvent", "mq"]);
  assert.deepEqual(get("buff").data[0], ["urutan", "nama", "kode"]);
  assert.equal(get("buff").data[1][1], "Max HP");
  // Seed memuat semua kode, termasuk DTE yang punya banyak kode (25 nama, 35 kode).
  assert.equal(get("buff").data.length - 1, 35);
  assert.equal(get("buffland").data.length - 1, 4);
  assert.equal(get("xtallMaster").data[0][1], "isi");
  assert.match(get("xtallMaster").data[2][1], /Xtall Master/);
  assert.equal(get("xtallEvent").data[0][1], "isi");
  assert.match(get("xtallEvent").data[2][1], /List Xtall Event/);
  assert.equal(get("mq").data[0][1], "isi");
  assert.match(get("mq").data[2][1], /BAHAN MQ/);
  get("buff").data[1][2] = "999";
  ctx.setup();
  assert.equal(get("buff").data[1][2], "999", "isi yang sudah ada tidak ditimpa");
});

test("GET read buff: baris terurut tanpa PIN, kode tetap string", () => {
  const { read } = baru();
  const res = read("buff");
  assert.equal(res.ok, true);
  assert.equal(res.data[0].nama, "Max HP");
  assert.equal(res.data[0].kode, "1180755");
  assert.equal(typeof res.data[0].kode, "string");
});

test("GET read: tab tidak dikenal atau tanpa aksi → ok:false", () => {
  const { json, ctx, read } = baru();
  assert.equal(read("rahasia").ok, false);
  assert.equal(json(ctx.doGet({ parameter: {} })).ok, false);
  assert.equal(json(ctx.doGet({})).ok, false);
});

test("GET read sebelum setup(): ok:false dengan petunjuk, bukan exception", () => {
  const { read } = buatLingkungan();
  const res = read("buff");
  assert.equal(res.ok, false);
  assert.match(res.error, /setup/);
});

test("POST login: PIN benar ok:true, salah ok:false", () => {
  const { post } = baru();
  assert.equal(post({ action: "login", pin: "1234" }).ok, true);
  const salah = post({ action: "login", pin: "0000" });
  assert.equal(salah.ok, false);
  assert.match(salah.error, /PIN/);
});

test("POST login: PIN belum diatur di Script Properties → ok:false dengan petunjuk", () => {
  const env = buatLingkungan({ props: { DASHBOARD_PIN: "" } });
  env.ctx.setup();
  const res = env.post({ action: "login", pin: "" });
  assert.equal(res.ok, false);
  assert.match(res.error, /Script Properties|belum diatur/i);
});

test("POST read_admin: tanpa PIN benar ditolak, dengan PIN benar mengembalikan data", () => {
  const { post } = baru();
  assert.equal(post({ action: "read_admin", tab: "buff", pin: "x" }).ok, false);
  const ok = post({ action: "read_admin", tab: "buff", pin: "1234" });
  assert.equal(ok.ok, true);
  assert.equal(ok.data.length, 35);
});

test("POST save: baris valid menulis ulang tab, urutan dinomori ulang, kode berawalan 0 utuh", () => {
  const { post, read } = baru();
  const rows = [
    { urutan: 7, nama: "Max HP", kode: "0123456" },
    { urutan: 3, nama: "ATK", kode: "5130123" }
  ];
  const res = post({ action: "save", tab: "buff", pin: "1234", rows });
  assert.equal(res.ok, true);
  const after = read("buff").data;
  assert.deepEqual(after, [
    { urutan: 1, nama: "Max HP", kode: "0123456" },
    { urutan: 2, nama: "ATK", kode: "5130123" }
  ]);
});

test("POST save: satu baris tidak valid menolak seluruh tab, Sheet tidak berubah", () => {
  const { post, read } = baru();
  const sebelum = JSON.stringify(read("buff").data);
  const res = post({
    action: "save", tab: "buff", pin: "1234",
    rows: [{ urutan: 1, nama: "OK", kode: "1" }, { urutan: 2, nama: "Salah", kode: "abc" }]
  });
  assert.equal(res.ok, false);
  assert.match(res.error, /Baris 2/);
  assert.equal(JSON.stringify(read("buff").data), sebelum);
});

test("POST save: daftar kosong diizinkan dan mengosongkan tab", () => {
  const { post, read } = baru();
  assert.equal(post({ action: "save", tab: "buffland", pin: "1234", rows: [] }).ok, true);
  assert.deepEqual(read("buffland").data, []);
});

test("PIN salah 5 kali berturut-turut mengunci; PIN benar saat terkunci tetap ditolak", () => {
  const { post } = baru();
  for (let i = 0; i < 5; i++) assert.equal(post({ action: "login", pin: "salah" }).ok, false);
  const terkunci = post({ action: "login", pin: "1234" });
  assert.equal(terkunci.ok, false);
  assert.match(terkunci.error, /menit|Terlalu banyak/);
});

test("kunci PIN terbuka setelah 10 menit dan PIN benar mereset penghitung", () => {
  const { post, ctx } = baru();
  const t0 = 1_000_000;
  ctx.nowMs_ = () => t0;
  for (let i = 0; i < 5; i++) post({ action: "login", pin: "salah" });
  assert.equal(post({ action: "login", pin: "1234" }).ok, false);
  ctx.nowMs_ = () => t0 + 601 * 1000;
  assert.equal(post({ action: "login", pin: "1234" }).ok, true);
  // setelah sukses, 4 salah lagi belum mengunci
  for (let i = 0; i < 4; i++) post({ action: "login", pin: "salah" });
  assert.equal(post({ action: "login", pin: "1234" }).ok, true);
});

test("body bukan JSON atau aksi tidak dikenal → ok:false, bukan exception", () => {
  const { post, json, ctx } = baru();
  assert.equal(post("{bukan json").ok, false);
  assert.equal(post({ action: "hapus_semua", pin: "1234" }).ok, false);
  assert.equal(json(ctx.doPost({})).ok, false);
});

test("save saat lock tidak didapat → ok:false 'Sedang ada penyimpanan lain', Sheet tidak berubah", () => {
  const { post, read, lock } = baru();
  const sebelum = JSON.stringify(read("buff").data);
  lock.queue = [true, false]; // pertama untuk cek PIN, kedua untuk simpan
  const res = post({ action: "save", tab: "buff", pin: "1234", rows: [{ urutan: 1, nama: "X", kode: "1" }] });
  assert.equal(res.ok, false);
  assert.match(res.error, /penyimpanan lain/);
  assert.equal(JSON.stringify(read("buff").data), sebelum);
});

test("lock dilepas setelah save, baik sukses maupun gagal", () => {
  const { post, lock } = baru();
  post({ action: "save", tab: "buff", pin: "1234", rows: [{ urutan: 1, nama: "X", kode: "1" }] });
  assert.equal(lock.held, false);
  post({ action: "save", tab: "buff", pin: "1234", rows: [{ urutan: 1, nama: "", kode: "1" }] });
  assert.equal(lock.held, false);
});

test("[review] cek PIN memakai lock: lock tidak didapat → ditolak (fail closed) walau PIN benar", () => {
  const { post, lock } = baru();
  lock.tryLockResult = false;
  const res = post({ action: "login", pin: "1234" });
  assert.equal(res.ok, false);
  assert.match(res.error, /sibuk|coba lagi/i);
});

test("[review] lock cek PIN dilepas setelah PIN benar, salah, dan terkunci", () => {
  const { post, lock } = baru();
  post({ action: "login", pin: "1234" });
  assert.equal(lock.held, false);
  post({ action: "login", pin: "salah" });
  assert.equal(lock.held, false);
  for (let i = 0; i < 5; i++) post({ action: "login", pin: "salah" });
  post({ action: "login", pin: "1234" }); // terkunci
  assert.equal(lock.held, false);
});

test("[review] setValues gagal tidak mengosongkan tab (data lama utuh)", () => {
  const { post, read, get } = baru();
  const sebelum = JSON.stringify(read("buff").data);
  get("buff").failNextSetValues = true;
  const res = post({ action: "save", tab: "buff", pin: "1234", rows: [{ urutan: 1, nama: "Baru", kode: "1" }] });
  assert.equal(res.ok, false);
  assert.equal(JSON.stringify(read("buff").data), sebelum);
});

test("[review] simpan lebih pendek menghapus sisa baris lama", () => {
  const { post, read } = baru();
  post({ action: "save", tab: "buff", pin: "1234", rows: [{ urutan: 1, nama: "Satu", kode: "1" }] });
  assert.deepEqual(read("buff").data, [{ urutan: 1, nama: "Satu", kode: "1" }]);
});

test("[review] flush dipanggil sebelum lock simpan dilepas", () => {
  const { post, events } = baru();
  events.length = 0;
  post({ action: "save", tab: "buff", pin: "1234", rows: [{ urutan: 1, nama: "X", kode: "1" }] });
  assert.ok(events.includes("flush"), "flush dipanggil");
  assert.ok(events.lastIndexOf("flush") < events.lastIndexOf("release"), "flush sebelum release terakhir");
});
