"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { encryptCaesar, decryptCaesar } from "@/lib/caesar.js"
import { encryptAffine, decryptAffine } from "@/lib/affine.js"
import { decryptHybrid } from "@/lib/hybrid.js"
import * as XLSX from "xlsx"

const invertibleAValues = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]

function cipherStats(text) {
  const normalized = (text || "").toUpperCase().replace(/[^A-Z]/g, "")
  const length = normalized.length
  const uniqueChars = normalized ? new Set(normalized.split("")).size : 0
  return { length, uniqueChars }
}

function normalizeClassicComparison(text) {
  return String(text || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
}

function isBatchDecryptionValid(algorithm, expectedText, actualText) {
  if (algorithm === "secure-hybrid" || algorithm === "secure-ecdh") {
    return String(actualText || "") === String(expectedText || "")
  }
  return normalizeClassicComparison(actualText) === normalizeClassicComparison(expectedText)
}

function mod26(value) {
  return ((Number(value) || 0) % 26 + 26) % 26
}

const sampleRecords = (() => {
  const firstNames = [
    "Andi",
    "Siti",
    "Budi",
    "Dewi",
    "Rizky",
    "Ayu",
    "Fajar",
    "Nabila",
    "Rafi",
    "Putri",
    "Dimas",
    "Nisa",
    "Agus",
    "Wulan",
    "Yoga",
    "Intan",
    "Arif",
    "Shafa",
    "Bagas",
    "Nadya",
  ]

  const lastNames = [
    "Pratama",
    "Rahmawati",
    "Santoso",
    "Permata",
    "Saputra",
    "Lestari",
    "Hidayat",
    "Salsabila",
    "Maulana",
    "Ananda",
    "Wijaya",
    "Kurniawan",
    "Putra",
    "Utami",
    "Nugroho",
    "Puspita",
    "Firmansyah",
    "Azzahra",
    "Syahputra",
    "Wicaksono",
  ]

  const programs = [
    "Informatika",
    "Sistem Informasi",
    "Teknik Elektro",
    "Teknik Industri",
    "Teknik Sipil",
    "Manajemen",
    "Akuntansi",
    "Ilmu Komunikasi",
    "Matematika",
    "Statistika",
    "Hukum",
    "Administrasi Bisnis",
  ]

  const baseNimPrefix = "231011"
  const baseSuffix = 2000

  return Array.from({ length: 50 }, (_, idx) => {
    const id = idx + 1
    const first = firstNames[idx % firstNames.length]
    const last = lastNames[(idx * 3 + 5) % lastNames.length]
    const program = programs[(idx * 7 + 2) % programs.length]
    const suffix = String(baseSuffix + id).padStart(4, "0")
    const nim = `${baseNimPrefix}${suffix}`

    const gpaRaw = 2.55 + ((idx * 37) % 141) / 100
    const gpa = Math.min(3.95, gpaRaw).toFixed(2)

    return {
      id,
      name: `${first} ${last}`,
      nim,
      program,
      gpa,
    }
  })
})()

export default function CampusSimPage() {
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [records, setRecords] = useState([])
  const [datasetStatus, setDatasetStatus] = useState("Memuat dataset Excel...")
  const [field, setField] = useState("attendance")
  const [mode, setMode] = useState("hybrid")
  const [keyMode, setKeyMode] = useState("dynamic")
  const [a, setA] = useState(invertibleAValues[1])
  const [b, setB] = useState(8)
  const [k1, setK1] = useState(3)
  const [k2, setK2] = useState(7)
  const [plaintext, setPlaintext] = useState("")
  const [ciphertext, setCiphertext] = useState("")
  const [decrypted, setDecrypted] = useState("")
  const [encryptTime, setEncryptTime] = useState(null)
  const [decryptTime, setDecryptTime] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [sessionNumber, setSessionNumber] = useState(null)
  const [sessionTestType, setSessionTestType] = useState("campus-sim")
  const [sessionCustomTestType, setSessionCustomTestType] = useState("")
  const [sessionName, setSessionName] = useState("Simulasi Kampus")
  const [hybridVariant, setHybridVariant] = useState("dc_a")
  const [secureEnvelope, setSecureEnvelope] = useState(null)
  const [secureEcdhEnvelope, setSecureEcdhEnvelope] = useState(null)
  const [secureStatus, setSecureStatus] = useState("")
  const [batchRecordMode, setBatchRecordMode] = useState("all")
  const [batchRecordCount, setBatchRecordCount] = useState(10)
  const [batchFields, setBatchFields] = useState({ attendance: true, nilai: true })
  const [batchAlgorithms, setBatchAlgorithms] = useState({
    caesar: true,
    "double-caesar": true,
    affine: true,
    hybrid: true,
    "secure-hybrid": false,
    "secure-ecdh": false,
  })
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchStatus, setBatchStatus] = useState("")
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 })
  const [batchResults, setBatchResults] = useState([])
  const cancelBatchRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function loadDataset() {
      try {
        const res = await fetch("/api/campus-sim-dataset", { cache: "no-store" })
        if (!res.ok) {
          const txt = await res.text()
          throw new Error(txt || "Gagal memuat dataset Excel")
        }
        const data = await res.json()
        const loaded = Array.isArray(data?.records) ? data.records : []
        if (cancelled) return
        if (loaded.length > 0) {
          setRecords(loaded)
          setSelectedRecord(loaded[0])
          setDatasetStatus(`Dataset aktif: ${loaded.length} data dari dataset.xlsx`)
        } else {
          setRecords([])
          setSelectedRecord(null)
          setDatasetStatus("Dataset Excel kosong.")
        }
      } catch (e) {
        if (cancelled) return
        setRecords([])
        setSelectedRecord(null)
        setDatasetStatus(`Dataset tidak dapat dimuat: ${e.message}`)
      }
    }
    loadDataset()
    return () => {
      cancelled = true
    }
  }, [])

  const availableRecords = records

  const plaintextStats = cipherStats(plaintext)
  const ciphertextStats = cipherStats(ciphertext)

  const isSecure = mode === "secure-hybrid" || mode === "secure-ecdh"
  const isStaticKeyMode = keyMode === "static"

  const buildPlaintext = () => {
    if (field === "nilai") {
      return `NIM ${selectedRecord?.nim || "-"}, nama ${selectedRecord?.name || "-"}, mata kuliah ${selectedRecord?.courseName || "-"}, tugas individu ${selectedRecord?.assignmentScore ?? "-"}, quiz ${selectedRecord?.quizScore ?? "-"}, project ${selectedRecord?.projectScore ?? "-"}, UTS ${selectedRecord?.utsScore ?? "-"}, UAS ${selectedRecord?.uasScore ?? "-"}, kehadiran ${selectedRecord?.attendanceGradeScore ?? "-"}, nilai akhir ${selectedRecord?.finalScore ?? "-"}, grade ${selectedRecord?.grade || "-"}, status lulus ${selectedRecord?.passStatus || "-"}`
    }
    return `NIM ${selectedRecord?.nim || "-"}, nama ${selectedRecord?.name || "-"}, mata kuliah ${selectedRecord?.courseName || "-"}, kelas ${selectedRecord?.className || "-"}, total pertemuan ${selectedRecord?.totalMeetings ?? "-"}, hadir ${selectedRecord?.attendanceCount ?? "-"}, alpha ${selectedRecord?.absentCount ?? "-"}, persentase kehadiran ${selectedRecord?.attendancePercentage ?? "-"}, keterangan ${selectedRecord?.attendanceNote || "-"}`
  }

  function buildPlaintextForRecord(record, fieldType) {
    if (!record) return ""
    if (fieldType === "nilai") {
      return `NIM ${record.nim}, nama ${record.name}, mata kuliah ${record.courseName || "-"}, tugas individu ${record.assignmentScore ?? "-"}, quiz ${record.quizScore ?? "-"}, project ${record.projectScore ?? "-"}, UTS ${record.utsScore ?? "-"}, UAS ${record.uasScore ?? "-"}, kehadiran ${record.attendanceGradeScore ?? "-"}, nilai akhir ${record.finalScore ?? "-"}, grade ${record.grade || "-"}, status lulus ${record.passStatus || "-"}`
    }
    return `NIM ${record.nim}, nama ${record.name}, mata kuliah ${record.courseName || "-"}, kelas ${record.className || "-"}, total pertemuan ${record.totalMeetings ?? "-"}, hadir ${record.attendanceCount ?? "-"}, alpha ${record.absentCount ?? "-"}, persentase kehadiran ${record.attendancePercentage ?? "-"}, keterangan ${record.attendanceNote || "-"}`
  }

  const applyKeyMode = () => {
    let aUsed = a
    let bUsed = b
    let k1Used = k1
    let k2Used = k2

    if (keyMode === "dynamic") {
      const now = Date.now()
      aUsed = invertibleAValues[now % invertibleAValues.length]
      bUsed = now % 26
      k1Used = Math.floor(now / 8) % 26
      k2Used = Math.floor(now / 32) % 26
    }

    return {
      aUsed,
      bUsed: mod26(bUsed),
      k1Used: mod26(k1Used),
      k2Used: mod26(k2Used),
    }
  }

  function bufToB64(buf) {
    const bytes = new Uint8Array(buf)
    let binary = ""
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }

  function b64ToBuf(b64) {
    const binary = atob(String(b64 || ""))
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  }

  const XLSX_CELL_LIMIT = 32767
  function safeXlsxCellValue(value) {
    if (typeof value !== "string") return value
    if (value.length <= XLSX_CELL_LIMIT) return value
    const suffix = `… [truncated, len=${value.length}]`
    const head = Math.max(0, XLSX_CELL_LIMIT - suffix.length)
    return value.slice(0, head) + suffix
  }

  const effectiveSessionTestType =
    sessionTestType === "custom"
      ? sessionCustomTestType || "campus-custom"
      : sessionTestType || "campus-sim"

  async function ensureActiveSessionIdForSecure(text) {
    if (sessionId) return sessionId
    const existing =
      typeof window !== "undefined" ? window.localStorage.getItem("activeSessionId") : ""
    if (existing) {
      setSessionId(existing)
      return existing
    }

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sessionName || null,
        algorithm: mode,
        keyMode,
        textLength: typeof text === "string" ? text.length : 0,
        runCount: 1,
        testType: effectiveSessionTestType,
      }),
    })
    if (!res.ok) throw new Error("Gagal membuat sesi untuk mode secure")
    const data = await res.json()
    if (!data?.id) throw new Error("Sesi tidak valid")
    setSessionId(data.id)
    setSessionNumber(typeof data.number === "number" ? data.number : null)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("activeSessionId", data.id)
      }
    } catch {}
    return data.id
  }

  async function getServerPublicKey() {
    const res = await fetch("/api/secure/public-key", { cache: "no-store" })
    if (!res.ok) throw new Error("Gagal mengambil public key server")
    const data = await res.json()
    if (!data?.spkiDerB64 || !data?.fingerprintHex) {
      throw new Error("Public key server tidak valid")
    }

    const pinKey = "secureHybridServerFingerprint"
    const pinned =
      typeof window !== "undefined" ? window.localStorage.getItem(pinKey) : ""
    if (pinned && pinned !== data.fingerprintHex) {
      throw new Error("Peringatan MitM: fingerprint public key server berubah")
    }
    if (!pinned) {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(pinKey, data.fingerprintHex)
        }
      } catch {}
    }

    return data
  }

  async function verifyServerHelloSignature(payload, signatureB64) {
    const { spkiDerB64 } = await getServerPublicKey()
    const rsaPub = await window.crypto.subtle.importKey(
      "spki",
      b64ToBuf(spkiDerB64),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    )
    const ok = await window.crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      rsaPub,
      b64ToBuf(signatureB64),
      new TextEncoder().encode(payload),
    )
    if (!ok) throw new Error("Peringatan MitM: signature server invalid")
  }

  async function importEcdhPublicKeyUncompressed(publicKeyB64) {
    return window.crypto.subtle.importKey(
      "raw",
      b64ToBuf(publicKeyB64),
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    )
  }

  async function createClientEcdhKeypair() {
    return window.crypto.subtle.generateKey(
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    )
  }

  async function hkdfToAesKey(sharedSecret, saltText) {
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      sharedSecret,
      "HKDF",
      false,
      ["deriveKey"],
    )
    return window.crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new TextEncoder().encode(saltText),
        info: new TextEncoder().encode("secure-ecdh-aes-gcm"),
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    )
  }

  async function importRsaOaepPublicKey(spkiDerB64) {
    const der = b64ToBuf(spkiDerB64)
    return window.crypto.subtle.importKey(
      "spki",
      der,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"],
    )
  }

  async function getOrCreateStaticAesKeyRaw(sessionId) {
    const storageKey = `secureHybridStaticAesKeyB64:${sessionId}`
    const existing =
      typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : ""
    if (existing) {
      return new Uint8Array(b64ToBuf(existing))
    }
    const key = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    )
    const raw = await window.crypto.subtle.exportKey("raw", key)
    const b64 = bufToB64(raw)
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, b64)
      }
    } catch {}
    return new Uint8Array(raw)
  }

  async function createRotatingAesKeyRaw() {
    const key = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"],
    )
    const raw = await window.crypto.subtle.exportKey("raw", key)
    return new Uint8Array(raw)
  }

  async function handleEncryptSecure(text) {
    setSecureStatus("")
    setEncryptTime(null)
    setDecryptTime(null)
    setDecrypted("")
    try {
      if (!window.crypto?.subtle) {
        throw new Error("WebCrypto tidak tersedia di browser ini")
      }

      const activeSessionId = await ensureActiveSessionIdForSecure(text)
      const pinStart = performance.now()
      const { spkiDerB64, fingerprintHex } = await getServerPublicKey()
      const pinEnd = performance.now()
      const rsaKey = await importRsaOaepPublicKey(spkiDerB64)

      const staticMode = keyMode === "static"
      const aesKeyRaw = staticMode
        ? await getOrCreateStaticAesKeyRaw(activeSessionId)
        : await createRotatingAesKeyRaw()
      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        aesKeyRaw,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
      )

      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      const encoded = new TextEncoder().encode(text)

      const start = performance.now()
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        aesKey,
        encoded,
      )
      const afterAes = performance.now()

      const wrappedKey = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        rsaKey,
        aesKeyRaw,
      )
      const end = performance.now()

      const out = new Uint8Array(encrypted)
      const tag = out.slice(out.length - 16)
      const ciphertextBytes = out.slice(0, out.length - 16)

      const envelope = {
        encryptedKeyB64: bufToB64(wrappedKey),
        ivB64: bufToB64(iv.buffer),
        ciphertextB64: bufToB64(ciphertextBytes.buffer),
        tagB64: bufToB64(tag.buffer),
        fingerprintHex,
      }

      setSecureEnvelope(envelope)
      setSecureEcdhEnvelope(null)
      setCiphertext(`${envelope.ciphertextB64}:${envelope.tagB64}`)
      setEncryptTime(end - start)

      try {
        await fetch("/api/secure/log-encrypt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ciphertextB64: envelope.ciphertextB64,
            tagB64: envelope.tagB64,
            timeMs: end - start,
            mode: "secure-hybrid",
            metrics: {
              pinningMs: pinEnd - pinStart,
              aesGcmEncryptMs: afterAes - start,
              rsaOaepWrapMs: end - afterAes,
              totalClientMs: end - start,
            },
            keyMode,
            sessionId: activeSessionId,
            textLength: typeof text === "string" ? text.length : 0,
            source: "campus-sim-secure",
          }),
        })
      } catch {}

      setSecureStatus(`OK · fingerprint ${fingerprintHex.slice(0, 16)}…`)
    } catch (e) {
      setSecureStatus(e.message)
    }
  }

  async function handleDecryptSecure() {
    setSecureStatus("")
    setDecryptTime(null)
    try {
      const activeSessionId =
        sessionId ||
        (typeof window !== "undefined" ? window.localStorage.getItem("activeSessionId") : "")
      const env = secureEnvelope
      if (!env) throw new Error("Belum ada ciphertext secure. Jalankan Encrypt (Secure) dulu.")
      const res = await fetch("/api/secure/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedKeyB64: env.encryptedKeyB64,
          ivB64: env.ivB64,
          ciphertextB64: env.ciphertextB64,
          tagB64: env.tagB64,
          keyMode,
          source: "campus-sim-secure",
          sessionId: activeSessionId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Gagal dekripsi secure")
      }
      setDecrypted(data.result || "")
      if (typeof data.timeMs === "number") {
        setDecryptTime(data.timeMs)
      }
      setSecureStatus("OK · decrypt valid")
    } catch (e) {
      setSecureStatus(e.message)
    }
  }

  async function handleEncryptEcdh(text) {
    setSecureStatus("")
    setEncryptTime(null)
    setDecryptTime(null)
    setDecrypted("")
    try {
      if (!window.crypto?.subtle) {
        throw new Error("WebCrypto tidak tersedia di browser ini")
      }

      const activeSessionId = await ensureActiveSessionIdForSecure(text)

      const t0 = performance.now()
      const helloRes = await fetch("/api/secure-ecdh/server-hello", { cache: "no-store" })
      if (!helloRes.ok) throw new Error("Gagal handshake ECDH (server-hello)")
      const hello = await helloRes.json()
      const payload = JSON.stringify({
        handshakeId: hello.handshakeId,
        issuedAt: hello.issuedAt,
        curve: hello.curve,
        serverPublicKeyB64: hello.serverPublicKeyB64,
      })
      const t1 = performance.now()

      await verifyServerHelloSignature(payload, hello.signatureB64)
      const t2 = performance.now()

      const serverPub = await importEcdhPublicKeyUncompressed(hello.serverPublicKeyB64)
      const kp = await createClientEcdhKeypair()
      const t3 = performance.now()

      const sharedSecret = await window.crypto.subtle.deriveBits(
        { name: "ECDH", public: serverPub },
        kp.privateKey,
        256,
      )
      const t4 = performance.now()

      const aesKey = await hkdfToAesKey(sharedSecret, hello.handshakeId)
      const t5 = performance.now()

      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      const encoded = new TextEncoder().encode(text)
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        aesKey,
        encoded,
      )
      const t6 = performance.now()

      const out = new Uint8Array(encrypted)
      const tag = out.slice(out.length - 16)
      const ciphertextBytes = out.slice(0, out.length - 16)

      const clientPubRaw = await window.crypto.subtle.exportKey("raw", kp.publicKey)

      const envelope = {
        handshakeId: hello.handshakeId,
        clientPublicKeyB64: bufToB64(clientPubRaw),
        ivB64: bufToB64(iv.buffer),
        ciphertextB64: bufToB64(ciphertextBytes.buffer),
        tagB64: bufToB64(tag.buffer),
      }

      setSecureEcdhEnvelope(envelope)
      setSecureEnvelope(null)
      setCiphertext(`${envelope.ciphertextB64}:${envelope.tagB64}`)

      const metrics = {
        helloFetchMs: t1 - t0,
        pinAndVerifySigMs: t2 - t1,
        keygenMs: t3 - t2,
        ecdhMs: t4 - t3,
        hkdfMs: t5 - t4,
        aesGcmEncryptMs: t6 - t5,
        totalClientMs: t6 - t0,
      }

      setEncryptTime(metrics.totalClientMs)

      const decRes = await fetch("/api/secure-ecdh/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...envelope,
          keyMode,
          source: "campus-sim-ecdh",
          sessionId: activeSessionId,
          clientMetrics: metrics,
        }),
      })
      const decData = await decRes.json()
      if (!decRes.ok) {
        throw new Error(decData?.error || "Gagal decrypt secure-ecdh")
      }
      setDecrypted(decData.result || "")
      if (typeof decData.timeMs === "number") {
        setDecryptTime(decData.timeMs)
      }

      try {
        await fetch("/api/secure/log-encrypt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ciphertextB64: envelope.ciphertextB64,
            tagB64: envelope.tagB64,
            timeMs: metrics.totalClientMs,
            mode: "secure-ecdh",
            metrics,
            keyMode,
            sessionId: activeSessionId,
            textLength: typeof text === "string" ? text.length : 0,
            source: "campus-sim-ecdh",
          }),
        })
      } catch {}

      setSecureStatus("OK · ECDHE authenticated (RSA signature + pinned fingerprint)")
    } catch (e) {
      setSecureStatus(e.message)
    }
  }

  async function handleDecryptEcdh() {
    setSecureStatus("")
    setDecryptTime(null)
    try {
      const activeSessionId =
        sessionId ||
        (typeof window !== "undefined" ? window.localStorage.getItem("activeSessionId") : "")
      const env = secureEcdhEnvelope
      if (!env) throw new Error("Belum ada ciphertext ECDHE. Jalankan Encrypt (ECDHE) dulu.")
      const res = await fetch("/api/secure-ecdh/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...env,
          keyMode,
          source: "campus-sim-ecdh",
          sessionId: activeSessionId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Gagal decrypt ECDHE")
      }
      setDecrypted(data.result || "")
      if (typeof data.timeMs === "number") {
        setDecryptTime(data.timeMs)
      }
      setSecureStatus("OK · decrypt valid")
    } catch (e) {
      setSecureStatus(e.message)
    }
  }

  function algorithmLabel(v) {
    if (v === "caesar") return "Caesar"
    if (v === "double-caesar") return "Double Caesar"
    if (v === "affine") return "Affine"
    if (v === "hybrid") return `Hybrid (${hybridVariant})`
    if (v === "secure-hybrid") return "Secure Hybrid"
    if (v === "secure-ecdh") return "Secure ECDHE"
    return v
  }

  function keyModeLabel(v) {
    if (v === "static") return "Statis"
    if (v === "dynamic") return "Dinamis"
    return v
  }

  function fieldLabel(v) {
    if (v === "attendance") return "Data Kehadiran"
    if (v === "nilai") return "Data Nilai"
    return v
  }

  function keyspaceForAlgorithm(v) {
    if (v === "caesar") return 26
    if (v === "double-caesar") return 26 * 26
    if (v === "affine") return 12 * 26
    if (v === "hybrid") {
      if (hybridVariant === "c_a") return 26 * (12 * 26)
      if (hybridVariant === "dc_a") return (26 * 26) * (12 * 26)
      return 26 * (26 * 26) * (12 * 26)
    }
    if (v === "secure-hybrid" || v === "secure-ecdh") return 2n ** 256n
    return null
  }

  function keyspaceLabel(v) {
    const k = keyspaceForAlgorithm(v)
    if (typeof k === "bigint") return "2^256"
    if (typeof k === "number") return k.toLocaleString()
    return "-"
  }

  function estimateBruteForceTime(v, decryptMs) {
    const k = keyspaceForAlgorithm(v)
    if (typeof decryptMs !== "number" || !Number.isFinite(decryptMs)) return null
    if (typeof k === "number") return decryptMs * k
    return null
  }

  function entropyValue(text) {
    const normalized = String(text || "").replace(/\s+/g, "")
    if (!normalized) return 0
    const counts = new Map()
    for (const ch of normalized) counts.set(ch, (counts.get(ch) || 0) + 1)
    let h = 0
    for (const count of counts.values()) {
      const p = count / normalized.length
      h += -p * Math.log2(p)
    }
    return h
  }

  function performanceStability(totalSamples) {
    const arr = totalSamples.filter((n) => typeof n === "number" && Number.isFinite(n))
    if (!arr.length) return null
    const mean = arr.reduce((s, n) => s + n, 0) / arr.length
    if (mean === 0) return 100
    const variance = arr.reduce((s, n) => s + (n - mean) ** 2, 0) / arr.length
    const stdDev = Math.sqrt(variance)
    const cv = (stdDev / mean) * 100
    return Math.max(0, 100 - cv)
  }

  function getBatchSelectedRecords() {
    if (batchRecordMode === "all") return availableRecords
    const n = Math.max(1, Math.min(availableRecords.length, Number(batchRecordCount) || 1))
    return availableRecords.slice(0, n)
  }

  const batchSelectedFieldTypes = useMemo(() => {
    const out = []
    if (batchFields.attendance) out.push("attendance")
    if (batchFields.nilai) out.push("nilai")
    return out
  }, [batchFields])

  const batchSelectedAlgorithms = useMemo(() => {
    return Object.entries(batchAlgorithms)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([alg]) => alg)
  }, [batchAlgorithms])

  const batchTotalPlanned = useMemo(() => {
    return getBatchSelectedRecords().length * batchSelectedFieldTypes.length * batchSelectedAlgorithms.length
  }, [availableRecords.length, batchRecordMode, batchRecordCount, batchSelectedFieldTypes.length, batchSelectedAlgorithms.length])

  function runEncryptDecryptClassic(text, alg, keys) {
    const { aUsed, bUsed, k1Used, k2Used } = keys
    const t0 = performance.now()
    let cipher = ""
    if (alg === "caesar") {
      cipher = encryptCaesar(text, k1Used)
    } else if (alg === "double-caesar") {
      cipher = encryptCaesar(encryptCaesar(text, k1Used), k2Used)
    } else if (alg === "affine") {
      cipher = encryptAffine(text, aUsed, bUsed)
    } else if (alg === "hybrid") {
      if (hybridVariant === "c_a") {
        cipher = encryptAffine(encryptCaesar(text, k1Used), aUsed, bUsed)
      } else if (hybridVariant === "dc_a") {
        cipher = encryptAffine(
          encryptCaesar(encryptCaesar(text, k1Used), k2Used),
          aUsed,
          bUsed,
        )
      } else {
        cipher = encryptAffine(
          encryptCaesar(encryptCaesar(encryptCaesar(text, k1Used), k2Used), k2Used),
          aUsed,
          bUsed,
        )
      }
    } else {
      cipher = text
    }
    const t1 = performance.now()

    const d0 = performance.now()
    let plain = ""
    if (alg === "caesar") {
      plain = decryptCaesar(cipher, k1Used)
    } else if (alg === "double-caesar") {
      plain = decryptCaesar(decryptCaesar(cipher, k2Used), k1Used)
    } else if (alg === "affine") {
      plain = decryptAffine(cipher, aUsed, bUsed)
    } else if (alg === "hybrid") {
      plain = decryptHybrid(cipher, aUsed, bUsed, k1Used, k2Used)
      if (hybridVariant === "c_a") {
        plain = decryptCaesar(decryptAffine(cipher, aUsed, bUsed), k1Used)
      } else if (hybridVariant === "dc_a") {
        plain = decryptCaesar(
          decryptCaesar(decryptAffine(cipher, aUsed, bUsed), k2Used),
          k1Used,
        )
      } else {
        plain = decryptCaesar(
          decryptCaesar(
            decryptCaesar(decryptAffine(cipher, aUsed, bUsed), k2Used),
            k2Used,
          ),
          k1Used,
        )
      }
    } else {
      plain = cipher
    }
    const d1 = performance.now()

    return {
      cipher,
      plain,
      encryptMs: t1 - t0,
      decryptMs: d1 - d0,
    }
  }

  async function runEncryptDecryptSecureHybrid(text) {
    if (!window.crypto?.subtle) {
      throw new Error("WebCrypto tidak tersedia di browser ini")
    }

    const activeSessionId = await ensureActiveSessionIdForSecure(text)
    const { spkiDerB64, fingerprintHex } = await getServerPublicKey()
    const rsaKey = await importRsaOaepPublicKey(spkiDerB64)

    const staticMode = keyMode === "static"
    const aesKeyRaw = staticMode
      ? await getOrCreateStaticAesKeyRaw(activeSessionId)
      : await createRotatingAesKeyRaw()
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      aesKeyRaw,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    )

    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(text)

    const t0 = performance.now()
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv, tagLength: 128 },
      aesKey,
      encoded,
    )
    const wrappedKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      rsaKey,
      aesKeyRaw,
    )
    const t1 = performance.now()

    const out = new Uint8Array(encrypted)
    const tag = out.slice(out.length - 16)
    const ciphertextBytes = out.slice(0, out.length - 16)

    const envelope = {
      encryptedKeyB64: bufToB64(wrappedKey),
      ivB64: bufToB64(iv.buffer),
      ciphertextB64: bufToB64(ciphertextBytes.buffer),
      tagB64: bufToB64(tag.buffer),
      fingerprintHex,
    }

    const decRes = await fetch("/api/secure/decrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encryptedKeyB64: envelope.encryptedKeyB64,
        ivB64: envelope.ivB64,
        ciphertextB64: envelope.ciphertextB64,
        tagB64: envelope.tagB64,
        keyMode,
        source: "campus-sim-batch",
        sessionId: activeSessionId || null,
      }),
    })

    let decPayload = null
    try {
      decPayload = await decRes.json()
    } catch {
      decPayload = null
    }
    if (!decRes.ok) {
      throw new Error(decPayload?.error || decPayload?.details || "Gagal dekripsi secure")
    }

    return {
      cipher: `${envelope.ciphertextB64}:${envelope.tagB64}`,
      plain: decPayload?.result || "",
      encryptMs: t1 - t0,
      decryptMs: typeof decPayload?.timeMs === "number" ? decPayload.timeMs : null,
      sessionId: activeSessionId,
    }
  }

  async function runEncryptDecryptSecureEcdh(text) {
    if (!window.crypto?.subtle) {
      throw new Error("WebCrypto tidak tersedia di browser ini")
    }

    const activeSessionId = await ensureActiveSessionIdForSecure(text)

    const t0 = performance.now()
    const helloRes = await fetch("/api/secure-ecdh/server-hello", { cache: "no-store" })
    if (!helloRes.ok) throw new Error("Gagal handshake ECDH (server-hello)")
    const hello = await helloRes.json()
    const payload = JSON.stringify({
      handshakeId: hello.handshakeId,
      issuedAt: hello.issuedAt,
      curve: hello.curve,
      serverPublicKeyB64: hello.serverPublicKeyB64,
    })
    const t1 = performance.now()

    await verifyServerHelloSignature(payload, hello.signatureB64)
    const t2 = performance.now()

    const serverPub = await importEcdhPublicKeyUncompressed(hello.serverPublicKeyB64)
    const kp = await createClientEcdhKeypair()
    const t3 = performance.now()

    const sharedSecret = await window.crypto.subtle.deriveBits(
      { name: "ECDH", public: serverPub },
      kp.privateKey,
      256,
    )
    const t4 = performance.now()

    const aesKey = await hkdfToAesKey(sharedSecret, hello.handshakeId)
    const t5 = performance.now()

    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(text)
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv, tagLength: 128 },
      aesKey,
      encoded,
    )
    const t6 = performance.now()

    const out = new Uint8Array(encrypted)
    const tag = out.slice(out.length - 16)
    const ciphertextBytes = out.slice(0, out.length - 16)

    const clientPubRaw = await window.crypto.subtle.exportKey("raw", kp.publicKey)

    const envelope = {
      handshakeId: hello.handshakeId,
      clientPublicKeyB64: bufToB64(clientPubRaw),
      ivB64: bufToB64(iv.buffer),
      ciphertextB64: bufToB64(ciphertextBytes.buffer),
      tagB64: bufToB64(tag.buffer),
    }

    const metrics = {
      helloFetchMs: t1 - t0,
      pinAndVerifySigMs: t2 - t1,
      keygenMs: t3 - t2,
      ecdhMs: t4 - t3,
      hkdfMs: t5 - t4,
      aesGcmEncryptMs: t6 - t5,
      totalClientMs: t6 - t0,
    }

    const decRes = await fetch("/api/secure-ecdh/decrypt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...envelope,
        keyMode,
        source: "campus-sim-batch",
        sessionId: activeSessionId,
        clientMetrics: metrics,
      }),
    })

    let decPayload = null
    try {
      decPayload = await decRes.json()
    } catch {
      decPayload = null
    }
    if (!decRes.ok) {
      throw new Error(decPayload?.error || decPayload?.details || "Gagal decrypt secure-ecdh")
    }

    return {
      cipher: `${envelope.ciphertextB64}:${envelope.tagB64}`,
      plain: decPayload?.result || "",
      encryptMs: metrics.totalClientMs,
      decryptMs: typeof decPayload?.timeMs === "number" ? decPayload.timeMs : null,
      sessionId: activeSessionId,
    }
  }

  async function runBatch() {
    cancelBatchRef.current = false
    setBatchRunning(true)
    setBatchStatus("")
    setBatchResults([])
    setBatchProgress({ done: 0, total: 0 })

    const records = getBatchSelectedRecords()
    const fields = batchSelectedFieldTypes
    const algs = batchSelectedAlgorithms

    const total = records.length * fields.length * algs.length
    setBatchProgress({ done: 0, total })
    if (!total) {
      setBatchRunning(false)
      setBatchStatus("Pilih minimal 1 data, 1 jenis data, dan 1 metode.")
      return
    }

    let done = 0
    for (const record of records) {
      for (const fieldType of fields) {
        for (const alg of algs) {
          if (cancelBatchRef.current) {
            setBatchRunning(false)
            setBatchStatus("Dihentikan.")
            return
          }

          const label = `${record.name} • ${fieldLabel(fieldType)} • ${algorithmLabel(alg)}`
          setBatchStatus(`Memproses: ${label}`)

          const text = buildPlaintextForRecord(record, fieldType)
          let cipher = ""
          let plain = ""
          let encryptMs = null
          let decryptMs = null
          let keysUsed = null
          let error = null
          let usedSessionId = sessionId
          const encryptSamples = []
          const decryptSamples = []
          const totalSamples = []

          try {
            const repeatCount = alg === "secure-hybrid" || alg === "secure-ecdh" ? 2 : 3
            for (let i = 0; i < repeatCount; i++) {
              if (alg === "secure-hybrid") {
                const out = await runEncryptDecryptSecureHybrid(text)
                cipher = out.cipher
                plain = out.plain
                encryptSamples.push(out.encryptMs)
                decryptSamples.push(out.decryptMs)
                totalSamples.push((out.encryptMs || 0) + (out.decryptMs || 0))
                usedSessionId = out.sessionId || usedSessionId
              } else if (alg === "secure-ecdh") {
                const out = await runEncryptDecryptSecureEcdh(text)
                cipher = out.cipher
                plain = out.plain
                encryptSamples.push(out.encryptMs)
                decryptSamples.push(out.decryptMs)
                totalSamples.push((out.encryptMs || 0) + (out.decryptMs || 0))
                usedSessionId = out.sessionId || usedSessionId
              } else {
                const keys = applyKeyMode()
                keysUsed = keys
                const out = runEncryptDecryptClassic(text, alg, keys)
                cipher = out.cipher
                plain = out.plain
                encryptSamples.push(out.encryptMs)
                decryptSamples.push(out.decryptMs)
                totalSamples.push((out.encryptMs || 0) + (out.decryptMs || 0))
              }
            }
            encryptMs = encryptSamples.reduce((s, n) => s + n, 0) / encryptSamples.length
            decryptMs = decryptSamples.reduce((s, n) => s + n, 0) / decryptSamples.length
          } catch (e) {
            error = e?.message || String(e)
          }

          const isValid = !error && isBatchDecryptionValid(alg, text, plain)
          const plainAlpha = cipherStats(text)
          const cipherAlpha = cipherStats(cipher)
          const bruteForceMs = estimateBruteForceTime(alg, decryptMs)
          const entropy = entropyValue(cipher)
          const stability = performanceStability(totalSamples)
          const row = {
            run: done + 1,
            name: record.name,
            nim: record.nim,
            program: record.program,
            fieldType,
            algorithm: alg,
            hybridVariant: alg === "hybrid" ? hybridVariant : null,
            keyMode,
            a: keysUsed?.aUsed ?? null,
            b: keysUsed?.bUsed ?? null,
            k1: keysUsed?.k1Used ?? null,
            k2: keysUsed?.k2Used ?? null,
            plaintext: text,
            ciphertext: cipher,
            decrypted: plain,
            plaintextLength: String(text || "").length,
            ciphertextLength: String(cipher || "").length,
            plaintextAlphaLength: plainAlpha.length,
            plaintextAlphaUnique: plainAlpha.uniqueChars,
            ciphertextAlphaLength: cipherAlpha.length,
            ciphertextAlphaUnique: cipherAlpha.uniqueChars,
            encryptMs,
            decryptMs,
            bruteForceMs,
            keyspace: keyspaceLabel(alg),
            entropy,
            stability,
            valid: Boolean(isValid),
            sessionId: usedSessionId || null,
            error,
            createdAt: new Date().toISOString(),
          }

          setBatchResults((prev) => prev.concat(row))

          done += 1
          setBatchProgress({ done, total })
          await new Promise((r) => setTimeout(r, 0))
        }
      }
    }

    setBatchRunning(false)
    setBatchStatus("Selesai.")
  }

  function stopBatch() {
    cancelBatchRef.current = true
  }

  const batchSummary = useMemo(() => {
    const rows = batchResults.filter((r) => !r.error)
    if (!rows.length) return null
    const avg = (arr) => {
      const nums = arr.filter((n) => typeof n === "number" && Number.isFinite(n))
      if (!nums.length) return null
      return nums.reduce((s, n) => s + n, 0) / nums.length
    }
    return {
      total: batchResults.length,
      success: rows.filter((r) => r.valid).length,
      avgEncrypt: avg(rows.map((r) => r.encryptMs)),
      avgDecrypt: avg(rows.map((r) => r.decryptMs)),
      avgBruteForce: avg(rows.map((r) => r.bruteForceMs)),
      avgEntropy: avg(rows.map((r) => r.entropy)),
      avgStability: avg(rows.map((r) => r.stability)),
    }
  }, [batchResults])

  function exportBatchToExcel() {
    if (!batchResults.length) return
    const rows = batchResults.map((r) => ({
      Skenario: `${r.name} - ${fieldLabel(r.fieldType)} - ${algorithmLabel(r.algorithm)}`,
      "Jenis Algoritma": algorithmLabel(r.algorithm),
      "Mode Pengelolaan Kunci": keyModeLabel(r.keyMode),
      "Panjang Plaintext": r.plaintextLength,
      "Waktu Enkripsi": typeof r.encryptMs === "number" ? Number(r.encryptMs.toFixed(3)) : null,
      "Waktu Dekripsi": typeof r.decryptMs === "number" ? Number(r.decryptMs.toFixed(3)) : null,
      "Waktu Brute Force":
        typeof r.bruteForceMs === "number" ? Number(r.bruteForceMs.toFixed(3)) : "Tidak praktis",
      "Ruang Kunci": r.keyspace,
      Entropy: typeof r.entropy === "number" ? Number(r.entropy.toFixed(4)) : null,
      "Stabilitas Performa":
        typeof r.stability === "number" ? `${r.stability.toFixed(2)}%` : "-",
      Status: r.valid ? "OK" : "FAIL",
      Plaintext: safeXlsxCellValue(r.plaintext),
      Ciphertext: safeXlsxCellValue(r.ciphertext),
      Decrypted: safeXlsxCellValue(r.decrypted),
      Error: safeXlsxCellValue(r.error || ""),
      "Session ID": r.sessionId || "",
    }))

    const workbook = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, ws, "Batch")

    const suffix = sessionNumber ? `Sesi_${sessionNumber}` : "NoSesi"
    XLSX.writeFile(
      workbook,
      `CampusSim_Batch_${suffix}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    )
  }

  const handleEncrypt = async () => {
    const text = buildPlaintext()
    setPlaintext(text)
    setSecureStatus("")
    setSecureEnvelope(null)
    setSecureEcdhEnvelope(null)
    if (mode === "secure-hybrid") {
      await handleEncryptSecure(text)
      return
    }
    if (mode === "secure-ecdh") {
      await handleEncryptEcdh(text)
      return
    }
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
      if (hybridVariant === "c_a") {
        result = encryptAffine(encryptCaesar(text, k1Used), aUsed, bUsed)
      } else if (hybridVariant === "dc_a") {
        result = encryptAffine(
          encryptCaesar(encryptCaesar(text, k1Used), k2Used),
          aUsed,
          bUsed
        )
      } else {
        result = encryptAffine(
          encryptCaesar(encryptCaesar(encryptCaesar(text, k1Used), k2Used), k2Used),
          aUsed,
          bUsed
        )
      }
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
          metrics: { timeMs: duration, mode, hybridVariant },
          mode: mode === "hybrid" ? `hybrid-${hybridVariant}` : mode,
          sessionId,
        }),
      })
    } catch (e) {
    }
  }

  const handleDecrypt = async () => {
    if (mode === "secure-hybrid") {
      await handleDecryptSecure()
      return
    }
    if (mode === "secure-ecdh") {
      await handleDecryptEcdh()
      return
    }
    if (!ciphertext) return
    const { aUsed, bUsed, k1Used, k2Used } = applyKeyMode()
    let result = ""
    const start = performance.now()

    if (mode === "caesar") {
      result = decryptCaesar(ciphertext, k1Used)
    } else if (mode === "double-caesar") {
      result = decryptCaesar(decryptCaesar(ciphertext, k2Used), k1Used)
    } else if (mode === "affine") {
      result = decryptAffine(ciphertext, aUsed, bUsed)
    } else {
      if (hybridVariant === "c_a") {
        result = decryptCaesar(decryptAffine(ciphertext, aUsed, bUsed), k1Used)
      } else if (hybridVariant === "dc_a") {
        result = decryptCaesar(
          decryptCaesar(decryptAffine(ciphertext, aUsed, bUsed), k2Used),
          k1Used,
        )
      } else {
        result = decryptCaesar(
          decryptCaesar(
            decryptCaesar(decryptAffine(ciphertext, aUsed, bUsed), k2Used),
            k2Used,
          ),
          k1Used,
        )
      }
    }

    const end = performance.now()
    setDecrypted(result)
    setDecryptTime(end - start)
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Simulasi Nilai dan Kehadiran Mahasiswa
        </h1>
        <p className="text-sm text-slate-500">
          Mensimulasikan enkripsi data nilai dan kehadiran mahasiswa menggunakan Hybrid
          Cipher dan manajemen kunci dinamis.
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
            <div className="mt-3 grid gap-3 md:grid-cols-6">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-medium text-slate-500">Nama Sesi</label>
                <input
                  type="text"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Algoritma</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="caesar">Caesar</option>
                  <option value="double-caesar">Double Caesar</option>
                  <option value="affine">Affine</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="secure-hybrid">Secure Hybrid</option>
                  <option value="secure-ecdh">Secure ECDHE</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Mode Kunci</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={keyMode}
                  onChange={(e) => setKeyMode(e.target.value)}
                >
                  <option value="static">Statis</option>
                  <option value="dynamic">Dinamis</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Panjang Teks</label>
                <input
                  type="number"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={buildPlaintext().toUpperCase().replace(/[^A-Z]/g, '').length}
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Jumlah Run</label>
                <input
                  type="number"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={1}
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Jenis Uji</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={sessionTestType}
                  onChange={(e) => setSessionTestType(e.target.value)}
                >
                  <option value="campus-sim">Campus Sim</option>
                  <option value="campus-attendance">Kehadiran</option>
                  <option value="campus-nilai">Nilai</option>
                  <option value="campus-secure">Secure</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            {sessionTestType === "custom" ? (
              <div className="mt-3">
                <label className="text-[11px] font-medium text-slate-500">
                  Jenis Uji (Custom)
                </label>
                <input
                  type="text"
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={sessionCustomTestType}
                  onChange={(e) => setSessionCustomTestType(e.target.value)}
                  placeholder="mis. kampus-batch-1"
                />
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={async () => {
                  const payload = {
                    name: sessionName || null,
                    algorithm: mode,
                    keyMode,
                    textLength: buildPlaintext().toUpperCase().replace(/[^A-Z]/g, '').length,
                    runCount: 1,
                    testType: effectiveSessionTestType,
                  }
                  const res = await fetch("/api/sessions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  })
                  if (res.ok) {
                    const data = await res.json()
                    setSessionId(data.id)
                    setSessionNumber(data.number)
                    try {
                      if (typeof window !== "undefined") {
                        window.localStorage.setItem("activeSessionId", data.id)
                      }
                    } catch {}
                  }
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Buat Sesi
              </button>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Data Dataset Simulasi
              </h2>
              <span className="text-xs text-slate-400">
                Teks saat ini: {buildPlaintext().length} karakter
              </span>
            </div>
            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              {datasetStatus}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  Rekaman
                </label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={selectedRecord?.id || availableRecords[0]?.id || ""}
                  disabled={availableRecords.length === 0}
                  onChange={(e) =>
                    setSelectedRecord(
                      availableRecords.find(
                        (r) => r.id === Number(e.target.value)
                      ) || availableRecords[0]
                    )
                  }
                >
                  {availableRecords.length === 0 && (
                    <option value="">Dataset belum tersedia</option>
                  )}
                  {availableRecords.map((r) => (
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
                  <option value="attendance">Data kehadiran mahasiswa</option>
                  <option value="nilai">Data nilai mahasiswa</option>
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
                  <option value="secure-hybrid">Secure Hybrid</option>
                  <option value="secure-ecdh">Secure ECDHE</option>
                </select>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">
                  a (Affine)
                </label>
                <input
                  type="number"
                  value={a}
                  onChange={(e) => setA(Number(e.target.value))}
                  disabled={!isStaticKeyMode}
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
                  disabled={!isStaticKeyMode}
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
                  disabled={!isStaticKeyMode}
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
                  disabled={!isStaticKeyMode}
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
                  <option value="static">Statis</option>
                  <option value="dynamic">Dinamis</option>
                </select>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              {isStaticKeyMode
                ? "Mode statis memakai nilai a, b, k1, dan k2 yang Anda tetapkan untuk seluruh proses enkripsi/dekripsi."
                : "Mode dinamis menghasilkan nilai kunci berbeda secara otomatis pada setiap proses, termasuk saat batch berjalan."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              {mode !== "secure-hybrid" && mode !== "secure-ecdh" ? (
                <>
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
                </>
              ) : mode === "secure-hybrid" ? (
                <>
                  <button
                    type="button"
                    onClick={handleEncrypt}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    Encrypt (Secure)
                  </button>
                  <button
                    type="button"
                    onClick={handleDecrypt}
                    disabled={!secureEnvelope}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-4 text-xs font-medium text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Decrypt (Secure)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleEncrypt}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    Encrypt (ECDHE)
                  </button>
                  <button
                    type="button"
                    onClick={handleDecrypt}
                    disabled={!secureEcdhEnvelope}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-4 text-xs font-medium text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Decrypt (ECDHE)
                  </button>
                </>
              )}
            </div>
            {isSecure && secureStatus ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                {secureStatus}
              </div>
            ) : null}
            <p className="mt-2 text-[11px] text-slate-400">
              Halaman ini mensimulasikan skenario enkripsi untuk data nilai dan kehadiran
              mahasiswa berdasarkan dataset riil yang Anda unggah.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Pengujian Otomatis</h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Menjalankan enkripsi + dekripsi secara berurutan untuk kombinasi record
                  mahasiswa, jenis data, dan metode.
                </p>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <div className="font-mono">
                  {batchProgress.total ? `${batchProgress.done}/${batchProgress.total}` : "—"}
                </div>
                <div>Total kombinasi: {batchTotalPlanned || 0}</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">Record Dataset</label>
                <select
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={batchRecordMode}
                  onChange={(e) => setBatchRecordMode(e.target.value)}
                  disabled={batchRunning}
                >
                  <option value="all">Semua ({availableRecords.length})</option>
                  <option value="firstN">Pertama N</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-500">N</label>
                <input
                  type="number"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  value={batchRecordCount}
                  onChange={(e) => setBatchRecordCount(Number(e.target.value))}
                  disabled={batchRunning || batchRecordMode !== "firstN"}
                  min={1}
                  max={availableRecords.length}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-medium text-slate-500">Jenis Data</label>
                <div className="flex flex-wrap gap-3 pt-1 text-xs text-slate-700">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                        checked={batchFields.attendance}
                      disabled={batchRunning}
                      onChange={(e) =>
                        setBatchFields((prev) => ({ ...prev, attendance: e.target.checked }))
                      }
                    />
                    Data kehadiran
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={batchFields.nilai}
                      disabled={batchRunning}
                      onChange={(e) =>
                        setBatchFields((prev) => ({ ...prev, nilai: e.target.checked }))
                      }
                    />
                    Data nilai
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-1">
              <label className="text-[11px] font-medium text-slate-500">Metode Enkripsi</label>
              <div className="mt-2 grid gap-2 text-xs text-slate-700 md:grid-cols-3">
                {[
                  ["caesar", "Caesar"],
                  ["double-caesar", "Double Caesar"],
                  ["affine", "Affine"],
                  ["hybrid", `Hybrid (${hybridVariant})`],
                  ["secure-hybrid", "Secure Hybrid"],
                  ["secure-ecdh", "Secure ECDHE"],
                ].map(([alg, label]) => (
                  <label key={alg} className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(batchAlgorithms[alg])}
                      disabled={batchRunning}
                      onChange={(e) =>
                        setBatchAlgorithms((prev) => ({ ...prev, [alg]: e.target.checked }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={runBatch}
                disabled={batchRunning}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Jalankan Batch
              </button>
              <button
                type="button"
                onClick={stopBatch}
                disabled={!batchRunning}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Stop
              </button>
              <button
                type="button"
                onClick={() => {
                  if (batchRunning) return
                  setBatchResults([])
                  setBatchStatus("")
                  setBatchProgress({ done: 0, total: 0 })
                }}
                disabled={batchRunning || batchResults.length === 0}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset Hasil
              </button>
              <button
                type="button"
                onClick={exportBatchToExcel}
                disabled={batchRunning || batchResults.length === 0}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-xs font-medium text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Download Excel
              </button>
            </div>

            {batchStatus ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                {batchStatus}
              </div>
            ) : null}

            {batchSummary ? (
              <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
                  <div className="text-slate-500">Success Rate</div>
                  <div className="mt-1 font-mono text-slate-900">
                    {batchSummary.success}/{batchSummary.total}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
                  <div className="text-slate-500">Avg Encrypt</div>
                  <div className="mt-1 font-mono text-slate-900">
                    {batchSummary.avgEncrypt != null ? `${batchSummary.avgEncrypt.toFixed(3)} ms` : "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
                  <div className="text-slate-500">Avg Decrypt</div>
                  <div className="mt-1 font-mono text-slate-900">
                    {batchSummary.avgDecrypt != null ? `${batchSummary.avgDecrypt.toFixed(3)} ms` : "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
                  <div className="text-slate-500">Avg Brute Force</div>
                  <div className="mt-1 font-mono text-slate-900">
                    {batchSummary.avgBruteForce != null
                      ? `${batchSummary.avgBruteForce.toFixed(3)} ms`
                      : "Tidak praktis"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
                  <div className="text-slate-500">Avg Entropy</div>
                  <div className="mt-1 font-mono text-slate-900">
                    {batchSummary.avgEntropy != null ? batchSummary.avgEntropy.toFixed(4) : "-"}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
                  <div className="text-slate-500">Avg Stabilitas</div>
                  <div className="mt-1 font-mono text-slate-900">
                    {batchSummary.avgStability != null ? `${batchSummary.avgStability.toFixed(2)}%` : "-"}
                  </div>
                </div>
              </div>
            ) : null}

            {batchResults.length ? (
              <div className="mt-4 overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-[980px] w-full border-collapse text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Skenario</th>
                      <th className="px-3 py-2 text-left font-medium">Jenis Algoritma</th>
                      <th className="px-3 py-2 text-left font-medium">Mode Pengelolaan Kunci</th>
                      <th className="px-3 py-2 text-left font-medium">Panjang Plaintext</th>
                      <th className="px-3 py-2 text-left font-medium">Waktu Enkripsi</th>
                      <th className="px-3 py-2 text-left font-medium">Waktu Dekripsi</th>
                      <th className="px-3 py-2 text-left font-medium">Waktu Brute Force</th>
                      <th className="px-3 py-2 text-left font-medium">Ruang Kunci</th>
                      <th className="px-3 py-2 text-left font-medium">Entropy</th>
                      <th className="px-3 py-2 text-left font-medium">Stabilitas Performa</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchResults.map((r) => (
                      <tr key={`${r.run}-${r.nim}-${r.algorithm}-${r.fieldType}`} className="text-slate-800">
                        <td className="px-3 py-2">
                          <div className="font-medium">{`${r.name} - ${fieldLabel(r.fieldType)} - ${algorithmLabel(r.algorithm)}`}</div>
                          <div className="font-mono text-[11px] text-slate-500">{r.nim}</div>
                        </td>
                        <td className="px-3 py-2">{algorithmLabel(r.algorithm)}</td>
                        <td className="px-3 py-2">{keyModeLabel(r.keyMode)}</td>
                        <td className="px-3 py-2 font-mono">{r.plaintextLength}</td>
                        <td className="px-3 py-2 font-mono">
                          {typeof r.encryptMs === "number" ? `${r.encryptMs.toFixed(2)} ms` : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {typeof r.decryptMs === "number" ? `${r.decryptMs.toFixed(2)} ms` : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {typeof r.bruteForceMs === "number" ? `${r.bruteForceMs.toFixed(2)} ms` : "Tidak praktis"}
                        </td>
                        <td className="px-3 py-2 font-mono">{r.keyspace}</td>
                        <td className="px-3 py-2 font-mono">
                          {typeof r.entropy === "number" ? r.entropy.toFixed(4) : "—"}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {typeof r.stability === "number" ? `${r.stability.toFixed(2)}%` : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <span className={r.valid ? "text-emerald-700" : "text-rose-700"}>
                            {r.error ? "ERROR" : r.valid ? "OK" : "FAIL"}
                          </span>
                          {r.error ? (
                            <div className="mt-1 text-[11px] text-slate-500">{safeXlsxCellValue(r.error)}</div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Plaintext</h2>
              <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
                {plaintext || "Belum ada data. Klik Enkripsi untuk menghasilkan plaintext."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Ciphertext</h2>
                {mode === "hybrid" && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">Model Hybrid</span>
                    <select
                      className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-900"
                      value={hybridVariant}
                      onChange={(e) => setHybridVariant(e.target.value)}
                    >
                      <option value="c_a">Caesar → Affine</option>
                      <option value="dc_a">Double Caesar → Affine</option>
                      <option value="c_dc_a">Caesar → Double Caesar → Affine</option>
                    </select>
                  </div>
                )}
              </div>
              <p className="mt-2 break-words font-mono text-xs text-slate-800">
                {ciphertext || "Belum ada ciphertext."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Hasil Dekripsi (Validasi)</h2>
            <p className="mt-2 whitespace-pre-wrap text-xs text-slate-700">
              {decrypted || "Belum ada hasil dekripsi."}
            </p>
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
              Nilai ini dapat digunakan untuk menggambarkan kelayakan algoritma pada
              skenario data nilai dan kehadiran mahasiswa di lingkungan kampus.
            </p>
          </div>

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
                  Mode algoritma saat ini:{" "}
                  <span className="font-mono">
                    {mode === "hybrid"
                      ? "Hybrid (Affine + Double Caesar)"
                      : mode}
                  </span>
                  . Pilih Hybrid untuk mensimulasikan model kriptografi hybrid penuh.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  Manajemen Kunci
                </p>
                <p>
                  Mode kunci: <span className="font-mono">{keyModeLabel(keyMode)}</span> dengan nilai{" "}
                  <span className="font-mono">
                    a={a}, b={b}, k1={k1}, k2={k2}
                  </span>
                  . Mode statis memakai nilai tetap, sedangkan mode dinamis menghasilkan
                  kunci berbeda otomatis di setiap proses.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Keamanan Data</p>
                <p>
                  Panjang plaintext:{" "}
                  <span className="font-mono">
                    {plaintextStats.length} huruf, unik {plaintextStats.uniqueChars}
                  </span>
                  . Panjang ciphertext:{" "}
                  <span className="font-mono">
                    {ciphertextStats.length} huruf, unik {ciphertextStats.uniqueChars}
                  </span>
                  . Semakin panjang dan semakin banyak huruf unik, pola data nilai dan
                  kehadiran semakin sulit dianalisis.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">Waktu Akses Data</p>
                <p>
                  Waktu enkripsi:{" "}
                  <span className="font-mono">
                    {encryptTime != null ? `${encryptTime.toFixed(3)} ms` : "–"}
                  </span>
                  . Waktu dekripsi:{" "}
                  <span className="font-mono">
                    {decryptTime != null ? `${decryptTime.toFixed(3)} ms` : "–"}
                  </span>
                  . Nilai ini menggambarkan seberapa cepat data nilai dan kehadiran dapat
                  diakses dalam bentuk terenkripsi.
                </p>
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  Efisiensi Pemrosesan Sistem
                </p>
                <p>
                  Penggabungan panjang teks dan waktu proses di atas dapat digunakan
                  untuk menilai efisiensi Hybrid dan Double Caesar pada skenario sistem
                  informasi kampus berbasis nilai dan kehadiran mahasiswa yang real-time.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
