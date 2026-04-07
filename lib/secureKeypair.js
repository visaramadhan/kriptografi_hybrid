import { createHash, generateKeyPairSync } from "node:crypto"

function pemToDer(pem) {
  const normalized = String(pem || "")
    .replace(/-----(BEGIN|END) [^-]+-----/g, "")
    .replace(/\s+/g, "")
  return Buffer.from(normalized, "base64")
}

function fingerprintHexFromDer(der) {
  return createHash("sha256").update(der).digest("hex")
}

function createKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  })

  const publicDer = pemToDer(publicKey)
  const fingerprintHex = fingerprintHexFromDer(publicDer)
  const spkiDerB64 = publicDer.toString("base64")

  return {
    publicKeyPem: publicKey,
    privateKeyPem: privateKey,
    fingerprintHex,
    spkiDerB64,
  }
}

export function getServerRsaKeypair() {
  if (!globalThis.__secureHybridKeypair) {
    globalThis.__secureHybridKeypair = createKeypair()
  }
  return globalThis.__secureHybridKeypair
}

