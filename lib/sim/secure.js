// Primitif kripto "secure" untuk simulasi (Web Crypto API).
//
// ATURAN PRIVASI: kunci simulasi TIDAK PERNAH ditulis ke log/console.
// Bila perlu ditampilkan, gunakan hexPreview() yang memotong nilai.

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function subtle() {
  const webcrypto = globalThis.crypto
  if (!webcrypto || !webcrypto.subtle) {
    throw new Error("Web Crypto API tidak tersedia di lingkungan ini (butuh HTTPS/localhost).")
  }
  return webcrypto.subtle
}

export function isCryptoAvailable() {
  return Boolean(globalThis.crypto && globalThis.crypto.subtle)
}

export function toBase64(bytes) {
  let binary = ""
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i += 1) binary += String.fromCharCode(arr[i])
  return btoa(binary)
}

export function fromBase64(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Cuplikan hex terpotong (aman untuk ditampilkan, bukan kunci utuh). */
export function hexPreview(bytes, maxBytes = 6) {
  const arr = bytes instanceof Uint8Array ? bytes : fromBase64(bytes)
  const slice = Array.from(arr.slice(0, maxBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return arr.length > maxBytes ? `${slice}…` : slice
}

/** Buat kunci AES-GCM 256-bit. */
export async function createAesKey() {
  return subtle().generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
}

export function randomIv() {
  const iv = new Uint8Array(12)
  globalThis.crypto.getRandomValues(iv)
  return iv
}

/**
 * Enkripsi AEAD (AES-GCM). AAD default = id konteks record.
 * @returns {Promise<{ivB64:string, cipherB64:string}>}
 */
export async function encryptAead(text, key, { iv, aad } = {}) {
  const useIv = iv || randomIv()
  const params = { name: "AES-GCM", iv: useIv }
  if (aad) params.additionalData = encoder.encode(aad)
  const cipher = await subtle().encrypt(params, key, encoder.encode(text))
  return { ivB64: toBase64(useIv), cipherB64: toBase64(cipher) }
}

/** Dekripsi AEAD; melempar error bila ciphertext/AAD dimodifikasi. */
export async function decryptAead(cipherB64, key, { ivB64, aad } = {}) {
  const params = { name: "AES-GCM", iv: fromBase64(ivB64) }
  if (aad) params.additionalData = encoder.encode(aad)
  const plain = await subtle().decrypt(params, key, fromBase64(cipherB64))
  return decoder.decode(plain)
}

/** Balik 1 bit pada byte pertama ciphertext. */
export function tamperOneBit(cipherB64) {
  const bytes = fromBase64(cipherB64)
  if (bytes.length === 0) return cipherB64
  bytes[0] = bytes[0] ^ 0x01
  return toBase64(bytes)
}

/**
 * Uji apakah dekripsi masih berhasil setelah 1 bit diubah.
 * @returns {Promise<0|1>} 1 = manipulasi terdeteksi
 */
export async function detectsTampering({ text, key, aad }) {
  const { ivB64, cipherB64 } = await encryptAead(text, key, { aad })
  try {
    await decryptAead(tamperOneBit(cipherB64), key, { ivB64, aad })
    return 0
  } catch {
    return 1
  }
}

/**
 * Serangan salin ciphertext antar record.
 * @returns {Promise<0|1>} 1 = serangan berhasil (ciphertext dapat dipindah)
 */
export async function tryCopyAttack({ key, plainA, plainB, withAad }) {
  const { ivB64, cipherB64 } = await encryptAead(plainA, key, { aad: withAad ? "record:A" : undefined })
  try {
    // Penyerang menempelkan ciphertext record A ke slot record B.
    await decryptAead(cipherB64, key, { ivB64, aad: withAad ? "record:B" : undefined })
    return 1
  } catch {
    return 0
  }
}

/**
 * Demonstrasi nonce reuse: dua plaintext berbeda dienkripsi dengan IV sama.
 * @returns {Promise<{relationLeaked:boolean}>}
 */
export async function nonceReuseRevealsRelation({ key, plainA, plainB }) {
  const iv = randomIv()
  const a = await encryptAead(plainA, key, { iv })
  const b = await encryptAead(plainB, key, { iv })
  const xorCipher = xorBytes(fromBase64(a.cipherB64), fromBase64(b.cipherB64))
  const xorPlain = xorBytes(encoder.encode(plainA), encoder.encode(plainB))
  const limit = Math.min(xorCipher.length, xorPlain.length, 32)
  let same = limit > 0
  for (let i = 0; i < limit; i += 1) {
    if (xorCipher[i] !== xorPlain[i]) {
      same = false
      break
    }
  }
  return { relationLeaked: same }
}

function xorBytes(a, b) {
  const limit = Math.min(a.length, b.length)
  const out = new Uint8Array(limit)
  for (let i = 0; i < limit; i += 1) out[i] = a[i] ^ b[i]
  return out
}

/**
 * Biaya rotasi kunci: ukur waktu enkripsi ulang sejumlah record contoh.
 * @returns {Promise<{costMs:number, reEncrypted:number, kmsCalls:number}>}
 */
export async function measureRotationCost({
  key,
  sampleSize = 50,
  recordCount = 1000,
  sessions = 30,
  keyModeId,
}) {
  const plaintext = "ROTASI|".repeat(20)
  const start = performance.now()
  for (let i = 0; i < sampleSize; i += 1) {
    await encryptAead(plaintext, key, { aad: `rotate:${i}` })
  }
  const elapsed = performance.now() - start
  const perRecord = elapsed / sampleSize
  const kmsCalls =
    keyModeId === "statis"
      ? 2
      : keyModeId === "dinamis_per_sesi"
        ? Math.min(sessions, 500)
        : Math.min(recordCount, 500)

  return {
    costMs: Math.round(perRecord * recordCount * 100) / 100,
    reEncrypted: recordCount,
    kmsCalls,
  }
}

// ---------------------------------------------------------------------------
// ECDHE (kunci sesi efemeral)
// ---------------------------------------------------------------------------

export async function createEcdhKeyPair() {
  return subtle().generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"])
}

/** Turunkan kunci AES sesi dari ECDH + HKDF. */
export async function deriveSessionKey(privateKey, publicKey) {
  const shared = await subtle().deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256)
  const hkdfKey = await subtle().importKey("raw", shared, "HKDF", false, ["deriveKey"])
  return subtle().deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(16), info: encoder.encode("simulasi-ecdhe") },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
}

/**
 * Sesi ECDHE lengkap (client + server efemeral).
 * @param {{ephemeral?:boolean}} [options] ephemeral=false meniru ECDH statis (tanpa FS).
 */
export async function createEcdheSession({ ephemeral = true } = {}) {
  const client = await createEcdhKeyPair()
  const server = await createEcdhKeyPair()
  const key = await deriveSessionKey(client.privateKey, server.publicKey)
  return { key, ephemeral }
}
