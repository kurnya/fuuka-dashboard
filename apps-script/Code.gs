// Web App "Master Data Fuuka". Satu-satunya yang menyentuh spreadsheet.
// - GET  ?action=read&tab=buff            publik, hanya baca (dipakai bot)
// - POST {action:"login", pin}            cek PIN
// - POST {action:"read_admin", tab, pin}  baca untuk dashboard
// - POST {action:"save", tab, rows, pin}  validasi lalu ganti seluruh isi tab
// PIN disimpan di Script Properties (DASHBOARD_PIN), bukan di sheet.

// Data awal = isi topik #3 saat bot masih memakai teks statis.
var SEED_BUFF = [
  ['Max HP', ['1180755']], ['Max MP', ['9090903']], ['AMPR', ['1234561']], ['Critical Rate', ['1100000']],
  ['MATK', ['52255555']], ['ATK', ['5130123']], ['Weapon ATK', ['7123456']], ['STR', ['1110033']],
  ['INT', ['9090903']], ['VIT', ['5130123']], ['AGI', ['7162029']], ['DEX', ['9090904']],
  ['Physical Resist', ['9090907']], ['Magic Resist', ['2020505']], ['Kebal bumi', ['6150029']],
  ['Frac Barrier', ['6150029']], ['Aggro +%', ['2020606']], ['Aggro -%', ['1010147']],
  ['DTE Bumi', ['4111113', '2210103']], ['DTE Api', ['3210106', '2210106']],
  ['DTE Air', ['7150030', '2210100']], ['DTE Angin', ['8080804', '7257777', '3149696', '2210101']],
  ['DTE Cahaya', ['6010289', '2210105']], ['DTE Gelap', ['6116116', '5010092', '2210104']],
  ['DTE Netral', ['1234561', '2210102']]
];

var SEED_BUFFLAND = [
  ['MP', 'punkz'],
  ['AMPR', 'hsans, moung zy'],
  ['WATK', 'Master-A'],
  ['DTE earth', 'medzzo']
];

function nowMs_() {
  return Date.now();
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function spreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function seedRows_(tab) {
  var rows = [];
  if (tab === 'buff') {
    SEED_BUFF.forEach(function (g) {
      g[1].forEach(function (kode) {
        rows.push({ urutan: rows.length + 1, nama: g[0], kode: kode });
      });
    });
  } else {
    SEED_BUFFLAND.forEach(function (b, i) {
      rows.push({ urutan: i + 1, label: b[0], nama: b[1] });
    });
  }
  return rows;
}

// Tulis dulu, baru hapus sisa baris lama. Bila penulisan gagal, isi lama tetap utuh (tab tidak pernah dikosongkan lebih dulu).
function tulisTab_(sheet, tab, rows) {
  var values = rowsToValues(tab, rows);
  var cols = values[0].length;
  var barisLama = sheet.getLastRow();
  var range = sheet.getRange(1, 1, values.length, cols);
  range.setNumberFormat('@'); // teks, supaya kode berawalan 0 tidak berubah jadi angka
  range.setValues(values);
  if (barisLama > values.length) {
    sheet.getRange(values.length + 1, 1, barisLama - values.length, cols).clearContent();
  }
}

// Jalankan sekali dari editor Apps Script. Tidak menimpa tab yang sudah berisi.
function setup() {
  var ss = spreadsheet_();
  Object.keys(TAB_SCHEMAS).forEach(function (tab) {
    var sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);
    if (sheet.getLastRow() < 2) tulisTab_(sheet, tab, seedRows_(tab));
  });
}

function bacaTab_(tab) {
  if (!isAllowedTab(tab)) throw new Error('Tab tidak dikenal');
  var sheet = spreadsheet_().getSheetByName(tab);
  if (!sheet) throw new Error('Tab "' + tab + '" belum dibuat. Jalankan fungsi setup() di Apps Script.');
  return parseRows(tab, sheet.getDataRange().getValues());
}

function simpanTab_(tab, rows) {
  var galat = validateRows(tab, rows);
  if (galat) throw new Error(galat);
  var sheet = spreadsheet_().getSheetByName(tab);
  if (!sheet) throw new Error('Tab "' + tab + '" belum dibuat. Jalankan fungsi setup() di Apps Script.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Sedang ada penyimpanan lain, coba lagi sebentar');
  try {
    tulisTab_(sheet, tab, rows);
    SpreadsheetApp.flush(); // pastikan tertulis sebelum lock dilepas
  } finally {
    lock.releaseLock();
  }
  return { jumlah: rows.length };
}

// Melempar Error bila PIN salah atau sedang terkunci. Percobaan dihitung di CacheService.
function cekPin_(pin) {
  var expected = PropertiesService.getScriptProperties().getProperty('DASHBOARD_PIN');
  if (!expected) throw new Error('PIN belum diatur di Script Properties (DASHBOARD_PIN)');
  // Baca-cek-tulis penghitung dibungkus lock agar permintaan paralel tidak bisa
  // membaca angka lama yang sama (itu melewati batas 5 percobaan). Tanpa lock = ditolak.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('Server sedang sibuk, coba lagi sebentar');
  try {
    var cache = CacheService.getScriptCache();
    var attempts = Number(cache.get('pin_attempts') || 0);
    var until = Number(cache.get('pin_locked_until') || 0);
    var st = lockState(attempts, nowMs_(), until);
    if (st.locked) {
      throw new Error('Terlalu banyak percobaan. Coba lagi dalam ' + Math.ceil(st.retryInSec / 60) + ' menit');
    }
    var ok = checkPin(pin, expected);
    if (ok) {
      cache.remove('pin_attempts');
      cache.remove('pin_locked_until');
      return;
    }
    var next = nextAttempts(attempts, false);
    cache.put('pin_attempts', String(next), KUNCI_DETIK);
    if (next >= MAX_PERCOBAAN) cache.put('pin_locked_until', String(nowMs_() + KUNCI_DETIK * 1000), KUNCI_DETIK);
    throw new Error('PIN salah');
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'read') return jsonOut_({ ok: true, data: bacaTab_(p.tab) });
    return jsonOut_({ ok: false, error: 'Aksi tidak dikenal' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents;
    var body;
    try {
      body = JSON.parse(raw);
    } catch (x) {
      throw new Error('Body bukan JSON');
    }
    if (!body || typeof body !== 'object') throw new Error('Body bukan JSON');
    if (body.action === 'login') {
      cekPin_(body.pin);
      return jsonOut_({ ok: true, data: true });
    }
    if (body.action === 'read_admin') {
      cekPin_(body.pin);
      return jsonOut_({ ok: true, data: bacaTab_(body.tab) });
    }
    if (body.action === 'save') {
      cekPin_(body.pin);
      return jsonOut_({ ok: true, data: simpanTab_(body.tab, body.rows) });
    }
    return jsonOut_({ ok: false, error: 'Aksi tidak dikenal' });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err.message || err) });
  }
}
