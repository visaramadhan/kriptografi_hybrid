import { createDecipheriv, privateDecrypt } from "node:crypto"
import { getLogsCollection } from "@/lib/mongodb"
import { getServerRsaKeypair } from "@/lib/secureKeypair"

export const runtime = "nodejs"

function b64ToBuf(b64) {
  return Buffer.from(String(b64 || ""), "base64")
}

function asNumber(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

export async function POST(req) {
  const start = Date.now()
  try {
    const body = await req.json()
    const {
      encryptedKeyB64,
      ivB64,
      ciphertextB64,
      tagB64,
      aadB64,
      keyMode,
      source,
      sessionId,
    } = body || {}

    if (!encryptedKeyB64 || !ivB64 || !ciphertextB64 || !tagB64) {
      return new Response(
        JSON.stringify({ error: "Payload tidak lengkap" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    const { privateKeyPem } = getServerRsaKeypair()
    const wrappedKey = b64ToBuf(encryptedKeyB64)
    const aesKey = privateDecrypt({ key: privateKeyPem, oaepHash: "sha256" }, wrappedKey)

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
        mode: "secure-hybrid",
        keys: null,
        processType: "decrypt",
        timeMs,
        keyMode: typeof keyMode === "string" ? keyMode : null,
        textLength: plaintext.replace(/[^A-Za-z]/g, "").length,
        source: typeof source === "string" ? source : "secure-server",
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
        error: "Gagal mendekripsi secure envelope",
        details: e.message,
        timeMs: end - start,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}

