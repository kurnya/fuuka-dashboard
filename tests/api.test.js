const test = require("node:test");
const assert = require("node:assert/strict");
const { createApi } = require("../api.js");

function api(fetchImpl, url = "https://example.test/exec") {
  return createApi({ getUrl: () => url, fetchImpl });
}
const respon = (payload) => async () => ({ json: async () => payload });

test("login sukses", async () => {
  assert.equal(await api(respon({ ok: true, data: true })).login("1234"), true);
});

test("login PIN salah melempar pesan server", async () => {
  await assert.rejects(api(respon({ ok: false, error: "PIN salah" })).login("x"), /PIN salah/);
});

test("respons HTML (bukan JSON) melempar pesan jelas", async () => {
  const html = async () => ({ json: async () => { throw new SyntaxError("Unexpected token <"); } });
  await assert.rejects(api(html).readAdmin("buff", "1234"), /bukan JSON/);
});

test("fetch gagal (jaringan) melempar 'tidak bisa dijangkau'", async () => {
  const mati = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(api(mati).login("1"), /tidak bisa dijangkau/);
});

test("API_URL kosong melempar petunjuk config.js", async () => {
  await assert.rejects(api(respon({ ok: true }), "").login("1"), /config\.js/);
});

test("save mengirim POST text/plain dengan action, tab, rows, dan PIN", async () => {
  let dikirim;
  const f = async (url, opts) => { dikirim = { url, opts }; return { json: async () => ({ ok: true, data: { jumlah: 1 } }) }; };
  const rows = [{ urutan: 1, nama: "A", kode: "1" }];
  await api(f).save("buff", rows, "1234");
  assert.equal(dikirim.opts.method, "POST");
  assert.match(dikirim.opts.headers["Content-Type"], /^text\/plain/);
  assert.deepEqual(JSON.parse(dikirim.opts.body), { action: "save", tab: "buff", rows, pin: "1234" });
});

test("readAdmin mengembalikan data", async () => {
  const rows = [{ urutan: 1, nama: "A", kode: "1" }];
  assert.deepEqual(await api(respon({ ok: true, data: rows })).readAdmin("buff", "1234"), rows);
});

test("save gagal tidak diulang (fetch dipanggil sekali)", async () => {
  let n = 0;
  const f = async () => { n++; throw new TypeError("Failed to fetch"); };
  await assert.rejects(api(f).save("buff", [], "1"));
  assert.equal(n, 1);
});
