// Pemetaan alfabet eksplisit untuk cipher klasik saat data bukan huruf murni.
//
// Alfabet yang dipakai: A–Z ditambah 0–9 = 36 simbol.
// Alasan: data akademik dummy memuat NIM, nominal UKT, dan kode mata kuliah
// (angka), sehingga cipher klasik perlu alfabet yang mencakup digit.
// Simbol di luar alfabet dibuang sebelum enkripsi (didokumentasikan di UI).

export const CLASSIC_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

/** Faktor persekutuan terbesar (algoritma Euclid). */
export function gcd(a, b) {
  let x = Math.abs(a)
  let y = Math.abs(b)
  while (y !== 0) {
    const t = y
    y = x % y
    x = t
  }
  return x
}

/** Invers modular a terhadap m, atau null bila tidak ada. */
export function modInverse(a, m) {
  const norm = ((a % m) + m) % m
  for (let x = 1; x < m; x += 1) {
    if ((norm * x) % m === 1) return x
  }
  return null
}

/**
 * Daftar pengali a yang invertibel modulo panjang alfabet.
 * Untuk N = 36 dihasilkan 12 nilai: {1,5,7,11,13,17,19,23,25,29,31,35}.
 */
export function invertibleMultipliers(alphabet = CLASSIC_ALPHABET) {
  const n = alphabet.length
  const result = []
  for (let a = 1; a < n; a += 1) {
    if (gcd(a, n) === 1) result.push(a)
  }
  return result
}

/** Ubah teks menjadi huruf besar dan buang simbol di luar alfabet. */
export function normalizeToAlphabet(text, alphabet = CLASSIC_ALPHABET) {
  const upper = String(text ?? "").toUpperCase()
  const allowed = new Set(alphabet.split(""))
  return upper
    .split("")
    .filter((ch) => allowed.has(ch))
    .join("")
}

/** Indeks karakter di dalam alfabet, atau -1 bila tidak ada. */
export function toIndex(ch, alphabet = CLASSIC_ALPHABET) {
  return alphabet.indexOf(ch)
}

/** Karakter pada indeks tertentu (dibungkus modulo panjang alfabet). */
export function fromIndex(index, alphabet = CLASSIC_ALPHABET) {
  const n = alphabet.length
  const safe = ((index % n) + n) % n
  return alphabet.charAt(safe)
}
