"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

const algorithmOptions = [
  { value: "multi", label: "Multi (Analysis)" },
  { value: "caesar", label: "Caesar" },
  { value: "double-caesar", label: "Double Caesar" },
  { value: "affine", label: "Affine" },
  { value: "hybrid", label: "Hybrid" },
  { value: "hybrid-c_a", label: "Hybrid: Caesar → Affine" },
  { value: "hybrid-dc_a", label: "Hybrid: Double Caesar → Affine" },
  { value: "hybrid-c_dc_a", label: "Hybrid: Caesar → Double Caesar → Affine" },
  { value: "attacker-caesar", label: "Attacker: Caesar" },
  { value: "attacker-double-caesar", label: "Attacker: Double Caesar" },
  { value: "attacker-hybrid-subset", label: "Attacker: Hybrid Subset" },
]

export default function SessionsPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)

  const [algorithm, setAlgorithm] = useState("multi")
  const [keyMode, setKeyMode] = useState("manual")
  const [textLength, setTextLength] = useState(0)
  const [runCount, setRunCount] = useState(10)
  const [testType, setTestType] = useState("analysis")
  const [group, setGroup] = useState("")
  const [groupNo, setGroupNo] = useState("")

  const sorted = useMemo(() => {
    return [...sessions].sort((a, b) => (b.number || 0) - (a.number || 0))
  }, [sessions])

  async function loadSessions() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/sessions")
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || "Gagal memuat sesi")
      }
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function createSession() {
    setCreating(true)
    setError(null)
    try {
      const payload = {
        algorithm,
        keyMode,
        textLength: Number(textLength) || 0,
        runCount: Number(runCount) || 0,
        testType: testType || "analysis",
        group: group || null,
        groupNo: groupNo ? Number(groupNo) : null,
      }
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const txt = await res.text()
        throw new Error(txt || "Gagal membuat sesi")
      }
      await loadSessions()
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function exportSession(session) {
    const sessionId = session?.id
    if (!sessionId) return
    const res = await fetch(`/api/logs?sessionId=${encodeURIComponent(sessionId)}&limit=0`)
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || "Gagal mengambil log untuk export")
    }
    const data = await res.json()
    const logs = data.logs || []

    const metaRows = [
      { Field: "No Sesi", Value: session.number ?? "-" },
      { Field: "Kelompok", Value: session.group ?? "-" },
      { Field: "No Kelompok", Value: session.groupNo ?? "-" },
      { Field: "Algoritma", Value: session.algorithm ?? "-" },
      { Field: "Mode Kunci", Value: session.keyMode ?? "-" },
      { Field: "Panjang Teks", Value: session.textLength ?? "-" },
      { Field: "Jumlah Run", Value: session.runCount ?? "-" },
      { Field: "Jenis Uji", Value: session.testType ?? "-" },
      { Field: "Total Log", Value: logs.length },
      { Field: "Exported At", Value: new Date().toLocaleString() },
    ]

    const logRows = logs.map((log) => ({
      ID: log.id,
      Waktu: log.createdAt ? new Date(log.createdAt).toLocaleString() : "-",
      Metode: log.mode,
      Jenis: log.processType,
      Plaintext: log.plaintext,
      Ciphertext: log.ciphertext,
      "Waktu Proses (ms)": typeof log.timeMs === "number" ? log.timeMs : null,
      "Kunci A": log.keys?.a ?? null,
      "Kunci B": log.keys?.b ?? null,
      "Kunci K1": log.keys?.k1 ?? null,
      "Kunci K2": log.keys?.k2 ?? null,
    }))

    const workbook = XLSX.utils.book_new()
    const wsMeta = XLSX.utils.json_to_sheet(metaRows)
    const wsLogs = XLSX.utils.json_to_sheet(logRows)
    XLSX.utils.book_append_sheet(workbook, wsMeta, "Sesi")
    XLSX.utils.book_append_sheet(workbook, wsLogs, "Logs")
    XLSX.writeFile(workbook, `Sesi_${session.number || sessionId}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  useEffect(() => {
    loadSessions()
  }, [])

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Pengaturan Sesi Pengujian
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Tambah sesi, pakai saat analisis, dan export log per sesi.
          </p>
        </div>
        <Link
          href="/analysis"
          className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
        >
          ← Ke Analisis
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Tambah Sesi</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">Algoritma</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
            >
              {algorithmOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">Mode Kunci</label>
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={keyMode}
              onChange={(e) => setKeyMode(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">Panjang Teks</label>
            <input
              type="number"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={textLength}
              onChange={(e) => setTextLength(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">Jumlah Run</label>
            <input
              type="number"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={runCount}
              onChange={(e) => setRunCount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">Jenis Uji</label>
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">Kelompok</label>
            <input
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Kelompok 1"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-500">No Kelompok</label>
            <input
              type="number"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={groupNo}
              onChange={(e) => setGroupNo(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={creating}
            onClick={createSession}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            Tambah Sesi
          </button>
          <button
            type="button"
            onClick={loadSessions}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-700"
          >
            Refresh
          </button>
        </div>
        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Daftar Sesi</h2>
          <span className="text-xs text-slate-400">{sorted.length} sesi</span>
        </div>

        {loading ? (
          <div className="mt-3 text-xs text-slate-600">Memuat...</div>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    No
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Kelompok
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Algoritma
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Mode Kunci
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Panjang
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Run
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Jenis Uji
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{s.number}</td>
                    <td className="px-3 py-2 text-slate-700">
                      {s.group ? `${s.group}${s.groupNo ? ` (${s.groupNo})` : ""}` : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{s.algorithm || "-"}</td>
                    <td className="px-3 py-2 text-slate-700">{s.keyMode || "-"}</td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {typeof s.textLength === "number" ? s.textLength : "-"}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {typeof s.runCount === "number" ? s.runCount : "-"}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{s.testType || "-"}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/analysis?sessionId=${encodeURIComponent(s.id)}`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-blue-700 transition hover:border-blue-400 hover:bg-blue-50"
                        >
                          Pakai
                        </Link>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await exportSession(s)
                            } catch (e) {
                              setError(e.message)
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-700"
                        >
                          Export
                        </button>
                        <Link
                          href={`/logs`}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:border-blue-500 hover:text-blue-700"
                        >
                          Logs
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
