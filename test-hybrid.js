import { encryptCaesar, decryptCaesar } from "./lib/caesar.js"
import { encryptAffine, decryptAffine } from "./lib/affine.js"
import { encryptHybrid, decryptHybrid } from "./lib/hybrid.js"

function normalize(text) {
  return text.toUpperCase().replace(/[^A-Z]/g, "")
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} gagal. Expected=${expected}, Actual=${actual}`)
  }
}

function runHybridTests() {
  const texts = [
    "HELLO",
    "KRIPTOGRAFI",
    "Hybrid Cipher 123",
    "kriptografi hybrid untuk penelitian",
    "abcdefghijklmnopqrstuvwxyz",
  ]

  const keySets = [
    { a: 5, b: 8, k1: 3, k2: 7 },
    { a: 7, b: 2, k1: 10, k2: 4 },
    { a: 11, b: 15, k1: 5, k2: 9 },
  ]

  for (const text of texts) {
    const normalized = normalize(text)
    for (const keys of keySets) {
      const enc = encryptHybrid(normalized, keys.a, keys.b, keys.k1, keys.k2)
      const dec = decryptHybrid(enc, keys.a, keys.b, keys.k1, keys.k2)
      assertEqual(
        dec,
        normalized,
        `Hybrid cipher untuk text="${text}" dengan keys=${JSON.stringify(keys)}`
      )
    }
  }
}

function runCaesarTests() {
  const texts = ["HELLO", "KRIPTO", "Caesar Cipher", "abcdefghijklmnopqrstuvwxyz"]
  const keys = [1, 3, 7, 13]

  for (const text of texts) {
    const normalized = normalize(text)
    for (const k of keys) {
      const enc = encryptCaesar(normalized, k)
      const dec = decryptCaesar(enc, k)
      assertEqual(dec, normalized, `Caesar cipher untuk text="${text}" dengan k=${k}`)
    }
  }
}

function runAffineTests() {
  const texts = ["HELLO", "KRIPTO", "Affine Cipher", "abcdefghijklmnopqrstuvwxyz"]
  const keySets = [
    { a: 5, b: 8 },
    { a: 7, b: 3 },
    { a: 11, b: 4 },
  ]

  for (const text of texts) {
    const normalized = normalize(text)
    for (const keys of keySets) {
      const enc = encryptAffine(normalized, keys.a, keys.b)
      const dec = decryptAffine(enc, keys.a, keys.b)
      assertEqual(
        dec,
        normalized,
        `Affine cipher untuk text="${text}" dengan keys=${JSON.stringify(keys)}`
      )
    }
  }
}

function main() {
  runCaesarTests()
  runAffineTests()
  runHybridTests()
  console.log("Semua pengujian cipher (Caesar, Affine, Hybrid) berhasil.")
}

main()

