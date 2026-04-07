import { createDecipheriv, createECDH, hkdfSync } from "node:crypto"
import { getLogsCollection } from "@/lib/mongodb"

export const runtime = "nodejs"

function getStore() {
  if (!globalThis.__secureEcdhHandshakes) {
    globalThis.__secureEcdhHandshakes = new Map()
  }
  return globalThis.__secureEcdhHandshakes
}

function cleanupExpired(store) {
  const now = Date.now()
  for (const [id, v] of store.entries()) {
    if (!v || typeof v.expiresAt !== "number" || v.expiresAt <= now) {
      store.delete(id)
    }
  }
}

function b64ToBuf(b64) {
  return Buffer.from(String(b64 || ""), "base64")
}

function asNumber(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

export async function POST(req) {
  const store = getStore()
  cleanupExpired(store)

  const start = Date.now()
  try {
    const body = await req.json()
    const {
      handshakeId,
      clientPublicKeyB64,
      ivB64,
      ciphertextB64,
      tagB64,
      aadB64,
      keyMode,
      source,
      sessionId,
      clientMetrics,
    } = body || {}

    if (!handshakeId || !clientPublicKeyB64 || !ivB64 || !ciphertextB64 || !tagB64) {
      return new Response(
        JSON.stringify({ error: "Payload tidak lengkap" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    const entry = store.get(handshakeId)
    if (!entry) {
      return new Response(
        JSON.stringify({ error: "Handshake tidak ditemukan atau sudah kedaluwarsa" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    store.delete(handshakeId)

    const ecdh = createECDH("prime256v1")
    ecdh.setPrivateKey(b64ToBuf(entry.serverPrivateKeyB64))
    const secret = ecdh.computeSecret(b64ToBuf(clientPublicKeyB64))

    const salt = Buffer.from(handshakeId, "utf8")
    const info = Buffer.from("secure-ecdh-aes-gcm", "utf8")
    const aesKey = hkdfSync("sha256", secret, salt, info, 32)

    const iv = b64ToBuf(ivB64)
    const ciphertext = b64ToBuf(ciphertextB64)
    const tag = b64ToBuf(tagB64)

    const decipher = createDecipheriv("aes-256-gcm", aesKey, iv)
    if (aadB64) {
      decipher.setAAD(b64ToBuf(aadB64))
    }
    decipher.setAuthTag(tag)

    const plaintextBuf = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    const plaintext = plaintextBuf.toString("utf8")

    const end = Date.now()
    const timeMs = end - start

    let logId = null
    try {
      const collection = await getLogsCollection()
      const doc = {
        plaintext,
        ciphertext: `${ciphertextB64}:${tagB64}`,
        mode: "secure-ecdh",
        keys: null,
        processType: "decrypt",
        timeMs,
        keyMode: typeof keyMode === "string" ? keyMode : null,
        textLength: plaintext.replace(/[^A-Za-z]/g, "").length,
        source: typeof source === "string" ? source : "secure-ecdh-server",
        metrics: clientMetrics && typeof clientMetrics === "object" ? clientMetrics : null,
        createdAt: new Date(),
        sessionId: typeof sessionId === "string" ? sessionId : null,
      }
      const res = await collection.insertOne(doc)
      logId = res.insertedId.toString()
    } catch {}

    return Response.json({ result: plaintext, timeMs, logId })
  } catch (e) {
    const end = Date.now()
    return new Response(
      JSON.stringify({
        error: "Gagal mendekripsi secure ECDH",
        details: e.message,
        timeMs: end - start,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}

