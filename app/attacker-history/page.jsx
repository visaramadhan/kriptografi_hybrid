"use client"

import { useEffect, useMemo, useState } from "react"

export default function AttackerHistoryPage() {
  const [attacks, setAttacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sessions, setSessions] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState("")

  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch("/api/sessions")
        if (res.ok) {
          const data = await res.json()
          setSessions(data.sessions || [])
        }
      } catch {}
    }
    loadSessions()
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams()
        if (selectedSessionId) params.append("sessionId", selectedSessionId)
        const res = await fetch(`/api/attacks?${params.toString()}`)
        if (!res.ok) {
          throw new Error("Gagal memuat riwayat attacker")
        }
        const data = await res.json()
        setAttacks(data.attacks || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [selectedSessionId])

  const summary = useMemo(() => {
    if (!attacks.length) return []
    const map = new Map()
    for (const attack of attacks) {
      const key = attack.algorithm || "unknown"
      const existing = map.get(key) || {
        algorithm: key,
        count: 0,
        successCount: 0,
        totalTime: 0,
        minTime: Number.POSITIVE_INFINITY,
        maxTime: 0,
        totalRank: 0,
        rankCount: 0,
      }
      existing.count += 1
      if (typeof attack.attackTime === "number") {
        existing.totalTime += attack.attackTime
        existing.minTime = Math.min(existing.minTime, attack.attackTime)
        existing.maxTime = Math.max(existing.maxTime, attack.attackTime)
      }
      if (attack.trueFoundInSearch === true) {
        existing.successCount += 1
        if (typeof attack.trueRank === "number") {
          existing.totalRank += attack.trueRank
          existing.rankCount += 1
        }
      }
      map.set(key, existing)
    }

    return Array.from(map.values()).map((entry) => ({
      algorithm: entry.algorithm,
      count: entry.count,
      successRate: entry.count ? entry.successCount / entry.count : 0,
      avgTime:
        entry.totalTime > 0 && entry.count > 0 ? entry.totalTime / entry.count : null,
      minTime:
        entry.minTime !== Number.POSITIVE_INFINITY ? entry.minTime : null,
      maxTime: entry.maxTime || null,
      avgRank:
        entry.rankCount > 0 ? entry.totalRank / entry.rankCount : null,
    }))
  }, [attacks])

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Riwayat Serangan Attacker
        </h1>
        <p className="text-sm text-slate-500">
          Histori simulasi brute force dari modul attacker beserta ringkasan performa
          serangan terhadap setiap algoritma.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Sesi</label>
          <select
            className="block w-56 rounded-lg border-slate-200 text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={selectedSessionId}
            onChange={(e) => {
              setLoading(true)
              setSelectedSessionId(e.target.value)
            }}
          >
            <option value="">Semua</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {`No ${s.number} • ${s.group || "-"} • ${s.testType || "-"} • ${s.algorithm || "-"}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-xs text-slate-600 shadow-sm">
          Memuat data riwayat attacker...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && attacks.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-xs text-slate-600 shadow-sm">
          Belum ada riwayat serangan yang tercatat. Jalankan simulasi di halaman Attacker
          untuk mulai mengumpulkan data.
        </div>
      )}

      {!loading && !error && attacks.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  No
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Algoritma
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Panjang cipher
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Kombinasi diuji
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Sesi
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Waktu brute force (ms)
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Kunci ditemukan
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Posisi kandidat benar
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Waktu
                </th>
              </tr>
            </thead>
            <tbody>
              {attacks.map((attack, idx) => (
                <tr
                  key={attack.id}
                  className="border-t border-slate-100 bg-white hover:bg-slate-50"
                >
                  <td className="px-3 py-2 align-top text-slate-700">{idx + 1}</td>
                  <td className="px-3 py-2 align-top text-[11px] font-semibold uppercase text-slate-600">
                    {attack.algorithm}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {typeof attack.ciphertextLength === "number"
                      ? attack.ciphertextLength
                      : "-"}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {typeof attack.totalTried === "number" ? attack.totalTried : "-"}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {(() => {
                      const s = sessions.find((x) => x.id === attack.sessionId)
                      return s ? `No ${s.number}` : "-"
                    })()}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {typeof attack.attackTime === "number"
                      ? attack.attackTime.toFixed(3)
                      : "-"}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {attack.trueFoundInSearch == null
                      ? "-"
                      : attack.trueFoundInSearch
                      ? "Ya"
                      : "Tidak"}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {typeof attack.trueRank === "number"
                      ? `Peringkat ke-${attack.trueRank}`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 align-top text-slate-700">
                    {attack.createdAt
                      ? new Date(attack.createdAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && attacks.length > 0 && summary.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-700 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Ringkasan Analisis Serangan
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Rangkuman performa serangan brute force untuk setiap algoritma berdasarkan
            riwayat attacker yang tercatat.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                    Algoritma
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                    Jumlah serangan
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                    Tingkat keberhasilan
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                    Rata-rata waktu (ms)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                    Min–Max waktu (ms)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                    Rata-rata posisi kandidat benar
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.algorithm} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{row.algorithm}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{row.count}</td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {(row.successRate * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-800">
                      {row.avgTime != null ? row.avgTime.toFixed(3) : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-800">
                      {row.minTime != null && row.maxTime != null
                        ? `${row.minTime.toFixed(3)} – ${row.maxTime.toFixed(3)}`
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-800">
                      {row.avgRank != null ? row.avgRank.toFixed(2) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Nilai di atas dapat digunakan untuk membandingkan seberapa mudah setiap
            algoritma dipatahkan dengan brute force, baik dari sisi waktu yang dibutuhkan
            maupun seberapa sering dan seberapa cepat kandidat plaintext yang benar muncul
            dalam daftar hasil serangan.
          </p>
        </div>
      )}
    </div>
  )
}
