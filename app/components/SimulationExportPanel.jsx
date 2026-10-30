"use client"

import { useRef } from "react"

const academicCategories = [
  "Nilai Akademik",
  "Kehadiran Mahasiswa",
  "Transkrip & IPK",
  "Data Pribadi Mahasiswa",
  "Dokumen Ijazah",
  "Data Keuangan",
  "Kredensial / Login",
  "Data Umum Kampus",
]

function formatCsvValue(value) {
  const text = String(value ?? "")
  return `"${text.replace(/"/g, '""')}"`
}

export default function SimulationExportPanel({ rows = [], title = "Dataset", onImport, onFileImport }) {
  const fileInputRef = useRef(null)

  const exportCsv = () => {
    if (!rows.length) return
    const headers = [
      "category",
      "algorithm",
      "keyMode",
      "sensitivity",
      "score",
      "timeEncrypt",
      "timeDecrypt",
      "cipherSize",
      "blastRadius",
      "recordCount",
    ]
    const content = [
      headers.join(","),
      ...rows.map((row) =>
        headers.map((key) => formatCsvValue(row[key] ?? "")).join(","),
      ),
    ].join("\n")

    const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${(title || "dataset").replace(/\s+/g, "_")}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const exportJson = () => {
    if (!rows.length) return
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `${(title || "dataset").replace(/\s+/g, "_")}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleManualImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (onFileImport) {
      await onFileImport(file)
    } else {
      const text = await file.text()
      let parsed = []

      try {
        if (file.name.endsWith(".json")) {
          const json = JSON.parse(text)
          parsed = Array.isArray(json) ? json : Array.isArray(json.rows) ? json.rows : []
        } else if (file.name.endsWith(".csv")) {
          const lines = text.trim().split(/\r?\n/)
          if (!lines.length) return
          const headers = lines[0].split(",").map((item) => item.trim().replace(/^"|"$/g, ""))
          parsed = lines.slice(1).filter(Boolean).map((line) => {
            const values = line.split(",")
            const item = {}
            headers.forEach((header, index) => {
              item[header] = values[index]?.replace(/^"|"$/g, "") || ""
            })
            return item
          })
        } else {
          const XLSX = await import("xlsx")
          const workbook = XLSX.read(text, { type: "binary" })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          parsed = XLSX.utils.sheet_to_json(sheet, { defval: "" })
        }

        const mapped = parsed.map((item, index) => ({
          category: item.category || item.kategori || academicCategories[index % academicCategories.length],
          algorithm: item.algorithm || item.algoritma || "Hybrid",
          keyMode: item.keyMode || item.modeKunci || "Statis",
          sensitivity: item.sensitivity || item.sensitivitas || "Tinggi",
          score: Number(item.score ?? item.skor ?? 75),
          timeEncrypt: Number(item.timeEncrypt ?? item.time_enkripsi ?? item.encryptMs ?? 3),
          timeDecrypt: Number(item.timeDecrypt ?? item.time_dekripsi ?? item.decryptMs ?? 2),
          cipherSize: Number(item.cipherSize ?? item.ukuran_cipher ?? 320),
          blastRadius: Number(item.blastRadius ?? item.blast_radius ?? 25),
          recordCount: Number(item.recordCount ?? item.records ?? 1000),
        }))

        if (onImport) onImport(mapped, file.name)
      } catch (error) {
        console.error("Import gagal", error)
      }
    }

    event.target.value = ""
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Export & import data</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={exportCsv}
          disabled={!rows.length}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={exportJson}
          disabled={!rows.length}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-700 shadow-sm transition hover:border-emerald-300"
        >
          Import File
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json,.xlsx,.xls"
        className="hidden"
        onChange={handleManualImport}
      />

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[11px] text-slate-600">
        <div className="font-medium text-slate-800">Format yang didukung</div>
        <div className="mt-1">CSV, JSON, XLSX</div>
      </div>
    </div>
  )
}
