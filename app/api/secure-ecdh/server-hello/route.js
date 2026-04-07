import { createECDH, createSign, randomUUID } from "node:crypto"
import { getServerRsaKeypair } from "@/lib/secureKeypair"

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

export async function GET() {
  const store = getStore()
  cleanupExpired(store)

  const ecdh = createECDH("prime256v1")
  ecdh.generateKeys()

  const serverPublicKeyB64 = ecdh.getPublicKey(null, "uncompressed").toString("base64")
  const serverPrivateKeyB64 = ecdh.getPrivateKey().toString("base64")

  const handshakeId = randomUUID()
  const issuedAt = Date.now()
  const expiresAt = issuedAt + 60_000

  const payload = JSON.stringify({
    handshakeId,
    issuedAt,
    curve: "P-256",
    serverPublicKeyB64,
  })

  const { privateKeyPem } = getServerRsaKeypair()
  const sign = createSign("RSA-SHA256")
  sign.update(payload)
  sign.end()
  const signatureB64 = sign.sign(privateKeyPem).toString("base64")

  store.set(handshakeId, {
    serverPrivateKeyB64,
    serverPublicKeyB64,
    issuedAt,
    expiresAt,
  })

  return Response.json({
    handshakeId,
    issuedAt,
    expiresAt,
    curve: "P-256",
    serverPublicKeyB64,
    signatureB64,
  })
}

