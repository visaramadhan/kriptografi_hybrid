"use client"

import { useMemo, useState } from "react"
import { encryptCaesar, decryptCaesar } from "@/lib/caesar.js"
import { encryptAffine, decryptAffine } from "@/lib/affine.js"
import { encryptHybrid, decryptHybrid } from "@/lib/hybrid.js"

const modes = [
  { value: "caesar", label: "Caesar Cipher" },
  { value: "double-caesar", label: "Double Caesar Cipher" },
  { value: "affine", label: "Affine Cipher" },
  { value: "hybrid", label: "Hybrid (Affine + Double Caesar)" },
]

const keyManagementOptions = [
  { value: "manual", label: "Manual" },
  { value: "random", label: "Random" },
  { value: "timestamp", label: "Timestamp-based" },
]

const invertibleAValues = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]

export default function Home() {
  const [mode, setMode] = useState("hybrid")
  const [keyMode, setKeyMode] = useState("manual")
  const [text, setText] = useState("")
  const [cipherText, setCipherText] = useState("")
  const [plainText, setPlainText] = useState("")
  const [a, setA] = useState(5)
  const [b, setB] = useState(8)
  const [k1, setK1] = useState(3)
  const [k2, setK2] = useState(7)
  const [encryptTime, setEncryptTime] = useState(null)
  const [decryptTime, setDecryptTime] = useState(null)

  const complexity = useMemo(() => {
    const normalized = text.toUpperCase().replace(/[^A-Z]/g, "")
    const length = normalized.length
    const uniqueChars = new Set(normalized.split("")).size
    return { length, uniqueChars }
  }, [text])

  const applyKeyManagement = () => {
    if (keyMode === "manual") return

    if (keyMode === "random") {
      const newA = invertibleAValues[Math.floor(Math.random() * invertibleAValues.length)]
      const newB = Math.floor(Math.random() * 26)
      const newK1 = 1 + Math.floor(Math.random() * 25)
      const newK2 = 1 + Math.floor(Math.random() * 25)
      setA(newA)
      setB(newB)
      setK1(newK1)
      setK2(newK2)
      return
    }

    const now = Date.now()
    const newA = invertibleAValues[now % invertibleAValues.length]
    const newB = now % 26
    const newK1 = (Math.floor(now / 1000) % 25) + 1
    const newK2 = (Math.floor(now / 100000) % 25) + 1
    setA(newA)
    setB(newB)
    setK1(newK1)
    setK2(newK2)
  }

  const handleEncryptClient = () => {
    applyKeyManagement()

    const start = performance.now()
    let result = ""

    if (mode === "caesar") {
      result = encryptCaesar(text, k1)
    } else if (mode === "double-caesar") {
      const step1 = encryptCaesar(text, k1)
      result = encryptCaesar(step1, k2)
    } else if (mode === "affine") {
      result = encryptAffine(text, a, b)
    } else if (mode === "hybrid") {
      result = encryptHybrid(text, a, b, k1, k2)
    }

    const end = performance.now()
    setCipherText(result)
    setEncryptTime(end - start)
  }

  const handleDecryptClient = () => {
    const start = performance.now()
    let result = ""

    if (mode === "caesar") {
      result = decryptCaesar(cipherText, k1)
    } else if (mode === "double-caesar") {
      const step1 = decryptCaesar(cipherText, k2)
      result = decryptCaesar(step1, k1)
    } else if (mode === "affine") {
      result = decryptAffine(cipherText, a, b)
    } else if (mode === "hybrid") {
      result = decryptHybrid(cipherText, a, b, k1, k2)
    }

    const end = performance.now()
    setPlainText(result)
    setDecryptTime(end - start)
  }

  const handleEncryptServer = async () => {
    applyKeyManagement()

    const res = await fetch("/api/encrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        a,
        b,
        k1,
        k2,
      }),
    })

    const data = await res.json()
    setCipherText(data.result)
    if (typeof data.timeMs === "number") {
      setEncryptTime(data.timeMs)
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Hybrid Crypto Dashboard
        </h1>
        <p className="text-sm text-slate-500">
          Eksperimen algoritma Caesar, Affine, dan Hybrid dengan antarmuka modern.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">Input</h2>
              <span className="text-xs text-slate-400">
                Panjang: {complexity.length} · Unik: {complexity.uniqueChars}
              </span>
            </div>
            <textarea
              rows={6}
              className="mt-3 w-full min-h-[160px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 shadow-inner outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Masukkan plaintext atau ciphertext (huruf A-Z). Karakter lain akan diabaikan."
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Mode Enkripsi
            </h2>
            <div className="mt-3">
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {modes.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Manajemen Kunci
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={keyMode}
                  onChange={(e) => setKeyMode(e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {keyManagementOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={applyKeyManagement}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Generate Key
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  a (Affine)
                </label>
                <input
                  type="number"
                  value={a}
                  onChange={(e) => setA(Number(e.target.value))}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Aksi</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleEncryptClient}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Encrypt (Client)
              </button>
              <button
                type="button"
                onClick={handleDecryptClient}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Decrypt (Client)
              </button>
              <button
                type="button"
                onClick={handleEncryptServer}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-4 text-xs font-medium text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Encrypt via API (Hybrid)
              </button>
            </div>
          </section>
        </div>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mt-3 space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  Ciphertext
                </p>
                <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900">
                  {cipherText || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-slate-400">
                  Plaintext hasil dekripsi
                </p>
                <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900">
                  {plainText || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Performa</h2>
            <dl className="mt-3 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <dt>Waktu enkripsi</dt>
                <dd className="font-mono text-[11px] text-blue-700">
                  {encryptTime != null ? `${encryptTime.toFixed(3)} ms` : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Waktu dekripsi</dt>
                <dd className="font-mono text-[11px] text-blue-700">
                  {decryptTime != null ? `${decryptTime.toFixed(3)} ms` : "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Catatan Formula & Perhitungan
            </h2>
            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>
                Seluruh algoritma bekerja pada alfabet A–Z dengan pemetaan{" "}
                <span className="font-mono">A = 0, B = 1, ..., Z = 25</span> dan operasi
                dilakukan modulo 26.
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <span className="font-semibold">Caesar:</span>{" "}
                  <span className="font-mono">C = (P + k) mod 26</span>,{" "}
                  <span className="font-mono">P = (C - k) mod 26</span>
                </li>
                <li>
                  <span className="font-semibold">Affine:</span>{" "}
                  <span className="font-mono">C = (aP + b) mod 26</span>,{" "}
                  <span className="font-mono">P = a⁻¹ (C - b) mod 26</span> dengan{" "}
                  <span className="font-mono">gcd(a, 26) = 1</span>
                </li>
                <li>
                  <span className="font-semibold">Hybrid:</span> Affine{" "}
                  <span className="font-mono">(a, b)</span> → Caesar{" "}
                  <span className="font-mono">(k1)</span> → Caesar{" "}
                  <span className="font-mono">(k2)</span> secara berurutan.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
