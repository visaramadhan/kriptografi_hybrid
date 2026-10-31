// Cipher klasik umum berparameter alfabet.
//
// Catatan desain: lib/caesar.js, lib/affine.js, dan lib/hybrid.js sengaja
// TIDAK diubah karena dipakai halaman lama (campus-sim, analysis, API).
// Modul ini menyediakan padanan dengan alfabet 36 simbol (A–Z + 0–9) agar
// data akademik non-huruf tetap dapat diolah, tanpa mengubah perilaku lama.

import {
  CLASSIC_ALPHABET,
  fromIndex,
  invertibleMultipliers,
  modInverse,
  normalizeToAlphabet,
  toIndex,
} from "./alphabet.js"
import { pick, randomInt } from "./prng.js"

const CLASSIC_IDS = ["caesar", "double-caesar", "affine", "hybrid"]

export function isClassicAlgorithm(algorithmId) {
  return CLASSIC_IDS.includes(algorithmId)
}

function applyShift(shifted, k1, k2, alphabet) {
  return shifted.map((index) => fromIndex(index + k1 + k2, alphabet))
}

function toIndexes(text, alphabet) {
  return normalizeToAlphabet(text, alphabet)
    .split("")
    .map((ch) => toIndex(ch, alphabet))
    .filter((index) => index >= 0)
}

/**
 * Bangkitkan kunci klasik dari PRNG berbenih.
 * @param {string} algorithmId
 * @param {() => number} rand
 * @returns {{k?:number,k1?:number,k2?:number,a?:number,b?:number}}
 */
export function generateClassicKeys(algorithmId, rand) {
  const n = CLASSIC_ALPHABET.length
  const mults = invertibleMultipliers(CLASSIC_ALPHABET)

  if (algorithmId === "caesar") {
    return { k: randomInt(rand, 1, n - 1) }
  }
  if (algorithmId === "double-caesar") {
    return { k1: randomInt(rand, 1, n - 1), k2: randomInt(rand, 1, n - 1) }
  }
  if (algorithmId === "affine") {
    return { a: pick(rand, mults), b: randomInt(rand, 0, n - 1) }
  }
  if (algorithmId === "hybrid") {
    return {
      a: pick(rand, mults),
      b: randomInt(rand, 0, n - 1),
      k1: randomInt(rand, 1, n - 1),
      k2: randomInt(rand, 1, n - 1),
    }
  }
  throw new Error(`Algoritma klasik tidak dikenal: ${algorithmId}`)
}

/** Ukuran ruang kunci (jumlah kemungkinan kunci) untuk cipher klasik. */
export function keySpaceSize(algorithmId, alphabet = CLASSIC_ALPHABET) {
  const n = alphabet.length
  const mults = invertibleMultipliers(alphabet).length
  if (algorithmId === "caesar") return n
  if (algorithmId === "double-caesar") return n * n
  if (algorithmId === "affine") return mults * n
  if (algorithmId === "hybrid") return mults * n * n * n
  return 0
}

/** Ruang kunci dalam bit (log2), dipakai untuk metrik ruang_kunci_bit. */
export function keySpaceBits(algorithmId, alphabet = CLASSIC_ALPHABET) {
  const size = keySpaceSize(algorithmId, alphabet)
  return size > 0 ? Math.round(Math.log2(size) * 100) / 100 : 0
}

/**
 * Enkripsi cipher klasik.
 * @param {string} algorithmId
 * @param {string} text
 * @param {{k?:number,k1?:number,k2?:number,a?:number,b?:number}} keys
 * @param {string} [alphabet]
 * @returns {string}
 */
export function encryptClassic(algorithmId, text, keys, alphabet = CLASSIC_ALPHABET) {
  const indexes = toIndexes(text, alphabet)

  if (algorithmId === "caesar") {
    return applyShift(indexes, keys.k ?? 0, 0, alphabet).join("")
  }
  if (algorithmId === "double-caesar") {
    return applyShift(indexes, keys.k1 ?? 0, keys.k2 ?? 0, alphabet).join("")
  }
  if (algorithmId === "affine") {
    return indexes.map((index) => fromIndex((keys.a ?? 1) * index + (keys.b ?? 0), alphabet)).join("")
  }
  if (algorithmId === "hybrid") {
    const affine = indexes.map((index) => (keys.a ?? 1) * index + (keys.b ?? 0))
    return applyShift(affine, keys.k1 ?? 0, keys.k2 ?? 0, alphabet)
  }
  throw new Error(`Algoritma klasik tidak dikenal: ${algorithmId}`)
}

/**
 * Dekripsi cipher klasik (kebalikan langsung dari encryptClassic).
 */
export function decryptClassic(algorithmId, text, keys, alphabet = CLASSIC_ALPHABET) {
  const indexes = toIndexes(text, alphabet)

  if (algorithmId === "caesar") {
    return applyShift(indexes, -(keys.k ?? 0), 0, alphabet).join("")
  }
  if (algorithmId === "double-caesar") {
    return applyShift(indexes, -(keys.k1 ?? 0), -(keys.k2 ?? 0), alphabet).join("")
  }
  if (algorithmId === "affine") {
    const aInv = modInverse(keys.a ?? 1, alphabet.length)
    if (aInv == null) throw new Error("Kunci affine tidak invertibel pada alfabet ini")
    return indexes.map((index) => fromIndex(aInv * (index - (keys.b ?? 0)), alphabet)).join("")
  }
  if (algorithmId === "hybrid") {
    const aInv = modInverse(keys.a ?? 1, alphabet.length)
    if (aInv == null) throw new Error("Kunci affine tidak invertibel pada alfabet ini")
    const unshifted = applyShift(indexes, -(keys.k1 ?? 0), -(keys.k2 ?? 0), alphabet)
      .join("")
      .split("")
      .map((ch) => toIndex(ch, alphabet))
    return unshifted.map((index) => fromIndex(aInv * (index - (keys.b ?? 0)), alphabet)).join("")
  }
  throw new Error(`Algoritma klasik tidak dikenal: ${algorithmId}`)
}
