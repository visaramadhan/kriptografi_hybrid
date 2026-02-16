"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

function frequencyMap(text) {
  const normalized = (text || "").toUpperCase().replace(/[^A-Z]/g, "")
  const map = new Map()
  for (const ch of normalized) {
    map.set(ch, (map.get(ch) || 0) + 1)
  }
  return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1))
}

export default function LogDetailPage() {
  const params = useParams()
  const id = params?.id

  const [log, setLog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return

    async function load() {
      try {
        const res = await fetch(`/api/logs/${id}`)
        if (!res.ok) {
          throw new Error("Gagal memuat detail log")
        }
        const data = await res.json()
        setLog(data.log)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

  const cipherFreq = log ? frequencyMap(log.ciphertext) : []

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Detail Log</h1>
          <p className="mt-1 text-xs text-slate-400">
            Informasi lengkap satu transaksi enkripsi beserta analisis karakter.
          </p>
        </div>
        <Link
          href="/logs"
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
        >
          ← Kembali ke Logs
        </Link>
      </div>

      {loading && (
        <div className="rounded-md border border-slate-800 bg-slate-900/60 px-4 py-6 text-xs text-slate-300">
          Memuat detail log...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && !log && (
        <div className="rounded-md border border-slate-800 bg-slate-900/60 px-4 py-6 text-xs text-slate-300">
          Data log tidak ditemukan.
        </div>
      )}

      {log && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
              <h2 className="text-sm font-semibold text-slate-100">
                Informasi Umum
              </h2>
              <dl className="mt-2 space-y-1">
                <div className="flex gap-2">
                  <dt className="w-28 text-slate-400">ID</dt>
                  <dd className="flex-1 break-all">{log.id}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 text-slate-400">Metode</dt>
                  <dd className="flex-1 uppercase">{log.mode}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 text-slate-400">Jenis Proses</dt>
                  <dd className="flex-1">{log.processType}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 text-slate-400">Waktu Proses</dt>
                  <dd className="flex-1">
                    {typeof log.timeMs === "number"
                      ? `${log.timeMs.toFixed(3)} ms`
                      : "-"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-28 text-slate-400">Timestamp</dt>
                  <dd className="flex-1">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "-"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200">
              <h2 className="text-sm font-semibold text-slate-100">Kunci</h2>
              <dl className="mt-2 space-y-1">
                <div className="flex gap-2">
                  <dt className="w-10 text-slate-400">a</dt>
                  <dd className="flex-1">{log.keys?.a ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-10 text-slate-400">b</dt>
                  <dd className="flex-1">{log.keys?.b ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-10 text-slate-400">k1</dt>
                  <dd className="flex-1">{log.keys?.k1 ?? "-"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-10 text-slate-400">k2</dt>
                  <dd className="flex-1">{log.keys?.k2 ?? "-"}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold text-slate-100">Plaintext</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-200">
                {log.plaintext}
              </p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
              <h2 className="text-sm font-semibold text-slate-100">Ciphertext</h2>
              <p className="mt-2 whitespace-pre-wrap font-mono text-[12px] text-slate-100">
                {log.ciphertext}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Analisis Frekuensi Ciphertext
            </h2>
            {cipherFreq.length === 0 ? (
              <p className="mt-2 text-xs text-slate-300">
                Tidak ada data frekuensi (ciphertext kosong).
              </p>
            ) : (
              <table className="mt-3 w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border-b border-slate-700 px-2 py-1 text-left text-slate-300">
                      Huruf
                    </th>
                    <th className="border-b border-slate-700 px-2 py-1 text-right text-slate-300">
                      Frekuensi
                    </th>
                    <th className="border-b border-slate-700 px-2 py-1 text-left text-slate-300">
                      Grafik
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cipherFreq.map(([ch, count]) => {
                    const max = cipherFreq[0][1]
                    const ratio = max > 0 ? (count / max) * 100 : 0
                    return (
                      <tr key={ch}>
                        <td className="px-2 py-1 text-slate-200">{ch}</td>
                        <td className="px-2 py-1 text-right text-slate-200">
                          {count}
                        </td>
                        <td className="px-2 py-1">
                          <div
                            className="h-1.5 max-w-full bg-indigo-500"
                            style={{ width: `${ratio}%` }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

