"use client"

import { useMemo, useState } from "react"
import {
  dataTypes,
  algorithmCatalog,
  keyModes,
  defaultSimulationRows,
} from "@/lib/simulation-config"

function formatNumber(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—"
  return Number(value).toFixed(digits)
}

function getAlgorithmTone(id) {
  if (id === "caesar") return "bg-slate-100 text-slate-700"
  if (id === "double-caesar") return "bg-blue-100 text-blue-700"
  if (id === "affine") return "bg-violet-100 text-violet-700"
  if (id === "hybrid") return "bg-indigo-100 text-indigo-700"
  if (id === "secure-hybrid") return "bg-emerald-100 text-emerald-700"
  return "bg-rose-100 text-rose-700"
}

export default function SimulationPage() {
  const [selectedDataType, setSelectedDataType] = useState(dataTypes[0].id)
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(algorithmCatalog[3].id)
  const [selectedKeyMode, setSelectedKeyMode] = useState(keyModes[0].id)
  const [recordCount, setRecordCount] = useState(1000)
  const [rotationInterval, setRotationInterval] = useState(30)
  const [noncePolicy, setNoncePolicy] = useState("AES-GCM nonce unique per plaintext")
  const [scenario, setScenario] = useState("blast-radius")

  const dataType = dataTypes.find((item) => item.id === selectedDataType) || dataTypes[0]
  const algorithm = algorithmCatalog.find((item) => item.id === selectedAlgorithm) || algorithmCatalog[3]
  const keyMode = keyModes.find((item) => item.id === selectedKeyMode) || keyModes[0]

  const filteredRows = useMemo(
    () =>
      defaultSimulationRows.filter(
        (row) =>
          row.tipe_data === dataType.label &&
          row.algoritma === algorithm.label &&
          row.mode_kunci === keyMode.label,
      ),
    [dataType.label, algorithm.label, keyMode.label],
  )

  const summary = useMemo(() => {
    const rows = filteredRows.length ? filteredRows : defaultSimulationRows
    const avgScore =
      rows.reduce((sum, row) => sum + row.skor_total, 0) / Math.max(rows.length, 1)
    const avgEncrypt =
      rows.reduce((sum, row) => sum + row.waktu_enkripsi_ms, 0) / Math.max(rows.length, 1)
    const avgCipher =
      rows.reduce((sum, row) => sum + row.ukuran_cipher_byte, 0) / Math.max(rows.length, 1)
    const avgBlast =
      rows.reduce((sum, row) => sum + row.blast_radius_persen, 0) / Math.max(rows.length, 1)

    return {
      avgScore,
      avgEncrypt,
      avgCipher,
      avgBlast,
    }
  }, [filteredRows])

  const scenarioText = {
    "blast-radius": "Bocorkan satu kunci data → blast radius pada record sensitif berkurang bila mode dinamis aktif.",
    "kek-breach": "Bocorkan KEK → semua DEK terbuka jika mode envelope statis dipakai; struktur dinamis mengurangi dampaknya.",
    "forward-secrecy": "Bocorkan kunci privat server di hari ke-N → sesi lama tetap aman bila ECDHE efemeral benar.",
    "nonce-reuse": "Ulang nonce AES-GCM → hubungan antar plaintext dapat terbaca dari pola autentikasi.",
    rotation: "Rotasi kunci → biaya rotasi dan re-enkripsi meningkat sesuai interval yang dipilih.",
    tamper: "Ubah 1 bit ciphertext → tag AES-GCM gagal dan deteksi manipulasi menjadi 1.",
  }[scenario]

  return (
    <div className="w-full space-y-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Simulasi Keamanan Data Akademik
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Kombinasi algoritma, tipe data, mode kunci, dan skenario pelanggaran untuk studi keamanan kampus.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Parameter simulasi</h2>
              <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
                seed: 2024
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Tipe data</label>
                <select
                  value={selectedDataType}
                  onChange={(e) => setSelectedDataType(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {dataTypes.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Algoritma</label>
                <select
                  value={selectedAlgorithm}
                  onChange={(e) => setSelectedAlgorithm(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {algorithmCatalog.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Mode kunci</label>
                <select
                  value={selectedKeyMode}
                  onChange={(e) => setSelectedKeyMode(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {keyModes.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Jumlah record</label>
                <input
                  type="number"
                  value={recordCount}
                  min={100}
                  max={5000}
                  onChange={(e) => setRecordCount(Number(e.target.value) || 1000)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Interval rotasi</label>
                <input
                  type="number"
                  value={rotationInterval}
                  min={1}
                  max={365}
                  onChange={(e) => setRotationInterval(Number(e.target.value) || 30)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Kebijakan nonce</label>
                <select
                  value={noncePolicy}
                  onChange={(e) => setNoncePolicy(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="AES-GCM nonce unique per plaintext">Unique per plaintext</option>
                  <option value="nonce reused for same record">Reuse per record</option>
                  <option value="nonce derived from counter">Counter-derived</option>
                </select>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p className="font-medium text-slate-800">Metadata tipe data</p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <div>
                  <span className="text-slate-500">Kelas sensitivitas:</span> {dataType.sensitivity}
                </div>
                <div>
                  <span className="text-slate-500">Prioritas:</span> {dataType.protectionPriority}
                </div>
                <div>
                  <span className="text-slate-500">Ukuran sampel:</span> {dataType.sizeLabel}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-600">{dataType.warning}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">Skenario keamanan</h2>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">dummy only</span>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {[
                ["blast-radius", "Bocorkan satu kunci data"],
                ["kek-breach", "Bocorkan KEK"],
                ["forward-secrecy", "Bocorkan kunci privat server"],
                ["nonce-reuse", "Ulang nonce"],
                ["rotation", "Rotasi kunci"],
                ["tamper", "Ubah 1 bit ciphertext"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScenario(value)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                    scenario === value
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
              {scenarioText}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Ringkasan hasil</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Skor total</div>
                <div className="mt-2 font-mono text-lg text-slate-900">
                  {formatNumber(summary.avgScore, 1)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Waktu enkripsi</div>
                <div className="mt-2 font-mono text-lg text-slate-900">
                  {formatNumber(summary.avgEncrypt, 2)} ms
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Ukuran ciphertext</div>
                <div className="mt-2 font-mono text-lg text-slate-900">
                  {formatNumber(summary.avgCipher, 0)} B
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Blast radius</div>
                <div className="mt-2 font-mono text-lg text-slate-900">
                  {formatNumber(summary.avgBlast, 0)}%
                </div>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Profil konfigurasi</h2>
            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Algoritma</span>
                <span className={`rounded-full px-2 py-1 ${getAlgorithmTone(algorithm.id)}`}>
                  {algorithm.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Mode kunci</span>
                <span className="font-medium text-slate-700">{keyMode.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Coverage</span>
                <span className="font-mono text-slate-700">{algorithm.coverage * 100}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Ruang kunci</span>
                <span className="font-mono text-slate-700">{algorithm.keySpaceBits} bit</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Forward secrecy</span>
                <span className="font-bold text-slate-800">
                  {algorithm.id === "secure-ecdh" || (algorithm.id === "secure-hybrid" && keyMode.id === "dinamis_per_sesi") ? "Ya" : "Tidak"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Skor kecocokan</h2>
            <div className="mt-4 space-y-3 text-xs">
              {[
                { label: "Kerahasiaan", value: filteredRows[0]?.skor_kerahasiaan ?? 78 },
                { label: "Integritas", value: filteredRows[0]?.skor_integritas ?? 82 },
                { label: "Dampak bocor", value: filteredRows[0]?.skor_dampak_bocor ?? 70 },
                { label: "Performa", value: filteredRows[0]?.skor_performa ?? 68 },
                { label: "Kompleksitas", value: filteredRows[0]?.skor_kompleksitas ?? 73 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-slate-600">
                    <span>{item.label}</span>
                    <span className="font-mono text-slate-800">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min(item.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Performa algoritma</h2>
          <div className="mt-4 space-y-3">
            {algorithmCatalog.map((item) => {
              const relatedRows = defaultSimulationRows.filter((row) => row.algoritma === item.label)
              const avgValue =
                relatedRows.reduce((sum, row) => sum + row.waktu_enkripsi_ms, 0) /
                Math.max(relatedRows.length, 1)

              return (
                <div key={item.id}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span>{item.label}</span>
                    <span className="font-mono">{formatNumber(avgValue, 2)} ms</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.min((avgValue / 10) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Tabel ringkasan</h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Algoritma</th>
                  <th className="px-3 py-2 font-medium">Skor</th>
                  <th className="px-3 py-2 font-medium">Waktu</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {algorithmCatalog.map((item) => {
                  const rows = defaultSimulationRows.filter((row) => row.algoritma === item.label)
                  const average =
                    rows.length > 0 ? rows.reduce((sum, row) => sum + row.skor_total, 0) / rows.length : 0
                  const valid = average >= 50

                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] ${getAlgorithmTone(item.id)}`}>
                          {item.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">{formatNumber(average, 1)}</td>
                      <td className="px-3 py-2 font-mono">{formatNumber(rows[0]?.waktu_enkripsi_ms ?? 2, 2)} ms</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-1 text-[10px] ${valid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {valid ? "Layak" : "Tidak layak"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Data mentah (contoh hasil)</h2>
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Algoritma</th>
                <th className="px-3 py-2 font-medium">Tipe data</th>
                <th className="px-3 py-2 font-medium">Mode kunci</th>
                <th className="px-3 py-2 font-medium">Waktu enkripsi</th>
                <th className="px-3 py-2 font-medium">Waktu dekripsi</th>
                <th className="px-3 py-2 font-medium">Cipher size</th>
                <th className="px-3 py-2 font-medium">Blast radius</th>
                <th className="px-3 py-2 font-medium">Skor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {defaultSimulationRows.slice(0, 8).map((row, index) => (
                <tr key={`${row.run_id}-${index}`}>
                  <td className="px-3 py-2">{row.algoritma}</td>
                  <td className="px-3 py-2">{row.tipe_data}</td>
                  <td className="px-3 py-2">{row.mode_kunci}</td>
                  <td className="px-3 py-2 font-mono">{formatNumber(row.waktu_enkripsi_ms, 2)} ms</td>
                  <td className="px-3 py-2 font-mono">{formatNumber(row.waktu_dekripsi_ms, 2)} ms</td>
                  <td className="px-3 py-2 font-mono">{row.ukuran_cipher_byte} B</td>
                  <td className="px-3 py-2 font-mono">{row.blast_radius_persen}%</td>
                  <td className="px-3 py-2 font-mono">{formatNumber(row.skor_total, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
