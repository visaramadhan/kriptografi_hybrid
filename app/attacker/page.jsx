"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { decryptCaesar } from "@/lib/caesar.js"
import { decryptHybrid } from "@/lib/hybrid.js"

const invertibleAValues = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]

const englishFreq = [
  0.08167, 0.01492, 0.02782, 0.04253, 0.12702, 0.02228, 0.02015, 0.06094, 0.06966,
  0.00153, 0.00772, 0.04025, 0.02406, 0.06749, 0.07507, 0.01929, 0.00095, 0.05987,
  0.06327, 0.09056, 0.02758, 0.00978, 0.0236, 0.0015, 0.01974, 0.00074,
]

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

function chiSquareScore(text) {
  const normalized = (text || "").toUpperCase().replace(/[^A-Z]/g, "")
  if (!normalized) return Infinity
  const counts = new Array(26).fill(0)
  for (const ch of normalized) {
    const idx = ch.charCodeAt(0) - 65
    if (idx >= 0 && idx < 26) counts[idx] += 1
  }
  const n = normalized.length
  let sum = 0
  for (let i = 0; i < 26; i++) {
    const expected = englishFreq[i] * n
    if (expected <= 0) continue
    const diff = counts[i] - expected
    sum += (diff * diff) / expected
  }
  return sum
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

function caesarCiphertextOnlyAttack(ciphertext) {
  const candidates = []
  const normalized = (ciphertext || "").toUpperCase().replace(/[^A-Z]/g, "")
  for (let k = 0; k < 26; k++) {
    const plain = decryptCaesar(normalized, k)
    candidates.push({
      label: `k=${k}`,
      chiSquare: chiSquareScore(plain),
      plaintext: plain,
      params: { k },
    })
  }
  candidates.sort((a, b) => a.chiSquare - b.chiSquare)
  return candidates
}

function deriveCaesarKeyFromKnownPlaintext(plainSnippet, cipherSnippet) {
  const p = (plainSnippet || "").toUpperCase().replace(/[^A-Z]/g, "")
  const c = (cipherSnippet || "").toUpperCase().replace(/[^A-Z]/g, "")
  if (!p || !c) {
    return { ok: false, error: "Known plaintext/ciphertext masih kosong." }
  }
  if (p.length !== c.length) {
    return { ok: false, error: "Panjang known plaintext dan ciphertext harus sama." }
  }
  let k = null
  for (let i = 0; i < p.length; i++) {
    const pi = p.charCodeAt(i) - 65
    const ci = c.charCodeAt(i) - 65
    const ki = (ci - pi + 26) % 26
    if (k == null) {
      k = ki
    } else if (k !== ki) {
      return { ok: false, error: "Pasangan known plaintext/ciphertext tidak konsisten untuk Caesar." }
    }
  }
  return { ok: true, k }
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
  const [attackMode, setAttackMode] = useState("bruteforce")
  const [algorithm, setAlgorithm] = useState("caesar")
  const [results, setResults] = useState([])
  const [attackTime, setAttackTime] = useState(null)
  const [knownK, setKnownK] = useState("")
  const [knownK1, setKnownK1] = useState("")
  const [knownK2, setKnownK2] = useState("")
  const [knownA, setKnownA] = useState("")
  const [knownB, setKnownB] = useState("")
  const [knownPlainSnippet, setKnownPlainSnippet] = useState("")
  const [knownCipherSnippet, setKnownCipherSnippet] = useState("")
  const [attackStatus, setAttackStatus] = useState("")
  const [truePlaintext, setTruePlaintext] = useState("")
  const [trueRank, setTrueRank] = useState(null)
  const [trueFoundInSearch, setTrueFoundInSearch] = useState(null)
  const [availableSessions, setAvailableSessions] = useState([])
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [sessionNumber, setSessionNumber] = useState(null)

  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch("/api/sessions")
        if (!res.ok) return
        const data = await res.json()
        setAvailableSessions(data.sessions || [])
      } catch {}
    }
    loadSessions()
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const idFromUrl = new URLSearchParams(window.location.search).get("sessionId")
    if (!idFromUrl) return
    setSelectedSessionId(idFromUrl)
  }, [])

  useEffect(() => {
    if (!selectedSessionId) {
      setSessionNumber(null)
      return
    }
    const s = availableSessions.find((x) => x.id === selectedSessionId)
    setSessionNumber(s ? s.number : null)
  }, [selectedSessionId, availableSessions])

  const handleAttack = () => {
    setAttackStatus("")
    const start = performance.now()
    let candidates = []

    if (attackMode === "bruteforce") {
      if (algorithm === "caesar") {
        candidates = bruteForceCaesar(ciphertext)
        candidates.sort((a, b) => b.score - a.score)
      } else if (algorithm === "double-caesar") {
        candidates = bruteForceDoubleCaesar(ciphertext)
      } else if (algorithm === "hybrid-subset") {
        candidates = bruteForceHybridSubset(ciphertext)
      }
    } else if (attackMode === "coa") {
      if (algorithm !== "caesar") {
        setAttackStatus("COA (ciphertext-only) pada demo ini hanya tersedia untuk Caesar.")
        return
      }
      candidates = caesarCiphertextOnlyAttack(ciphertext)
    } else if (attackMode === "kpa") {
      if (algorithm !== "caesar") {
        setAttackStatus("KPA (known-plaintext) pada demo ini hanya tersedia untuk Caesar.")
        return
      }
      const derived = deriveCaesarKeyFromKnownPlaintext(knownPlainSnippet, knownCipherSnippet)
      if (!derived.ok) {
        setAttackStatus(derived.error)
        return
      }
      const normalized = (ciphertext || "").toUpperCase().replace(/[^A-Z]/g, "")
      const plain = decryptCaesar(normalized, derived.k)
      candidates = [{ label: `k=${derived.k}`, score: 1, plaintext: plain, params: { k: derived.k } }]
    }

    const normalized = (ciphertext || "").toUpperCase().replace(/[^A-Z]/g, "")
    let recovered = ""
    let rank = null
    let foundInSearch = null

    if (attackMode === "kpa" && algorithm === "caesar") {
      recovered = candidates[0]?.plaintext || ""
      const bf = bruteForceCaesar(ciphertext)
      bf.sort((a, b) => b.score - a.score)
      const kVal = candidates[0]?.params?.k
      const idx = bf.findIndex((c) => c.params && typeof c.params.k === "number" && c.params.k === kVal)
      if (idx >= 0) {
        rank = idx + 1
        foundInSearch = true
      }
    } else if (attackMode === "coa" && algorithm === "caesar") {
      recovered = candidates[0]?.plaintext || ""
    } else if (attackMode === "bruteforce" && algorithm === "caesar" && knownK !== "") {
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
    } else if (attackMode === "bruteforce" && algorithm === "double-caesar" && knownK1 !== "" && knownK2 !== "") {
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
      attackMode === "bruteforce" &&
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
    const dataSizeBytes =
      typeof ciphertext === "string" ? new TextEncoder().encode(ciphertext).length : 0
    const dataSizeKb = dataSizeBytes / 1024

    const algorithmToLog = attackMode === "bruteforce" ? algorithm : `${algorithm}-${attackMode}`
    const totalTriedValue =
      attackMode === "bruteforce"
        ? totalTried
        : attackMode === "coa" && algorithm === "caesar"
        ? 26
        : 1

    try {
      fetch("/api/attacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          algorithm: algorithmToLog,
          ciphertextLength: normalizedLength,
          dataSizeBytes,
          dataSizeKb,
          totalTried: totalTriedValue,
          attackTime: duration,
          trueFoundInSearch: foundInSearch,
          trueRank: rank,
          sessionId: selectedSessionId || null,
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
          Modul Attacker (Simulasi Serangan)
        </h1>
        <p className="text-sm text-slate-500">
          Mensimulasikan beberapa tipe serangan: brute force (kunci kecil), ciphertext-only
          attack (COA) untuk Caesar, dan known-plaintext attack (KPA) untuk Caesar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Sesi Pengujian</h2>
              <span className="text-xs text-slate-400">
                {sessionNumber ? `No Sesi: ${sessionNumber}` : "Belum ada sesi"}
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-medium text-slate-500">Pilih Sesi</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                >
                  <option value="">(Tanpa sesi)</option>
                  {availableSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {`No ${s.number} • ${s.group || "-"} • ${s.testType || "-"} • ${s.algorithm || "-"}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Aksi Cepat</label>
                <div className="flex gap-2">
                  <Link
                    href="/sessions"
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-700"
                  >
                    Atur Sesi
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedSessionId("")}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-700"
                  >
                    Lepas
                  </button>
                </div>
              </div>
            </div>
          </div>
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
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Jenis serangan
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={attackMode}
                  onChange={(e) => setAttackMode(e.target.value)}
                >
                  <option value="bruteforce">Brute Force</option>
                  <option value="coa">COA (Ciphertext-only)</option>
                  <option value="kpa">KPA (Known-plaintext)</option>
                </select>
              </div>
            </div>

            {attackMode === "kpa" && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">
                    Known plaintext (contoh potongan)
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={knownPlainSnippet}
                    onChange={(e) => setKnownPlainSnippet(e.target.value)}
                    placeholder="mis. KRIPTO"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">
                    Ciphertext (potongan yang sejajar)
                  </label>
                  <input
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={knownCipherSnippet}
                    onChange={(e) => setKnownCipherSnippet(e.target.value)}
                    placeholder="mis. NULWAV"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Kunci sebenarnya (opsional)
                </label>
                {attackMode !== "bruteforce" && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    Bagian ini hanya relevan untuk brute force (untuk melihat posisi kunci benar di daftar kandidat).
                  </div>
                )}
                {algorithm === "caesar" && (
                  <input
                    type="number"
                    min={0}
                    max={25}
                    disabled={attackMode !== "bruteforce"}
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
                      disabled={attackMode !== "bruteforce"}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={knownK1}
                      onChange={(e) => setKnownK1(e.target.value)}
                      placeholder="k1"
                    />
                    <input
                      type="number"
                      min={0}
                      max={25}
                      disabled={attackMode !== "bruteforce"}
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
                      disabled={attackMode !== "bruteforce"}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={knownA}
                      onChange={(e) => setKnownA(e.target.value)}
                      placeholder="a (coprime 26)"
                    />
                    <input
                      type="number"
                      disabled={attackMode !== "bruteforce"}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={knownB}
                      onChange={(e) => setKnownB(e.target.value)}
                      placeholder="b"
                    />
                    <input
                      type="number"
                      disabled={attackMode !== "bruteforce"}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      value={knownK1}
                      onChange={(e) => setKnownK1(e.target.value)}
                      placeholder="k1"
                    />
                    <input
                      type="number"
                      disabled={attackMode !== "bruteforce"}
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

            {attackStatus ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                {attackStatus}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAttack}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {attackMode === "bruteforce" ? "Jalankan Brute Force" : "Jalankan Analisis Serangan"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Brute force cocok untuk ruang kunci kecil. COA dan KPA menunjukkan bagaimana
              penyerang bisa memulihkan kunci/pesan tanpa mencoba semua kombinasi, sebagai
              bentuk cryptanalysis yang lebih formal.
            </p>
          </div>

          {results.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Hasil Serangan ({algorithm === "caesar"
                  ? "Caesar"
                  : algorithm === "double-caesar"
                  ? "Double Caesar"
                  : "Hybrid (subset)"})
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Kandidat plaintext untuk serangan yang dipilih. COA memakai skor chi-square
                (semakin kecil semakin baik). Brute force memakai skor sederhana (proporsi
                vokal).
              </p>
              <div className="mt-3 max-h-[280px] overflow-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-[11px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                        Kunci
                      </th>
                      <th className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">
                        {attackMode === "coa" ? "Chi-square" : "Skor"}
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
                          {attackMode === "coa"
                            ? typeof row.chiSquare === "number"
                              ? row.chiSquare.toFixed(2)
                              : "—"
                            : typeof row.score === "number"
                            ? row.score.toFixed(3)
                            : "—"}
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
                <span>Jumlah kandidat yang diuji</span>
                <span className="font-mono text-blue-700">
                  {results.length > 0
                    ? attackMode === "bruteforce"
                      ? totalTried
                      : results.length
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Waktu proses</span>
                <span className="font-mono text-blue-700">
                  {attackTime != null ? `${attackTime.toFixed(3)} ms` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Kunci sebenarnya</span>
                <span className="font-mono text-blue-700">
                  {attackMode !== "bruteforce"
                    ? "—"
                    : algorithm === "caesar" && knownK !== ""
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
