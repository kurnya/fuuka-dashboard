# Master Data Fuuka

Dashboard untuk mengubah isi data bot Fuuka (ForceknightBot) tanpa menyentuh kode. Data disimpan di Google Spreadsheet **Master Data Fuuka**, diakses lewat Apps Script Web App. Dashboard mengelola topik `#3`, `#12`, dan `#13`.

```
Dashboard (GitHub Pages) ──POST (PIN)──► Apps Script ◄──GET read── Bot WA
                                              │
                                         Google Sheet
```

## Setup (sekali saja)

1. Buka spreadsheet **Master Data Fuuka**, lalu **Ekstensi → Apps Script**.
2. Buat dua file dan tempel isinya: `apps-script/Logic.gs` dan `apps-script/Code.gs`.
3. Pilih fungsi `setup` lalu **Run**, dan setujui izin akses. Ini membuat tab `buff`, `buffland`, `xtallMaster`, dan `xtallEvent` beserta isi awal. Tab yang sudah berisi tidak ditimpa.
4. **Setelan Proyek (ikon roda gigi) → Properti skrip → Tambah properti**: nama `DASHBOARD_PIN`, nilai PIN pilihanmu. PIN **tidak** disimpan di sheet. Pakai PIN **minimal 8 karakter** (campur huruf dan angka lebih baik): URL `/exec` publik, jadi panjang PIN adalah pertahanan utama terhadap tebakan massal.
5. **Deploy → Deployment baru → Web app**. Execute as: **Me**. Who has access: **Anyone**. Salin URL yang berakhiran `/exec`.
6. Isi `API_URL` di [config.js](config.js) dengan URL itu.
7. Di bot, isi `MASTER_DATA_URL` di `.env` dengan URL yang sama, lalu restart bot.

Setiap kali `Code.gs` atau `Logic.gs` diubah, buat **versi deployment baru** supaya perubahan dipakai.

## GitHub Pages

Push repo ini ke GitHub, lalu **Settings → Pages → Deploy from a branch → main / (root)**. Halaman statis ini publik, tetapi **datanya** terkunci: semua aksi dashboard (`login`, `read_admin`, `save`) ditolak Apps Script tanpa PIN yang benar.

## Cara pakai

- Buka dashboard, masukkan PIN.
- Tab **Kode Buff**: ubah nama dan kode, tambah kode pada nama yang sama (mis. DTE), geser urutan, hapus. Kode hanya angka.
- Tab **Code Buffland**: label dan nama untuk blok "Code buffland member/admin".
- Tab **Xtall Master** dan **Xtall Event**: satu baris per baris pesan; baris kosong dipertahankan sebagai pemisah.
- Panel **Preview** menampilkan isi pesan WA seperti yang akan dilihat guild.
- Klik **Simpan**. Bot memakai data baru paling lambat **5 menit** kemudian (cache bot).

## Keamanan

- `read` (dipakai bot) publik dan hanya membaca. Isi kode buff memang ditampilkan ke seluruh guild.
- Aksi tulis dan baca-admin butuh PIN. 5 kali salah berturut-turut mengunci semua aksi ber-PIN selama 10 menit.
- URL `/exec` publik. Yang melindungi data adalah PIN, bukan kerahasiaan URL.
- Riwayat perubahan: pakai **File → Riwayat versi** di Google Sheets untuk memulihkan.

## Tes

```
npm test
```

Menguji logika Apps Script (`Logic.gs`, `Code.gs` di atas Sheet tiruan), klien API, dan penyusun teks. `tests/buff-cases.json` dan `lib/buffText.js` harus tetap sama dengan `tests/fixtures/buff-cases.json` dan `src/services/buffText.js` di ForceknightBot. Ubah satu, salin ke yang lain.

## Menambah topik baru

1. Tambah skema kolom di `TAB_SCHEMAS` dan aturan di `validateRows` (`Logic.gs`), serta data awal di `Code.gs`.
2. Tambah tab di `TABS` pada `app.js` beserta editornya.
3. Di bot, ambil tab itu lewat `getTab("<nama tab>")` dari `src/services/masterData.js`.
