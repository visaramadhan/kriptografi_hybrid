"use client"

import { useMemo, useState } from "react"
import { buildSpssSyntax, downloadText } from "@/lib/sim/export.js"

const STEPS = [
  {
    title: "Unduh berkas hasil",
    body: "Jalankan eksperimen pada tab Parameter, lalu pada tab Ekspor unduh dataset_simulasi.csv, codebook.csv, impor_spss.sps, dan metadata.json.",
  },
  {
    title: "Simpan di satu folder",
    body: "Letakkan keempat berkas pada folder kerja yang sama agar syntax impor dapat menemukan dataset_simulasi.csv.",
  },
  {
    title: "Buka IBM SPSS Statistics",
    body: "Jalankan SPSS dengan tampilan Data View dan Syntax aktif melalui menu File dan Window.",
  },
  {
    title: "Jalankan syntax impor",
    body: "Menu File > Open > Syntax, pilih impor_spss.sps, lalu tekan Run. Syntax memuat berkas CSV melalui GET DATA.",
  },
  {
    title: "Periksa pemisah dan header",
    body: "Pastikan DELIMITERS=',' dan FIRSTCASE=2 sehingga baris pertama menjadi nama variabel, bukan data.",
  },
  {
    title: "Cek label variabel",
    body: "Buka Variable View. Blok VARIABLE LABELS dan VALUE LABELS memberi nama deskriptif dan makna kode angka.",
  },
  {
    title: "Tetapkan level pengukuran",
    body: "Blok VARIABLE LEVEL menandai variabel kategori sebagai Nominal dan metrik sebagai Scale.",
  },
  {
    title: "Simpan sebagai .sav",
    body: "Menu File > Save As untuk menyimpan berkas SPSS native sehingga pengaturan label tersimpan permanen.",
  },
  {
    title: "Verifikasi isi data",
    body: "Jalankan FREQUENCIES untuk variabel kategori dan DESCRIPTIVES untuk variabel skala guna memastikan data terbaca lengkap.",
  },
  {
    title: "Lanjutkan analisis",
    body: "Uji perbedaan skor_total antar algoritma (One-Way ANOVA atau Kruskal-Wallis), korelasi waktu enkripsi dengan ukuran data, dan sertakan seed, n, serta implementasi_native saat melaporkan hasil.",
  },
]

const EXTRA_SYNTAX = [
  "* Contoh analisis setelah impor.",
  "FREQUENCIES VARIABLES=algoritma tipe_data mode_kunci layak.",
  "DESCRIPTIVES VARIABLES=waktu_enkripsi_ms overhead_persen entropi_cipher skor_total.",
  "ONEWAY skor_total BY algoritma",
  "  /STATISTICS DESCRIPTIVES",
  "  /POSTHOC=TUKEY ALPHA(0.05).",
  "CORRELATIONS",
  "  /VARIABLES=ukuran_data_byte waktu_enkripsi_ms overhead_persen",
  "  /PRINT=TWOTAIL NOSIG.",
].join("\n")

export default function SpssGuideTab() {
  const [copied, setCopied] = useState("")
  const syntax = useMemo(() => buildSpssSyntax(), [])

  const copy = async (key, content) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(key)
      window.setTimeout(() => setCopied(""), 1500)
    } catch {
      setCopied("gagal")
      window.setTimeout(() => setCopied(""), 1500)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Panduan impor &amp; analisis di SPSS</h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Salinan ringkas dari berkas docs/panduan_spss.md. Ikuti sepuluh langkah berikut setelah mengunduh berkas ekspor.
        </p>

        <ol className="mt-4 space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">
                {index + 1}
              </span>
              <div>
                <p className="text-xs font-medium text-slate-800">{step.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Syntax impor (GET DATA)</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copy("import", syntax)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-600 transition hover:border-slate-400"
            >
              {copied === "import" ? "Tersalin" : "Salin"}
            </button>
            <button
              type="button"
              onClick={() => downloadText("impor_spss.sps", syntax, "text/plain;charset=utf-8")}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700 transition hover:border-emerald-300"
            >
              Unduh .sps
            </button>
          </div>
        </div>
        <pre className="mt-2 overflow-auto whitespace-pre rounded-xl bg-slate-50 p-3 font-mono text-[10px] leading-relaxed text-slate-600">
          {syntax}
        </pre>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Contoh syntax analisis</h3>
          <button
            type="button"
            onClick={() => copy("analysis", EXTRA_SYNTAX)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-600 transition hover:border-slate-400"
          >
            {copied === "analysis" ? "Tersalin" : "Salin"}
          </button>
        </div>
        <pre className="mt-2 overflow-auto whitespace-pre rounded-xl bg-slate-50 p-3 font-mono text-[10px] leading-relaxed text-slate-600">
          {EXTRA_SYNTAX}
        </pre>
      </section>
    </div>
  )
}
