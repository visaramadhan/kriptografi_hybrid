"use client"

import { useState } from "react"
import { decryptCaesar } from "@/lib/caesar.js"
import { decryptHybrid } from "@/lib/hybrid.js"

const invertibleAValues = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]

function scorePlaintext(text) {
  const normalized = (text || "").toUpperCase().replace(/[^A-Z]/g, "")
  if (!normalized) return 0
  const vowels = new Set(["A", "E", "I", "O", "U"])
  let vowelCount = 0
  for (const ch of normalized) {
    if (vowels.has(ch)) vowelCount++
  }
  return vowelCount / normalized.length
}

function bruteForceCaesar(ciphertext) {
  const candidates = []
  const normalized = (ciphertext || "").toUpperCase().replace(/[^A-Z]/g, "")
  for (let k = 0; k < 26; k++) {
    const plain = decryptCaesar(normalized, k)
    candidates.push({
      label: `k=${k}`,
      score: scorePlaintext(plain),
      plaintext: plain,
      params: { k },
    })
  }
  return candidates
}

function bruteForceDoubleCaesar(ciphertext) {
  const candidates = []
  const normalized = (ciphertext || "").toUpperCase().replace(/[^A-Z]/g, "")
  for (let k1 = 0; k1 < 26; k1++) {
    for (let k2 = 0; k2 < 26; k2++) {
      const step1 = decryptCaesar(normalized, k2)
      const plain = decryptCaesar(step1, k1)
      candidates.push({
        label: `k1=${k1}, k2=${k2}`,
        score: scorePlaintext(plain),
        plaintext: plain,
        params: { k1, k2 },
      })
    }
  }
  candidates.sort((a, b) => b.score - a.score)
  return candidates
}

function bruteForceHybridSubset(ciphertext) {
  const candidates = []
  const normalized = (ciphertext || "").toUpperCase().replace(/[^A-Z]/g, "")
  const subsetA = invertibleAValues.slice(0, 4)
  const maxB = 8
  const maxK = 8

  for (const a of subsetA) {
    for (let b = 0; b <= maxB; b++) {
      for (let k1 = 0; k1 <= maxK; k1++) {
        for (let k2 = 0; k2 <= maxK; k2++) {
          try {
            const plain = decryptHybrid(normalized, a, b, k1, k2)
            candidates.push({
              label: `a=${a}, b=${b}, k1=${k1}, k2=${k2}`,
              score: scorePlaintext(plain),
              plaintext: plain,
              params: { a, b, k1, k2 },
            })
          } catch {
          }
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score)
  return candidates
}

export default function AttackerPage() {
  const [ciphertext, setCiphertext] = useState("")
  const [algorithm, setAlgorithm] = useState("caesar")
  const [results, setResults] = useState([])
  const [attackTime, setAttackTime] = useState(null)
  const [knownK, setKnownK] = useState("")
  const [knownK1, setKnownK1] = useState("")
  const [knownK2, setKnownK2] = useState("")
  const [knownA, setKnownA] = useState("")
  const [knownB, setKnownB] = useState("")
  const [truePlaintext, setTruePlaintext] = useState("")
  const [trueRank, setTrueRank] = useState(null)
  const [trueFoundInSearch, setTrueFoundInSearch] = useState(null)

  const handleAttack = () => {
    const start = performance.now()
    let candidates = []

    if (algorithm === "caesar") {
      candidates = bruteForceCaesar(ciphertext)
    } else if (algorithm === "double-caesar") {
      candidates = bruteForceDoubleCaesar(ciphertext)
    } else if (algorithm === "hybrid-subset") {
      candidates = bruteForceHybridSubset(ciphertext)
    }

    const normalized = (ciphertext || "").toUpperCase().replace(/[^A-Z]/g, "")
    let recovered = ""
    let rank = null
    let foundInSearch = null

    if (algorithm === "caesar" && knownK !== "") {
      const kVal = Number(knownK)
      if (!Number.isNaN(kVal)) {
        try {
          recovered = decryptCaesar(normalized, kVal)
        } catch {
        }
        const idx = candidates.findIndex(
          (c) => c.params && typeof c.params.k === "number" && c.params.k === kVal,
        )
        if (idx >= 0) {
          rank = idx + 1
          foundInSearch = true
        } else {
          foundInSearch = false
        }
      }
    } else if (algorithm === "double-caesar" && knownK1 !== "" && knownK2 !== "") {
      const k1Val = Number(knownK1)
      const k2Val = Number(knownK2)
      if (!Number.isNaN(k1Val) && !Number.isNaN(k2Val)) {
        try {
          const step1 = decryptCaesar(normalized, k2Val)
          recovered = decryptCaesar(step1, k1Val)
        } catch {
        }
        const idx = candidates.findIndex(
          (c) =>
            c.params &&
            typeof c.params.k1 === "number" &&
            typeof c.params.k2 === "number" &&
            c.params.k1 === k1Val &&
            c.params.k2 === k2Val,
        )
        if (idx >= 0) {
          rank = idx + 1
          foundInSearch = true
        } else {
          foundInSearch = false
        }
      }
    } else if (
      algorithm === "hybrid-subset" &&
      knownA !== "" &&
      knownB !== "" &&
      knownK1 !== "" &&
      knownK2 !== ""
    ) {
      const aVal = Number(knownA)
      const bVal = Number(knownB)
      const k1Val = Number(knownK1)
      const k2Val = Number(knownK2)
      if (
        !Number.isNaN(aVal) &&
        !Number.isNaN(bVal) &&
        !Number.isNaN(k1Val) &&
        !Number.isNaN(k2Val)
      ) {
        try {
          recovered = decryptHybrid(normalized, aVal, bVal, k1Val, k2Val)
        } catch {
        }
        const idx = candidates.findIndex(
          (c) =>
            c.params &&
            typeof c.params.a === "number" &&
            typeof c.params.b === "number" &&
            typeof c.params.k1 === "number" &&
            typeof c.params.k2 === "number" &&
            c.params.a === aVal &&
            c.params.b === bVal &&
            c.params.k1 === k1Val &&
            c.params.k2 === k2Val,
        )
        if (idx >= 0) {
          rank = idx + 1
          foundInSearch = true
        } else {
          foundInSearch = false
        }
      }
    }

    const end = performance.now()
    const duration = end - start

    const normalizedLength = (ciphertext || "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "").length

    try {
      fetch("/api/attacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          algorithm,
          ciphertextLength: normalizedLength,
          totalTried,
          attackTime: duration,
          trueFoundInSearch: foundInSearch,
          trueRank: rank,
        }),
      }).catch(() => {})
    } catch {
    }

    setResults(candidates)
    setAttackTime(duration)
    setTruePlaintext(recovered)
    setTrueRank(rank)
    setTrueFoundInSearch(foundInSearch)
  }

  const totalTried =
    algorithm === "double-caesar"
      ? 26 * 26
      : algorithm === "hybrid-subset"
      ? invertibleAValues.slice(0, 4).length * 9 * 9 * 9
      : 26

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Modul Attacker (Simulasi Brute Force)
        </h1>
        <p className="text-sm text-slate-500">
          Mensimulasikan serangan brute force sederhana terhadap ciphertext untuk
          mengilustrasikan ruang kunci dan tingkat kesulitan pemulihan plaintext.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Input Ciphertext</h2>
            <textarea
              rows={4}
              className="mt-3 w-full min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              value={ciphertext}
              onChange={(e) => setCiphertext(e.target.value)}
              placeholder="Tempel ciphertext yang ingin diuji brute force di sini..."
            />

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Algoritma target
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                >
                  <option value="caesar">Caesar</option>
                  <option value="double-caesar">Double Caesar</option>
                  <option value="hybrid-subset">Hybrid (subset ruang kunci)</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Kunci sebenarnya (opsional)
                </label>
                {algorithm === "caesar" && (
                  <input
                    type="number"
                    min={0}
                    max={25}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={knownK}
                    onChange={(e) => setKnownK(e.target.value)}
                    placeholder="k (0-25)"
                  />
                )}
                {algorithm === "double-caesar" && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={0}
                      max={25}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={knownK1}
                      onChange={(e) => setKnownK1(e.target.value)}
                      placeholder="k1"
                    />
                    <input
                      type="number"
                      min={0}
                      max={25}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={knownK2}
                      onChange={(e) => setKnownK2(e.target.value)}
                      placeholder="k2"
                    />
                  </div>
                )}
                {algorithm === "hybrid-subset" && (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={knownA}
                      onChange={(e) => setKnownA(e.target.value)}
                      placeholder="a (coprime 26)"
                    />
                    <input
                      type="number"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={knownB}
                      onChange={(e) => setKnownB(e.target.value)}
                      placeholder="b"
                    />
                    <input
                      type="number"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={knownK1}
                      onChange={(e) => setKnownK1(e.target.value)}
                      placeholder="k1"
                    />
                    <input
                      type="number"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={knownK2}
                      onChange={(e) => setKnownK2(e.target.value)}
                      placeholder="k2"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1 text-[11px] text-slate-500">
                <div className="font-medium text-slate-600">
                  Tujuan pengaturan kunci sebenarnya
                </div>
                <p>
                  Isi kunci yang benar digunakan saat enkripsi ciphertext untuk melihat
                  apakah brute force mampu menemukan kombinasi kunci dan di peringkat
                  keberapa kandidat plaintext yang benar muncul.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAttack}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Jalankan Brute Force
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Modul ini mengekplorasi ruang kunci untuk Caesar, Double Caesar, dan subset
              ruang kunci Hybrid. Untuk Hybrid penuh ruang kunci jauh lebih besar sehingga
              brute force naif tidak realistis dan hanya disimulasikan pada sebagian kecil
              kombinasi kunci.
            </p>
          </div>

          {results.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Hasil Brute Force ({algorithm === "caesar"
                  ? "Caesar"
                  : algorithm === "double-caesar"
                  ? "Double Caesar"
                  : "Hybrid (subset)"})
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Menampilkan kandidat plaintext yang diurutkan berdasarkan skor sederhana
                (proporsi huruf vokal) sebagai pendekatan untuk memilih plaintext yang
                paling mungkin.
              </p>
              <div className="mt-3 max-h-[280px] overflow-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                        Kunci
                      </th>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                        Skor
                      </th>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                        Plaintext kandidat
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((row, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-3 py-1 font-mono text-slate-800">
                          {row.label}
                        </td>
                        <td className="px-3 py-1 font-mono text-slate-800">
                          {row.score.toFixed(3)}
                        </td>
                        <td className="px-3 py-1 font-mono text-slate-700">
                          {row.plaintext || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Ringkasan Serangan</h2>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Jumlah kombinasi kunci yang diuji</span>
                <span className="font-mono text-blue-700">
                  {results.length > 0 ? totalTried : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Waktu brute force</span>
                <span className="font-mono text-blue-700">
                  {attackTime != null ? `${attackTime.toFixed(3)} ms` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Kunci sebenarnya</span>
                <span className="font-mono text-blue-700">
                  {algorithm === "caesar" && knownK !== ""
                    ? `k=${knownK}`
                    : algorithm === "double-caesar" && knownK1 !== "" && knownK2 !== ""
                    ? `k1=${knownK1}, k2=${knownK2}`
                    : algorithm === "hybrid-subset" &&
                      knownA !== "" &&
                      knownB !== "" &&
                      knownK1 !== "" &&
                      knownK2 !== ""
                    ? `a=${knownA}, b=${knownB}, k1=${knownK1}, k2=${knownK2}`
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Posisi kandidat benar</span>
                <span className="font-mono text-blue-700">
                  {trueRank != null
                    ? `Peringkat ke-${trueRank}`
                    : trueFoundInSearch === false
                    ? "Tidak ditemukan dalam ruang kunci yang diserang"
                    : "—"}
                </span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Nilai di atas menggambarkan biaya brute force untuk algoritma yang dipilih.
              Double Caesar memiliki ruang kunci 26×26, sedangkan Hybrid memiliki ruang
              kunci jauh lebih besar sehingga pada modul ini hanya disimulasikan subset
              kombinasi kunci yang terbatas.
            </p>
          </div>

          {truePlaintext && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Plaintext Sebenarnya
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Hasil dekripsi ciphertext menggunakan kunci yang Anda isi sebagai kunci
                sebenarnya.
              </p>
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-800">
                {truePlaintext}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
