"use client"

import { useMemo, useState } from "react"
import { encryptCaesar } from "@/lib/caesar.js"
import { encryptAffine } from "@/lib/affine.js"
import { encryptHybrid } from "@/lib/hybrid.js"

const invertibleAValues = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]

function frequencyMap(text) {
  const normalized = text.toUpperCase().replace(/[^A-Z]/g, "")
  const map = new Map()
  for (const ch of normalized) {
    map.set(ch, (map.get(ch) || 0) + 1)
  }
  return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1))
}

export default function AnalysisPage() {
  const [text, setText] = useState("KRIPTOGRAFIHYBRID")
  const [a, setA] = useState(invertibleAValues[1])
  const [b, setB] = useState(8)
  const [k1, setK1] = useState(3)
  const [k2, setK2] = useState(7)
  const [runs, setRuns] = useState(5)
  const [keyMode, setKeyMode] = useState("manual")
  const [results, setResults] = useState(null)

  const inputStats = useMemo(() => {
    const normalized = text.toUpperCase().replace(/[^A-Z]/g, "")
    const length = normalized.length
    const uniqueChars = normalized ? new Set(normalized.split("")).size : 0
    return { length, uniqueChars }
  }, [text])

  const summary = useMemo(() => {
    if (!results) return null
    const baseline = results.caesar.avgTime
    const items = [
      {
        key: "caesar",
        label: "Caesar",
        avgTime: results.caesar.avgTime,
        minTime: results.caesar.minTime,
        maxTime: results.caesar.maxTime,
      },
      {
        key: "doubleCaesar",
        label: "Double Caesar",
        avgTime: results.doubleCaesar.avgTime,
        minTime: results.doubleCaesar.minTime,
        maxTime: results.doubleCaesar.maxTime,
      },
      {
        key: "affine",
        label: "Affine",
        avgTime: results.affine.avgTime,
        minTime: results.affine.minTime,
        maxTime: results.affine.maxTime,
      },
      {
        key: "hybrid",
        label: "Hybrid",
        avgTime: results.hybrid.avgTime,
        minTime: results.hybrid.minTime,
        maxTime: results.hybrid.maxTime,
      },
    ]

    return items.map((item) => ({
      ...item,
      relToCaesar:
        baseline && item.avgTime != null && baseline > 0
          ? item.avgTime / baseline
          : null,
    }))
  }, [results])

  const runAnalysis = async () => {
    let aUsed = a
    let bUsed = b
    let k1Used = k1
    let k2Used = k2

    if (keyMode === "random") {
      aUsed =
        invertibleAValues[Math.floor(Math.random() * invertibleAValues.length)]
      bUsed = Math.floor(Math.random() * 26)
      k1Used = Math.floor(Math.random() * 26)
      k2Used = Math.floor(Math.random() * 26)
    } else if (keyMode === "timestamp") {
      const now = Date.now()
      aUsed = invertibleAValues[now % invertibleAValues.length]
      bUsed = now % 26
      k1Used = (now >> 3) % 26
      k2Used = (now >> 5) % 26
    }

    const executions = {
      caesar: { times: [], cipher: "", freq: [] },
      doubleCaesar: { times: [], cipher: "", freq: [] },
      affine: { times: [], cipher: "", freq: [] },
      hybrid: { times: [], cipher: "", freq: [] },
    }

    const iterations = Math.max(1, Math.min(Number(runs) || 1, 50))

    for (let i = 0; i < iterations; i++) {
      let start = performance.now()
      const caesar = encryptCaesar(text, k1Used)
      let end = performance.now()
      executions.caesar.times.push(end - start)
      executions.caesar.cipher = caesar
      executions.caesar.freq = frequencyMap(caesar)

      start = performance.now()
      const doubleCaesar = encryptCaesar(
        encryptCaesar(text, k1Used),
        k2Used
      )
      end = performance.now()
      executions.doubleCaesar.times.push(end - start)
      executions.doubleCaesar.cipher = doubleCaesar
      executions.doubleCaesar.freq = frequencyMap(doubleCaesar)

      start = performance.now()
      const affine = encryptAffine(text, aUsed, bUsed)
      end = performance.now()
      executions.affine.times.push(end - start)
      executions.affine.cipher = affine
      executions.affine.freq = frequencyMap(affine)

      start = performance.now()
      const hybrid = encryptHybrid(text, aUsed, bUsed, k1Used, k2Used)
      end = performance.now()
      executions.hybrid.times.push(end - start)
      executions.hybrid.cipher = hybrid
      executions.hybrid.freq = frequencyMap(hybrid)
    }

    function aggregateTimes(times) {
      if (!times.length) {
        return { avgTime: 0, minTime: 0, maxTime: 0 }
      }
      const sum = times.reduce((acc, t) => acc + t, 0)
      const minTime = Math.min(...times)
      const maxTime = Math.max(...times)
      return {
        avgTime: sum / times.length,
        minTime,
        maxTime,
      }
    }

    const aggregated = {
      caesar: { ...aggregateTimes(executions.caesar.times), cipher: executions.caesar.cipher, freq: executions.caesar.freq },
      doubleCaesar: {
        ...aggregateTimes(executions.doubleCaesar.times),
        cipher: executions.doubleCaesar.cipher,
        freq: executions.doubleCaesar.freq,
      },
      affine: { ...aggregateTimes(executions.affine.times), cipher: executions.affine.cipher, freq: executions.affine.freq },
      hybrid: { ...aggregateTimes(executions.hybrid.times), cipher: executions.hybrid.cipher, freq: executions.hybrid.freq },
    }

    setResults(aggregated)

    try {
      const normalizedLength = text
        ? text.toUpperCase().replace(/[^A-Z]/g, "").length
        : 0
      await fetch("/api/experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "analysis",
          text,
          textLength: normalizedLength,
          keyMode,
          keys: { a: aUsed, b: bUsed, k1: k1Used, k2: k2Used },
          source: "analysis-page",
          metrics: aggregated,
        }),
      })
    } catch (e) {
    }
  }

  const bestKey = useMemo(() => {
    if (!summary) return null
    return summary.reduce((best, current) => {
      if (!best) return current
      return current.avgTime < best.avgTime ? current : best
    }, null)
  }, [summary])

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Analisis Algoritma Cipher
        </h1>
        <p className="text-sm text-slate-500">
          Bandingkan waktu eksekusi dan distribusi huruf antara Caesar, Double Caesar,
          Affine, dan Hybrid.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Pengaturan Analisis</h2>
              <span className="text-xs text-slate-400">
                Teks saat ini: {text.length} karakter
              </span>
            </div>
            <textarea
              rows={4}
              className="mt-3 w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  a (Affine)
                </label>
                <input
                  type="number"
                  value={a}
                  onChange={(e) => setA(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  b (Affine)
                </label>
                <input
                  type="number"
                  value={b}
                  onChange={(e) => setB(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  k1 (Caesar 1)
                </label>
                <input
                  type="number"
                  value={k1}
                  onChange={(e) => setK1(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  k2 (Caesar 2)
                </label>
                <input
                  type="number"
                  value={k2}
                  onChange={(e) => setK2(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Jumlah run
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={runs}
                  onChange={(e) => setRuns(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Mode kunci
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setKeyMode("manual")}
                    className={`flex-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                      keyMode === "manual"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                    }`}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeyMode("random")}
                    className={`flex-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                      keyMode === "random"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                    }`}
                  >
                    Random
                  </button>
                  <button
                    type="button"
                    onClick={() => setKeyMode("timestamp")}
                    className={`flex-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                      keyMode === "timestamp"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                    }`}
                  >
                    Timestamp
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={runAnalysis}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Jalankan Analisis
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Analisis akan menjalankan enkripsi berkali-kali (sesuai jumlah run) untuk
              mendapatkan rata-rata waktu, minimum, dan maksimum.
            </p>
          </div>

          {results && summary && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Ringkasan Waktu Eksekusi
                </h2>
                <span className="text-[11px] text-slate-400">
                  Dibandingkan terhadap Caesar sebagai baseline
                </span>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                        Algoritma
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
                      <th className="px-3 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">
                        x Caesar
                      </th>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                        Visual
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row) => {
                      const maxAvg = Math.max(
                        summary[0].avgTime,
                        summary[1].avgTime,
                        summary[2].avgTime,
                        summary[3].avgTime
                      )
                      const ratio = maxAvg > 0 ? (row.avgTime / maxAvg) * 100 : 0
                      return (
                        <tr key={row.key} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-700">{row.label}</td>
                          <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                            {row.avgTime.toFixed(3)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                            {row.minTime.toFixed(3)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-800">
                            {row.maxTime.toFixed(3)}
                          </td>
                          <td className="px-3 py-2 text-right text-[11px] text-slate-700">
                            {row.relToCaesar != null
                              ? `${row.relToCaesar.toFixed(2)}x`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="h-2 w-full max-w-xs rounded-full bg-slate-100">
                              <div
                                className="h-2 rounded-full bg-blue-500"
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {bestKey && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Algoritma tercepat (rata-rata):{" "}
                  <span className="font-semibold text-blue-700">{bestKey.label}</span>{" "}
                  dengan waktu sekitar {bestKey.avgTime.toFixed(3)} ms.
                </p>
              )}
            </div>
          )}

          {results && summary && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Dimensi Penelitian
              </h2>
              <div className="mt-3 space-y-2 text-[11px] text-slate-600">
                <div>
                  <p className="font-semibold text-slate-800">
                    Implementasi Kriptografi Hybrid
                  </p>
                  <p>
                    Pengujian selalu menyertakan algoritma Hybrid bersama Caesar, Double
                    Caesar, dan Affine. Waktu rata-rata Hybrid saat ini sekitar{" "}
                    <span className="font-mono">
                      {results.hybrid.avgTime.toFixed(3)} ms
                    </span>
                    .
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Manajemen Kunci Dinamis
                  </p>
                  <p>
                    Mode kunci: <span className="font-mono">{keyMode}</span>. Nilai kunci
                    yang digunakan pada pengujian ini adalah{" "}
                    <span className="font-mono">
                      a={a}, b={b}, k1={k1}, k2={k2}
                    </span>
                    , merepresentasikan skema kunci statis atau dinamis.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Keamanan Data</p>
                  <p>
                    Panjang teks uji:{" "}
                    <span className="font-mono">
                      {inputStats.length} huruf, unik {inputStats.uniqueChars}
                    </span>
                    . Distribusi frekuensi ciphertext untuk tiap algoritma ditampilkan di
                    panel kanan sehingga memudahkan analisis ketahanan terhadap serangan
                    berbasis frekuensi.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Waktu Akses Data</p>
                  <p>
                    Tabel ringkasan menunjukkan rata-rata waktu enkripsi per algoritma.
                    Hybrid memiliki waktu sekitar{" "}
                    <span className="font-mono">
                      {results.hybrid.avgTime.toFixed(3)} ms
                    </span>{" "}
                    untuk teks di atas, yang dapat dibandingkan dengan algoritma lain
                    sebagai indikator waktu akses data terenkripsi.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    Efisiensi Pemrosesan Sistem
                  </p>
                  <p>
                    Algoritma tercepat adalah{" "}
                    <span className="font-mono">{bestKey.label}</span> dengan rata-rata{" "}
                    <span className="font-mono">
                      {bestKey.avgTime.toFixed(3)} ms
                    </span>
                    . Perbandingan nilai rata-rata, minimum, dan maksimum di tabel di atas
                    merepresentasikan efisiensi pemrosesan sistem untuk masing-masing
                    algoritma.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {results && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Ringkasan Cipher & Pola Huruf
              </h2>
              <div className="mt-3 space-y-3 text-xs text-slate-600">
                <CipherSummary
                  title="Caesar"
                  cipher={results.caesar.cipher}
                  time={results.caesar.avgTime}
                />
                <CipherSummary
                  title="Double Caesar"
                  cipher={results.doubleCaesar.cipher}
                  time={results.doubleCaesar.avgTime}
                />
                <CipherSummary
                  title="Affine"
                  cipher={results.affine.cipher}
                  time={results.affine.avgTime}
                />
                <CipherSummary
                  title="Hybrid"
                  cipher={results.hybrid.cipher}
                  time={results.hybrid.avgTime}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Distribusi Frekuensi Huruf
              </h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Semakin merata distribusi huruf, semakin sulit dilakukan analisis frekuensi
                klasik.
              </p>
              <div className="mt-3 grid gap-4">
                <FrequencyTable
                  title="Caesar"
                  data={results.caesar.freq}
                  colorClass="bg-red-500"
                />
                <FrequencyTable
                  title="Double Caesar"
                  data={results.doubleCaesar.freq}
                  colorClass="bg-orange-500"
                />
                <FrequencyTable
                  title="Affine"
                  data={results.affine.freq}
                  colorClass="bg-emerald-500"
                />
                <FrequencyTable
                  title="Hybrid"
                  data={results.hybrid.freq}
                  colorClass="bg-blue-500"
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function CipherSummary({ title, cipher, time }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase text-slate-500">
          {title}
        </span>
        <span className="font-mono text-[11px] text-blue-700">
          {time != null ? `${time.toFixed(3)} ms` : "—"}
        </span>
      </div>
      <p className="mt-1 line-clamp-2 font-mono text-[11px] text-slate-800">
        {cipher || "—"}
      </p>
    </div>
  )
}

function FrequencyTable({ title, data, colorClass }) {
  if (!data || data.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-slate-800">{title}</h3>
        <p className="text-[11px] text-slate-400">Tidak ada data frekuensi.</p>
      </div>
    )
  }

  const max = Math.max(...data.map(([, count]) => count))

  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-800">{title}</h3>
      <div className="mt-2 space-y-1">
        {data.map(([ch, count]) => {
          const ratio = max > 0 ? (count / max) * 100 : 0
          return (
            <div
              key={ch}
              className="flex items-center gap-2 text-[11px] text-slate-600"
            >
              <span className="w-4 font-mono text-[11px] text-slate-800">{ch}</span>
              <span className="w-6 text-right font-mono">{count}</span>
              <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full ${colorClass}`}
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
