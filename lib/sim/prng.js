// Pembangkit acak berbenih (deterministik) untuk seluruh simulasi.
// Tujuan: hasil eksperimen dapat direproduksi persis dari nilai seed.

/**
 * Membuat fungsi acak deterministik (mulberry32).
 * @param {number} seed
 * @returns {() => number} fungsi yang mengembalikan angka 0..1
 */
export function createSeededRandom(seed = 2024) {
  let a = seed >>> 0
  if (a === 0) a = 0x9e3779b9

  return function next() {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Bilangan bulat acak pada rentang inklusif [min, max]. */
export function randomInt(rand, min, max) {
  return min + Math.floor(rand() * (max - min + 1))
}

/** Ambil satu elemen acak dari daftar. */
export function pick(rand, list) {
  if (!list || list.length === 0) return undefined
  return list[Math.floor(rand() * list.length) % list.length]
}

/** Salin lalu acak urutan daftar (Fisher-Yates). */
export function shuffle(list, rand) {
  const arr = [...list]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}
