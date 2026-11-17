# Latihan Git Workflow — Repo `Reagenn/Nontonin`

Repo kamu sudah live di https://github.com/Reagenn/Nontonin (branch `main`,
Nontonin v2.2.0). File ini berisi **8 latihan berurutan**, masing-masing =
**1 branch + 1 Pull Request**. Kerjakan berurutan — tiap latihan melatih satu
bagian dari GitHub Flow di kode asli, bukan repo kosong.

## Setup awal (sekali saja)

```bash
# Clone repo kamu sendiri (jangan pakai folder ZIP latihan kemarin)
git clone https://github.com/Reagenn/Nontonin.git
cd Nontonin

# Pastikan identitas Git-mu benar
git config user.name "Rainy"
git config user.email "790514+Reagenn@users.noreply.github.io"
git log --oneline   # harus ada commit v2.2.0
```

## Aturan main (berlaku untuk SEMUA latihan)

1. **Tidak ada push langsung ke `main`.** Semua perubahan lewat branch + PR.
2. **1 latihan = 1 branch = 1 PR.** Nama branch: `jenis/apa-yang-diubah`
   (huruf kecil, pakai `-`), contoh: `feature/filter-favorit`.
3. **Commit message pakai Conventional Commits:** `feat:` / `fix:` /
   `docs:` / `style:` / `refactor:` / `chore:` + pesan jelas.
   Benar: `feat: tambah filter favorit saja`. Jelek: `update`, `fix bug doang`.
4. **Sebelum merge, PR harus:** CI hijau (mulai Latihan 1), diff sudah kamu
   baca sendiri di tab **Files changed**, dan kamu bisa menjelaskan
   perubahannya dalam 2 kalimat.
5. **Setelah merge:** hapus branch di GitHub, lalu di laptop:
   `git checkout main && git pull && git branch -d nama-branch`.

---

## Latihan 0 — Masukkan file ini lewat PR (pemanasan, 15 menit)

**Tujuan:** merasakan **1 putaran penuh GitHub Flow** (branch → commit → push
→ PR → review → merge → hapus branch → pull) dengan perubahan yang **aman**:
cuma menambah file dokumentasi, tidak menyentuh kode aplikasi sama sekali.
Kalau ada yang salah di sini, tidak ada yang rusak.

**Konsep yang dipakai di latihan ini (baca dulu, 2 menit):**

- `main` = branch utama. Isinya kode yang sudah jadi dan bisa jalan.
  Aturannya: jangan ubah `main` langsung.
- **Branch** = salinan kerja terpisah. Kamu kerja di branch, `main` tetap aman.
  Branch dihapus setelah selesai.
- **Commit** = menyimpan perubahan ke riwayat lokal, lengkap dengan pesan.
- **Push** = mengirim commit dari laptop ke GitHub.
- **Pull Request (PR)** = pengajuan "tolong gabungkan branch-ku ke `main`".
  PR adalah tempat review dan (mulai Latihan 1) tempat CI berjalan.
- **Merge** = menggabungkan branch ke `main` setelah PR disetujui.

### Langkah 1 — Clone repo (kalau belum pernah)

```bash
git clone https://github.com/Reagenn/Nontonin.git
cd Nontonin
```

- `clone` = mengunduh repo dari GitHub ke laptop.
- `cd Nontonin` = masuk ke folder repo. **Semua perintah git berikutnya harus
  dijalankan dari dalam folder ini.** Kalau muncul error
  `fatal: not a git repository`, artinya kamu belum `cd` ke folder repo.
- Cek posisimu:

```bash
git status
```

Harusnya muncul `On branch main` dan `nothing to commit, working tree clean`
(artinya: kamu di branch `main`, tidak ada perubahan yang belum disimpan).

### Langkah 2 — Pastikan `main` sudah yang terbaru

```bash
git checkout main
git pull
```

- `git checkout main` = pindah ke branch `main`.
- `git pull` = mengambil perubahan terbaru dari GitHub ke laptop.
- Lakukan ini **selalu sebelum membuat branch baru**, supaya branch-mu mulai
  dari kode yang paling baru.

### Langkah 3 — Buat branch baru

```bash
git checkout -b docs/latihan-git-workflow
```

- `-b` artinya "buat branch baru, lalu langsung pindah ke sana".
- Nama branch `docs/latihan-git-workflow`: `docs/` karena ini perubahan
  dokumentasi; `latihan-git-workflow` karena isinya file latihan ini.
- Cek:

```bash
git branch
```

Branch yang aktif ditandai `*`. Sekarang harusnya `* docs/latihan-git-workflow`.

### Langkah 4 — Salin file latihan ke repo

Salin file `LATIHAN-GIT-WORKFLOW.md` (file ini) ke dalam folder repo,
sejajar dengan `README.md`. Boleh lewat File Explorer (copy-paste biasa) —
tidak harus lewat terminal.

### Langkah 5 — Cek, lalu commit

```bash
git status
```

Harusnya muncul `Untracked files: LATIHAN-GIT-WORKFLOW.md` (warna merah).
Artinya: Git melihat ada file baru, tapi belum melacaknya. Itu normal.

```bash
git add LATIHAN-GIT-WORKFLOW.md
git status
```

- `git add` = menandai file untuk disimpan di commit berikutnya. Sekarang
  statusnya berubah jadi hijau (`new file`).
- ⚠️ Jangan `git add .` membabi buta kalau ada file lain yang berubah.
  Di repo ini `backend/data/data.json` sudah ada di `.gitignore`, jadi tidak
  akan ikut — tapi biasakan cek `git status` dulu sebelum `add`.

```bash
git commit -m "docs: tambah daftar latihan git workflow"
```

- `git commit` = menyimpan perubahan ke riwayat **lokal** (belum ke GitHub)
  dengan pesan.
- Pesan commit: diawali `docs:` karena ini dokumentasi, lalu pesan jelas
  dengan huruf kecil, tanpa titik di akhir.
- Cek:

```bash
git log --oneline
git status
```

`git log` harus menampilkan commit-mu di paling atas. `git status` harus
bersih lagi (`nothing to commit`).

### Langkah 6 — Push branch ke GitHub

```bash
git push -u origin docs/latihan-git-workflow
```

- `push` = mengirim commit dari laptop ke GitHub.
- `-u origin` = memasang "upstream" — penanda supaya lain kali cukup ketik
  `git push` saja tanpa nama branch. `origin` adalah nama remote GitHub-mu.
- Kalau GitHub minta login saat push: pakai **Personal Access Token**
  (GitHub → Settings → Developer settings → Personal access tokens →
  Tokens (classic) → Generate, centang `repo`), **bukan** password GitHub.
  Password sudah tidak bisa dipakai untuk push lewat HTTPS.

### Langkah 7 — Buka Pull Request di GitHub

1. Buka https://github.com/Reagenn/Nontonin di browser.
2. Akan muncul banner kuning `docs/latihan-git-workflow had recent pushes` →
   klik tombol hijau **Compare & pull request**.
   (Kalau banner tidak muncul: tab **Pull requests → New pull request**,
   lalu atur base: `main` ← compare: `docs/latihan-git-workflow`.)
3. **Judul PR:** isi sama seperti commit — `docs: tambah daftar latihan
   git workflow`.
4. **Deskripsi:** tulis 1–2 kalimat, contoh:
   `Menambah file LATIHAN-GIT-WORKFLOW.md berisi 8 latihan GitHub Flow
   untuk repo ini.`
5. Klik **Create pull request**.

### Langkah 8 — Review sendiri sebelum merge

Di halaman PR:

1. Buka tab **Files changed** — yang muncul hanya file baru
   `LATIHAN-GIT-WORKFLOW.md` dengan semua baris berwarna hijau (`+`).
   Baca sekilas: apakah isinya benar? Tidak ada baris aneh?
2. Tab **Conversation** — di latihan ini belum ada cek CI (CI baru dibuat di
   Latihan 1), jadi tidak ada yang perlu ditunggu. Itu normal.

Ini gunanya PR: kamu melihat **persis apa yang akan masuk ke `main`**
sebelum digabungkan. Kalau ada yang salah, kamu masih bisa perbaiki di branch
yang sama (edit file → `git add` → `git commit` → `git push`), PR ikut
ter-update otomatis.

### Langkah 9 — Merge, lalu hapus branch di GitHub

1. Klik tombol hijau **Merge pull request** → **Confirm merge**.
2. Setelah merge, GitHub menampilkan tombol **Delete branch** → klik itu.
   Branch di GitHub terhapus. Branch di laptop masih ada — dihapus di
   Langkah 10.

### Langkah 10 — Sinkronkan laptop dengan `main` yang baru

```bash
git checkout main
git pull
git branch -d docs/latihan-git-workflow
git branch
```

- `git checkout main` = kembali ke branch `main`.
- `git pull` = menarik hasil merge dari GitHub. Sekarang file
  `LATIHAN-GIT-WORKFLOW.md` ada di `main` laptopmu.
- `git branch -d docs/latihan-git-workflow` = menghapus branch lokal yang
  sudah di-merge. Huruf `d` kecil itu sengaja: Git akan **menolak** kalau
  branch-nya belum di-merge (pengaman).
- `git branch` = cek akhir. Harusnya tinggal `main`.

✅ **Selesai kalau semua ini benar:**

- File ini tampil di https://github.com/Reagenn/Nontonin (branch `main`).
- `git log --oneline` di `main` menunjukkan commit
  `docs: tambah daftar latihan git workflow`.
- `git branch` tinggal `main`, dan `git status` bersih.

**Kalau salah langkah, ini perbaikannya:**

- **Salah pesan commit, belum push:** `git commit --amend -m "pesan yang benar"`
  (mengubah commit terakhir).
- **Terlanjur commit file yang salah, belum push:**
  `git reset HEAD~1` — membatalkan commit terakhir, tapi file-nya tetap ada
  di laptop, jadi kamu bisa `git add` ulang yang benar.
- **Sudah push tapi mau memperbaiki:** jangan `amend` + `force push` untuk
  latihan ini — buat saja commit perbaikan baru di branch yang sama, lalu
  `git push` lagi. PR ikut ter-update.

---

## Latihan 1 — Tambah CI + lindungi `main` (fondasi, 30 menit)

**Tujuan:** supaya semua PR berikutnya punya gerbang otomatis (CI hijau).

**Branch:** `chore/tambah-ci`

**File yang disentuh:** `.github/workflows/ci.yml` (baru),
`.github/pull_request_template.md` (baru).

**Petunjuk:**

- File CI-nya sudah jadi — ada di ZIP latihan kemarin
  (`nontonin-git-practice/.github/`). Salin folder `.github/` itu ke repo ini.
- Isi CI: `node --check` semua file `backend/**/*.js` dan
  `frontend/**/*.js`, lalu boot server dan `curl http://localhost:3000/api/items`.
- PR template: ringkasan, yang diubah, cara ngetes, checklist
  (sudah dites, CI hijau, tidak ada `data.json` yang ikut).

**Cara ngetes:** setelah PR dibuka, di bawah PR harus muncul job
`smoke-test` dan berakhir hijau. Kalau merah, klik detailnya dan baca log.

**Commit:** `chore: tambah CI smoke test dan template PR`

**Setelah merge — lindungi `main`:** repo GitHub → **Settings → Branches →
Add branch ruleset**, pattern `main`, centang **Require a pull request before
merging** dan **Require status checks to pass** → pilih `smoke-test`.

> **Jujur buat repo solo:** jangan centang "Require approvals: 1" — kamu tidak
> bisa approve PR-mu sendiri, PR-mu akan terkunci selamanya. Gerbang yang bisa
> kamu lewati sendirian adalah **PR wajib + CI wajib hijau**. Review tetap kamu
> lakukan sendiri dengan membaca diff sebelum merge.

✅ **Selesai kalau:** push langsung ke `main` ditolak GitHub, dan PR berikutnya
menampilkan CI hijau sebelum bisa di-merge.

---

## Latihan 2 — Filter "Favorit saja" (mudah, 30–45 menit)

**Tujuan:** latihan mengubah UI + logika filter tanpa menyentuh backend.

**Branch:** `feature/filter-favorit`

**File yang disentuh:** `frontend/index.html`, `frontend/js/render-items.js`.

**Petunjuk:**

- Item sudah punya field `favorite` (boolean, badge ⭐ di kartu) dan form
  Tambah/Edit sudah punya checkbox `#in-favorite`. Yang belum ada: filter-nya.
- Di `index.html`, di baris filter (dekat `#f-category`, `#f-status`,
  `#f-sort`, `#f-search`), tambah satu kontrol baru, misal checkbox
  "⭐ Favorit saja" dengan id `#f-favorite-only`.
- Di `filteredItems()` (`render-items.js`), baca nilai checkbox itu dan
  tambahkan syarat ke `.filter(...)`: kalau dicentang, hanya item dengan
  `it.favorite === true` yang tampil.
- Pastikan filter ini tetap bekerja bersamaan dengan filter kategori/status,
  pencarian, dan semua opsi urut yang sudah ada.

**Cara ngetes:** tandai 2 judul sebagai favorit, centang "Favorit saja" →
hanya 2 itu yang tampil, angka `(n)` di samping judul daftar ikut berubah.
Matikan lagi → semua tampil kembali.

**Commit:** `feat: tambah filter favorit saja`

---

## Latihan 3 — Dark mode (menengah, 1–2 jam)

**Tujuan:** latihan mengubah tema lewat CSS + menyimpan preferensi user.

**Branch:** `feature/dark-mode`

**File yang disentuh:** `frontend/css/styles.css`, `frontend/index.html`,
`frontend/js/main.js` (atau `frontend/js/state.js`).

**Petunjuk:**

- Ubah warna-warna utama di `styles.css` jadi **CSS variables** (misal
  `--bg`, `--text`, `--card`), lalu buat varian gelap di bawah selector
  `body.dark` yang menimpa nilai variable-nya.
- Tambah tombol toggle (🌙/☀️) di header `index.html` (dekat `<h1>`).
- Saat diklik: toggle class `dark` di `<body>` dan simpan pilihan di
  `localStorage` (misal key `nontonin-theme`).
- Saat aplikasi dimuat (`main.js`), baca `localStorage` dan terapkan tema
  sebelum render pertama — supaya tidak sempat "kedip" terang dulu.

**Cara ngetes:** klik toggle → seluruh halaman gelap; refresh → tetap gelap;
klik lagi → kembali terang. Semua teks tetap terbaca di kedua mode (cek kartu,
badge Tier, dan form).

**Commit:** `feat: tambah dark mode dengan preferensi tersimpan`

---

## Latihan 4 — Export & Import backup JSON (menengah, 1–2 jam)

**Tujuan:** latihan fitur yang menyentuh data + file, dan berpikir soal
keamanan data user.

**Branch:** `feature/backup-json`

**File yang disentuh:** `frontend/index.html`, `frontend/js/api.js`
(atau file baru `frontend/js/backup.js` + daftarkan di `main.js`),
`backend/src/routes/items.js` (hanya kalau kamu memilih impor via server).

**Petunjuk:**

- **Export (mudah):** ambil semua item lewat `GET /api/items`, ubah jadi
  string JSON, unduh sebagai file lewat `Blob` + `URL.createObjectURL`
  (tanpa library). Nama file: `nontonin-backup-YYYY-MM-DD.json`.
- **Import (pikirkan dulu):** user memilih file JSON → baca dengan
  `FileReader` → validasi bentuknya (harus array, tiap item harus punya
  `title` dan `category` yang valid) → kirim tiap item ke `POST /api/items`.
  Putuskan dan tulis di PR: import **menambah** ke koleksi yang ada, atau
  **mengganti** semuanya? (Rekomendasi: menambah saja — lebih aman.)
- **Keamanan:** jangan pernah mengimpor `coverUrl` berupa path lokal
  sembarangan — cukup kirim field yang dikenali API; field aneh diabaikan.

**Cara ngetes:** tambah 2 judul → export → hapus keduanya → import file
backup → keduanya kembali. Coba import file JSON asal (misal `{}`) → aplikasi
menolak dengan pesan yang jelas, bukan crash.

**Commit:** `feat: tambah export dan import backup JSON`

---

## Latihan 5 — Streak harian di dashboard (menengah, 1 jam)

**Tujuan:** latihan mengolah data yang sudah ada (activity log) jadi insight baru.

**Branch:** `feature/streak-harian`

**File yang disentuh:** `frontend/js/render-dashboard.js`,
`frontend/js/utils.js` (kalau perlu helper tanggal).

**Petunjuk:**

- Backend sudah mencatat aktivitas di `data.activity` — tiap entri punya
  `date` (format `YYYY-MM-DD`) dan `ts`. Aktivitas lebih dari 30 hari
  otomatis dibuang, jadi streak maksimal 30.
- Hitung **streak**: jumlah hari berurutan ke belakang dari hari ini yang
  punya minimal 1 aktivitas. Kalau hari ini belum ada aktivitas, streak
  dihitung dari kemarin (jangan langsung 0).
- Tampilkan di dashboard, dekat statistik: misal `🔥 Streak 3 hari`.
- Hati-hati zona waktu: bandingkan berdasarkan `date` (string tanggal),
  bukan `ts` mentah — supaya tidak meleset sehari.

**Cara ngetes:** dengan data kosong streak = 0. Tandai 1 episode hari ini →
streak 1. (Untuk menguji streak 3 tanpa menunggu 3 hari: ubah sementara
`date` di `backend/data/data.json` jadi 3 tanggal berurutan, restart server,
cek dashboard, lalu kembalikan — jangan commit file data itu!)

**Commit:** `feat: tampilkan streak harian di dashboard`

---

## Latihan 6 — Toggle tampilan Grid / List (mudah–menengah, 1 jam)

**Tujuan:** latihan mengubah cara render yang sama dari dua mode tampilan.

**Branch:** `feature/tampilan-list`

**File yang disentuh:** `frontend/js/render-items.js`,
`frontend/css/styles.css`, `frontend/index.html`,
`frontend/js/state.js` (untuk menyimpan pilihan mode).

**Petunjuk:**

- Tambah dua tombol di atas daftar (misal `▦ Grid` / `☰ List`).
- Mode Grid = kartu seperti sekarang. Mode List = baris ringkas per judul
  (cover kecil + judul + progress + Tier dalam satu baris).
- Simpan pilihan mode di `state` (dan `localStorage` supaya bertahan setelah
  refresh, seperti Dark mode di Latihan 3).
- Satu fungsi `renderGrid()` boleh bercabang berdasarkan mode — atau buat
  `renderList()` terpisah dan pilih salah satu di `render()`.

**Cara ngetes:** pindah Grid → List → Grid; filter, pencarian, dan urutan
tetap bekerja di kedua mode; refresh → mode terakhir tetap dipakai.

**Commit:** `feat: tambah toggle tampilan grid dan list`

---

## Latihan 7 — Statistik per kategori di dashboard (menengah, 1 jam)

**Tujuan:** latihan agregasi data + menampilkan insight yang berguna.

**Branch:** `feature/statistik-kategori`

**File yang disentuh:** `frontend/js/render-dashboard.js`.

**Petunjuk:**

- Dari `state.items`, hitung per kategori (Anime/Film/Drama/Novel/Wattpad):
  jumlah judul + episode/bab selesai. Kategori kosong tetap tampil dengan 0
  (jangan disembunyikan — user jadi tahu kategori mana yang belum diisi).
- Tampilkan sebagai daftar kecil di dashboard, misal baris
  `Anime — 5 judul, 120/200 episode` per kategori.
- Hitung dari data tersimpan (seperti statistik lain), bukan angka hardcode.

**Cara ngetes:** tambah 1 Anime dan 1 Film → angka kedua kategori naik,
tiga kategori lain tetap 0. Hapus keduanya → kembali 0.

**Commit:** `feat: tambah statistik per kategori di dashboard`

---

## Latihan 8 (bonus) — Simulasi konflik merge

**Tujuan:** merasakan konflik sekali, supaya tidak panik saat kejadian beneran.

1. Di GitHub web, edit `README.md` langsung (ikon pensil ✏️), ubah satu baris,
   commit dengan pesan `docs: ubah README dari web`.
2. Di laptop, **tanpa `git pull` dulu**, edit baris yang sama di `README.md`:

```bash
git add README.md
git commit -m "docs: ubah README dari laptop"
git push   # akan ditolak: main di remote sudah maju
git pull   # muncul CONFLICT di README.md
```

3. Buka `README.md`, cari tanda `<<<<<<<`, `=======`, `>>>>>>>`. Pilih versi
   yang benar (atau gabungkan keduanya), hapus semua tanda itu, lalu:

```bash
git add README.md
git commit -m "docs: selesaikan konflik merge README"
git push
```

✅ **Selesai kalau:** konflik terselesaikan dan `main` lokal + remote sama lagi
(`git status` bersih setelah `git pull`).

---

## Setelah semua latihan selesai

Yang kamu punya bukan cuma 8 fitur baru — tapi juga:

- **Riwayat PR yang rapi** di repo (ini yang dibuka recruiter duluan setelah README)
- **CI hijau** di setiap PR
- **Commit message konsisten** (`feat:`/`fix:`/`docs:`/...)
- Bukti kamu bisa kerja dengan workflow tim, bukan cuma coding sendirian

Langkah berikutnya yang benar: ulangi pola yang sama (branch → PR → CI →
review → merge) di repo portofolio lain — Belajar Fullstack Dev, AlgoMentor,
LP Desk — lalu fokus ke deploy dan lamar kerja. Git Flow dan Trunk-Based
cukup paham konsepnya untuk interview; GitHub Flow ini yang dipakai sehari-hari.
