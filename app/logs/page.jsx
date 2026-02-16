"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/logs")
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

    load()
  }, [])

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
          Belum ada log enkripsi yang tersimpan.
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
    </div>
  )
}
