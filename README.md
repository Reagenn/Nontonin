# Nontonin — Watchlist & Reading Tracker

> **Versi 2.2.0** — perbaikan: frontend sempat tidak jalan sama sekali karena
> satu import modul yang salah (`renderGrid`); sudah diperbaiki dan diuji
> ujung-ke-ujung di browser sungguhan (jsdom). Tile kandidat cover kini
> menampilkan sinopsis + rating seperti versi hosted, peringatan `file://`
> kini tampil walau file dibuka langsung, dan halaman kosong menjelaskan
> bahwa data hosted tidak ikut terbawa. Struktur modular v2.1 tetap sama
> (lihat [Struktur proyek](#struktur-proyek-v220)). Fitur, API, dan bentuk
> `backend/data/data.json` **tidak berubah** dari v1 — data v1/v2.1 bisa
> dipindah dengan menyalin file `data.json` saja (lihat
> [Migrasi dari v1 ke v2](#migrasi-dari-v1-ke-v2)).

> **Catatan nama:** mulai v2.1.0 aplikasi ini bernama **Nontonin** (sebelumnya
> TontonBaca). Hanya nama yang berubah — fitur, API, dan bentuk data sama.

**Nontonin** adalah aplikasi web lokal untuk menyimpan dan melacak tontonan dan bacaan:
Anime, Film, Drama, Novel, dan Wattpad — dalam satu tempat.

Simpan judul, centang episode/bab yang sudah ditonton atau dibaca, beri Tier,
dan lihat progress serta statistik koleksimu. Data tersimpan di komputermu
sendiri, bukan di server orang lain.

## Fitur

- **5 kategori:** Anime, Film, Drama, Novel, Wattpad
- **Checklist episode/bab bernomor** — ketuk untuk centang / batal centang;
  kolom “Sudah ditonton/dibaca sampai ke-” dan Total Episode/Bab. Status
  otomatis berubah jadi **Selesai** saat checklist penuh, dan kembali ke
  **Berlangsung** kalau ada yang dicentang-batal di bawah penuh.
- **Cari cover dari banyak sumber nyata** (maks. 12 kandidat, berlabel sumber):
  - Anime: Kitsu, Shikimori, TVMaze, Cinemeta, Wikipedia EN & ID
  - Film: Cinemeta (poster IMDb), Wikipedia EN & ID
  - Drama: TVMaze, Cinemeta, Wikipedia EN & ID
  - Novel & Wattpad: Open Library, Gutendex/Project Gutenberg, Wikipedia EN & ID, TVMaze (adaptasi)
  - Plus **tempel link cover** dan **upload gambar**. Cover yang dipilih
    **diunduh dan disimpan di dalam aplikasi** (`backend/data/blobs/`), bukan
    sekadar link luar.
  - Klik kandidat cover akan **auto-isi Total Episode/Bab** — hanya saat kolom
    masih kosong, atau masih sama dengan nilai auto-isi kandidat sebelumnya
    (aturan snapshot). Jadi mengganti kandidat — mis. dari Vagabond 16 eps ke
    Love in Disguise 12 eps — akan memperbarui Judul, Genre, Tahun rilis, dan
    Total. Nilai yang kamu ketik manual tidak pernah ditimpa.
- **Tier / Rank S, A, B, C, D** per judul — bisa dipilih di form Tambah/Edit
  maupun lewat tombol huruf berwarna di panel detail (ketuk lagi untuk
  melepas). Ada badge Tier di kartu judul, bagian **“Tier List Kamu”** yang
  mengelompokkan cover per Tier, dan opsi urut **“Tier tertinggi”**.
- **Dashboard:** statistik koleksi (total judul, episode/bab selesai, rating
  rata-rata — semuanya dihitung dari data tersimpan), grafik aktivitas 7 hari,
  bagian **“Lanjutkan”**, dan pemilih acak **“Bingung mau lanjut apa?”**.
- **Filter & pencarian:** filter kategori/status, pencarian judul, dan
  pengurutan (terbaru, judul, progress, rating, Tier).
- **Catatan, rating bintang, favorit, penulis/studio, tahun, target selesai,**
  dan link tempat nonton/baca per judul.
- **Hapus dua langkah:** di form Edit, di bawah tombol Simpan Perubahan, ada
  bagian “Hapus judul ini” dengan peringatan hapus permanen dan konfirmasi
  (Hapus judul → Yakin hapus permanen / Batal hapus).

## Cara menjalankan

Butuh **Node.js 18+**. Tanpa dependensi npm — tidak perlu `npm install`.

```bash
node backend/src/server.js
# atau
npm start
```

Lalu buka **http://localhost:3000** di browser.

> ⚠️ Jangan buka `frontend/index.html` langsung dengan klik ganda (file://) —
> aplikasi tidak akan menyimpan data dengan cara itu. Gunakan langkah di atas.
> Kalau terlanjur dibuka begitu, halaman akan menampilkan peringatan merah di
> bagian atas — ikuti petunjuknya.

Data tersimpan di `backend/data/data.json` dan tetap ada setelah server
di-restart. Aplikasi mulai **kosong** — isi sendiri lewat **+ Tambah Judul**.
Judul-judul dari versi hosted (web) **tidak ikut terbawa** ke versi lokal ini,
dan data lokal tidak menimpa data hosted.

## Kalau aplikasi tidak jalan / halaman kosong

Cek dari yang paling sering terjadi:

1. **Server belum jalan.** Pastikan terminal masih menampilkan
   `Nontonin v2.2.0 jalan di http://localhost:3000`, lalu refresh browser.
   Kalau terminal sudah ditutup, jalankan lagi `node backend/src/server.js`.
2. **Membuka file langsung (file://).** Jangan klik ganda `index.html` —
   halaman akan menampilkan peringatan merah di atas. Jalankan server dulu
   (lihat Cara menjalankan), lalu buka `http://localhost:3000`.
3. **Port 3000 sudah dipakai.** Server akan berhenti dengan pesan
   `Port 3000 sudah dipakai aplikasi lain`. Jalankan dengan port lain:
   `PORT=3001 node backend/src/server.js`, lalu buka `http://localhost:3001`.
4. **Node.js belum terinstall / terlalu lama.** Cek dengan `node --version` —
   butuh Node.js 18+. Kalau belum ada, install dari https://nodejs.org.
5. **Halaman terbuka tapi kosong tanpa judul.** Pastikan kamu membuka
   `http://localhost:3000` (bukan `file://`), lalu hard-refresh
   (`Ctrl+Shift+R` / `Cmd+Shift+R`). Kalau masih kosong, lihat pesan error di
   terminal server.

## Teknologi

- **Node.js tanpa dependensi npm** — server HTTP bawaan Node (`http`, `fs`,
  `crypto`) dan `fetch` global untuk pencarian cover.
- **Frontend:** HTML + CSS + JavaScript polos (ES modules, tanpa build step),
  tanpa framework dan tanpa CDN.
- **Penyimpanan:** file JSON lokal `backend/data/data.json`; cover di
  `backend/data/blobs/`.
- **Sumber cover:** API publik Kitsu, Shikimori, TVMaze, Cinemeta,
  Open Library, Gutendex, dan Wikipedia (tidak butuh API key).

## Struktur proyek (v2.2.0)

Kode sengaja dipecah per tanggung jawab, bukan menumpuk di satu file —
supaya gampang dibaca dan direview (mis. buat porto GitHub). Backend di
`backend/src/` (entry `backend/src/server.js`, rute di
`backend/src/routes/`, sumber cover di `backend/src/sources/`); frontend
di `frontend/js/` (entry `frontend/js/main.js`, CSS di
`frontend/css/styles.css`).

```
nontonin-local/
├── package.json                 # name: nontonin, versi 2.2.0
├── README.md  LICENSE  .gitignore
├── backend/
│   ├── data/
│   │   ├── data.json            # data kamu (kosong di ZIP; jangan di-commit)
│   │   └── blobs/               # cover yang diunduh (jangan di-commit)
│   └── src/
│       ├── server.js            # entry tipis: load data + start server
│       ├── config.js            # port, path data, kategori/status/tier
│       ├── state.js             # baca/tulis data.json + logika item
│       ├── http.js              # response JSON, body, fetch, file statis
│       ├── router.js            # peta rute -> modul routes/
│       ├── coverSources.js      # orkestrator cari cover (paralel + round-robin)
│       ├── covers.js            # unduh & simpan cover sebagai blob
│       ├── sources/             # satu file per sumber cover
│       │   ├── kitsu.js  shikimori.js  tvmaze.js  cinemeta.js
│       │   ├── wikipedia.js  openlibrary.js  gutendex.js  helpers.js
│       └── routes/              # satu file per kelompok endpoint
│           ├── items.js         # CRUD items + toggle checklist
│           ├── covers.js        # search-cover, cover-download, cover-upload
│           └── static.js        # index.html, /frontend/*, /blobs/*
└── frontend/
    ├── index.html               # <script type="module" src="/frontend/js/main.js">
    ├── css/
    │   └── styles.css
    └── js/                      # ES modules
        ├── main.js              # entry tipis: wiring event + init
        ├── api.js               # semua fetch ke backend
        ├── state.js             # state lokal + aturan snapshot auto-fill
        ├── utils.js             # helper DOM / format
        ├── render.js            # orkestrator render + loadAll
        ├── render-dashboard.js  # statistik, Tier List, Lanjutkan, grafik
        ├── render-items.js      # kartu judul, filter, pencarian, urutan
        ├── render-detail.js     # panel detail, checklist, tombol Tier
        └── forms.js             # form Tambah/Edit, cari cover, hapus
```

## Migrasi dari v1/v2.1 ke v2.2

API dan bentuk `backend/data/data.json` **tidak berubah** — v2.2 membaca
data v1/v2.1 apa adanya. Untuk pindah:

1. Salin file `backend/data/data.json` dari folder v1/v2.1 ke
   `backend/data/data.json` di folder v2.2 (timpa file kosong bawaan v2.2).
2. Kalau ada cover tersimpan, salin juga isi folder
   `backend/data/blobs/` dari folder lama ke v2.2.
3. Jalankan v2.2 seperti biasa (`node backend/src/server.js`).

⚠️ Jangan lakukan sebaliknya — jangan menimpa `data.json` lama yang berisi
datamu dengan file kosong dari ZIP.

## Batasan yang jujur

- **Wattpad tidak punya API pencarian resmi yang berfungsi** (dicek: 404).
  Kategori Wattpad dilayani lewat sumber buku & adaptasi (Open Library,
  Gutendex, Wikipedia, TVMaze), bukan pencarian langsung ke Wattpad.
- **Gutendex** pencocokannya longgar (ikut mencocokkan ringkasan buku), jadi
  hasilnya diurutkan di bawah Open Library.
- Sumber novel/Wattpad **tidak menerbitkan jumlah bab**, jadi Total Bab untuk
  Novel & Wattpad tetap diisi manual.
- Jumlah episode bisa berbeda antar sumber untuk judul yang sama; angka yang
  terisi mengikuti kandidat cover yang diklik (cek angka di tile kandidat
  sebelum mengklik, mis. “22 episode”).

## Lisensi

MIT — lihat `LICENSE`.
