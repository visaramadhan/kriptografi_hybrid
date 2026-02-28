"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const summary = useMemo(() => {
    if (!logs.length) return []
    const map = new Map()
    for (const log of logs) {
      if (typeof log.timeMs !== "number") continue
      const key = `${log.mode || "unknown"}:${log.processType || "encrypt"}`
      const existing = map.get(key) || {
        mode: log.mode || "unknown",
        processType: log.processType || "encrypt",
        count: 0,
        total: 0,
        min: Number.POSITIVE_INFINITY,
        max: 0,
      }
      existing.count += 1
      existing.total += log.timeMs
      existing.min = Math.min(existing.min, log.timeMs)
      existing.max = Math.max(existing.max, log.timeMs)
      map.set(key, existing)
    }
    return Array.from(map.values()).map((entry) => ({
      ...entry,
      avg: entry.total / entry.count,
    }))
  }, [logs])

  const entropyAndThroughput = useMemo(() => {
    if (!logs.length) {
      return {
        entropy: null,
        maxEntropy: null,
        requestsPerHour: null,
        spanHours: null,
      }
    }

    const keyCounts = new Map()
    let totalWithKeys = 0

    for (const log of logs) {
      if (!log.keys) continue
      const { a, b, k1, k2 } = log.keys
      const sig = `${a ?? "-"}-${b ?? "-"}-${k1 ?? "-"}-${k2 ?? "-"}`
      keyCounts.set(sig, (keyCounts.get(sig) || 0) + 1)
      totalWithKeys += 1
    }

    let entropy = null
    let maxEntropy = null
    if (totalWithKeys > 0) {
      let h = 0
      for (const count of keyCounts.values()) {
        const p = count / totalWithKeys
        h += -p * Math.log2(p)
      }
      entropy = h
      maxEntropy = Math.log2(keyCounts.size)
    }

    const timestamps = logs
      .map((log) => (log.createdAt ? new Date(log.createdAt).getTime() : null))
      .filter((t) => typeof t === "number")

    let requestsPerHour = null
    let spanHours = null
    if (timestamps.length >= 2) {
      const minTime = Math.min(...timestamps)
      const maxTime = Math.max(...timestamps)
      const spanMs = maxTime - minTime
      if (spanMs > 0) {
        spanHours = spanMs / (1000 * 60 * 60)
        requestsPerHour = logs.length / spanHours
      }
    }

    return {
      entropy,
      maxEntropy,
      requestsPerHour,
      spanHours,
    }
  }, [logs])

  async function loadLogs(withFilter = false) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (withFilter) {
          if (startDate) params.append("startDate", startDate)
          if (endDate) params.append("endDate", endDate)
          // Increase limit for filtered view to show more relevant data
          params.append("limit", "1000")
      }
      const res = await fetch(`/api/logs?${params.toString()}`)
      if (!res.ok) {
        throw new Error("Gagal memuat data log")
      }
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const handleFilter = () => {
    loadLogs(true)
  }

  const handleExport = async () => {
    try {
        const params = new URLSearchParams()
        if (startDate) params.append("startDate", startDate)
        if (endDate) params.append("endDate", endDate)
        params.append("limit", "0") // Unlimited for export

        const res = await fetch(`/api/logs?${params.toString()}`)
        if (!res.ok) throw new Error("Gagal mengambil data untuk export")
        const data = await res.json()
        
        if (!data.logs || data.logs.length === 0) {
            alert("Tidak ada data untuk diexport")
            return
        }

        const rows = data.logs.map(log => ({
            "ID": log.id,
            "Waktu": log.createdAt ? new Date(log.createdAt).toLocaleString() : "-",
            "Metode": log.mode,
            "Jenis": log.processType,
            "Plaintext": log.plaintext,
            "Ciphertext": log.ciphertext,
            "Waktu Proses (ms)": log.timeMs,
            "Kunci A": log.keys?.a,
            "Kunci B": log.keys?.b,
            "Kunci K1": log.keys?.k1,
            "Kunci K2": log.keys?.k2
        }))

        const worksheet = XLSX.utils.json_to_sheet(rows)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Log Enkripsi")
        XLSX.writeFile(workbook, `Log_Enkripsi_${new Date().toISOString().slice(0,10)}.xlsx`)
    } catch (e) {
        alert("Gagal export: " + e.message)
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Log Enkripsi
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Histori enkripsi dari API server yang disimpan di MongoDB.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
        >
          ← Kembali ke Dashboard
        </Link>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Tanggal Mulai</label>
            <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="block w-full rounded-lg border-slate-200 text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
        </div>
        <div className="space-y-1">
            <label className="text-xs font-medium text-slate-700">Tanggal Selesai</label>
            <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="block w-full rounded-lg border-slate-200 text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleFilter}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
                Filter
            </button>
            <button 
                onClick={handleExport}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
                Export Excel
            </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-xs text-slate-600 shadow-sm">
          Memuat data log...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-xs text-slate-600 shadow-sm">
          Tidak ada log yang ditemukan untuk filter ini.
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  No
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Metode
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Jenis
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Plaintext
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Ciphertext
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Waktu (ms)
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Timestamp
                </th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr
                  key={log.id}
                  className="border-t border-slate-100 bg-white hover:bg-slate-50"
                >
                  <td className="px-3 py-2 align-top text-slate-700">{idx + 1}</td>
                  <td className="px-3 py-2 align-top text-[11px] font-semibold uppercase text-slate-600">
                    {log.mode}
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] uppercase text-slate-600">
                    {log.processType}
                  </td>
                  <td className="px-3 py-2 align-top max-w-xs text-slate-700">
                    <span className="line-clamp-2">{log.plaintext}</span>
                  </td>
                  <td className="px-3 py-2 align-top max-w-xs font-mono text-[11px] text-slate-800">
                    <span className="line-clamp-2">{log.ciphertext}</span>
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {typeof log.timeMs === "number" ? log.timeMs.toFixed(3) : "-"}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2 align-top text-right">
                    <Link
                      href={`/logs/${log.id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && logs.length > 0 && summary.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-700 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Ringkasan Analisis dari Semua Log
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Rata-rata waktu proses per kombinasi metode dan jenis proses berdasarkan semua
            log yang tersimpan.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                    Metode
                  </th>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                    Jenis
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                    Jumlah
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                    Rata-rata (ms)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                    Min (ms)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                    Max (ms)
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={`${row.mode}:${row.processType}`} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{row.mode}</td>
                    <td className="px-3 py-2 text-slate-700">{row.processType}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{row.count}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-800">
                      {row.avg.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-800">
                      {row.min.toFixed(3)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-800">
                      {row.max.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-700 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Entropy Kunci & Perkiraan Permintaan per Jam
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Menggambarkan sebaran penggunaan kunci dan estimasi beban permintaan berdasarkan
            histori log yang tersimpan.
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-800">
                Entropy Kunci (Shannon)
              </h3>
              {entropyAndThroughput.entropy == null ? (
                <p className="text-[11px] text-slate-500">
                  Belum cukup data kunci untuk menghitung entropy.
                </p>
              ) : (
                <div className="space-y-1 text-[11px] text-slate-600">
                  <p>
                    Entropy aktual:{" "}
                    <span className="font-mono text-blue-700">
                      {entropyAndThroughput.entropy.toFixed(3)} bit
                    </span>
                  </p>
                  <p>
                    Entropy maksimum berdasarkan jumlah kombinasi kunci unik yang pernah
                    muncul:{" "}
                    <span className="font-mono text-slate-800">
                      {entropyAndThroughput.maxEntropy.toFixed(3)} bit
                    </span>
                    .
                  </p>
                  <p>
                    Semakin mendekati nilai maksimum, semakin merata penggunaan kombinasi
                    kunci pada skema manajemen kunci dinamis.
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-800">
                Perkiraan Permintaan per Jam
              </h3>
              {entropyAndThroughput.requestsPerHour == null ? (
                <p className="text-[11px] text-slate-500">
                  Belum cukup data waktu (minimal dua log dengan timestamp berbeda)
                  untuk menghitung estimasi ini.
                </p>
              ) : (
                <div className="space-y-1 text-[11px] text-slate-600">
                  <p>
                    Perkiraan permintaan per jam (rata-rata):{" "}
                    <span className="font-mono text-blue-700">
                      {entropyAndThroughput.requestsPerHour.toFixed(2)} permintaan/jam
                    </span>
                    .
                  </p>
                  <p>
                    Estimasi dihitung dari {logs.length} log dalam rentang waktu sekitar{" "}
                    <span className="font-mono">
                      {entropyAndThroughput.spanHours.toFixed(2)} jam
                    </span>
                    .
                  </p>
                  <p>
                    Nilai ini dapat dibandingkan dengan hasil uji load testing untuk
                    memvalidasi kapasitas sistem pada skenario beban tinggi.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
