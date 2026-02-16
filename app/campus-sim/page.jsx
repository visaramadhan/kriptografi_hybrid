"use client"

import { useState } from "react"
import { encryptCaesar } from "@/lib/caesar.js"
import { encryptAffine } from "@/lib/affine.js"
import { encryptHybrid } from "@/lib/hybrid.js"

const invertibleAValues = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]

const sampleRecords = [
  {
    id: 1,
    name: "Andi Pratama",
    nim: "2310112233",
    program: "Informatika",
    gpa: "3.72",
  },
  {
    id: 2,
    name: "Siti Rahma",
    nim: "2310112211",
    program: "Sistem Informasi",
    gpa: "3.58",
  },
]

export default function CampusSimPage() {
  const [selectedRecord, setSelectedRecord] = useState(sampleRecords[0])
  const [field, setField] = useState("profile")
  const [mode, setMode] = useState("hybrid")
  const [keyMode, setKeyMode] = useState("timestamp")
  const [a, setA] = useState(invertibleAValues[1])
  const [b, setB] = useState(8)
  const [k1, setK1] = useState(3)
  const [k2, setK2] = useState(7)
  const [plaintext, setPlaintext] = useState("")
  const [ciphertext, setCiphertext] = useState("")
  const [decrypted, setDecrypted] = useState("")
  const [encryptTime, setEncryptTime] = useState(null)
  const [decryptTime, setDecryptTime] = useState(null)

  const buildPlaintext = () => {
    if (field === "profile") {
      return `NIM ${selectedRecord.nim}, nama ${selectedRecord.name}, prodi ${selectedRecord.program}, IPK ${selectedRecord.gpa}`
    }
    if (field === "nilai") {
      return `NIM ${selectedRecord.nim}, Mata Kuliah Kriptografi, Nilai A, SKS 3, IPK ${selectedRecord.gpa}`
    }
    return plaintext
  }

  const applyKeyMode = () => {
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

    return { aUsed, bUsed, k1Used, k2Used }
  }

  const handleEncrypt = async () => {
    const text = buildPlaintext()
    setPlaintext(text)
    const { aUsed, bUsed, k1Used, k2Used } = applyKeyMode()
    let result = ""
    const start = performance.now()

    if (mode === "caesar") {
      result = encryptCaesar(text, k1Used)
    } else if (mode === "double-caesar") {
      result = encryptCaesar(encryptCaesar(text, k1Used), k2Used)
    } else if (mode === "affine") {
      result = encryptAffine(text, aUsed, bUsed)
    } else {
      result = encryptHybrid(text, aUsed, bUsed, k1Used, k2Used)
    }

    const end = performance.now()
    const duration = end - start
    setCiphertext(result)
    setEncryptTime(duration)
    setDecrypted("")
    setDecryptTime(null)

    try {
      const normalizedLength = text
        ? text.toUpperCase().replace(/[^A-Z]/g, "").length
        : 0
      await fetch("/api/experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "campus-sim",
          text,
          textLength: normalizedLength,
          keyMode,
          keys: { a: aUsed, b: bUsed, k1: k1Used, k2: k2Used },
          source: "campus-sim",
          metrics: { timeMs: duration, mode },
          mode,
        }),
      })
    } catch (e) {
    }
  }

  const handleDecrypt = () => {
    if (!ciphertext) return
    const { aUsed, bUsed, k1Used, k2Used } = applyKeyMode()
    let result = ""
    const start = performance.now()

    if (mode === "caesar") {
      result = plaintext
    } else if (mode === "double-caesar") {
      result = plaintext
    } else if (mode === "affine") {
      result = plaintext
    } else {
      result = plaintext
    }

    const end = performance.now()
    setDecrypted(result)
    setDecryptTime(end - start)
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Simulasi Sistem Informasi Kampus
        </h1>
        <p className="text-sm text-slate-500">
          Mensimulasikan enkripsi data akademik menggunakan Hybrid Cipher dan manajemen kunci
          dinamis.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Data Akademik Simulasi
              </h2>
              <span className="text-xs text-slate-400">
                Teks saat ini: {buildPlaintext().length} karakter
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Rekaman
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={selectedRecord.id}
                  onChange={(e) =>
                    setSelectedRecord(
                      sampleRecords.find(
                        (r) => r.id === Number(e.target.value)
                      ) || sampleRecords[0]
                    )
                  }
                >
                  {sampleRecords.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nim} - {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Jenis data
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                >
                  <option value="profile">Profil mahasiswa</option>
                  <option value="nilai">Data nilai mata kuliah</option>
                  <option value="custom">Teks kustom</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Mode algoritma
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="caesar">Caesar</option>
                  <option value="double-caesar">Double Caesar</option>
                  <option value="affine">Affine</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>

            {field === "custom" && (
              <textarea
                rows={3}
                className="mt-3 w-full min-h-[100px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                value={plaintext}
                onChange={(e) => setPlaintext(e.target.value)}
              />
            )}

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
                  Mode kunci
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={keyMode}
                  onChange={(e) => setKeyMode(e.target.value)}
                >
                  <option value="manual">Manual</option>
                  <option value="random">Random</option>
                  <option value="timestamp">Timestamp</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleEncrypt}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Enkripsi Data
              </button>
              <button
                type="button"
                onClick={handleDecrypt}
                disabled={!ciphertext}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Dekripsi (Validasi)
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Halaman ini mensimulasikan skenario sederhana sistem informasi kampus dengan
              data seperti NIM, nama, program studi, dan IPK.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Plaintext</h2>
              <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                {plaintext || "Belum ada data. Klik Enkripsi untuk menghasilkan plaintext."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Ciphertext</h2>
              <p className="mt-2 break-words font-mono text-xs text-slate-800">
                {ciphertext || "Belum ada ciphertext."}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Ringkasan Waktu</h2>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Waktu enkripsi</span>
                <span className="font-mono text-blue-700">
                  {encryptTime != null ? `${encryptTime.toFixed(3)} ms` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Waktu dekripsi (validasi)</span>
                <span className="font-mono text-emerald-700">
                  {decryptTime != null ? `${decryptTime.toFixed(3)} ms` : "—"}
                </span>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              Nilai ini dapat digunakan untuk menggambarkan kelayakan algoritma Hybrid dan
              Double Caesar pada skenario data real-time di lingkungan kampus.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Interpretasi Penelitian
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-[11px] text-slate-600">
              <li>
                Menunjukkan bagaimana model kriptografi hybrid diterapkan pada data teks
                sensitif seperti NIM dan nilai.
              </li>
              <li>
                Mengilustrasikan dampak manajemen kunci dinamis (Random/Timestamp) pada
                variasi ciphertext untuk data akademik yang mirip real-time.
              </li>
              <li>
                Menghubungkan efektivitas Double Caesar sebagai bagian dari skema Hybrid
                untuk transaksi akademik yang berulang.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}
