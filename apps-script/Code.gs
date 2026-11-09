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

// Satu elemen = satu baris teks. Baris kosong sengaja dipertahankan.
var SEED_XTALL_MASTER = [
  "━━━━━━━━━━━━━━━━━━━━",
  "Xtall Master",
  "━━━━━━━━━━━━━━━━━━━━",
  "",
  "Peminjaman Up Xtall: Lapor di Discord.",
  "Waktu Peminjaman: Menyesuaikan waktu luang Master-A",
  "",
  "Xtall Weap",
  "- Megiston Sang Juara - VII -> (Megiston Sang Juara VIII)",
  "- Armasit -> (Kadal Bunga)",
  "- Zahhak Machina - Penyihir Besi Bercakar -> (Ratu Rosemee)",
  "- Ganglef -> (Kepiting Bulan Besar)",
  "- Dango Iblis -> (Fubbit)",
  "- Armasit -> (Diark)",
  "- Putri Natal Berbaju Hitam -> (Gusti Ilusi Melodi)",
  "- Zega - IX -> (Zega X)",
  "- Metasrigala - Cakar Kucing Kissatpam -> (Neo Magi Filecia)",
  "- Zolban - Repthon - Naga Trompet Reguita -> (Doreminador)",
  "- Pedang Neo Maton -> (Pedrio)",
  "- Mbah Dukun Usasama -> (Mbah Dukun Usasama II)",
  "- Potum Pahlawan - III -> (Potum Pahlawan IV)",
  "- Pomie Chan - II -> (Pomie Chan III)",
  "---",
  "- Ksatria Buruk Dusta - Gwaimol - Hexter - Don Profundo -> (Doy)",
  "- Ganglef - Machina Tiran - Vulture - Mimyugon -> (Bakuzan)",
  "- Golem Pillar - Machina Ultima - Vlam si Naga Api -> (Supreme Evil Crystal Beast)",
  "- Iblis Kristal Jahanam - Shampy - Irestida -> (Vatudo)",
  "- Pedang Sihir Iblis -> (Kristal Berlumur Darah)",
  "- Imitacia - Finstern - Oculasignio -> (Menti)",
  "- Imitator - Mardula - Velum -> (Deformis)",
  "---",
  "- Gerbang Iblis > Mozto Machina > Pisteus - Naga Jahat Fazzino -> (Rondine)",
  "- Arbogazella -> (Doridodi)",
  "- Zahhak Machina - Penyihir Besi Bercakar -> (Naga Meraung Bovinari)",
  "- Zolban - Repthon - Naga Trompet Reguita -> (Goudvis)",
  "- Golem Galian - Builder Golem -> (Meduso)",
  "- Dukun Lapin -> (Momok Gelembung)",
  "",
  "Xtall Armor",
  "- Pilz Erosi -> (Tulin Max)",
  "- Gopherga -> (Yuveria)",
  "- Usakichi - Usami -> (Usamochi)",
  "- Sibylares -> (Bemoz)",
  "- Noeliel - Noeliel si Patung Es Suci - Kucing Yule -> (Gegner)",
  "- Sosok Jahat - Velly Hitam -> (Glocke)",
  "- Kruztor -> (Kruztor II)",
  "- Cerabes - Mimesia - Sakura Merah Jelita - Baavgai -> (Bajinja / Ninja Persik Hitam)",
  "- Permaisuri Besi -> (Merzehal)",
  "- Dr. Leonardo -> (Dr. Leonardo II)",
  "- DX Fighter -> (DX Fighter II)",
  "---",
  "- Arachnidemon - Zapo -> (Puiet)",
  "- Cerberus - Pyxtica - Gemma -> (Meteora)",
  "- Nemopirania -> (Skelerow)",
  "---",
  "- Pilz Erosi - Filrocas -> (Mari)",
  "- Bos Roga - Iconos - Ornlarf - Roga Safir - Ferzen -> (Walican)",
  "- Ifrid - Mama Fluck - Gordel -> (Biskyva)",
  "- Forestia -> (Glaucius)",
  "- Quassar Jahanam -> (Mata Jahanam)",
  "- Tortuga - Daddy Finpen - Capo Profundo -> (Landak Penggali Gelap)",
  "- Golem Preman -> (Naga Langkisau)",
  "- Colon Komandan -> (Goleps)",
  "- Elang Zamrud - Jamur Super Mampus -> (Dandolion)",
  "",
  "Xtall Add",
  "- Naga Sabana Yelb - Roda Kelana -> (Roda Kelana Neo)",
  "- Adaro -> (Monster Dasar Laut)",
  "- Tengkorak Emas - Solopy -> (Potum Hiu)",
  "- Pumpking - Jeila - Zoe - Zarth - Neewollah -> (Eripmav)",
  "- Naga Senja - Baphomela -> (Bayangan Biru Tafakur)",
  "- Potum Surya -> (Potum Bintang Top)",
  "- Biskuit Buatan Tangan - Alfenix -> (Zucotto Goblin)",
  "- Eidenliebe -> (Garnache)",
  "- Candela - II -> (Amargon)",
  "- Chocolate Ooze & II -> (Soldner)",
  "- Iconos Emas - Kodok Riang - Gem Mas -> (Goldian)",
  "- Gespenst II -> (Stellar Ooze)",
  "- Ratu Kuno -> (Ratu Kuno II)",
  "- Raja Kerbau - Paduka Raja Kerbau -> (Paduka Raja Kerbau II)",
  "- Raja Kerbau - (Pillow Kitagawa) -> (Pillow Kitagawa II)",
  "- Jibril - II -> (Jibril III)",
  "- Ayah Yashiro Azuki -> (Raja Kegelapan)",
  "- Narumi Hina -> (Ibu Yashiro Azuki II)",
  "---",
  "- Naga Sabana Yelb - Roda Kelana -> (Gordo)",
  "- Dusk Machina -> (Trocostida)",
  "- Zyvio -> (Gula)",
  "- Altoblepas -> (Jiva)",
  "---",
  "- Grylle - Fantica -> (Obsia)",
  "- Celeng Raksasa -> (Mega Alpoca)",
  "- Warmonger - Proto Leon - Raja Piton -> (Naga Membara Igneus)",
  "- Seltirio -> (Tardigrademon)",
  "- Kapten Karatan -> (Exdocus)",
  "",
  "Xtall Ring",
  "- Kristal Jahat -> (Kristal Misterius)",
  "- Violangkara -> (Violangkara G)",
  "- Zeagrysta -> (Monster Kristal Abisal)",
  "- Seele Zauga -> (Seele Zauga II)",
  "- Dark Mushroom -> (Teertocrit)",
  "- Viscum - Deniala - Amalgam - Crysmort -> (Breeta)",
  "- Kristal Jahat - Tapir - Patissia -> (Sicanokami)",
  "- Volgagon -> (Etoise)",
  "- Potumotter -> (Potumotter)",
  "---",
  "- Ooze - Lalvada -> (Dominaredor)",
  "- Venena - II -> (Humida)",
  "- Bexiz - Zelbuse -> (Naga Milisi Turba)",
  "---",
  "- Tentara Batu -> (Memecoleous)",
  "- Baron Bling-Bling -> (Roh Orang Mati)",
  "- Violaccoon - Ketua Bandit Gurun -> (Arpoon)",
  "",
  "Xtall Umum",
  "- Bos Colon -> (Kijimu Agung)",
  "- Goblin Bos -> (Colon Bos)",
  "- Lobalawar - Melancia -> (Chiromina)",
  "- Lynx Mithurna -> (Kuffania)",
  "- Shawle -> (Dutannen)",
  "- Nurethoth -> (Nuthoreth)",
  "- Potum Raja - Potum Platina -> (Potum Kue)",
  "- Gerumi -> (Gerumi Kuat)",
  "---",
  "- Metal Stinger - Kapten Lyark Spesialis - Ageladanios -> (Wiltileaf)",
  "- Odelon Machina - Pret -> (Lilicarolla)",
  "- Gravicep - Naga Abu Merah Rudis -> (Gioco)",
  "- Minotaur - Rhinosaurus -> (Wild Beast Lixi)",
  "- Naga Beringas Decel - York - Tuscog - Bayangan Hitam -> (Torexesa)",
  "- Nurethoth - Guignol - Golem Satpam -> (Piscruva)",
  "- Coryn Besar - Seraph Machina -> (Limacina)",
  "- Flare Volg -> (Charugon)",
  "---",
  "- Gespenst - Salamander -> (Bullamius)",
  "- Ksatriaja - Volotur -> (Brassozard)",
  "- Crimsosh -> (Amoeba Machina)",
  "- Aranea - Blazingur -> (Brahma)",
  "- Bos Petapa Kadal -> (Orictoceras)",
  "- Caspy -> (Vevela)",
  "",
  "━━━━━━━━━━━━━━━━━━━━",
];
var SEED_XTALL_EVENT = [
  "━━━━━━━━━━━━━━━━━━━━",
  "List Xtall Event",
  "━━━━━━━━━━━━━━━━━━━━",
  "",
  "Xtall Event Anniv",
  "1. Sang Juara Megiston - VIII",
  "2. Roda Kelana Neo",
  "3. Kadal Bunga",
  "4. Kristal Misterius",
  "5. Violangkara G",
  "6. Ratu Rosemee",
  "7. Tulin Max",
  "8. Kijimu Agung",
  "9. Colon Boss",
  "10. Potum Ultra",
  "---",
  "Xtall Event Summer",
  "1. Titeres",
  "2. Gopherga > Yuveria",
  "3. Adaro > Monster Dasar Laut",
  "4. Kapten Amiya",
  "5. Gurita Raksasa",
  "6. Semangat Musim Panas",
  "7. Fallburrow",
  "8. Zegrysta > Monster Kristal Abisal",
  "9. Stormun",
  "10. Potum Hiu",
  "---",
  "Xtall Event Otsukimi",
  "1. Usakichi > Usami > Usamochi",
  "2. Kepiting Bulan",
  "3. Dango Iblis > Fubbit",
  "---",
  "Xtall Event Persimmon Coryn",
  "1. Auvio",
  "2. Auberkasa",
  "---",
  "Xtall Event Halloween",
  "1. Pumpking > Jeila > Zoe > Zarth > Neewollah > Eripmav",
  "2. Penyihir Naga",
  "3. Gagak Penyihir Hebat",
  "4. Badut Tukang Sandiwara",
  "5. Phantom Wisp",
  "6. Tikus Kecil Ajaib",
  "7. Serigala Merah Mata Satu",
  "8. Teertocrit",
  "9. Sibylares > Bemoz",
  "10. Syaman Hitam Hutan Hantu",
  "11. Melancia > Chiromina",
  "12. Sinar Rembulan Purba",
  "13. Kuffania",
  "14. Jejak Bayang Nan Jauh",
  "15. Olobaid",
  "16. Bayangan Iblis Mayat Ksatria",
  "---",
  "Xtall Event Natal",
  "1. Naga Senja > Baphomela > Bayangan Biru Tafakur > Shawle Terlarang",
  "2. Noeliel > Noeliel si Patung Es Suci > Kucing Yule > Gegner",
  "3. Shawle > Dutannen",
  "4. Sosok Jahat > Velly Hitam > Glocke",
  "5. Putri Natal Berbaju Hitam > Gusti Ilusi Melodi",
  "6. Iluminator",
  "7. Bayangan Jeritan",
  "8. Diark",
  "9. Granpromus",
  "10. Potum Bintang Top",
  "---",
  "Xtall Event Megiston Road",
  "1. Zega - IX",
  "2. Felien > Neo Lefina Jahat",
  "3. Metasrigala > Cakar Kucing Kissatpam > Neo Magi Filecia",
  "4. Kapten Sihir & si B",
  "5. Doreminador",
  "6. Seele Zauga II",
  "7. Dango Sakura",
  "8. Sakura Musim Semi",
  "---",
  "Xtall Event Otoshidama",
  "1. Grand Pojo (Ayam)",
  "2. Perro (Anjing)",
  "3. Kohaku Lil Boar (Babi)",
  "4. Omochi (Tikus)",
  "5. Bovinio (Kerbau)",
  "6. Purro (Macan)",
  "7. Lunadore (Kelinci)",
  "8. Dratone (Naga)",
  "9. Ophy (Ular)",
  "10. Ponier (Kuda)",
  "---",
  "Xtall Event Valentine",
  "1. Chocolate Ooze - II > Soldner",
  "2. Eidenliebe > Garnache > Erkuch",
  "3. Jeandoux",
  "4. Mieli",
  "5. Goblin Makelar > Velcaroy",
  "6. Amargon",
  "7. Sicanokami",
  "8. Pelulu Raksasa",
  "---",
  "Xtall Event White Day",
  "1. Candela - II",
  "2. Biskuit Buatan Tangan > Alfenix > Zucotto Goblin",
  "3. Mercy",
  "4. Kruztor - II",
  "5. Lefina Jahat > Sanburmon",
  "6. Magi Filecia",
  "7. Bangrudom",
  "---",
  "Xtall Event Hanami",
  "1. Viscum > Deniala > Amalgam > Crysmort > Breeta",
  "2. Marchitar",
  "3. Super Night Mushroom",
  "4. Cerabes > Mimesia > Sakura Merah Jelita > Baavgai > Bajinja / Ninja Persik Hitam",
  "5. Oni Api Gaib",
  "---",
  "Xtall Event Golden Week",
  "1. Iconos Emas > Kodok Riang > Gem Mas > Goldian > Auporter",
  "---",
  "Xtall Event Hdb",
  "1. Raja Kerbau > Paduka Raja Kerbau - II",
  "2. Raja Kerbau > Pillow Kitagawa - II",
  "3. P. Ava",
  "4. Ratu Kuno II",
  "5. Permaisuri Besi > Merzehal",
  "6. Gespenst II > Stellar Ooze",
  "7. Pedang Neo Maton > Pedrio",
  "8. Patissia",
  "9. Volgagon > Etoise",
  "10. Altadar",
  "11. Castilia",
  "12. Mbah Dukun Usasama - II",
  "13. Stellar Ooze II",
  "---",
  "Xtall Event Download",
  "1. Potum Pahlawan - IV",
  "2. Potum Platina > Potum Kue",
  "3. Pomie-chan - III",
  "4. Doktor Pom Pom",
  "5. Potumotter - III",
  "---",
  "Xtall Collab",
  "1. Gerumi > Gerumi Kuat",
  "2. Yashiro Azuki",
  "3. Ibu Yashiro Azuki",
  "4. Ayah Yashiro Azuki > Raja Kegelapan",
  "5. Narumi Hina > Ibu Yashiro Azuki II",
  "6. Dr. Leonardo - II",
  "7. Dx Fighter - II",
  "8. Jibril - III",
  "9. Dewa Mesin Maple",
  "",
  "━━━━━━━━━━━━━━━━━━━━",
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
  } else if (tab === 'buffland') {
    SEED_BUFFLAND.forEach(function (b, i) {
      rows.push({ urutan: i + 1, label: b[0], nama: b[1] });
    });
  } else {
    var lines = tab === 'xtallMaster' ? SEED_XTALL_MASTER : SEED_XTALL_EVENT;
    lines.forEach(function (isi, i) {
      rows.push({ urutan: i + 1, isi: isi });
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
