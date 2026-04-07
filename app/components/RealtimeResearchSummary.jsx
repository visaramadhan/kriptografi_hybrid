"use client"

import { useEffect, useMemo, useState } from "react"

function formatMaybeInt(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—"
  return String(Math.round(v))
}

function formatMaybeKbps(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—"
  return String(Math.round(v))
}

function formatDateTime(value) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString()
}

export default function RealtimeResearchSummary() {
  const [sessions, setSessions] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadSessions() {
      try {
        const res = await fetch("/api/sessions")
        if (!res.ok) return
        const data = await res.json()
        const list = Array.isArray(data.sessions) ? data.sessions : []
        if (cancelled) return
        setSessions(list)
      } catch {}
    }
    loadSessions()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem("activeSessionId") || ""
    if (saved) {
      setSelectedSessionId(saved)
      return
    }
    if (sessions.length) {
      setSelectedSessionId(sessions[0].id)
    }
  }, [sessions])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (selectedSessionId) {
      window.localStorage.setItem("activeSessionId", selectedSessionId)
    }
  }, [selectedSessionId])

  useEffect(() => {
    let cancelled = false
    let timer = null

    async function loadSummary() {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (selectedSessionId) params.set("sessionId", selectedSessionId)
        const res = await fetch(`/api/realtime-summary?${params.toString()}`, {
          cache: "no-store",
        })
        if (!res.ok) {
          let msg = `Gagal memuat ringkasan (HTTP ${res.status})`
          try {
            const txt = await res.text()
            try {
              const parsed = JSON.parse(txt)
              msg = parsed.error || parsed.details || msg
              if (parsed.details && parsed.error && parsed.details !== parsed.error) {
                msg = `${parsed.error}: ${parsed.details}`
              }
            } catch {
              if (txt) msg = txt
            }
          } catch {}
          throw new Error(msg)
        }
        const data = await res.json()
        if (cancelled) return
        setSummary(data)
      } catch (e) {
        if (cancelled) return
        setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadSummary()
    timer = setInterval(loadSummary, 5000)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
    }
  }, [selectedSessionId])

  async function refreshSessions() {
    try {
      const res = await fetch("/api/sessions")
      if (!res.ok) return []
      const data = await res.json()
      const list = Array.isArray(data.sessions) ? data.sessions : []
      setSessions(list)
      return list
    } catch {
      return []
    }
  }

  async function ensureSessionId() {
    if (selectedSessionId) return selectedSessionId
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        algorithm: "hybrid",
        keyMode: "mixed",
        textLength: 0,
        runCount: 0,
        testType: "benchmark",
      }),
    })
    if (!res.ok) throw new Error("Gagal membuat sesi")
    const data = await res.json()
    if (!data?.id) throw new Error("Sesi tidak valid")
    setSelectedSessionId(data.id)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("activeSessionId", data.id)
      }
    } catch {}
    await refreshSessions()
    return data.id
  }

  function buildTextByKb(kb) {
    const size = Math.max(1, Math.floor(kb * 1024))
    return "A".repeat(size)
  }

  async function runQuickBenchmark() {
    if (running) return
    setRunning(true)
    setError(null)
    try {
      const sessionId = await ensureSessionId()
      const sizesKb = [10, 50, 100]
      const iterations = 3
      for (const sizeKb of sizesKb) {
        const text = buildTextByKb(sizeKb)

        for (let i = 0; i < iterations; i++) {
          const encStatic = await fetch("/api/encrypt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              mode: "hybrid",
              keyMode: "manual",
              a: 5,
              b: 8,
              k1: 3,
              k2: 7,
              source: "footer-benchmark",
              sessionId,
            }),
          })
          if (!encStatic.ok) throw new Error("Gagal menjalankan encrypt (static)")
          const encStaticData = await encStatic.json()
          const keysStatic = encStaticData?.keys
          const cipherStatic = encStaticData?.result
          if (!keysStatic || typeof cipherStatic !== "string") throw new Error("Data encrypt (static) tidak valid")

          const decStatic = await fetch("/api/decrypt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: cipherStatic,
              mode: "hybrid",
              keyMode: "manual",
              a: keysStatic.a,
              b: keysStatic.b,
              k1: keysStatic.k1,
              k2: keysStatic.k2,
              source: "footer-benchmark",
              sessionId,
            }),
          })
          if (!decStatic.ok) throw new Error("Gagal menjalankan decrypt (static)")

          const encRot = await fetch("/api/encrypt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text,
              mode: "hybrid",
              keyMode: "timestamp",
              source: "footer-benchmark",
              sessionId,
            }),
          })
          if (!encRot.ok) throw new Error("Gagal menjalankan encrypt (rotating)")
          const encRotData = await encRot.json()
          const keysRot = encRotData?.keys
          const cipherRot = encRotData?.result
          if (!keysRot || typeof cipherRot !== "string") throw new Error("Data encrypt (rotating) tidak valid")

          const decRot = await fetch("/api/decrypt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: cipherRot,
              mode: "hybrid",
              keyMode: "timestamp",
              a: keysRot.a,
              b: keysRot.b,
              k1: keysRot.k1,
              k2: keysRot.k2,
              source: "footer-benchmark",
              sessionId,
            }),
          })
          if (!decRot.ok) throw new Error("Gagal menjalankan decrypt (rotating)")
        }
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  const buckets = useMemo(() => {
    const b = summary?.bucketsKb
    return Array.isArray(b) && b.length ? b : [10, 50, 100]
  }, [summary])

  const sessionLabel = useMemo(() => {
    if (!summary) return null
    if (summary.sessionNumber) return `No Sesi: ${summary.sessionNumber}`
    return summary.sessionId ? "Sesi dipilih" : "Belum ada sesi"
  }, [summary])

  const mappingInfo = useMemo(() => {
    const m = summary?.keyModeMapping
    if (!m) return null
    return "Static Key = manual/tetap, Rotating Key = random/timestamp/dinamis (berdasarkan keyMode yang tersimpan di log)."
  }, [summary])

  const overall = summary?.overallSummary || null
  const overallConclusion = useMemo(() => {
    if (!overall) return null
    const encS = overall?.encryptMs?.static
    const encR = overall?.encryptMs?.rotating
    const decS = overall?.decryptMs?.static
    const decR = overall?.decryptMs?.rotating

    const parts = []
    if (typeof encS === "number" && typeof encR === "number") {
      parts.push(encS <= encR ? "Enkripsi: Static lebih cepat." : "Enkripsi: Rotating lebih cepat.")
    }
    if (typeof decS === "number" && typeof decR === "number") {
      parts.push(decS <= decR ? "Dekripsi: Static lebih cepat." : "Dekripsi: Rotating lebih cepat.")
    }
    return parts.length ? parts.join(" ") : null
  }, [overall])

  const lastUpdated = formatDateTime(summary?.lastLogAt)
  const lastDocAt = formatDateTime(summary?.lastDocAt)

  return (
    <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
      <summary className="cursor-pointer select-none text-slate-700">
        Ringkasan Penelitian, Skenario Pengujian, dan Hasil (Static Key vs Rotating Key)
      </summary>
      <div className="mt-3 space-y-4 text-[11px] leading-relaxed text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-slate-700">
            <span className="font-semibold">{sessionLabel || "Ringkasan Real-time"}</span>
            {lastUpdated ? <span className="ml-2 text-slate-500">· Update: {lastUpdated}</span> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">(Terbaru)</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {typeof s.number === "number" ? `No ${s.number}` : s.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mappingInfo ? <div className="text-slate-500">{mappingInfo}</div> : null}

        {summary && typeof summary.matchedDocs === "number" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-500">
            <div>
              Log cocok filter: {summary.matchedDocs} · Dipakai untuk tabel:{" "}
              {typeof summary.totalRows === "number" ? summary.totalRows : 0}
              {lastDocAt ? <span> · Log terakhir: {lastDocAt}</span> : null}
            </div>
            <button
              type="button"
              disabled={running}
              onClick={runQuickBenchmark}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-700 disabled:opacity-60"
            >
              {running ? "Menjalankan..." : "Jalankan Pengujian Cepat (10/50/100KB)"}
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error}
          </div>
        ) : null}

        {loading && !summary ? (
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
            Memuat ringkasan...
          </div>
        ) : null}

        {summary ? (
          <>
            {typeof summary.totalRows === "number" && summary.totalRows === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                Data masih kosong untuk sesi/filter ini. Gunakan tombol “Jalankan Pengujian Cepat” atau lakukan
                Encrypt/Decrypt via API dalam sesi aktif agar tabel terisi.
              </div>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="font-semibold text-slate-700">Waktu Enkripsi (ms)</div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left text-slate-700">
                        <th className="border-b border-slate-200 pb-1 pr-3 font-semibold">Ukuran</th>
                        <th className="border-b border-slate-200 pb-1 pr-3 font-semibold">Static</th>
                        <th className="border-b border-slate-200 pb-1 font-semibold">Rotating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buckets.map((b) => (
                        <tr key={`enc-${b}`}>
                          <td className="py-1 pr-3">{b} KB</td>
                          <td className="py-1 pr-3">
                            {formatMaybeInt(summary.encryptAvgMs?.[b]?.static)}
                          </td>
                          <td className="py-1">
                            {formatMaybeInt(summary.encryptAvgMs?.[b]?.rotating)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="font-semibold text-slate-700">Waktu Dekripsi (ms)</div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left text-slate-700">
                        <th className="border-b border-slate-200 pb-1 pr-3 font-semibold">Ukuran</th>
                        <th className="border-b border-slate-200 pb-1 pr-3 font-semibold">Static</th>
                        <th className="border-b border-slate-200 pb-1 font-semibold">Rotating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buckets.map((b) => (
                        <tr key={`dec-${b}`}>
                          <td className="py-1 pr-3">{b} KB</td>
                          <td className="py-1 pr-3">
                            {formatMaybeInt(summary.decryptAvgMs?.[b]?.static)}
                          </td>
                          <td className="py-1">
                            {formatMaybeInt(summary.decryptAvgMs?.[b]?.rotating)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="font-semibold text-slate-700">Throughput (KB/s)</div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left text-slate-700">
                        <th className="border-b border-slate-200 pb-1 pr-3 font-semibold">Ukuran</th>
                        <th className="border-b border-slate-200 pb-1 pr-3 font-semibold">Static</th>
                        <th className="border-b border-slate-200 pb-1 font-semibold">Rotating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buckets.map((b) => (
                        <tr key={`thr-${b}`}>
                          <td className="py-1 pr-3">{b} KB</td>
                          <td className="py-1 pr-3">
                            {formatMaybeKbps(summary.throughputKbps?.[b]?.static)}
                          </td>
                          <td className="py-1">
                            {formatMaybeKbps(summary.throughputKbps?.[b]?.rotating)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="font-semibold text-slate-700">Analisis Hasil (Real-time)</div>
                <ul className="mt-2 list-disc pl-4">
                  <li>
                    {overallConclusion || "Kesimpulan otomatis belum tersedia karena data belum lengkap."}
                  </li>
                  <li>
                    Rotating key biasanya memiliki overhead karena pembangkitan kunci per request dan proses
                    tambahan pada pengelolaan kunci.
                  </li>
                  <li>
                    Dari sisi keamanan, rotating key mengurangi pemakaian kunci berulang dan lebih tahan terhadap
                    kebocoran kunci, namun umumnya mengorbankan sedikit performa.
                  </li>
                </ul>
                <div className="mt-2 text-slate-500">
                  Total sampel log dihitung: {typeof summary.totalRows === "number" ? summary.totalRows : 0}
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
                <div className="font-semibold text-slate-700">Trade-off Keamanan vs Performa</div>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left text-slate-700">
                        <th className="border-b border-slate-200 pb-1 pr-3 font-semibold">Aspek</th>
                        <th className="border-b border-slate-200 pb-1 pr-3 font-semibold">Static Key</th>
                        <th className="border-b border-slate-200 pb-1 font-semibold">Rotating Key</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-1 pr-3">Kecepatan</td>
                        <td className="py-1 pr-3">
                          {typeof overall?.encryptMs?.static === "number" ? "Tinggi" : "—"}
                        </td>
                        <td className="py-1">
                          {typeof overall?.encryptMs?.rotating === "number" ? "Sedang" : "—"}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-3">Keamanan</td>
                        <td className="py-1 pr-3">Rendah</td>
                        <td className="py-1">Tinggi</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-3">Efisiensi</td>
                        <td className="py-1 pr-3">Tinggi</td>
                        <td className="py-1">Cukup</td>
                      </tr>
                      <tr>
                        <td className="py-1 pr-3">Risiko Kebocoran</td>
                        <td className="py-1 pr-3">Tinggi</td>
                        <td className="py-1">Rendah</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-2">
                  Untuk data sensitif, rotating key lebih relevan karena keamanan biasanya lebih penting dibanding
                  selisih waktu kecil.
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </details>
  )
}
