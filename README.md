# PMR Adventure

## Struktur
- `index.html` — halaman utama dan elemen UI.
- `css/style.css` — seluruh tampilan.
- `js/game.js` — logika game, karakter, map, kontrol, dialog, dan perpindahan ruangan.
- `js/leaderboard.js` — pengelolaan dan tampilan leaderboard.
- `js/audio.js` — backsound, suara langkah kaki, dan efek suara (dibuat lewat Web Audio API, tanpa file audio).

## Keterhubungan file
`index.html` memuat `css/style.css` dan menjalankan `js/game.js` sebagai ES module.
`js/game.js` mengimpor `showLeaderboard()` dari `js/leaderboard.js`.

## Leaderboard (Firebase Firestore)
- `js/firebase-config.js` — isi dengan config Web App dari Firebase Console.
- `js/leaderboard.js` — `submitScore()`, `getTopScores()`, `showLeaderboard()`.
- `firestore.rules` — aturan keamanan; tempel di Firestore > Rules lalu Publish.
- Skor otomatis dikirim saat keenam rumah selesai dijawab. Satu dokumen per nama pemain, hanya skor tertinggi yang disimpan.
- Jika `firebase-config.js` belum diisi, game memakai `localStorage` (hanya lokal).

Jalankan melalui local server (misalnya Live Server), bukan membuka file HTML langsung, agar JavaScript module berjalan konsisten.


## Sistem kuis rumah
- Enam rumah berisi enam pertanyaan yang diacak setiap permainan dimulai.
- Tiga soal esai dan tiga pilihan ganda; jawaban benar bernilai 15 poin.
- Setiap rumah hanya dapat diselesaikan sekali. Rumah yang sudah dijawab tidak dapat dimasuki lagi.
- Mansion terkunci sampai keenam pertanyaan selesai dijawab.
- Skor maksimal adalah 90 poin.

## Tampilan & suara (v1.3)
- Tema pixel-art "papan kayu & kertas" dengan font Pixelify Sans + Nunito (Google Fonts; tetap aman jika offline karena ada font cadangan).
- Lobi: kamera menyusuri kampung, pilih karakter, riwayat permainan terakhir, tombol Leaderboard.
- HUD: skor, progres rumah (6 kotak), tombol suara, layar penuh, dan menu jeda (Esc di keyboard).
- Penanda di atas rumah: panah merah = belum dijawab, centang hijau = selesai; gembok/koin di mansion.
- Dialog kuis memakai potret warga, pilihan ganda berbentuk kartu, dan lencana poin saat jawaban dikirim.
- Backsound: lagu ceria di luar rumah, lagu tenang di dalam rumah/mansion (crossfade otomatis).
- Langkah kaki mengikuti permukaan: rumput, tanah (jalur), lantai kayu (rumah), ubin (mansion).
- Suara baru mulai setelah pemain menyentuh layar pertama kali (aturan browser). Pilihan mute tersimpan di `localStorage` (`pmrMuted`).
- Setelah keenam rumah selesai: tombol **Lihat hasil** (atau buka peti) menampilkan layar selesai dengan **Lihat leaderboard** dan **Kembali ke lobi**.
- Di tengah permainan, menu jeda punya tombol **Kembali ke lobi** (dengan konfirmasi karena progres akan hilang).
- Leaderboard menampilkan 10 teratas dan menyorot nama pemain.
