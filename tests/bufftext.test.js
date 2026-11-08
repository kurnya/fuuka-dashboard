// Kasus uji sama dengan di bot (tests/fixtures/buff-cases.json di ForceknightBot).
// Jika penyusun teks di salah satu repo diubah, salin fixture dan kodenya ke repo lain.
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildBuffBody } = require("../lib/buffText.js");
const cases = require("./buff-cases.json");

for (const c of cases) {
  test(`buildBuffBody: ${c.nama}`, () => {
    assert.equal(buildBuffBody(c.buff, c.buffland), c.expected);
  });
}

test("buildBuffBody: tidak mengubah array masukan", () => {
  const buff = [{ urutan: 2, nama: "B", kode: "2" }, { urutan: 1, nama: "A", kode: "1" }];
  const salinan = JSON.stringify(buff);
  buildBuffBody(buff, []);
  assert.equal(JSON.stringify(buff), salinan);
});
