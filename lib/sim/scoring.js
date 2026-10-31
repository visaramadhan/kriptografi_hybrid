// Skor kecocokan 0-100 (transparan) + gerbang kelayakan.

import { isClassicAlgorithm } from "./classic.js"

const clamp100 = (value) => Math.min(100, Math.max(0, value))
const round1 = (value) => Math.round(value * 10) / 10

/**
 * Hitung 5 sub-skor dari metrik satu percobaan.
 * @param {object} metrics
 * @param {{weight:object}} dataType
 */
export function computeSubScores(metrics, dataType) {
  const keyScore = clamp100(((metrics.ruang_kunci_bit || 0) / 256) * 100)
  const leakScore = (1 - (metrics.pola_bocor ? 1 : 0)) * 100
  const coverage = metrics.cakupan_persen || 0
  const kerahasiaan = clamp100(0.5 * keyScore + 0.25 * leakScore + 0.25 * coverage)

  const integritas = clamp100(
    50 * (metrics.deteksi_manipulasi || 0) + 50 * (1 - (metrics.serangan_salin_berhasil || 0)),
  )

  const dampak_bocor = clamp100(
    60 * (1 - (metrics.blast_radius_persen || 0) / 100) + 40 * (metrics.forward_secrecy || 0),
  )

  const performa = clamp100(
    100 -
      (metrics.overhead_persen || 0) * 1.2 -
      Math.min(metrics.waktu_enkripsi_ms || 0, 50) * 1.6 +
      (metrics.implementasi_native ? 6 : 0),
  )

  // Penalti panggilan KMS memakai skala logaritmik agar tetap terbounded
  // (mode envelope bisa memanggil KMS ratusan kali).
  const kmsPenalty = Math.min(Math.log10((metrics.panggilan_kms || 0) + 1) * 10, 40)
  const kompleksitas = clamp100(100 - Math.min((metrics.biaya_rotasi_ms || 0) / 12, 50) - kmsPenalty)

  return {
    kerahasiaan: round1(kerahasiaan),
    integritas: round1(integritas),
    dampak_bocor: round1(dampak_bocor),
    performa: round1(performa),
    kompleksitas: round1(kompleksitas),
  }
}

/** Skor total berbobot. Bobot wajib berjumlah 1. */
export function weightedTotal(subScores, weight) {
  const total =
    subScores.kerahasiaan * weight.confidentiality +
    subScores.integritas * weight.integrity +
    subScores.dampak_bocor * weight.leakImpact +
    subScores.performa * weight.performance +
    subScores.kompleksitas * weight.keyComplexity
  return round1(total)
}

/**
 * Gerbang kelayakan (berlaku walau skor tinggi).
 * @returns {{layak:0|1, label:string, notes:string[]}}
 */
export function eligibility({ algorithmId, dataType, subScores }) {
  const notes = []
  let layak = true

  if (isClassicAlgorithm(algorithmId)) {
    layak = false
    notes.push("Cipher klasik hanya untuk demo, bukan untuk data produksi.")
  }
  if ((dataType.id === "nilai" || dataType.id === "ijazah") && subScores.integritas < 50) {
    layak = false
    notes.push("Integritas < 50: tidak layak untuk nilai/ijazah.")
  }
  if (dataType.id === "ijazah") {
    notes.push("Perlu tanda tangan digital untuk keaslian dokumen.")
  }
  if (algorithmId === "secure-ecdh") {
    notes.push("Tidak mencakup data at rest; butuh enkripsi penyimpanan terpisah.")
  }
  if (dataType.isPassword) {
    layak = false
    notes.push("Gunakan hashing (Argon2/bcrypt), bukan enkripsi.")
  }

  return { layak: layak ? 1 : 0, label: layak ? "Layak" : "Tidak layak", notes }
}

/** Validasi bobot: jumlah harus 1 (toleransi pembulatan 0.01). */
export function weightsSumToOne(weight) {
  const sum =
    weight.confidentiality +
    weight.integrity +
    weight.leakImpact +
    weight.performance +
    weight.keyComplexity
  return Math.abs(sum - 1) <= 0.01
}
