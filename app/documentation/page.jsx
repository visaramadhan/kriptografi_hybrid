"use client"

export default function DocumentationPage() {
  return (
    <div className="w-full space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Dokumentasi Sistem Kriptografi Hybrid
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Ringkasan teori, alur sistem, dan cara penggunaan aplikasi.
        </p>
      </header>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-slate-900">1. Konsep Umum</h2>
          <p>
            Sistem ini mengimplementasikan algoritma kriptografi klasik berbasis operasi
            modulo 26 pada alfabet A–Z. Setiap huruf diubah menjadi angka 0–25, dilakukan
            operasi matematika, lalu dikonversi kembali ke huruf.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li>Plaintext dibersihkan menjadi huruf kapital A–Z.</li>
            <li>Operasi utama: penjumlahan, perkalian, dan invers modulo 26.</li>
            <li>
              Ciphertext yang dihasilkan merupakan karakter A–Z tanpa spasi dan simbol lain.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            2. Algoritma Caesar Cipher
          </h2>
          <p>
            Caesar Cipher menggeser setiap huruf sejauh <code>k</code> posisi pada alfabet:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li>
              Enkripsi: <span className="font-mono">C = (P + k) mod 26</span>
            </li>
            <li>
              Dekripsi: <span className="font-mono">P = (C - k) mod 26</span>
            </li>
            <li>
              Parameter: <span className="font-mono">k</span> (kunci geser).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            3. Algoritma Affine Cipher
          </h2>
          <p>Affine Cipher menggunakan transformasi linear pada ruang modulo 26:</p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li>
              Enkripsi: <span className="font-mono">C = (aP + b) mod 26</span>
            </li>
            <li>
              Dekripsi:{" "}
              <span className="font-mono">P = a⁻¹ (C - b) mod 26</span>, dengan{" "}
              <span className="font-mono">a⁻¹</span> adalah invers dari{" "}
              <span className="font-mono">a</span> modulo 26.
            </li>
            <li>
              Syarat: <span className="font-mono">gcd(a, 26) = 1</span> agar invers modular
              ada.
            </li>
            <li>
              Parameter: <span className="font-mono">a</span> (pengali) dan{" "}
              <span className="font-mono">b</span> (pergeseran).
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            4. Algoritma Hybrid (Affine + Double Caesar)
          </h2>
          <p>
            Algoritma hybrid menggabungkan satu kali Affine dan dua kali Caesar secara
            berurutan:
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600">
            <li>Affine: menghasilkan ciphertext tahap 1 dengan kunci (a, b).</li>
            <li>Caesar 1: menggeser hasil Affine dengan kunci k1.</li>
            <li>Caesar 2: menggeser kembali dengan kunci k2.</li>
          </ol>
          <p className="text-xs text-slate-600">
            Dekripsi dilakukan dengan urutan terbalik: Caesar (k2), Caesar (k1), kemudian
            Affine inverse.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">5. Manajemen Kunci</h2>
          <p>
            Sistem menyediakan beberapa mode manajemen kunci yang dapat dipilih dari
            dashboard:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li>
              <span className="font-semibold">Manual</span>: pengguna mengisi sendiri nilai
              a, b, k1, k2.
            </li>
            <li>
              <span className="font-semibold">Random</span>: sistem menghasilkan kunci acak
              yang valid (nilai a dipilih dari himpunan yang coprime dengan 26).
            </li>
            <li>
              <span className="font-semibold">Timestamp-based</span>: kunci diturunkan dari
              nilai waktu (Date.now), sehingga berubah setiap eksekusi.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            6. Arsitektur Sistem (Next.js App Router)
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-600">
            <li>
              <span className="font-semibold">Dashboard Enkripsi</span>{" "}
              (<span className="font-mono">/</span>): antarmuka utama untuk enkripsi dan
              dekripsi, pemilihan metode, dan pengukuran waktu.
            </li>
            <li>
              <span className="font-semibold">Halaman Analisis</span>{" "}
              (<span className="font-mono">/analysis</span>): menampilkan perbandingan
              waktu eksekusi dan frekuensi huruf.
            </li>
            <li>
              <span className="font-semibold">Halaman Logs</span>{" "}
              (<span className="font-mono">/logs</span>): menampilkan histori enkripsi dari
              MongoDB.
            </li>
            <li>
              <span className="font-semibold">Detail Log</span>{" "}
              (<span className="font-mono">/logs/[id]</span>): menunjukkan detail satu
              transaksi enkripsi, termasuk karakter ciphertext dan analisis frekuensinya.
            </li>
            <li>
              <span className="font-semibold">API Encrypt/Decrypt</span>{" "}
              (<span className="font-mono">/api/encrypt</span>,{" "}
              <span className="font-mono">/api/decrypt</span>): endpoint server untuk
              proses enkripsi dan dekripsi.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            7. Cara Penggunaan Aplikasi
          </h2>
          <ol className="list-decimal space-y-2 pl-5 text-xs text-slate-600">
            <li>
              Buka halaman <span className="font-mono">/</span> (Dashboard) untuk melakukan
              enkripsi dan dekripsi.
            </li>
            <li>
              Pilih <span className="font-semibold">Mode Enkripsi</span> (Caesar, Double
              Caesar, Affine, atau Hybrid).
            </li>
            <li>
              Pilih <span className="font-semibold">Manajemen Kunci</span>: Manual, Random,
              atau Timestamp-based. Jika perlu, tekan tombol{" "}
              <span className="font-semibold">Generate Key</span>.
            </li>
            <li>
              Isi kolom <span className="font-semibold">Input</span> dengan plaintext atau
              ciphertext (huruf A–Z). Karakter di luar A–Z akan diabaikan.
            </li>
            <li>
              Untuk enkripsi lokal, tekan{" "}
              <span className="font-semibold">Encrypt (Client)</span>. Untuk dekripsi,
              gunakan <span className="font-semibold">Decrypt (Client)</span>.
            </li>
            <li>
              Untuk menguji jalur server dan penyimpanan log, gunakan tombol{" "}
              <span className="font-semibold">Encrypt via API (Hybrid)</span>. Hasilnya
              akan tersimpan ke MongoDB.
            </li>
            <li>
              Buka halaman <span className="font-mono">/logs</span> untuk melihat histori
              enkripsi yang tersimpan, dan <span className="font-mono">/logs/[id]</span>{" "}
              untuk detail satu log.
            </li>
            <li>
              Buka halaman <span className="font-mono">/analysis</span> untuk melihat
              perbandingan waktu eksekusi dan frekuensi huruf dari berbagai algoritma.
            </li>
          </ol>
        </section>
      </div>
    </div>
  )
}
