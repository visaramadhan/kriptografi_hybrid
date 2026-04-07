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
  { value: "secure-hybrid", label: "Secure Hybrid (AES-GCM + RSA-OAEP)" },
  { value: "secure-ecdh", label: "Secure ECDHE (AES-GCM + ECDHE + RSA signature)" },
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
  const [secureEnvelope, setSecureEnvelope] = useState(null)
  const [secureEcdhEnvelope, setSecureEcdhEnvelope] = useState(null)
  const [secureStatus, setSecureStatus] = useState("")
  const [apiStatus, setApiStatus] = useState("")
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
    if (mode === "secure-hybrid" || mode === "secure-ecdh") return
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
    if (mode === "secure-hybrid" || mode === "secure-ecdh") return
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
    if (mode === "secure-hybrid" || mode === "secure-ecdh") return
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
    if (mode === "secure-hybrid" || mode === "secure-ecdh") return
    applyKeyManagement()
    setApiStatus("")
    const sessionId =
      typeof window !== "undefined" ? window.localStorage.getItem("activeSessionId") : ""

    if (!text) {
      setApiStatus("Input masih kosong.")
      return
    }

    try {
      const res = await fetch("/api/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mode,
          a,
          b,
          k1,
          k2,
          keyMode,
          source: "dashboard",
          sessionId: sessionId || null,
        }),
      })

      if (!res.ok) {
        let msg = `Gagal encrypt via API (HTTP ${res.status})`
        try {
          const t = await res.text()
          try {
            const parsed = JSON.parse(t)
            msg = parsed.error || parsed.details || msg
          } catch {
            if (t) msg = t
          }
        } catch {}
        setApiStatus(msg)
        return
      }

      const data = await res.json()
      setCipherText(typeof data.result === "string" ? data.result : "")
      if (typeof data.timeMs === "number") {
        setEncryptTime(data.timeMs)
      }
      setApiStatus(data.logId ? `OK · log ${data.logId}` : "OK")
    } catch (e) {
      setApiStatus(e.message)
    }
  }

  const handleDecryptServer = async () => {
    if (mode === "secure-hybrid" || mode === "secure-ecdh") return
    setApiStatus("")
    const sessionId =
      typeof window !== "undefined" ? window.localStorage.getItem("activeSessionId") : ""
    if (!cipherText) {
      setApiStatus("Ciphertext masih kosong.")
      return
    }

    try {
      const res = await fetch("/api/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cipherText,
          mode,
          a,
          b,
          k1,
          k2,
          keyMode,
          source: "dashboard",
          sessionId: sessionId || null,
        }),
      })

      if (!res.ok) {
        let msg = `Gagal decrypt via API (HTTP ${res.status})`
        try {
          const t = await res.text()
          try {
            const parsed = JSON.parse(t)
            msg = parsed.error || parsed.details || msg
          } catch {
            if (t) msg = t
          }
        } catch {}
        setApiStatus(msg)
        return
      }

      const data = await res.json()
      setPlainText(typeof data.result === "string" ? data.result : "")
      if (typeof data.timeMs === "number") {
        setDecryptTime(data.timeMs)
      }
      setApiStatus(data.logId ? `OK · log ${data.logId}` : "OK")
    } catch (e) {
      setApiStatus(e.message)
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

  function flipFirstByteB64(b64) {
    const buf = b64ToBuf(b64)
    const bytes = new Uint8Array(buf)
    if (bytes.length === 0) return b64
    bytes[0] = bytes[0] ^ 1
    return bufToB64(bytes.buffer)
  }

  async function ensureActiveSessionId() {
    const existing =
      typeof window !== "undefined" ? window.localStorage.getItem("activeSessionId") : ""
    if (existing) return existing

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        algorithm: mode,
        keyMode,
        textLength: typeof text === "string" ? text.length : 0,
        runCount: 1,
        testType: mode,
      }),
    })
    if (!res.ok) throw new Error("Gagal membuat sesi untuk mode secure")
    const data = await res.json()
    if (!data?.id) throw new Error("Sesi tidak valid")
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

  async function handleEncryptEcdh() {
    setSecureStatus("")
    setEncryptTime(null)
    try {
      if (!window.crypto?.subtle) {
        throw new Error("WebCrypto tidak tersedia di browser ini")
      }

      const sessionId = await ensureActiveSessionId()

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
      const ciphertext = out.slice(0, out.length - 16)

      const clientPubRaw = await window.crypto.subtle.exportKey("raw", kp.publicKey)

      const envelope = {
        handshakeId: hello.handshakeId,
        clientPublicKeyB64: bufToB64(clientPubRaw),
        ivB64: bufToB64(iv.buffer),
        ciphertextB64: bufToB64(ciphertext.buffer),
        tagB64: bufToB64(tag.buffer),
      }

      setSecureEcdhEnvelope(envelope)
      setCipherText(`${envelope.ciphertextB64}:${envelope.tagB64}`)

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
          source: "dashboard-ecdh",
          sessionId,
          clientMetrics: metrics,
        }),
      })
      const decData = await decRes.json()
      if (!decRes.ok) {
        throw new Error(decData?.error || "Gagal decrypt secure-ecdh")
      }
      setPlainText(decData.result || "")
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
            sessionId,
            textLength: typeof text === "string" ? text.length : 0,
            source: "dashboard-ecdh",
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
      const sessionId =
        typeof window !== "undefined" ? window.localStorage.getItem("activeSessionId") : ""
      const env = secureEcdhEnvelope
      if (!env) throw new Error("Belum ada ciphertext ECDHE. Jalankan Encrypt (ECDHE) dulu.")
      const res = await fetch("/api/secure-ecdh/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...env,
          keyMode,
          source: "dashboard-ecdh",
          sessionId: sessionId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Gagal decrypt ECDHE")
      }
      setPlainText(data.result || "")
      if (typeof data.timeMs === "number") {
        setDecryptTime(data.timeMs)
      }
    } catch (e) {
      setSecureStatus(e.message)
    }
  }

  async function handleEncryptSecure() {
    setSecureStatus("")
    setEncryptTime(null)
    try {
      if (!window.crypto?.subtle) {
        throw new Error("WebCrypto tidak tersedia di browser ini")
      }

      const sessionId = await ensureActiveSessionId()
      const pinStart = performance.now()
      const { spkiDerB64, fingerprintHex } = await getServerPublicKey()
      const pinEnd = performance.now()
      const rsaKey = await importRsaOaepPublicKey(spkiDerB64)

      const staticMode = keyMode === "manual"
      const aesKeyRaw = staticMode
        ? await getOrCreateStaticAesKeyRaw(sessionId)
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
      const ciphertext = out.slice(0, out.length - 16)

      const envelope = {
        encryptedKeyB64: bufToB64(wrappedKey),
        ivB64: bufToB64(iv.buffer),
        ciphertextB64: bufToB64(ciphertext.buffer),
        tagB64: bufToB64(tag.buffer),
        fingerprintHex,
      }

      setSecureEnvelope(envelope)
      setCipherText(`${envelope.ciphertextB64}:${envelope.tagB64}`)
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
            sessionId,
            textLength: typeof text === "string" ? text.length : 0,
            source: "dashboard-secure",
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
      const sessionId =
        typeof window !== "undefined" ? window.localStorage.getItem("activeSessionId") : ""
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
          source: "dashboard-secure",
          sessionId: sessionId || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Gagal dekripsi secure")
      }
      setPlainText(data.result || "")
      if (typeof data.timeMs === "number") {
        setDecryptTime(data.timeMs)
      }
    } catch (e) {
      setSecureStatus(e.message)
    }
  }

  async function handleTamperTestSecure() {
    setSecureStatus("")
    setDecryptTime(null)
    try {
      const sessionId =
        typeof window !== "undefined" ? window.localStorage.getItem("activeSessionId") : ""
      const env = secureEnvelope
      if (!env) {
        throw new Error("Jalankan Encrypt (Secure) dulu untuk membuat ciphertext.")
      }

      const tamperedTagB64 = flipFirstByteB64(env.tagB64)
      const res = await fetch("/api/secure/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedKeyB64: env.encryptedKeyB64,
          ivB64: env.ivB64,
          ciphertextB64: env.ciphertextB64,
          tagB64: tamperedTagB64,
          keyMode,
          source: "dashboard-secure-tamper",
          sessionId: sessionId || null,
        }),
      })

      let payload = null
      try {
        payload = await res.json()
      } catch {
        payload = null
      }

      if (res.ok) {
        setSecureStatus("FAIL · Dekripsi tetap berhasil walaupun tag dimodifikasi.")
        return
      }

      const timeMs = typeof payload?.timeMs === "number" ? payload.timeMs : null
      if (timeMs != null) setDecryptTime(timeMs)
      setSecureStatus("PASS · Dekripsi ditolak saat tag dimodifikasi (integritas AES-GCM bekerja).")
    } catch (e) {
      setSecureStatus(e.message)
    }
  }

  async function handleTamperTestEcdh() {
    setSecureStatus("")
    setEncryptTime(null)
    setDecryptTime(null)
    try {
      if (!window.crypto?.subtle) {
        throw new Error("WebCrypto tidak tersedia di browser ini")
      }

      const sessionId = await ensureActiveSessionId()

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
      const ciphertext = out.slice(0, out.length - 16)

      const clientPubRaw = await window.crypto.subtle.exportKey("raw", kp.publicKey)
      const envelope = {
        handshakeId: hello.handshakeId,
        clientPublicKeyB64: bufToB64(clientPubRaw),
        ivB64: bufToB64(iv.buffer),
        ciphertextB64: bufToB64(ciphertext.buffer),
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
      setEncryptTime(metrics.totalClientMs)

      const tamperedCiphertextB64 = flipFirstByteB64(envelope.ciphertextB64)

      const decStart = performance.now()
      const res = await fetch("/api/secure-ecdh/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...envelope,
          ciphertextB64: tamperedCiphertextB64,
          keyMode,
          source: "dashboard-ecdh-tamper",
          sessionId,
          clientMetrics: metrics,
        }),
      })
      const decEnd = performance.now()

      let payloadOut = null
      try {
        payloadOut = await res.json()
      } catch {
        payloadOut = null
      }

      if (res.ok) {
        setSecureStatus("FAIL · Dekripsi ECDHE tetap berhasil walaupun ciphertext dimodifikasi.")
        return
      }

      const timeMs = typeof payloadOut?.timeMs === "number" ? payloadOut.timeMs : decEnd - decStart
      setDecryptTime(timeMs)
      setSecureStatus("PASS · Dekripsi ditolak saat ciphertext dimodifikasi (integritas AES-GCM bekerja).")
    } catch (e) {
      setSecureStatus(e.message)
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
              placeholder="Masukkan plaintext atau ciphertext."
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
                disabled={mode === "secure-hybrid" || mode === "secure-ecdh"}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Encrypt (Client)
              </button>
              <button
                type="button"
                onClick={handleDecryptClient}
                disabled={mode === "secure-hybrid" || mode === "secure-ecdh"}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-500 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Decrypt (Client)
              </button>
              <button
                type="button"
                onClick={handleEncryptServer}
                disabled={mode === "secure-hybrid" || mode === "secure-ecdh"}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-4 text-xs font-medium text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Encrypt via API (Hybrid)
              </button>
              <button
                type="button"
                onClick={handleDecryptServer}
                disabled={mode === "secure-hybrid" || mode === "secure-ecdh"}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 px-4 text-xs font-medium text-blue-700 shadow-sm transition hover:border-blue-400 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                Decrypt via API
              </button>

              {mode === "secure-hybrid" ? (
                <>
                  <button
                    type="button"
                    onClick={handleEncryptSecure}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    Encrypt (Secure)
                  </button>
                  <button
                    type="button"
                    onClick={handleDecryptSecure}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-4 text-xs font-medium text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    Decrypt (Secure)
                  </button>
                  <button
                    type="button"
                    onClick={handleTamperTestSecure}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-medium text-rose-700 shadow-sm transition hover:border-rose-400 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    Tamper Test (AEAD)
                  </button>
                </>
              ) : null}

              {mode === "secure-ecdh" ? (
                <>
                  <button
                    type="button"
                    onClick={handleEncryptEcdh}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    Encrypt (ECDHE)
                  </button>
                  <button
                    type="button"
                    onClick={handleDecryptEcdh}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 px-4 text-xs font-medium text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    Decrypt (ECDHE)
                  </button>
                  <button
                    type="button"
                    onClick={handleTamperTestEcdh}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-medium text-rose-700 shadow-sm transition hover:border-rose-400 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    Tamper Test (AEAD)
                  </button>
                </>
              ) : null}
            </div>
            {mode !== "secure-hybrid" && mode !== "secure-ecdh" && apiStatus ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                {apiStatus}
              </div>
            ) : null}
            {(mode === "secure-hybrid" || mode === "secure-ecdh") && secureStatus ? (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                {secureStatus}
              </div>
            ) : null}
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
