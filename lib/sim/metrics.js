// Metrik kuantitatif per percobaan (satu baris = satu percobaan).

/** Ukuran byte UTF-8 dari sebuah teks. */
export function byteLength(text) {
  const value = String(text ?? "")
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).length
  return unescape(encodeURIComponent(value)).length
}

/** Entropi Shannon (bit per simbol) dari ciphertext. */
export function shannonEntropy(text) {
  const value = String(text ?? "")
  if (value.length === 0) return 0
  const freq = new Map()
  for (const ch of value) freq.set(ch, (freq.get(ch) || 0) + 1)

  let entropy = 0
  freq.forEach((count) => {
    const p = count / value.length
    entropy -= p * Math.log2(p)
  })
  return Math.round(entropy * 1000) / 1000
}

/** Overhead ukuran ciphertext dibanding plaintext (persen). */
export function overheadPercent(plainBytes, cipherBytes) {
  if (!plainBytes) return 0
  return Math.round(((cipherBytes - plainBytes) / plainBytes) * 10000) / 100
}

/**
 * Blast radius = persentase record yang terbuka bila SATU kunci data bocor.
 * - statis            : satu kunci untuk semua record -> 100%
 * - dinamis per sesi  : satu kunci per sesi            -> 100 / jumlah sesi
 * - dinamis per record: satu DEK per record            -> 100 / jumlah record
 */
export function blastRadius({ keyModeId, recordCount = 1000, sessions = 30 }) {
  if (keyModeId === "statis") return 100
  if (keyModeId === "dinamis_per_sesi") {
    return Math.round((100 / Math.max(sessions, 1)) * 100) / 100
  }
  if (keyModeId === "dinamis_per_record") {
    return Math.round((100 / Math.max(recordCount, 1)) * 10000) / 10000
  }
  return 100
}

/**
 * Forward secrecy: apakah kunci privat server yang bocor di hari ke-N
 * tetap tidak membuka sesi lama?
 */
export function forwardSecrecy({ algorithmId, keyModeId, ephemeral = true }) {
  if (algorithmId === "secure-ecdh") return ephemeral ? 1 : 0
  if (algorithmId === "secure-hybrid" && keyModeId === "dinamis_per_sesi") return 1
  return 0
}

/** Estimasi waktu brute force (detik) dari ruang kunci dan kecepatan tebak/s. */
export function bruteForceSeconds(keySpaceBits, guessesPerSecond = 1e6) {
  if (!keySpaceBits || keySpaceBits <= 0) return 0
  const space = Math.pow(2, keySpaceBits)
  return space / guessesPerSecond
}

/** Pola bocor: 1 bila plaintext identik menghasilkan ciphertext identik. */
export function detectPatternLeak(cipherA, cipherB) {
  return cipherA === cipherB ? 1 : 0
}
