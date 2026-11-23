# Nontonin

**EN:** Nontonin is a local web app for people who want to track anime, films, dramas, novels, and Wattpad reading in one personal library.<br>
**ID:** Nontonin adalah aplikasi web lokal untuk pengguna yang ingin melacak anime, film, drama, novel, dan bacaan Wattpad dalam satu koleksi pribadi.

## Features / Fitur

- **Personal library / Koleksi pribadi:** Store titles in five categories with status, notes, links, year, author or studio, rating, and favorite state. / Simpan judul dalam lima kategori beserta status, catatan, tautan, tahun, penulis atau studio, rating, dan favorit.
- **Progress tracking / Pelacakan progres:** Record the current episode or chapter and use a numbered checklist when a total is available. / Catat episode atau bab terakhir dan gunakan checklist bernomor ketika jumlah total tersedia.
- **Cover search / Pencarian cover:** Search supported public sources, paste an image URL, or upload an image; selected covers are stored locally when the download succeeds. / Cari dari sumber publik yang didukung, tempel URL gambar, atau unggah gambar; cover terpilih disimpan secara lokal ketika pengunduhan berhasil.
- **Organization / Pengelolaan:** Use Tier S-A-B-C-D, search, filters, sorting, collection statistics, and recent activity. / Gunakan Tier S-A-B-C-D, pencarian, filter, pengurutan, statistik koleksi, dan aktivitas terbaru.
- **Release calendar / Kalender rilis:** Show the next announced episode for saved Anime and Drama titles using Shikimori with TVMaze as the drama source and fallback. / Tampilkan episode berikutnya yang sudah diumumkan untuk Anime dan Drama tersimpan dengan Shikimori serta TVMaze sebagai sumber drama dan fallback.
- **Release reminders / Pengingat rilis:** Save one reminder per title and show browser notifications while Nontonin is open and notification permission is granted. / Simpan satu pengingat per judul dan tampilkan notifikasi browser selama Nontonin terbuka serta izin notifikasi diberikan.

## Quick Start

**EN:** Requires Git and Node.js 18 or newer; the project has no npm dependencies to install.<br>
**ID:** Membutuhkan Git dan Node.js 18 atau lebih baru; proyek ini tidak memiliki dependensi npm yang perlu dipasang.

```bash
git clone https://github.com/Reagenn/Nontonin.git
cd Nontonin
npm start
```

Open `http://localhost:3000`. Do not open `frontend/index.html` through `file://`.<br>
Buka `http://localhost:3000`. Jangan membuka `frontend/index.html` melalui `file://`.

## How to Use / Cara Pakai

1. **Add a title / Tambah judul:** Select **+ Tambah Judul**, choose a category, then enter metadata manually or select a cover candidate. / Pilih **+ Tambah Judul**, tentukan kategori, lalu isi metadata secara manual atau pilih kandidat cover.
2. **Track it / Lacak progres:** Update the current episode or chapter, checklist, status, Tier, rating, notes, and optional release reminder. / Perbarui episode atau bab terakhir, checklist, status, Tier, rating, catatan, dan pengingat rilis opsional.
3. **Review the library / Tinjau koleksi:** Use the dashboard, filters, Tier list, activity chart, and release calendar to review saved data. / Gunakan dashboard, filter, daftar Tier, grafik aktivitas, dan kalender rilis untuk meninjau data tersimpan.

## Project Structure / Struktur Proyek

```text
Nontonin/
|-- backend/
|   |-- src/
|   |   |-- server.js          # HTTP server entry / entry server HTTP
|   |   |-- routes/            # Local API and static routes / API lokal dan rute statis
|   |   |-- sources/           # Cover-source adapters / adapter sumber cover
|   |   |-- releaseCalendar.js # Release cache and orchestration / cache dan orkestrasi rilis
|   |   `-- state.js           # JSON persistence and domain logic / persistensi JSON dan logika domain
|   `-- data/                  # Local runtime data, ignored by Git / data runtime lokal, diabaikan Git
|-- frontend/
|   |-- index.html             # Application shell / kerangka aplikasi
|   |-- css/                   # Styles / gaya tampilan
|   |-- js/                    # Browser ES modules / modul ES browser
|   `-- sw.js                  # Notification service worker / service worker notifikasi
|-- package.json
|-- README.md
`-- LICENSE
```

The backend uses Node.js built-in modules and stores records in `backend/data/data.json`; the frontend is plain HTML, CSS, and JavaScript with no build step.<br>
Backend memakai modul bawaan Node.js dan menyimpan data di `backend/data/data.json`; frontend memakai HTML, CSS, dan JavaScript biasa tanpa build step.

## External Public APIs / API Publik Eksternal

Only the backend contacts the following external endpoints. The frontend `fetch` calls use this app's local `/api/*` routes. No API token, key, or secret is stored in the code.<br>
Hanya backend yang menghubungi endpoint eksternal berikut. Panggilan `fetch` frontend menggunakan rute lokal `/api/*` milik aplikasi ini. Tidak ada token, key, atau secret API yang disimpan di kode.

| API | Endpoint used / Endpoint yang dipakai | Purpose / Kegunaan |
| --- | --- | --- |
| Kitsu API | `GET https://kitsu.io/api/edge/anime?filter[text]={query}&page[limit]=5` | Anime cover, title, year, synopsis, rating, and episode count. / Cover anime, judul, tahun, sinopsis, rating, dan jumlah episode. |
| Shikimori API | `GET https://shikimori.one/api/animes?search={query}&limit=5`<br>`POST https://shikimori.one/api/graphql` | Anime cover and metadata; GraphQL supplies `nextEpisodeAt` and aired episode data for the release calendar. / Cover dan metadata anime; GraphQL menyediakan `nextEpisodeAt` dan data episode tayang untuk kalender rilis. |
| TVMaze API | `GET https://api.tvmaze.com/search/shows?q={query}`<br>`GET https://api.tvmaze.com/shows/{id}/episodes`<br>`GET https://api.tvmaze.com/shows/{id}?embed=nextepisode`<br>`GET {_links.nextepisode.href}` returned by TVMaze | Show search, cover and metadata, episode totals, and the next episode time. / Pencarian serial, cover dan metadata, jumlah episode, serta waktu episode berikutnya. |
| Cinemeta API | `GET https://v3-cinemeta.strem.io/catalog/{type}/top/search={query}.json`<br>`GET https://v3-cinemeta.strem.io/meta/series/{id}.json` | Film and series posters and metadata; series detail is used to count episodes. / Poster dan metadata film atau serial; detail serial dipakai untuk menghitung episode. |
| Open Library APIs | `GET https://openlibrary.org/search.json?q={query}&limit=5`<br>`GET https://covers.openlibrary.org/b/id/{coverId}-L.jpg` | Book metadata and cover images for Novel and Wattpad categories. / Metadata buku dan gambar cover untuk kategori Novel dan Wattpad. |
| Gutendex API | `GET https://gutendex.com/books/?search={query}` | Project Gutenberg book metadata and cover candidates. / Metadata buku Project Gutenberg dan kandidat cover. |
| Wikipedia APIs (EN and ID) | `GET https://{en,id}.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&srlimit=3&format=json&origin=*`<br>`GET https://{en,id}.wikipedia.org/api/rest_v1/page/summary/{title}` | Search pages, then read summaries and thumbnails for cover candidates. / Mencari halaman, lalu membaca ringkasan dan thumbnail untuk kandidat cover. |

The backend also downloads the selected candidate image or a user-supplied image URL and stores files up to 10 MB in `backend/data/blobs/`; this is a direct image fetch, not another fixed API.<br>
Backend juga mengunduh gambar kandidat terpilih atau URL gambar dari pengguna dan menyimpan file hingga 10 MB di `backend/data/blobs/`; ini adalah pengambilan gambar langsung, bukan API tetap lainnya.

## Honest Limitations / Batasan Jujur

- **No accounts or cloud sync:** Data is for one local installation and is not synchronized between devices. / **Tidak ada akun atau sinkronisasi cloud:** Data hanya untuk satu instalasi lokal dan tidak disinkronkan antarperangkat.
- **No streaming or reading content:** Nontonin tracks metadata and links; it does not host films, episodes, novels, or Wattpad chapters. / **Tidak menyediakan konten tontonan atau bacaan:** Nontonin hanya melacak metadata dan tautan; aplikasi tidak meng-host film, episode, novel, atau bab Wattpad.
- **No background push service:** Release checks run while the page is open; browser notifications require a secure context and permission. / **Tidak ada layanan push latar belakang:** Pemeriksaan rilis berjalan selama halaman terbuka; notifikasi browser memerlukan secure context dan izin.
- **Limited release coverage:** The calendar checks only Anime and Drama, and it cannot show a date that Shikimori or TVMaze has not published. / **Cakupan rilis terbatas:** Kalender hanya memeriksa Anime dan Drama serta tidak dapat menampilkan tanggal yang belum diterbitkan Shikimori atau TVMaze.
- **External data can be incomplete:** Provider outages, rate limits, ambiguous titles, and different episode counts can produce missing or imperfect matches. / **Data eksternal dapat tidak lengkap:** Gangguan provider, rate limit, judul ambigu, dan perbedaan jumlah episode dapat menghasilkan data yang hilang atau kecocokan yang kurang tepat.
- **No official Wattpad search:** Wattpad entries use book, Wikipedia, and adaptation sources; book APIs do not provide chapter totals. / **Tidak ada pencarian resmi Wattpad:** Entri Wattpad memakai sumber buku, Wikipedia, dan adaptasi; API buku tidak menyediakan jumlah bab.

Back up `backend/data/data.json` and `backend/data/blobs/` yourself when needed. Never commit `.env`, `backend/data/data.json`, or personal cover files.<br>
Cadangkan sendiri `backend/data/data.json` dan `backend/data/blobs/` bila diperlukan. Jangan commit `.env`, `backend/data/data.json`, atau file cover pribadi.

## Contributing / Kontribusi

1. Fork this repository. / Fork repository ini.
2. Create a feature branch: `git switch -c feat/nama-fitur`. / Buat branch fitur: `git switch -c feat/nama-fitur`.
3. Keep one feature in one pull request, run `npm test`, then push the branch. / Batasi satu fitur untuk satu pull request, jalankan `npm test`, lalu push branch.
4. Open a pull request from your feature branch to `main`. / Buka pull request dari branch fitur ke `main`.

Do not include `.env`, `backend/data/data.json`, or `backend/data/blobs/` in a pull request.<br>
Jangan sertakan `.env`, `backend/data/data.json`, atau `backend/data/blobs/` dalam pull request.

## License / Lisensi

Nontonin is licensed under the [MIT License](./LICENSE).<br>
Nontonin menggunakan [Lisensi MIT](./LICENSE).
