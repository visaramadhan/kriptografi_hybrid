// Konfigurasi kombinasi algoritma x mode kunci, cakupan jalur, dan kode kategori.

import { algorithmCatalog, coverageLayers, ALL_COVERAGE_LAYERS } from "../simulation-config.js"
import { keySpaceBits as classicKeySpaceBits, isClassicAlgorithm } from "./classic.js"
import { shuffle } from "./prng.js"

// Kode kategori (dipakai untuk ekspor CSV & SPSS, sesuai codebook).
export const ALGORITHM_CODES = {
  caesar: 1,
  "double-caesar": 2,
  affine: 3,
  hybrid: 4,
  "secure-hybrid": 5,
  "secure-ecdh": 6,
}

export const DATA_TYPE_CODES = {
  umum: 1,
  sensitif: 2,
  keuangan: 3,
  nilai: 4,
  ijazah: 5,
  kredensial: 6,
}

export const KEY_MODE_CODES = {
  statis: 1,
  dinamis_per_sesi: 2,
  dinamis_per_record: 3,
}

// Penanda implementasi native: cipher klasik ditulis di JS murni (0),
// sedangkan AES/ECDH memakai Web Crypto (1). Kolom ini penting agar
// perbandingan waktu tidak menyesatkan (lihat catatan keadilan waktu).
export const NATIVE_IMPLEMENTATION = {
  caesar: 0,
  "double-caesar": 0,
  affine: 0,
  hybrid: 0,
  "secure-hybrid": 1,
  "secure-ecdh": 1,
}

export function findAlgorithm(algorithmId) {
  return algorithmCatalog.find((item) => item.id === algorithmId)
}

/** Persentase titik jalur yang terlindungi (0..100) dari 5 titik. */
export function coveragePercent(algorithmId) {
  const layers = coverageLayers[algorithmId] || []
  return Math.round((layers.length / ALL_COVERAGE_LAYERS.length) * 100)
}

/** Ruang kunci (bit): dihitung untuk cipher klasik, diambil dari katalog untuk secure. */
export function keySpaceBitsFor(algorithmId) {
  if (isClassicAlgorithm(algorithmId)) return classicKeySpaceBits(algorithmId)
  const algorithm = findAlgorithm(algorithmId)
  return algorithm ? algorithm.keySpaceBits : 0
}

/** Apakah kombinasi algoritma x mode kunci valid? */
export function isValidCombination(algorithmId, keyModeId) {
  const algorithm = findAlgorithm(algorithmId)
  if (!algorithm) return false
  return algorithm.validKeyModes.includes(keyModeId)
}

/** Alasan penonaktifan kombinasi (ditampilkan di UI). */
export function explainInvalid(algorithmId, keyModeId) {
  if (isValidCombination(algorithmId, keyModeId)) return ""
  if (algorithmId === "secure-ecdh") {
    return "ECDHE hanya bermakna dengan kunci efemeral per sesi; mode statis dihilangkan."
  }
  if (isClassicAlgorithm(algorithmId) && keyModeId === "dinamis_per_record") {
    return "Envelope per record tidak berguna pada cipher klasik (ruang kunci terlalu kecil)."
  }
  return "Kombinasi ini tidak didukung oleh model keamanan algoritma terpilih."
}

/** Catatan tambahan walau kombinasi valid (mis. tetap lemah). */
export function combinationNote(algorithmId, keyModeId) {
  if (isClassicAlgorithm(algorithmId) && keyModeId !== "statis") {
    return "Kunci dinamis tidak mengubah kelemahan dasar cipher klasik; hanya menambah biaya."
  }
  if (algorithmId === "hybrid" && keyModeId === "statis") {
    return "Hybrid + RSA statis: tidak ada forward secrecy."
  }
  if (algorithmId === "secure-hybrid" && keyModeId === "statis") {
    return "Envelope statis: kebocoran KEK membuka seluruh DEK."
  }
  if (algorithmId === "secure-ecdh") {
    return "Secure ECDHE tidak mencakup data at rest."
  }
  return ""
}

/**
 * Bangun daftar sel percobaan (algoritma x tipe data x mode kunci) yang valid,
 * lalu acak urutannya untuk menghindari efek urutan.
 * @returns {Array<{algorithmId:string, dataTypeId:string, keyModeId:string}>}
 */
export function buildExperimentCells({ algorithmIds, dataTypeIds, keyModeIds, rand }) {
  const cells = []
  algorithmIds.forEach((algorithmId) => {
    dataTypeIds.forEach((dataTypeId) => {
      keyModeIds.forEach((keyModeId) => {
        if (isValidCombination(algorithmId, keyModeId)) {
          cells.push({ algorithmId, dataTypeId, keyModeId })
        }
      })
    })
  })
  return rand ? shuffle(cells, rand) : cells
}

/** Daftar kombinasi valid saja. */
export function validCombinations(algorithmIds, keyModeIds) {
  const result = []
  algorithmIds.forEach((algorithmId) => {
    keyModeIds.forEach((keyModeId) => {
      if (isValidCombination(algorithmId, keyModeId)) {
        result.push({ algorithmId, keyModeId })
      }
    })
  })
  return result
}

export function isSecureAlgorithm(algorithmId) {
  return algorithmId === "secure-hybrid" || algorithmId === "secure-ecdh"
}

export function nativeImplementation(algorithmId) {
  return NATIVE_IMPLEMENTATION[algorithmId] ?? 0
}
