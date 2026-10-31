# Panduan Menjalankan Eksperimen &amp; Membaca Data

Dokumen ini menjelaskan cara menjalankan eksperimen keamanan data akademik pada halaman
**Simulasi Akademik** (`/simulation`), cara membaca keluaran yang dihasilkan, serta menyertakan
tabel hasil eksperimen enkripsi untuk setiap tipe data.

Seluruh proses berjalan **lokal di peramban**. Data yang dipakai adalah **data fiktif**; tidak ada
data mahasiswa nyata dan tidak ada data yang dikirim ke server.

## 1. Cara menjalankan eksperimen

1. **Buka halaman Simulasi Akademik.** Dari navbar pilih **Simulasi Akademik**, atau buka rute
   `/simulation`. Halaman terdiri atas lima tab: **Parameter, Hasil, Grafik, Ekspor, Panduan SPSS**.
2. **Periksa sumber data uji.** Di tab **Parameter**, panel **Sumber data uji** harus menampilkan
   badge **"Berkas Excel"** dan status seperti `600 record uji dari Data_Fiktif_Keamanan_Akademik.xlsx`.
   Tabel pratinjau di bawahnya memperlihatkan tiga record pertama untuk tipe data yang sedang dipilih.
   Jika berkas tidak ditemukan, badge berubah menjadi **"Sintetis"** dan eksperimen memakai generator
   data bawaan.
3. **Atur parameter.** Nilai bawaan yang dipakai untuk tabel di dokumen ini:

   | Parameter | Bawaan | Keterangan |
   | --- | --- | --- |
   | Tipe data | Identitas umum | 6 pilihan; lihat bagian 3. |
   | Algoritma | (bawaan katalog) | 6 pilihan; lihat kolom `algoritma`. |
   | Mode kunci | Statis | Statis / Dinamis per sesi / Dinamis per record. |
   | Jumlah record | 1000 | Dipakai untuk menghitung blast radius dan biaya rotasi. |
   | Jumlah sesi | 30 | Relevan untuk mode kunci dinamis. |
   | Kebijakan nonce | Unik per plaintext (aman) | Pilihan "Dipakai ulang (rentan)" untuk demonstrasi. |
   | Ulangan per sel (n) | 30 | Minimal 30 agar statistik deskriptif memadai. |
   | Warm-up (dibuang) | 5 | Menghangatkan mesin agar waktu lebih stabil. |

   Catatan: pilihan tipe data, algoritma, dan mode kunci pada **checklist kombinasi** (panel atas;
   lihat bagian 8) menentukan sel mana yang dijalankan. Bila seluruh pilihan dicentang, tombol
   **Jalankan eksperimen** menjalankan **seluruh kombinasi valid**: 6 algoritma &times; 6 tipe data
   &times; mode kunci yang diizinkan (78 sel) &times; n ulangan. Mengurangi centang akan mempersempit
   eksperimen, mis. hanya Secure Hybrid + Dinamis per sesi untuk seluruh tipe data.

4. **Jalankan.** Tekan **"Jalankan eksperimen"**. Bilah kemajuan menampilkan sel yang sedang
   diproses dan jumlah baris terkumpul. Hasil disimpan sebagai satu **run** di dalam **sesi aktif**
   (lihat bagian 8), lalu tab **Hasil** otomatis terbuka.
5. **Ulangi dengan kombinasi lain (opsional).** Ubah checklist, lalu jalankan lagi. Setiap eksekusi
   menjadi **run** baru di sesi yang sama; hasil beberapa kombinasi tertampung dalam satu sesi.
6. **Telusuri hasil.** Tab **Hasil**, **Grafik**, dan **Ekspor** hanya menampilkan **run tercentang
   pada sesi yang sedang dipilih** — pilih sesi dan centang run yang ingin dianalisis terlebih
   dahulu. Tab Hasil memuat tabel T1–T4, tab Grafik memuat tujuh visualisasi.
7. **Ekspor (opsional).** Unduh berkas dataset, codebook, syntax SPSS, dan metadata — nama berkasnya
   mengikuti nama sesi aktif (mis. `dataset_simulasi_sesi-1.csv`). Ikuti
   [panduan_spss.md](./panduan_spss.md) untuk analisis di SPSS.

Tanda kombinasi tidak valid muncul sebagai **&times;** pada "Matriks kombinasi algoritma &times;
mode kunci" (mis. cipher klasik tidak boleh `dinamis_per_record`, Secure ECDHE hanya
`dinamis_per_sesi`). Sel bertanda &times; tidak dijalankan.

## 2. Struktur data hasil

Satu baris = **satu ulangan** dari **satu sel** (algoritma &times; tipe data &times; mode kunci).
Jumlah baris = jumlah sel valid &times; n. Sebagai contoh, dengan konfigurasi bagian 1 dihasilkan
**78 sel** dan **2.340 baris** (78 &times; 30).

Dataset CSV memuat **29 kolom**. Kategori dikodekan angka agar siap diimpor ke SPSS:

| Kolom kategori | Kode |
| --- | --- |
| `algoritma` | 1 Caesar, 2 Double Caesar, 3 Affine, 4 Hybrid, 5 Secure Hybrid, 6 Secure ECDHE |
| `tipe_data` | 1 umum, 2 sensitif, 3 keuangan, 4 nilai, 5 ijazah, 6 kredensial |
| `mode_kunci` | 1 statis, 2 dinamis per sesi, 3 dinamis per record |
| Kolom biner | 0 = Tidak, 1 = Ya |

## 3. Cara membaca setiap metrik

| Kolom | Arti | Satuan | Dibaca bagaimana |
| --- | --- | --- | --- |
| `ukuran_data_byte` | Ukuran plaintext (satu record data uji). | byte | Basis perbandingan ukuran. |
| `waktu_enkripsi_ms` | Durasi enkripsi satu record. | milidetik | Makin kecil makin cepat. Bandingkan hanya antar baris dengan `implementasi_native` sama. |
| `waktu_dekripsi_ms` | Durasi dekripsi satu record. | milidetik | Idem. |
| `ukuran_cipher_byte` | Ukuran ciphertext. | byte | Untuk cipher klasik bisa **lebih kecil** dari plaintext karena simbol non-alfabet (mis. `|`, `.`) dibuang — lihat bagian 5. |
| `overhead_persen` | Pertambahan ukuran ciphertext terhadap plaintext. | persen | Positif = ciphertext membesar; negatif = mengecil. |
| `entropi_cipher` | Entropi Shannon ciphertext. | bit/simbol | Makin tinggi makin tersebar (makin sulit ditebak). Batas atas = log2(ukuran alfabet). |
| `ruang_kunci_bit` | Ukuran ruang kunci efektif. | bit | Makin besar makin kuat menghadapi brute force. |
| `waktu_bruteforce_detik` | Estimasi waktu brute force (asumsi 10<sup>6</sup> tebakan/detik). | detik | Makin besar makin aman. |
| `pola_bocor` | 1 bila plaintext identik menghasilkan ciphertext identik. | 0/1 | 1 = bocor pola; 0 = aman. |
| `deteksi_manipulasi` | 1 bila perubahan 1 bit ciphertext terdeteksi. | 0/1 | 1 = memiliki integritas (AEAD). |
| `serangan_salin_berhasil` | 1 bila ciphertext dapat dipindah antar record. | 0/1 | 1 = rentan; 0 = terikat konteks (AAD). |
| `forward_secrecy` | 1 bila kunci yang bocor tidak membuka sesi lama. | 0/1 | 1 = punya forward secrecy. |
| `blast_radius_persen` | Persentase record yang terbuka bila **satu** kunci bocor. | persen | Makin kecil makin baik. Statis = 100%; per sesi = 100/sesi; per record = 100/record. |
| `biaya_rotasi_ms` | Perkiraan biaya enkripsi ulang saat rotasi kunci. | milidetik | Makin kecil makin murah dioperasikan. |
| `panggilan_kms` | Jumlah panggilan KMS per rotasi. | kali | Makin kecil makin sederhana. |
| `cakupan_persen` | Persentase titik jalur terlindungi (dari 5 titik: Browser, Jaringan, Backend, Database, Backup). | persen | Makin tinggi cakupannya makin luas. |
| `implementasi_native` | 1 bila memakai kripto native (Web Crypto), 0 bila JS murni. | 0/1 | **Wajib diperhatikan** saat membandingkan waktu (lihat bagian 6). |
| `skor_kerahasiaan` … `skor_kompleksitas` | Lima sub-skor 0–100. | skor | Rincian pembentuk `skor_total`. |
| `skor_total` | Skor kecocokan berbobot 0–100 (bobot per tipe data berbeda). | skor | Angka tunggal untuk perbandingan; tetap perhatikan `layak`. |
| `layak` | 1 bila lolos gerbang kelayakan. | 0/1 | 0 = tidak boleh dipakai, walau skornya tinggi (mis. kredensial harus di-*hash*, bukan dienkripsi). |

**Gerbang kelayakan (`layak`) menimpa skor.** Contoh: cipher klasik selalu `layak = 0`; data
kredensial selalu `layak = 0` karena harus memakai *hashing* (Argon2/bcrypt); ijazah/nilai dengan
integritas &lt; 50 juga tidak layak.

## 4. Tabel hasil eksperimen enkripsi per tipe data

Angka berikut dihasilkan dari **`Data_Fiktif_Keamanan_Akademik.xlsx`** (600 record, 100 record per
tipe data) dengan `seed = 2024`, `n = 30`, `warm-up = 5`, `jumlah record = 1000`, `sesi = 30`, dan
kebijakan nonce **unik**. Kolom ukuran, overhead, entropi, dan skor bersifat **deterministik**
untuk seed yang sama; kolom waktu bersifat **indikatif** dan dapat berbeda antar perangkat/run.

### Tabel A — Hasil per tipe data (rata-rata seluruh algoritma &amp; mode valid)

| Tipe data | Plain (B) | Cipher (B) | Overhead (%) | Enkripsi (ms) | Dekripsi (ms) | Entropi | Skor total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Identitas umum | 70,5 | 91,0 | 29,14 | 0,0536 | 0,0442 | 4,433 | 49,7 |
| Data pribadi sensitif | 230,4 | 276,6 | 20,03 | 0,0664 | 0,0755 | 4,671 | 47,7 |
| Data keuangan | 95,5 | 117,6 | 23,10 | 0,0460 | 0,0452 | 4,387 | 44,3 |
| Nilai dan transkrip | 95,9 | 118,4 | 23,44 | 0,0549 | 0,0489 | 4,450 | 43,1 |
| Ijazah / dokumen besar | 213,0 | 262,5 | 23,25 | 0,0615 | 0,0701 | 4,668 | 45,6 |
| Kredensial (password) | 142,9 | 178,7 | 25,07 | 0,0516 | 0,0537 | 4,791 | 52,0 |

Pembacaan: ukuran plaintext mengikuti isi record (ijazah dan data pribadi paling besar). Waktu
enkripsi naik seiring ukuran data. Skor total di kolom terakhir adalah campuran seluruh algoritma,
sehingga nilainya sedang (~43–52) — angka ini **bukan** rekomendasi, melainkan gambaran rata-rata.
Gunakan **Tabel D** untuk melihat hasil algoritma yang direkomendasikan.

### Tabel B — Waktu enkripsi rata-rata (ms) per algoritma &times; tipe data

| Algoritma | Identitas umum | Pribadi sensitif | Keuangan | Nilai | Ijazah | Kredensial |
| --- | --- | --- | --- | --- | --- | --- |
| Caesar | 0,0209 | 0,0500 | 0,0205 | 0,0174 | 0,0380 | 0,0247 |
| Double Caesar | 0,0148 | 0,0424 | 0,0310 | 0,0257 | 0,0466 | 0,0311 |
| Affine | 0,0165 | 0,0449 | 0,0197 | 0,0202 | 0,0404 | 0,0291 |
| Hybrid | 0,0140 | 0,0432 | 0,0185 | 0,0218 | 0,0535 | 0,0245 |
| **Secure Hybrid** | 0,1393 | 0,1213 | 0,0954 | 0,1105 | 0,0973 | 0,1103 |
| **Secure ECDHE** | 0,1324 | 0,0952 | 0,1142 | 0,1902 | 0,0975 | 0,0969 |

Pembacaan: cipher klasik (baris 1–4) tampak **jauh lebih cepat** karena ditulis di JS murni dan
tanpa AEAD, sedangkan Secure Hybrid/ECDHE memakai AES-GCM dan ECDH native yang menjalankan
verifikasi tag. Perbedaan ini mencerminkan **implementasi**, bukan semata kualitas algoritma —
selalu cek kolom `implementasi_native`.

### Tabel C — Ringkasan per algoritma (rata-rata seluruh tipe data)

| Algoritma | Plain (B) | Cipher (B) | Overhead (%) | Entropi | Skor total | Rasio `layak` |
| --- | --- | --- | --- | --- | --- | --- |
| Caesar | 141,4 | 118,6 | −16,30 | 4,453 | 34,6 | 0,00 |
| Double Caesar | 141,4 | 118,6 | −16,30 | 4,453 | 34,9 | 0,00 |
| Affine | 141,4 | 118,6 | −16,30 | 4,453 | 34,8 | 0,00 |
| Hybrid | 141,4 | 236,2 | 66,55 | 3,238 | 31,5 | 0,00 |
| **Secure Hybrid** | 141,4 | 210,9 | 52,56 | 5,732 | 75,3 | 0,83 |
| **Secure ECDHE** | 141,4 | 210,9 | 52,56 | 5,736 | 82,8 | 0,83 |

Pembacaan: overhead cipher klasik **negatif** karena simbol di luar alfabet A–Z/0–9 dibuang sebelum
enkripsi, sehingga ciphertext lebih pendek daripada plaintext aslinya. Rasio `layak` = proporsi baris
yang lolos gerbang kelayakan (cipher klasik = 0; Secure Hybrid/ECDHE = 0,83, yakni 5 dari 6 tipe data,
karena kredensial selalu tidak layak untuk dienkripsi).

### Tabel D — Secure Hybrid + mode "Dinamis per sesi" per tipe data (konfigurasi direkomendasikan)

| Tipe data | Plain (B) | Cipher (B) | Overhead (%) | Enkripsi (ms) | Dekripsi (ms) | Entropi | Skor total | Layak |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Identitas umum | 70,5 | 116,7 | 65,72 | 0,2531 | 0,1308 | 5,555 | 75,1 | Ya |
| Data pribadi sensitif | 230,4 | 330,0 | 43,24 | 0,0906 | 0,0777 | 5,859 | 87,4 | Ya |
| Data keuangan | 95,5 | 149,7 | 56,98 | 0,1018 | 0,1023 | 5,670 | 88,0 | Ya |
| Nilai dan transkrip | 95,9 | 150,7 | 57,13 | 0,1010 | 0,0889 | 5,664 | 89,0 | Ya |
| Ijazah / dokumen besar | 213,0 | 306,5 | 43,92 | 0,1000 | 0,0840 | 5,856 | 89,8 | Ya |
| Kredensial (password) | 142,9 | 212,0 | 48,36 | 0,1086 | 0,1043 | 5,763 | 82,2 | **Tidak** |

Pembacaan: dengan AES-GCM, ciphertext selalu lebih besar dari plaintext (+43% s.d. +66%) karena
menambahkan tag autentikasi dan nonce. Entropi tinggi (±5,6–5,9 bit/simbol) menandakan ciphertext
tersebar merata. Skor tinggi (±75–90) menunjukkan keamanan dan kelayakan untuk data produksi —
**kecuali kredensial**, yang meski skornya 82,2 tetap **tidak layak** karena harus memakai *hashing*,
bukan enkripsi.

## 5. Membaca tab Hasil (tabel ringkas)

- **T1 — Ringkasan per algoritma:** n, rata-rata &amp; median waktu enkripsi/dekripsi, dan skor
  rata-rata per algoritma. Cocok untuk membandingkan performa antar algoritma secara sekilas.
- **T2 — Matriks keamanan:** satu baris per (algoritma, mode kunci) dengan ruang kunci, cakupan
  jalur, deteksi manipulasi, forward secrecy, blast radius, skor, dan kelayakan. Tanda
  **Ya / Tidak / Sebagian** menunjukkan sifat keamanan.
- **T3 — Rekomendasi per tipe data:** algoritma + mode kunci terbaik untuk setiap tipe data
  berdasarkan skor. Kredensial ditandai **"Di luar perankingan"** (harus di-*hash*).
- **T4 — Data mentah:** tabel berpaginasi (10/25/50/100 baris per halaman) berisi 14 kolom utama,
  sebagai padanan teks dari grafik.

## 6. Membaca tab Grafik (tujuh visualisasi)

1. **Bar waktu enkripsi** — perbandingan rata-rata waktu enkripsi antar algoritma.
2. **Overhead ukuran** — persentase pertambahan ukuran ciphertext per algoritma.
3. **Blast radius statis vs dinamis** — pengaruh mode kunci terhadap jumlah record terbuka.
4. **Forward secrecy** — keamanan sesi lama ketika kunci bocor pada hari ke-N.
5. **Heatmap skor** — skor per algoritma &times; tipe data (statis vs dinamis).
6. **Ukuran vs waktu** — hubungan ukuran data dengan waktu enkripsi.
7. **Radar lima kriteria** — kerahasiaan, integritas, dampak bocor, performa, kompleksitas.

Setiap grafik memiliki padanan tabel teks (untuk pembaca layar) dengan keterangan `sr-only`.

## 7. Catatan penting

- **Privasi.** Kunci dan data simulasi tidak pernah dikirim ke server maupun ditulis ke log. Kunci
  hanya ditampilkan dalam bentuk hex terpotong bila perlu.
- **Determinisme.** Dengan `seed` yang sama, ukuran, overhead, entropi, skor, dan pemilihan record
  data uji selalu sama. Waktu eksekusi dapat berfluktuasi karena bergantung pada beban perangkat.
- **Keadilan waktu.** Cipher klasik berjalan di JS murni, sedangkan AES-GCM/ECDH memakai Web Crypto
  native. Karena itu selalu bandingkan waktu **hanya** antar baris dengan `implementasi_native` sama.
- **Bukan untuk produksi.** Hasil ini adalah alat edukasi/demo. Untuk produksi, gunakan AES-GCM
  (atau setara) untuk data, *hashing* (Argon2/bcrypt) untuk kredensial, dan tanda tangan digital
  untuk keaslian ijazah.

## 8. Sesi eksperimen &amp; checklist kombinasi

Satu **sesi** dapat menampung **banyak run**. Tiap run adalah satu eksekusi dengan kombinasi
parameter tertentu. Dengan begitu, beberapa kombinasi dapat dibandingkan dalam satu wadah tanpa
kehilangan hasil sebelumnya.

### 8.1 Checklist kombinasi (sebelum run)

Di bagian atas tab **Parameter** terdapat **Checklist kombinasi** dengan tiga kelompok:

- **Algoritma** — Caesar, Double Caesar, Affine, Hybrid, Secure Hybrid, Secure ECDHE.
- **Mode kunci** — Statis, Dinamis per sesi, Dinamis per record.
- **Tipe data** — 6 tipe (Identitas umum, Pribadi sensitif, Keuangan, Nilai, Ijazah, Kredensial).

Tersedia tombol **Pilih semua** dan **Kosongkan**, serta badge **"N sel valid"** yang menghitung
jumlah kombinasi sah dari centang saat ini (kombinasi tidak sah, mis. Caesar &times; Dinamis per
record, otomatis tidak dihitung). Tombol **Jalankan eksperimen** nonaktif bila tidak ada sel valid.

### 8.2 Panel sesi (kelola wadah &amp; pilih hasil)

Di bawah checklist terdapat **Panel sesi**:

1. **Sesi aktif** — dropdown untuk memilih sesi; angkanya menunjukkan jumlah run di dalam sesi.
2. **Nama sesi** — ubah nama sesi aktif (dipakai untuk nama berkas ekspor).
3. **Sesi baru / Unduh .json / Impor .json / Hapus sesi** — impor menambahkan sesi dari berkas
   `.json` yang pernah diunduh; hapus selalu menyisakan minimal satu sesi.
4. **Daftar run** — tabel berisi kolom **Ikut** (centang), **Label run**, **Kombinasi**, **Baris**,
   **Waktu**, dan **Aksi (Hapus)**. Ada tombol **Centang semua**, **Lepas semua**, dan **Hapus
   semua run**.

**Hasil hanya ditampilkan untuk run yang tercentang pada sesi aktif.** Untuk menggabungkan beberapa
kombinasi, centang run yang diinginkan — barisnya otomatis digabung (kolom `run_id` diberi prefiks
`r1_`, `r2_`, … agar tetap unik) dan langsung tercermin di tab **Hasil**, **Grafik**, dan **Ekspor**.

### 8.3 Penyimpanan

Sesi disimpan otomatis di **localStorage** peramban, sehingga tetap ada setelah halaman dimuat
ulang. Karena satu sesi bisa menampung ribuan baris, ukurannya terbatas; bila kuota penuh, muncul
peringatan agar Anda mengunduh berkas **`.json`** sesi sebagai cadangan. Mengunduh sesi lalu
mengimpornya di perangkat lain memindahkan seluruh run tanpa menyentuh server — konsisten dengan
prinsip privasi (tidak ada data yang dikirim ke server).

### 8.4 Contoh alur singkat

| Langkah | Aksi | Hasil |
| --- | --- | --- |
| 1 | Buat sesi "Efek Nonce", centang hanya Secure ECDHE + Dinamis per sesi + semua tipe data, jalankan. | Run 1 tersimpan. |
| 2 | Ubah kebijakan nonce ke "Dipakai ulang (rentan)", jalankan lagi. | Run 2 tersimpan di sesi yang sama. |
| 3 | Di daftar run, centang Run 1 dan Run 2. | Tab Hasil/Grafik/Ekspor menampilkan gabungan kedua run. |
| 4 | Lepas centang Run 2. | Analisis kembali hanya memakai Run 1. |
| 5 | Unduh `.json` sesi. | Cadangan berisi kedua run untuk diimpor di lain waktu. |
