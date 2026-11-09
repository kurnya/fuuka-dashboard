// Logika murni (tanpa SpreadsheetApp) agar bisa diuji dengan Node.
// Di Apps Script semua file .gs berbagi satu scope global, jadi pakai var + function.

var TAB_SCHEMAS = {
  buff: ['urutan', 'nama', 'kode'],
  buffland: ['urutan', 'label', 'nama'],
  xtallMaster: ['urutan', 'isi'],
  xtallEvent: ['urutan', 'isi']
};

var MAX_PERCOBAAN = 5;
var KUNCI_DETIK = 600;

function isAllowedTab(tab) {
  return typeof tab === 'string' && Object.prototype.hasOwnProperty.call(TAB_SCHEMAS, tab);
}

function teks_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return String(v);
  return String(v).trim();
}

function barisKosong_(r) {
  for (var i = 0; i < r.length; i++) {
    if (teks_(r[i]) !== '') return false;
  }
  return true;
}

// values = hasil getValues(), baris pertama header. Hasil diurutkan menurut urutan (stabil).
function parseRows(tab, values) {
  var cols = TAB_SCHEMAS[tab];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (barisKosong_(r)) continue;
    var obj = {};
    for (var c = 0; c < cols.length; c++) {
      obj[cols[c]] = cols[c] === 'urutan' ? Number(r[c]) : teks_(r[c]);
    }
    obj._pos = i;
    out.push(obj);
  }
  out.sort(function (a, b) {
    var ua = isNaN(a.urutan) ? Infinity : a.urutan;
    var ub = isNaN(b.urutan) ? Infinity : b.urutan;
    return ua - ub || a._pos - b._pos;
  });
  return out.map(function (o) {
    delete o._pos;
    return o;
  });
}

// Mengembalikan pesan galat (Indonesia) atau null bila valid.
function validateRows(tab, rows) {
  if (!isAllowedTab(tab)) return 'Tab tidak dikenal';
  if (!Array.isArray(rows)) return 'Data harus berupa daftar baris';
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i] || {};
    var no = 'Baris ' + (i + 1) + ': ';
    if (typeof r.urutan !== 'number' || r.urutan % 1 !== 0) return no + 'urutan harus bilangan bulat';
    if (tab === 'buff') {
      if (teks_(r.nama) === '') return no + 'nama tidak boleh kosong';
      if (!/^[0-9]+$/.test(String(r.kode === undefined || r.kode === null ? '' : r.kode))) {
        return no + 'kode harus berupa angka saja';
      }
    } else if (tab === 'buffland') {
      if (teks_(r.label) === '') return no + 'label tidak boleh kosong';
      if (teks_(r.nama) === '') return no + 'nama tidak boleh kosong';
    }
  }
  return null;
}

// Header + baris. Urutan dinomori ulang 1..n mengikuti urutan array.
function rowsToValues(tab, rows) {
  var cols = TAB_SCHEMAS[tab];
  var out = [cols.slice()];
  for (var i = 0; i < rows.length; i++) {
    var line = [];
    for (var c = 0; c < cols.length; c++) {
      line.push(cols[c] === 'urutan' ? i + 1 : String(rows[i][cols[c]]));
    }
    out.push(line);
  }
  return out;
}

// Perbandingan waktu-konstan: semua karakter selalu dibandingkan.
function checkPin(input, expected) {
  if (typeof expected !== 'string' || expected === '') return false;
  var a = String(input === undefined || input === null ? '' : input);
  var diff = a.length ^ expected.length;
  var n = Math.max(a.length, expected.length);
  for (var i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function lockState(attempts, nowMs, lockedUntilMs) {
  if (attempts >= MAX_PERCOBAAN && lockedUntilMs > nowMs) {
    return { locked: true, retryInSec: Math.ceil((lockedUntilMs - nowMs) / 1000) };
  }
  return { locked: false, retryInSec: 0 };
}

function nextAttempts(attempts, success) {
  return success ? 0 : attempts + 1;
}
