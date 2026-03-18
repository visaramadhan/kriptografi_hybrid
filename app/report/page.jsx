"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"

const methods = [
  { key: "caesar", label: "Caesar" },
  { key: "doubleCaesar", label: "Double Caesar" },
  { key: "affine", label: "Affine" },
  { key: "hybrid", label: "Hybrid" },
]

const hybridModels = [
  { key: "c_a", label: "Caesar → Affine" },
  { key: "dc_a", label: "Double Caesar → Affine" },
  { key: "c_dc_a", label: "Caesar → Double Caesar → Affine" },
]

function pick(n, fallback = 0) {
  const x = Number(n)
  return Number.isFinite(x) ? x : fallback
}

function aggregateStats(values) {
  const arr = values.filter((v) => typeof v === "number" && Number.isFinite(v))
  if (!arr.length) return { avg: null, min: null, max: null, n: 0 }
  const sum = arr.reduce((s, v) => s + v, 0)
  return {
    avg: sum / arr.length,
    min: Math.min(...arr),
    max: Math.max(...arr),
    n: arr.length,
  }
}

function keyspaceRow() {
  const caesar = 26
  const doubleCaesar = 26 * 26
  const affine = 12 * 26
  return [
    { method: "Caesar", keyspace: caesar, complexity: "Sangat mudah" },
    { method: "Double Caesar", keyspace: doubleCaesar, complexity: "Mudah" },
    { method: "Affine", keyspace: affine, complexity: "Sedang" },
    { method: "Caesar → Affine", keyspace: caesar * affine, complexity: "Lebih sulit" },
    { method: "Double Caesar → Affine", keyspace: doubleCaesar * affine, complexity: "Sulit" },
    { method: "Caesar → Double Caesar → Affine", keyspace: caesar * doubleCaesar * affine, complexity: "Sangat sulit" },
  ]
}

function median(numbers) {
  const arr = numbers.filter((n) => typeof n === "number" && Number.isFinite(n)).sort((a, b) => a - b)
  if (!arr.length) return null
  const mid = Math.floor(arr.length / 2)
  if (arr.length % 2 === 1) return arr[mid]
  return (arr[mid - 1] + arr[mid]) / 2
}

function toFixedOrDash(n, digits = 3) {
  return typeof n === "number" && Number.isFinite(n) ? n.toFixed(digits) : "-"
}

export default function ReportPage() {
  const [sessions, setSessions] = useState([])
  const [groupFilter, setGroupFilter] = useState("")
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [selectedIds, setSelectedIds] = useState([])
  const [analysisLogs, setAnalysisLogs] = useState([])
  const [encryptLogs, setEncryptLogs] = useState([])
  const [attacks, setAttacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const groups = useMemo(() => {
    const set = new Set()
    for (const s of sessions) {
      if (s.group) set.add(s.group)
    }
    return Array.from(set).sort((a, b) => (a < b ? -1 : 1))
  }, [sessions])

  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => (groupFilter ? s.group === groupFilter : true))
      .sort((a, b) => (a.number || 0) - (b.number || 0))
  }, [sessions, groupFilter])

  const selectedSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) || null
  }, [sessions, selectedSessionId])

  const effectiveIds = useMemo(() => {
    return selectedIds.length ? selectedIds : filteredSessions.map((s) => s.id)
  }, [selectedIds, filteredSessions])

  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch("/api/sessions")
        if (!res.ok) return
        const data = await res.json()
        setSessions(data.sessions || [])
      } catch {}
    }
    loadSessions()
  }, [])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const ids = effectiveIds
        if (!ids.length) {
          setAnalysisLogs([])
          setEncryptLogs([])
          setAttacks([])
          setLoading(false)
          return
        }

        const logsChunks = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/logs?sessionId=${encodeURIComponent(id)}&limit=0&includeMetrics=1`)
            if (!res.ok) return []
            const data = await res.json()
            return data.logs || []
          })
        )
        const allLogs = logsChunks.flat()
        setAnalysisLogs(allLogs.filter((l) => l.processType === "analysis" && l.metrics))
        setEncryptLogs(allLogs.filter((l) => l.processType !== "analysis"))

        const attacksChunks = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/attacks?sessionId=${encodeURIComponent(id)}`)
            if (!res.ok) return []
            const data = await res.json()
            return data.attacks || []
          })
        )
        setAttacks(attacksChunks.flat())
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [effectiveIds])

  const speedByMethod = useMemo(() => {
    const perMethod = {}
    for (const m of methods) {
      perMethod[m.key] = { label: m.label, avg: [], min: [], max: [] }
    }

    for (const log of analysisLogs) {
      const metrics = log.metrics || {}
      for (const m of methods) {
        const row = metrics[m.key]
        if (!row) continue
        perMethod[m.key].avg.push(pick(row.avgTime, NaN))
        perMethod[m.key].min.push(pick(row.minTime, NaN))
        perMethod[m.key].max.push(pick(row.maxTime, NaN))
      }
    }

    return methods.map((m) => {
      const aggAvg = aggregateStats(perMethod[m.key].avg)
      const aggMin = aggregateStats(perMethod[m.key].min)
      const aggMax = aggregateStats(perMethod[m.key].max)
      return {
        method: m.label,
        avgMs: aggAvg.avg,
        minMs: aggMin.min,
        maxMs: aggMax.max,
        n: Math.max(aggAvg.n, aggMin.n, aggMax.n),
      }
    })
  }, [analysisLogs])

  const speedByLength = useMemo(() => {
    const byLen = new Map()
    for (const log of analysisLogs) {
      const len = typeof log.textLength === "number" ? log.textLength : null
      if (!len) continue
      const metrics = log.metrics || {}
      if (!byLen.has(len)) {
        byLen.set(len, {
          length: len,
          caesar: [],
          doubleCaesar: [],
          affine: [],
          hybrid: [],
        })
      }
      const entry = byLen.get(len)
      for (const m of methods) {
        const row = metrics[m.key]
        if (row && typeof row.avgTime === "number") {
          entry[m.key].push(row.avgTime)
        }
      }
    }

    return Array.from(byLen.values())
      .sort((a, b) => a.length - b.length)
      .map((e) => ({
        length: e.length,
        caesar: aggregateStats(e.caesar).avg,
        doubleCaesar: aggregateStats(e.doubleCaesar).avg,
        affine: aggregateStats(e.affine).avg,
        hybrid: aggregateStats(e.hybrid).avg,
      }))
  }, [analysisLogs])

  const hybridComparison = useMemo(() => {
    const per = {
      c_a: { avg: [], min: [], max: [] },
      dc_a: { avg: [], min: [], max: [] },
      c_dc_a: { avg: [], min: [], max: [] },
    }
    for (const log of analysisLogs) {
      const hv = log.metrics?.hybridVariants
      if (!hv) continue
      for (const k of Object.keys(per)) {
        const row = hv[k]
        if (!row) continue
        per[k].avg.push(pick(row.avgTime, NaN))
        per[k].min.push(pick(row.minTime, NaN))
        per[k].max.push(pick(row.maxTime, NaN))
      }
    }
    return hybridModels.map((m) => {
      const a = aggregateStats(per[m.key].avg)
      const n = aggregateStats(per[m.key].min)
      const x = aggregateStats(per[m.key].max)
      return { model: m.label, avgMs: a.avg, minMs: n.min, maxMs: x.max, count: Math.max(a.n, n.n, x.n) }
    })
  }, [analysisLogs])

  const keyVariation = useMemo(() => {
    const rows = []
    const sliced = encryptLogs.slice(0, 30)
    for (const log of sliced) {
      const keys = log.keys || {}
      const keyText =
        log.mode === "caesar"
          ? `K=${keys.k1 ?? "-"}`
          : log.mode === "double-caesar"
          ? `K1=${keys.k1 ?? "-"} K2=${keys.k2 ?? "-"}`
          : log.mode === "affine"
          ? `A=${keys.a ?? "-"} B=${keys.b ?? "-"}`
          : `A=${keys.a ?? "-"} B=${keys.b ?? "-"} K1=${keys.k1 ?? "-"} K2=${keys.k2 ?? "-"}`
      rows.push({
        method: log.mode,
        key: keyText,
        ciphertext: log.ciphertext || "",
        timeMs: typeof log.timeMs === "number" ? log.timeMs : null,
        session: (() => {
          const s = sessions.find((x) => x.id === log.sessionId)
          return s ? `No ${s.number}` : "-"
        })(),
      })
    }
    return rows
  }, [encryptLogs, sessions])

  const bruteForceFromData = useMemo(() => {
    const map = new Map()
    for (const a of attacks) {
      const key = a.algorithm || "unknown"
      if (!map.has(key)) {
        map.set(key, { algorithm: key, times: [], totalTried: [], success: 0, count: 0 })
      }
      const entry = map.get(key)
      entry.count += 1
      if (typeof a.attackTime === "number") entry.times.push(a.attackTime)
      if (typeof a.totalTried === "number") entry.totalTried.push(a.totalTried)
      if (a.trueFoundInSearch === true) entry.success += 1
    }
    return Array.from(map.values()).map((e) => {
      const t = aggregateStats(e.times)
      const tried = aggregateStats(e.totalTried)
      return {
        algorithm: e.algorithm,
        attacks: e.count,
        avgTimeMs: t.avg,
        avgTried: tried.avg,
        successRate: e.count ? e.success / e.count : 0,
      }
    })
  }, [attacks])

  const frequencyDistribution = useMemo(() => {
    const acc = {}
    for (const m of methods) {
      acc[m.label] = new Map()
    }
    // Gabungkan frekuensi dari seluruh analysisLogs yang ada
    for (const log of analysisLogs) {
      const metrics = log.metrics
      if (!metrics) continue
      for (const m of methods) {
        const arr = metrics?.[m.key]?.freq
        if (!Array.isArray(arr)) continue
        const map = acc[m.label]
        for (const [ch, count] of arr) {
          map.set(ch, (map.get(ch) || 0) + (typeof count === "number" ? count : 0))
        }
      }
    }
    // Konversi ke array terurut per metode
    const out = {}
    for (const m of methods) {
      const entries = Array.from(acc[m.label].entries()).sort(([a], [b]) => (a < b ? -1 : 1))
      if (entries.length) out[m.label] = entries
    }
    return Object.keys(out).length ? out : null
  }, [analysisLogs])

  const speedMethodFinal = useMemo(() => {
    const base = speedByMethod.filter((r) => ["Caesar", "Double Caesar", "Affine"].includes(r.method))
    const hybrid = hybridComparison.map((r) => ({
      method: r.model,
      avgMs: r.avgMs,
      minMs: r.minMs,
      maxMs: r.maxMs,
      n: r.count,
    }))
    return [...base, ...hybrid]
  }, [speedByMethod, hybridComparison])

  const lengthEffectSummary = useMemo(() => {
    const rows = speedByLength
    if (!rows.length) return null
    const lengths = rows.map((r) => r.length).sort((a, b) => a - b)
    const first = rows.find((r) => r.length === lengths[0]) || null
    const last = rows.find((r) => r.length === lengths[lengths.length - 1]) || null
    if (!first || !last) return null

    const items = [
      { method: "Caesar", start: first.caesar, end: last.caesar },
      { method: "Double Caesar", start: first.doubleCaesar, end: last.doubleCaesar },
      { method: "Affine", start: first.affine, end: last.affine },
      { method: "Hybrid", start: first.hybrid, end: last.hybrid },
    ]
    return {
      minLen: lengths[0],
      maxLen: lengths[lengths.length - 1],
      deltas: items.map((it) => ({
        method: it.method,
        start: it.start,
        end: it.end,
        delta: typeof it.start === "number" && typeof it.end === "number" ? it.end - it.start : null,
      })),
    }
  }, [speedByLength])

  const keyInfluence = useMemo(() => {
    const map = new Map()
    for (const log of encryptLogs) {
      if (typeof log.timeMs !== "number") continue
      const keys = log.keys || {}
      const keyText =
        log.mode === "caesar"
          ? `K=${keys.k1 ?? "-"}`
          : log.mode === "double-caesar"
          ? `K1=${keys.k1 ?? "-"} K2=${keys.k2 ?? "-"}`
          : log.mode === "affine"
          ? `A=${keys.a ?? "-"} B=${keys.b ?? "-"}`
          : `A=${keys.a ?? "-"} B=${keys.b ?? "-"} K1=${keys.k1 ?? "-"} K2=${keys.k2 ?? "-"}`
      const method = log.mode || "unknown"
      const sig = `${method}::${keyText}`
      if (!map.has(sig)) map.set(sig, { method, keyText, times: [] })
      map.get(sig).times.push(log.timeMs)
    }

    const perMethod = new Map()
    for (const entry of map.values()) {
      const avg = aggregateStats(entry.times).avg
      if (avg == null) continue
      if (!perMethod.has(entry.method)) perMethod.set(entry.method, [])
      perMethod.get(entry.method).push(avg)
    }

    const summary = []
    for (const [method, avgs] of perMethod.entries()) {
      const stats = aggregateStats(avgs)
      summary.push({
        method,
        keyVariants: stats.n,
        avgOfKeyAvgs: stats.avg,
        minKeyAvg: stats.min,
        maxKeyAvg: stats.max,
        spread: typeof stats.min === "number" && typeof stats.max === "number" ? stats.max - stats.min : null,
      })
    }
    summary.sort((a, b) => (a.method < b.method ? -1 : 1))
    return summary
  }, [encryptLogs])

  const securityKeyspace = useMemo(() => {
    const rows = keyspaceRow()
    const minRow = rows.reduce((best, cur) => (!best || cur.keyspace < best.keyspace ? cur : best), null)
    const maxRow = rows.reduce((best, cur) => (!best || cur.keyspace > best.keyspace ? cur : best), null)
    return { rows, minRow, maxRow }
  }, [])

  const speedExtremes = useMemo(() => {
    const rows = speedMethodFinal.filter((r) => typeof r.avgMs === "number" && Number.isFinite(r.avgMs))
    if (!rows.length) return null
    const fastest = rows.reduce((best, cur) => (cur.avgMs < best.avgMs ? cur : best), rows[0])
    const slowest = rows.reduce((best, cur) => (cur.avgMs > best.avgMs ? cur : best), rows[0])
    return { fastest, slowest }
  }, [speedMethodFinal])

  const securityExtremesEmpirical = useMemo(() => {
    const rows = bruteForceFromData.filter((r) => typeof r.avgTimeMs === "number" && Number.isFinite(r.avgTimeMs))
    if (!rows.length) return null
    const hardest = rows.reduce((best, cur) => (cur.avgTimeMs > best.avgTimeMs ? cur : best), rows[0])
    const easiest = rows.reduce((best, cur) => (cur.avgTimeMs < best.avgTimeMs ? cur : best), rows[0])
    return { hardest, easiest }
  }, [bruteForceFromData])

  const classificationTable = useMemo(() => {
    const speedRows = speedMethodFinal
      .filter((r) => typeof r.avgMs === "number" && Number.isFinite(r.avgMs))
      .map((r) => ({ name: r.method, avgMs: r.avgMs }))

    const keyspaceMap = new Map(securityKeyspace.rows.map((r) => [r.method, r.keyspace]))
    const rows = speedRows
      .map((r) => ({ method: r.name, avgMs: r.avgMs, keyspace: keyspaceMap.get(r.name) ?? null }))
      .filter((r) => typeof r.keyspace === "number" && Number.isFinite(r.keyspace))

    const speedMedian = median(rows.map((r) => r.avgMs))
    const securityMedian = median(rows.map((r) => r.keyspace))
    if (speedMedian == null || securityMedian == null) {
      return { speedMedian: null, securityMedian: null, quadrants: null, rows: [] }
    }

    const quadrants = {
      fastSafe: [],
      fastUnsafe: [],
      slowSafe: [],
      slowUnsafe: [],
    }

    for (const r of rows) {
      const fast = r.avgMs <= speedMedian
      const safe = r.keyspace >= securityMedian
      if (fast && safe) quadrants.fastSafe.push(r.method)
      else if (fast && !safe) quadrants.fastUnsafe.push(r.method)
      else if (!fast && safe) quadrants.slowSafe.push(r.method)
      else quadrants.slowUnsafe.push(r.method)
    }

    return { speedMedian, securityMedian, quadrants, rows }
  }, [speedMethodFinal, securityKeyspace])

  async function exportReport() {
    const wb = XLSX.utils.book_new()

    const usedSessions = sessions
      .filter((s) => effectiveIds.includes(s.id))
      .sort((a, b) => (a.number || 0) - (b.number || 0))

    const configRows = [
      { Field: "Kelompok Filter", Value: groupFilter || "Semua" },
      { Field: "Jumlah Sesi Dipakai", Value: usedSessions.length },
      { Field: "Jumlah Log Analysis", Value: analysisLogs.length },
      { Field: "Jumlah Log Non-Analysis", Value: encryptLogs.length },
      { Field: "Jumlah Riwayat Attacker", Value: attacks.length },
      { Field: "Exported At", Value: new Date().toLocaleString() },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(configRows), "Konfigurasi")

    const usedSessionsRows = usedSessions.map((s) => ({
      "No Sesi": s.number,
      Kelompok: s.group || "-",
      "No Kelompok": typeof s.groupNo === "number" ? s.groupNo : "-",
      Algoritma: s.algorithm || "-",
      "Mode Kunci": s.keyMode || "-",
      "Panjang Teks": typeof s.textLength === "number" ? s.textLength : "-",
      "Jumlah Run": typeof s.runCount === "number" ? s.runCount : "-",
      "Jenis Uji": s.testType || "-",
      Dibuat: s.createdAt ? new Date(s.createdAt).toLocaleString() : "-",
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(usedSessionsRows), "Sesi-Dipakai")

    const vars = [
      {
        No: 1,
        "Jenis Variabel": "Independen",
        "Nama Variabel": "Metode Kriptografi",
        "Definisi Operasional":
          "Jenis algoritma kriptografi yang digunakan dalam proses enkripsi dan dekripsi pada eksperimen",
        Indikator:
          "Caesar Cipher, Double Caesar Cipher, Affine Cipher, Caesar → Affine, Double Caesar → Affine, Caesar → Double Caesar → Affine",
        Satuan: "Kategori",
      },
      {
        No: 2,
        "Jenis Variabel": "Independen",
        "Nama Variabel": "Panjang Plaintext",
        "Definisi Operasional":
          "Jumlah karakter teks yang digunakan sebagai input dalam proses enkripsi",
        Indikator: "20, 50, 100, 200 karakter",
        Satuan: "Karakter",
      },
      {
        No: 3,
        "Jenis Variabel": "Independen",
        "Nama Variabel": "Kunci Enkripsi",
        "Definisi Operasional":
          "Nilai parameter kunci yang digunakan pada masing-masing algoritma kriptografi",
        Indikator: "K (Caesar), K1 dan K2 (Double Caesar), A dan B (Affine)",
        Satuan: "Numerik",
      },
      {
        No: 4,
        "Jenis Variabel": "Dependen",
        "Nama Variabel": "Kecepatan Algoritma",
        "Definisi Operasional":
          "Tingkat kecepatan algoritma dalam melakukan proses enkripsi dan dekripsi terhadap plaintext",
        Indikator: "Waktu eksekusi proses kriptografi",
        Satuan: "Milidetik (ms)",
      },
      {
        No: 5,
        "Jenis Variabel": "Dependen",
        "Nama Variabel": "Keamanan Algoritma",
        "Definisi Operasional":
          "Tingkat ketahanan algoritma terhadap serangan brute force berdasarkan jumlah kemungkinan kombinasi kunci",
        Indikator: "Ruang kunci (keyspace) dan simulasi brute force",
        Satuan: "Numerik",
      },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(vars), "Variabel")

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        speedMethodFinal.map((r, i) => ({
          No: i + 1,
          Metode: r.method,
          "Rata-rata Waktu (ms)": r.avgMs != null ? r.avgMs : null,
          "Minimum (ms)": r.minMs != null ? r.minMs : null,
          "Maximum (ms)": r.maxMs != null ? r.maxMs : null,
          N: r.n,
        }))
      ),
      "Kecepatan-Metode"
    )

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        speedByLength.map((r, i) => ({
          No: i + 1,
          "Panjang Teks": r.length,
          "Caesar (ms)": r.caesar,
          "Double Caesar (ms)": r.doubleCaesar,
          "Affine (ms)": r.affine,
          "Hybrid (ms)": r.hybrid,
        }))
      ),
      "Kecepatan-Panjang"
    )

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        hybridComparison.map((r, i) => ({
          No: i + 1,
          "Model Hybrid": r.model,
          "Rata-rata (ms)": r.avgMs,
          "Minimum (ms)": r.minMs,
          "Maximum (ms)": r.maxMs,
          N: r.count,
        }))
      ),
      "Hybrid-Model"
    )

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        keyVariation.map((r, i) => ({
          No: i + 1,
          Metode: r.method,
          Kunci: r.key,
          Ciphertext: r.ciphertext,
          "Waktu (ms)": r.timeMs,
          Sesi: r.session,
        }))
      ),
      "Variasi-Kunci"
    )

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        keyspaceRow().map((r, i) => ({
          No: i + 1,
          Metode: r.method,
          "Jumlah Kemungkinan Kunci": r.keyspace,
          "Kompleksitas Brute Force": r.complexity,
        }))
      ),
      "Keamanan-Keyspace"
    )

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        bruteForceFromData.map((r, i) => ({
          No: i + 1,
          Algoritma: r.algorithm,
          "Jumlah Serangan": r.attacks,
          "Rata-rata Waktu (ms)": r.avgTimeMs,
          "Rata-rata Kombinasi Diuji": r.avgTried,
          "Success Rate": r.successRate,
        }))
      ),
      "Keamanan-Attacker"
    )

    if (frequencyDistribution) {
      const rows = []
      const labels = Object.keys(frequencyDistribution)
      for (const label of labels) {
        const freq = frequencyDistribution[label] || []
        for (const [ch, count] of freq) {
          rows.push({ Metode: label, Huruf: ch, Frekuensi: count })
        }
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Frekuensi")
    }

    const narrativeRows = [
      { Bagian: "4.3.1", Judul: "Hasil Pengujian Berdasarkan Metode", Ringkasan: speedExtremes ? `Metode tercepat: ${speedExtremes.fastest.method} (${toFixedOrDash(speedExtremes.fastest.avgMs)} ms). Metode paling lambat: ${speedExtremes.slowest.method} (${toFixedOrDash(speedExtremes.slowest.avgMs)} ms).` : "Belum ada data." },
      { Bagian: "4.3.2", Judul: "Hasil Pengujian Berdasarkan Panjang Plaintext", Ringkasan: lengthEffectSummary ? `Rentang panjang teks: ${lengthEffectSummary.minLen}–${lengthEffectSummary.maxLen} huruf. Kenaikan waktu (akhir - awal) dihitung dari rata-rata per panjang.` : "Belum ada data." },
      { Bagian: "4.3.3", Judul: "Hasil Pengujian Berdasarkan Kunci", Ringkasan: keyInfluence.length ? "Perbedaan kunci mengubah ciphertext. Pengaruh kunci terhadap waktu cenderung kecil dibanding panjang teks." : "Belum ada data." },
      { Bagian: "4.3.4", Judul: "Analisis Kecepatan", Ringkasan: speedExtremes ? "Algoritma dasar (Caesar/Double Caesar/Affine) umumnya lebih cepat dibanding kombinasi hybrid karena komposisi operasi lebih banyak." : "Belum ada data." },
      { Bagian: "4.4.1", Judul: "Analisis Keyspace", Ringkasan: securityKeyspace.maxRow && securityKeyspace.minRow ? `Keyspace terbesar: ${securityKeyspace.maxRow.method} (${securityKeyspace.maxRow.keyspace}). Terkecil: ${securityKeyspace.minRow.method} (${securityKeyspace.minRow.keyspace}).` : "Belum ada data." },
      { Bagian: "4.4.2", Judul: "Simulasi Brute Force", Ringkasan: securityExtremesEmpirical ? `Waktu brute force rata-rata terbesar (paling sulit): ${securityExtremesEmpirical.hardest.algorithm} (${toFixedOrDash(securityExtremesEmpirical.hardest.avgTimeMs)} ms). Terkecil (paling mudah): ${securityExtremesEmpirical.easiest.algorithm} (${toFixedOrDash(securityExtremesEmpirical.easiest.avgTimeMs)} ms).` : "Belum ada data attacker." },
      { Bagian: "4.4.3", Judul: "Perbandingan Tingkat Keamanan", Ringkasan: "Secara teori, kombinasi hybrid meningkatkan ruang kunci (keyspace) sehingga memperbesar biaya brute force." },
      { Bagian: "4.4.4", Judul: "Analisis Keamanan", Ringkasan: "Kompleksitas (ruang kunci) berbanding lurus dengan ketahanan brute force; kombinasi hybrid memberi trade-off tambahan waktu eksekusi." },
      { Bagian: "4.5.1", Judul: "Tabel Klasifikasi (Kecepatan vs Keamanan)", Ringkasan: classificationTable.speedMedian != null ? `Ambang cepat: <= ${toFixedOrDash(classificationTable.speedMedian)} ms. Ambang aman: >= ${classificationTable.securityMedian}.` : "Belum ada data klasifikasi." },
      { Bagian: "4.5.2", Judul: "Analisis Klasifikasi", Ringkasan: "Metode terbaik ditentukan dari kebutuhan: jika prioritas keamanan, pilih keyspace terbesar; jika prioritas waktu, pilih avg ms terkecil." },
      { Bagian: "4.6", Judul: "Pembahasan Hasil", Ringkasan: "Hasil memperlihatkan trade-off: metode lebih kompleks cenderung lebih aman namun membutuhkan waktu lebih besar." },
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(narrativeRows), "Narasi")

    if (classificationTable.quadrants) {
      const rows = [
        { Kategori: "Cepat + Aman", Metode: classificationTable.quadrants.fastSafe.join(", ") || "-" },
        { Kategori: "Cepat + Tidak Aman", Metode: classificationTable.quadrants.fastUnsafe.join(", ") || "-" },
        { Kategori: "Tidak Cepat + Aman", Metode: classificationTable.quadrants.slowSafe.join(", ") || "-" },
        { Kategori: "Tidak Cepat + Tidak Aman", Metode: classificationTable.quadrants.slowUnsafe.join(", ") || "-" },
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Klasifikasi")
    }

    const suffix = groupFilter ? `Kelompok_${groupFilter}` : "Semua"
    XLSX.writeFile(wb, `Laporan_Penelitian_${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Laporan Akhir Penelitian
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Menghasilkan tabel akhir dari sesi pengujian (kecepatan, variasi kunci, keamanan).
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/sessions"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
          >
            Sesi
          </Link>
          <button
            type="button"
            onClick={exportReport}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Export Excel
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Kelompok</label>
          <select
            className="block w-56 rounded-lg border-slate-200 text-xs shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="">Semua</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-700">Sesi Terpilih (opsional)</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-blue-500 hover:text-blue-700"
              onClick={() => setSelectedIds(filteredSessions.map((s) => s.id))}
            >
              Pilih Semua (Kelompok)
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-blue-500 hover:text-blue-700"
              onClick={() => setSelectedIds([])}
            >
              Kosongkan
            </button>
          </div>
          <div className="mt-2 max-h-40 w-80 overflow-auto rounded-lg border border-slate-200 bg-white p-2">
            {filteredSessions.map((s) => {
              const checked = selectedIds.includes(s.id)
              return (
                <label key={s.id} className="mb-1 flex items-center gap-2 text-[11px] text-slate-700">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds([...selectedIds, s.id])
                      } else {
                        setSelectedIds(selectedIds.filter((x) => x !== s.id))
                      }
                    }}
                  />
                  <span>{`No ${s.number} • ${s.group || "-"} • ${s.testType || "-"} • ${s.algorithm || "-"}`}</span>
                </label>
              )
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-xs text-slate-600 shadow-sm">
          Memuat data laporan...
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Tabel Variabel Penelitian</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      No
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Jenis
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Nama Variabel
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Definisi Operasional
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Indikator
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Satuan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      no: 1,
                      jenis: "Independen",
                      nama: "Metode Kriptografi",
                      definisi:
                        "Jenis algoritma kriptografi yang digunakan dalam proses enkripsi dan dekripsi pada eksperimen",
                      indikator:
                        "Caesar Cipher, Double Caesar Cipher, Affine Cipher, Caesar → Affine, Double Caesar → Affine, Caesar → Double Caesar → Affine",
                      satuan: "Kategori",
                    },
                    {
                      no: 2,
                      jenis: "Independen",
                      nama: "Panjang Plaintext",
                      definisi:
                        "Jumlah karakter teks yang digunakan sebagai input dalam proses enkripsi",
                      indikator: "20, 50, 100, 200 karakter",
                      satuan: "Karakter",
                    },
                    {
                      no: 3,
                      jenis: "Independen",
                      nama: "Kunci Enkripsi",
                      definisi:
                        "Nilai parameter kunci yang digunakan pada masing-masing algoritma kriptografi",
                      indikator:
                        "K (Caesar), K1 dan K2 (Double Caesar), A dan B (Affine)",
                      satuan: "Numerik",
                    },
                    {
                      no: 4,
                      jenis: "Dependen",
                      nama: "Kecepatan Algoritma",
                      definisi:
                        "Tingkat kecepatan algoritma dalam melakukan proses enkripsi dan dekripsi terhadap plaintext",
                      indikator: "Waktu eksekusi proses kriptografi",
                      satuan: "Milidetik (ms)",
                    },
                    {
                      no: 5,
                      jenis: "Dependen",
                      nama: "Keamanan Algoritma",
                      definisi:
                        "Tingkat ketahanan algoritma terhadap serangan brute force berdasarkan jumlah kemungkinan kombinasi kunci",
                      indikator: "Ruang kunci (keyspace) dan simulasi brute force",
                      satuan: "Numerik",
                    },
                  ].map((r) => (
                    <tr key={r.no} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{r.no}</td>
                      <td className="px-3 py-2 text-slate-700">{r.jenis}</td>
                      <td className="px-3 py-2 text-slate-700">{r.nama}</td>
                      <td className="px-3 py-2 text-slate-700">{r.definisi}</td>
                      <td className="px-3 py-2 text-slate-700">{r.indikator}</td>
                      <td className="px-3 py-2 text-slate-700">{r.satuan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Tabel Pengujian Kecepatan Berdasarkan Metode
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Perbandingan: Caesar, Double Caesar, Affine, dan 3 kombinasi Hybrid.
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              4.3.1 Hasil Pengujian Berdasarkan Metode. {speedExtremes ? `Metode tercepat: ${speedExtremes.fastest.method} (${toFixedOrDash(speedExtremes.fastest.avgMs)} ms). Metode paling lambat: ${speedExtremes.slowest.method} (${toFixedOrDash(speedExtremes.slowest.avgMs)} ms).` : "Belum ada data untuk menentukan tercepat/terlambat."}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      No
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Metode
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Rata-rata (ms)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Minimum (ms)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Maximum (ms)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {speedMethodFinal.map((r, idx) => (
                    <tr key={r.method} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-700">{r.method}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.avgMs != null ? r.avgMs.toFixed(3) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.minMs != null ? r.minMs.toFixed(3) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.maxMs != null ? r.maxMs.toFixed(3) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Tabel Pengujian Berdasarkan Panjang Teks
            </h2>
            <p className="mt-2 text-[11px] text-slate-500">
              4.3.2 Hasil Pengujian Berdasarkan Panjang Plaintext. {lengthEffectSummary ? `Rentang panjang teks: ${lengthEffectSummary.minLen}–${lengthEffectSummary.maxLen} huruf. Secara umum, waktu meningkat seiring panjang plaintext karena kompleksitas enkripsi bersifat linear terhadap jumlah karakter (≈ O(n)).` : "Belum ada data panjang teks."}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      No
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Panjang Teks
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Caesar (ms)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Double Caesar (ms)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Affine (ms)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Hybrid (ms)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {speedByLength.map((r, idx) => (
                    <tr key={r.length} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-700">{r.length}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.caesar != null ? r.caesar.toFixed(3) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.doubleCaesar != null ? r.doubleCaesar.toFixed(3) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.affine != null ? r.affine.toFixed(3) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.hybrid != null ? r.hybrid.toFixed(3) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Perbandingan 3 Model Hybrid
            </h2>
            <p className="mt-2 text-[11px] text-slate-500">
              Tabel ini dipakai untuk menentukan kombinasi hybrid yang paling optimal dari sisi kecepatan.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      No
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Model
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Rata-rata (ms)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Minimum (ms)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Maximum (ms)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hybridComparison.map((r, idx) => (
                    <tr key={r.model} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-700">{r.model}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.avgMs != null ? r.avgMs.toFixed(3) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.minMs != null ? r.minMs.toFixed(3) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.maxMs != null ? r.maxMs.toFixed(3) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Tabel Pengujian Variasi Kunci (contoh dari log)
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Menampilkan maksimal 30 baris pertama dari log non-analysis pada sesi yang dipilih (kelompok/all).
            </p>
            <p className="mt-2 text-[11px] text-slate-500">
              4.3.3 Hasil Pengujian Berdasarkan Kunci. Perubahan kunci mengubah ciphertext, tetapi perubahan kunci biasanya tidak meningkatkan waktu secara signifikan dibanding pengaruh panjang teks (selama panjang plaintext tetap).
            </p>
            {keyInfluence.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Metode
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Variasi Kunci
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Rentang Waktu (ms)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keyInfluence.map((r) => (
                      <tr key={r.method} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-700">{r.method}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{r.keyVariants}</td>
                        <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                          {r.spread != null ? r.spread.toFixed(3) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      No
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Metode
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Kunci
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Ciphertext
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Waktu (ms)
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Sesi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keyVariation.map((r, idx) => (
                    <tr key={`${r.session}-${idx}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-700">{r.method}</td>
                      <td className="px-3 py-2 text-slate-700">{r.key}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-800">
                        {r.ciphertext}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.timeMs != null ? r.timeMs.toFixed(3) : "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{r.session}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">4.3.4 Analisis Kecepatan</h2>
            <div className="mt-2 space-y-2 text-[11px] text-slate-600">
              <p>
                {speedExtremes
                  ? `Metode tercepat adalah ${speedExtremes.fastest.method} dengan rata-rata ${toFixedOrDash(speedExtremes.fastest.avgMs)} ms. Metode paling lambat adalah ${speedExtremes.slowest.method} dengan rata-rata ${toFixedOrDash(speedExtremes.slowest.avgMs)} ms.`
                  : "Belum ada data untuk menentukan metode tercepat dan paling lambat."}
              </p>
              <p>
                Pengaruh kompleksitas algoritma: kombinasi hybrid menambahkan tahapan operasi (komposisi cipher),
                sehingga rata-rata waktu cenderung meningkat dibanding metode tunggal.
              </p>
              <p>Kesimpulan sementara: memilih metode paling cepat bergantung pada kebutuhan sistem real-time, sedangkan metode hybrid memberi trade-off tambahan waktu untuk memperbesar ruang kunci.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Tabel Analisis Keamanan (Keyspace)
            </h2>
            <p className="mt-2 text-[11px] text-slate-500">
              4.4.1 Analisis Keyspace. {securityKeyspace.maxRow && securityKeyspace.minRow ? `Keyspace terbesar: ${securityKeyspace.maxRow.method} (${securityKeyspace.maxRow.keyspace.toLocaleString()}). Keyspace terkecil: ${securityKeyspace.minRow.method} (${securityKeyspace.minRow.keyspace.toLocaleString()}).` : "Belum ada data."}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      No
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Metode
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Jumlah Kemungkinan Kunci
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Kompleksitas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keyspaceRow().map((r, idx) => (
                    <tr key={r.method} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-700">{r.method}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.keyspace.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{r.complexity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Ringkasan Brute Force (dari modul Attacker)
            </h2>
            <p className="mt-2 text-[11px] text-slate-500">
              4.4.2 Simulasi Brute Force. {securityExtremesEmpirical ? `Paling sulit (waktu rata-rata terbesar): ${securityExtremesEmpirical.hardest.algorithm} (${toFixedOrDash(securityExtremesEmpirical.hardest.avgTimeMs)} ms). Paling mudah: ${securityExtremesEmpirical.easiest.algorithm} (${toFixedOrDash(securityExtremesEmpirical.easiest.avgTimeMs)} ms).` : "Belum ada data attacker untuk diringkas."}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      No
                    </th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Algoritma
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Jumlah Serangan
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Rata-rata Waktu (ms)
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Rata-rata Kombinasi Diuji
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Success Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bruteForceFromData.map((r, idx) => (
                    <tr key={r.algorithm} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-700">{r.algorithm}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{r.attacks}</td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.avgTimeMs != null ? r.avgTimeMs.toFixed(3) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                        {r.avgTried != null ? r.avgTried.toFixed(2) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {(r.successRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">4.4.3–4.4.4 Analisis Keamanan</h2>
            <div className="mt-2 space-y-2 text-[11px] text-slate-600">
              <p>
                Perbandingan tingkat keamanan menunjukkan metode dengan ruang kunci terbesar lebih tahan brute force,
                karena jumlah kombinasi yang harus dicoba meningkat drastis.
              </p>
              <p>
                Pengaruh kombinasi hybrid: menggabungkan dua/lebih transformasi meningkatkan keyspace (perkalian ruang kunci),
                sehingga meningkatkan biaya komputasi serangan brute force.
              </p>
              <p>
                Hubungan kompleksitas dengan keamanan: semakin besar keyspace, semakin tinggi ketahanan terhadap brute force.
                Kelebihan metode hybrid adalah meningkatkan keyspace tanpa mengubah panjang plaintext.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">4.5 Klasifikasi Hasil (Kecepatan vs Keamanan)</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              4.5.1 Tabel Klasifikasi. Ambang cepat diambil dari median waktu (ms), ambang aman dari median keyspace.
            </p>
            {classificationTable.quadrants ? (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Kategori
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Metode
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">Cepat + Aman</td>
                      <td className="px-3 py-2 text-slate-700">{classificationTable.quadrants.fastSafe.join(", ") || "-"}</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">Cepat + Tidak Aman</td>
                      <td className="px-3 py-2 text-slate-700">{classificationTable.quadrants.fastUnsafe.join(", ") || "-"}</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">Tidak Cepat + Aman</td>
                      <td className="px-3 py-2 text-slate-700">{classificationTable.quadrants.slowSafe.join(", ") || "-"}</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">Tidak Cepat + Tidak Aman</td>
                      <td className="px-3 py-2 text-slate-700">{classificationTable.quadrants.slowUnsafe.join(", ") || "-"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-3 text-xs text-slate-600">Belum ada data untuk klasifikasi.</div>
            )}
            <p className="mt-3 text-[11px] text-slate-600">
              4.5.2 Analisis Klasifikasi. Metode terbaik secara keseluruhan ditentukan oleh kebutuhan: sistem real-time cenderung memilih metode dengan waktu rata-rata paling kecil, sedangkan sistem dengan prioritas keamanan memilih metode dengan keyspace terbesar. Ini menunjukkan trade-off kecepatan vs keamanan.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">4.6 Pembahasan Hasil</h2>
            <div className="mt-2 space-y-2 text-[11px] text-slate-600">
              <p>
                Hasil pengujian menunjukkan tren umum: semakin kompleks metode (lebih banyak tahapan), semakin besar waktu eksekusi, namun di sisi lain keyspace meningkat sehingga lebih tahan brute force.
              </p>
              <p>
                Pada pengujian berbasis panjang plaintext, kenaikan waktu sejalan dengan bertambahnya jumlah karakter (≈ O(n)). Pada variasi kunci, perubahan kunci mengubah ciphertext tetapi dampaknya terhadap waktu relatif kecil dibanding panjang plaintext dan jumlah tahapan algoritma.
              </p>
              <p>
                Kontribusi penelitian terletak pada pemetaan trade-off ini dan pemilihan model hybrid yang optimal sesuai kebutuhan skenario penggunaan.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Distribusi Frekuensi Huruf (berdasarkan sesi)
            </h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Frekuensi dihitung dari agregasi log analysis pada sesi yang dipilih (kelompok/all).
            </p>
            {!frequencyDistribution ? (
              <div className="mt-3 text-xs text-slate-600">Belum ada data frekuensi untuk sesi ini.</div>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-100">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Metode
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Huruf
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Frekuensi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(frequencyDistribution).flatMap(([label, freq]) =>
                      (freq || []).slice(0, 26).map(([ch, count]) => (
                        <tr key={`${label}-${ch}`} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">{label}</td>
                          <td className="px-3 py-2 text-slate-700">{ch}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
