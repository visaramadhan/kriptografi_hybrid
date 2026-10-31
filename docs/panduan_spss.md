# Panduan Impor &amp; Analisis Data Simulasi di SPSS

Dokumen ini menjelaskan cara memindahkan hasil simulasi keamanan data akademik dari aplikasi
ke IBM SPSS Statistics, mulai dari mengunduh berkas hingga menjalankan analisis statistik.

Seluruh data yang dihasilkan adalah **data dummy** yang dibuat secara lokal di peramban.
Tidak ada data mahasiswa nyata dan tidak ada data yang dikirim ke server.

## Berkas yang dihasilkan

| Berkas | Isi |
| --- | --- |
| `dataset_simulasi.csv` | Data percobaan dalam format panjang (satu baris = satu ulangan). 29 kolom, semua kategori dikodekan angka. |
| `codebook.csv` | Kamus variabel: nama, label, tipe, skala ukur, dan value labels. |
| `impor_spss.sps` | Syntax siap jalan untuk memuat CSV beserta labelnya. |
| `metadata.json` | Parameter percobaan: seed, ulangan (n), warm-up, jumlah record, jumlah sel valid, bobot kriteria, dan lingkungan. |

## Sepuluh langkah impor

1. **Unduh berkas hasil.** Jalankan eksperimen pada tab Parameter, lalu pada tab Ekspor unduh
   `dataset_simulasi.csv`, `codebook.csv`, `impor_spss.sps`, dan `metadata.json`.
2. **Simpan di satu folder.** Letakkan keempat berkas pada folder kerja yang sama agar syntax
   impor dapat menemukan `dataset_simulasi.csv`.
3. **Buka IBM SPSS Statistics.** Jalankan SPSS dengan tampilan Data View dan Syntax aktif.
4. **Jalankan syntax impor.** Menu **File > Open > Syntax**, pilih `impor_spss.sps`, lalu tekan
   **Run**. Syntax memuat berkas CSV melalui `GET DATA`.
5. **Periksa pemisah dan header.** Pastikan `DELIMITERS=","` dan `FIRSTCASE=2` sehingga baris
   pertama menjadi nama variabel, bukan data.
6. **Cek label variabel.** Buka Variable View. Blok `VARIABLE LABELS` memberi nama deskriptif,
   dan blok `VALUE LABELS` memberi makna pada kode angka.
7. **Tetapkan level pengukuran.** Blok `VARIABLE LEVEL` menandai variabel kategori sebagai
   `NOMINAL` dan variabel metrik sebagai `SCALE`.
8. **Simpan sebagai `.sav`.** Menu **File > Save As** untuk menyimpan berkas SPSS native agar
   seluruh label ikut tersimpan.
9. **Verifikasi isi data.** Jalankan `FREQUENCIES` untuk variabel kategori dan `DESCRIPTIVES`
   untuk variabel skala guna memastikan seluruh data terbaca lengkap.
10. **Lanjutkan analisis.** Uji perbedaan `skor_total` antar algoritma (One-Way ANOVA atau
    Kruskal-Wallis), hitung korelasi waktu enkripsi dengan ukuran data, serta bandingkan blast
    radius antar mode kunci. Saat melaporkan hasil, sertakan `seed`, `n`, dan `implementasi_native`.

## Syntax impor

```spss
* Impor dataset simulasi kriptografi akademik.
* Sesuaikan path /FILE di bawah dengan lokasi dataset_simulasi.csv.

GET DATA
  /TYPE=TXT
  /FILE='dataset_simulasi.csv'
  /ENCODING='UTF8'
  /DELIMITERS=","
  /QUALIFIER='"'
  /ARRANGEMENT=DELIMITED
  /FIRSTCASE=2
  /VARIABLES=
    run_id A40
    ulangan F12.0
    algoritma F12.0
    tipe_data F12.0
    mode_kunci F12.0
    ukuran_data_byte F12.0
    waktu_enkripsi_ms F12.6
    waktu_dekripsi_ms F12.6
    ukuran_cipher_byte F12.0
    overhead_persen F12.6
    entropi_cipher F12.6
    ruang_kunci_bit F12.6
    waktu_bruteforce_detik F40.6
    pola_bocor F12.0
    deteksi_manipulasi F12.0
    serangan_salin_berhasil F12.0
    forward_secrecy F12.0
    blast_radius_persen F12.6
    biaya_rotasi_ms F12.6
    panggilan_kms F12.0
    cakupan_persen F12.6
    implementasi_native F12.0
    skor_kerahasiaan F12.6
    skor_integritas F12.6
    skor_dampak_bocor F12.6
    skor_performa F12.6
    skor_kompleksitas F12.6
    skor_total F12.6
    layak F12.0
  /MAP.
```

Blok `VARIABLE LABELS`, `VALUE LABELS`, dan `VARIABLE LEVEL` dibangkitkan otomatis oleh
aplikasi pada tab Ekspor dan sudah tercantum lengkap di dalam `impor_spss.sps`.

## Contoh syntax analisis

```spss
* Statistik deskriptif.
FREQUENCIES VARIABLES=algoritma tipe_data mode_kunci layak.
DESCRIPTIVES VARIABLES=waktu_enkripsi_ms overhead_persen entropi_cipher skor_total.

* Uji beda skor antar algoritma.
ONEWAY skor_total BY algoritma
  /STATISTICS DESCRIPTIVES
  /POSTHOC=TUKEY ALPHA(0.05).

* Korelasi ukuran data dengan waktu dan overhead.
CORRELATIONS
  /VARIABLES=ukuran_data_byte waktu_enkripsi_ms overhead_persen
  /PRINT=TWOTAIL NOSIG.
```

## Catatan penafsiran

- **Keadilan waktu.** Cipher klasik berjalan sebagai JavaScript murni, sedangkan algoritma
  *secure* memakai Web Crypto. Kolom `implementasi_native` (0 = JS murni, 1 = native) wajib
  disertakan agar perbandingan waktu tidak menyesatkan.
- **Kode angka.** Semua variabel kategori dikodekan angka. Gunakan `codebook.csv` atau
  value labels di dalam syntax untuk menafsirkan nilainya.
- **Data hilang.** Sel yang tidak valid tidak dijalankan, sehingga tidak muncul sebagai baris;
  nilai yang tidak berlaku dibiarkan kosong pada CSV.
- **Reproduksibilitas.** Dengan `seed` dan `n` yang sama, metrik non-waktu akan identik.
