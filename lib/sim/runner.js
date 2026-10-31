// Orkestrator eksperimen.
//
// Desain percobaan: seed tersimpan, warm-up 5 kali, ulangan n (default 30)
// per sel (algoritma x tipe data x mode kunci), urutan sel diacak, dan
// lingkungan dicatat. Waktu memakai performance.now() sehingga selisih waktu
// antara cipher klasik (JS murni) dan AES (Web Crypto/native) mencerminkan
// implementasi, bukan semata algoritma -> lihat kolom implementasi_native.

import { dataTypes, algorithmCatalog, keyModes } from "../simulation-config.js"
import { createSeededRandom } from "./prng.js"
import { isClassicAlgorithm } from "./classic.js"
import { decryptClassic, encryptClassic, generateClassicKeys } from "./classic.js"
import {
  ALGORITHM_CODES,
  DATA_TYPE_CODES,
  KEY_MODE_CODES,
  buildExperimentCells,
  coveragePercent,
  keySpaceBitsFor,
  nativeImplementation,
} from "./matrix.js"
import {
  blastRadius,
  bruteForceSeconds,
  byteLength,
  detectPatternLeak,
  forwardSecrecy,
  overheadPercent,
  shannonEntropy,
} from "./metrics.js"
import { computeSubScores, eligibility, weightedTotal } from "./scoring.js"
import * as secure from "./secure.js"
import { samplePlaintext } from "./dataset.js"

const DEFAULT_ALGORITHMS = algorithmCatalog.map((item) => item.id)
const DEFAULT_DATA_TYPES = dataTypes.map((item) => item.id)
const DEFAULT_KEY_MODES = keyModes.map((item) => item.id)

function findByCode(list, id) {
  return list.find((item) => item.id === id)
}

function median(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/** Catat lingkungan tempat eksperimen dijalankan. */
export function captureEnvironment() {
  const nav = typeof navigator !== "undefined" ? navigator : {}
  return {
    userAgent: nav.userAgent || "node",
    platform: nav.platform || (typeof process !== "undefined" ? process.platform : "unknown"),
    hardwareConcurrency: nav.hardwareConcurrency || 0,
    runtime: typeof window !== "undefined" ? "browser" : "node",
    locale: nav.language || "id-ID",
    timestamp: new Date().toISOString(),
  }
}

function fixedIv() {
  return new Uint8Array(12).fill(7)
}

/**
 * Siapkan material kunci + fakta tingkat-sel (dihitung sekali per sel).
 */
async function prepareCell({ algorithmId, dataTypeId, keyModeId, seed, recordCount, sessions, noncePolicy }) {
  const dataType = findByCode(dataTypes, dataTypeId)
  const rand = createSeededRandom(seed + algorithmId.length * 31 + dataTypeId.length * 17 + keyModeId.length * 7)
  const classic = isClassicAlgorithm(algorithmId)

  const material = classic
    ? { keys: generateClassicKeys(algorithmId, rand) }
    : { key: await secure.createAesKey() }

  const encrypt = async (text) => {
    if (classic) return encryptClassic(algorithmId, text, material.keys)
    const iv = noncePolicy === "reuse" ? fixedIv() : undefined
    const result = await secure.encryptAead(text, material.key, { iv, aad: keyModeId === "statis" ? undefined : `${dataTypeId}` })
    return result.cipherB64
  }

  // Pola bocor: enkripsi plaintext identik dua kali lalu bandingkan.
  const probe = "PROBE|DEMO|123"
  const c1 = await encrypt(probe)
  const c2 = await encrypt(probe)
  const polaBocor = detectPatternLeak(c1, c2)

  // Deteksi manipulasi: cipher klasik tidak memiliki MAC.
  let deteksi = 0
  let salin = 1
  if (!classic) {
    deteksi = await secure.detectsTampering({ text: probe, key: material.key, aad: undefined })
    salin = await secure.tryCopyAttack({ key: material.key, plainA: "A", plainB: "B", withAad: true })
  }

  // Biaya rotasi: ukur enkripsi ulang sejumlah record contoh lalu skala.
  const sampleSize = 50
  const start = performance.now()
  for (let i = 0; i < sampleSize; i += 1) {
    await encrypt(`ROTASI|${i}|${dataTypeId}`)
  }
  const perRecord = (performance.now() - start) / sampleSize
  const biayaRotasiMs = Math.round(perRecord * recordCount * 100) / 100
  const kmsCalls =
    keyModeId === "statis" ? 2 : keyModeId === "dinamis_per_sesi" ? Math.min(sessions, 500) : Math.min(recordCount, 500)

  return {
    dataType,
    material,
    encrypt,
    facts: { polaBocor, deteksi, salin, biayaRotasiMs, kmsCalls },
  }
}

/**
 * Jalankan eksperimen lengkap.
 * @param {object} options
 * @returns {Promise<{rows:Array, meta:object}>}
 */
export async function runExperiment({
  seed = 2024,
  algorithmIds = DEFAULT_ALGORITHMS,
  dataTypeIds = DEFAULT_DATA_TYPES,
  keyModeIds = DEFAULT_KEY_MODES,
  n = 30,
  warmup = 5,
  recordCount = 1000,
  sessions = 30,
  noncePolicy = "unique",
  dataset = null,
  onProgress,
} = {}) {
  const shuffleRand = createSeededRandom(seed)
  const cells = buildExperimentCells({ algorithmIds, dataTypeIds, keyModeIds, rand: shuffleRand })
  const rows = []

  for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 1) {
    const cell = cells[cellIndex]
    const { algorithmId, dataTypeId, keyModeId } = cell
    const prepared = await prepareCell({ algorithmId, dataTypeId, keyModeId, seed, recordCount, sessions, noncePolicy })
    const { dataType, facts } = prepared
    const classic = isClassicAlgorithm(algorithmId)

    const keySpaceBit = keySpaceBitsFor(algorithmId)
    const cakupan = coveragePercent(algorithmId)
    const native = nativeImplementation(algorithmId)
    const blast = blastRadius({ keyModeId, recordCount, sessions })
    const fs = forwardSecrecy({ algorithmId, keyModeId, ephemeral: true })
    const runId = `run-${algorithmId}-${dataTypeId}-${keyModeId}`

    const runOnce = async (plaintext) => {
      let cipher
      let ivB64
      const encStart = performance.now()
      if (classic) {
        cipher = encryptClassic(algorithmId, plaintext, prepared.material.keys)
      } else {
        const out = await secure.encryptAead(plaintext, prepared.material.key, {
          iv: noncePolicy === "reuse" ? fixedIv() : undefined,
          aad: keyModeId === "statis" ? undefined : dataTypeId,
        })
        cipher = out.cipherB64
        ivB64 = out.ivB64
      }
      const encMs = performance.now() - encStart

      const decStart = performance.now()
      if (classic) {
        decryptClassic(algorithmId, cipher, prepared.material.keys)
      } else {
        await secure.decryptAead(cipher, prepared.material.key, {
          ivB64,
          aad: keyModeId === "statis" ? undefined : dataTypeId,
        })
      }
      const decMs = performance.now() - decStart
      return { cipher, encMs, decMs }
    }

    // Warm-up (hasil dibuang).
    for (let w = 0; w < warmup; w += 1) {
      await runOnce(samplePlaintext(dataTypeId, { seed: seed + w, dataset }))
    }

    const encTimes = []
    for (let i = 1; i <= n; i += 1) {
      const plaintext = samplePlaintext(dataTypeId, { seed: seed + i, dataset })
      const { cipher, encMs, decMs } = await runOnce(plaintext)
      encTimes.push(encMs)

      const plainBytes = byteLength(plaintext)
      const cipherBytes = byteLength(cipher)
      const baseMetrics = {
        ukuran_data_byte: plainBytes,
        waktu_enkripsi_ms: Math.round(encMs * 1000) / 1000,
        waktu_dekripsi_ms: Math.round(decMs * 1000) / 1000,
        ukuran_cipher_byte: cipherBytes,
        overhead_persen: overheadPercent(plainBytes, cipherBytes),
        entropi_cipher: shannonEntropy(cipher),
        ruang_kunci_bit: keySpaceBit,
        waktu_bruteforce_detik: bruteForceSeconds(keySpaceBit),
        pola_bocor: facts.polaBocor,
        deteksi_manipulasi: facts.deteksi,
        serangan_salin_berhasil: facts.salin,
        forward_secrecy: fs,
        blast_radius_persen: blast,
        biaya_rotasi_ms: facts.biayaRotasiMs,
        panggilan_kms: facts.kmsCalls,
        cakupan_persen: cakupan,
        implementasi_native: native,
      }

      const subScores = computeSubScores(baseMetrics, dataType)
      const total = weightedTotal(subScores, dataType.weight)
      const gate = eligibility({ algorithmId, dataType, subScores })

      rows.push({
        run_id: runId,
        ulangan: i,
        algoritma: ALGORITHM_CODES[algorithmId],
        algoritma_id: algorithmId,
        algoritma_label: findByCode(algorithmCatalog, algorithmId).label,
        tipe_data: DATA_TYPE_CODES[dataTypeId],
        tipe_data_id: dataTypeId,
        tipe_data_label: dataType.label,
        mode_kunci: KEY_MODE_CODES[keyModeId],
        mode_kunci_id: keyModeId,
        mode_kunci_label: findByCode(keyModes, keyModeId).label,
        ...baseMetrics,
        skor_kerahasiaan: subScores.kerahasiaan,
        skor_integritas: subScores.integritas,
        skor_dampak_bocor: subScores.dampak_bocor,
        skor_performa: subScores.performa,
        skor_kompleksitas: subScores.kompleksitas,
        skor_total: total,
        layak: gate.layak,
        catatan: gate.notes,
      })
    }

    if (typeof onProgress === "function") {
      onProgress({
        cellIndex: cellIndex + 1,
        totalCells: cells.length,
        algorithmId,
        dataTypeId,
        keyModeId,
        rows: rows.length,
      })
    }
  }

  const meta = {
    seed,
    dataset: dataset?.source || "sintetis (bawaan)",
    params: {
      n,
      warmup,
      recordCount,
      sessions,
      noncePolicy,
      algorithmIds,
      dataTypeIds,
      keyModeIds,
      validCells: cells.length,
    },
    environment: captureEnvironment(),
    weights: dataTypes.map((item) => ({ tipe_data: item.label, ...item.weight })),
    timestamp: new Date().toISOString(),
  }

  return { rows, meta }
}

/** Ringkasan statistik per algoritma (untuk tabel T1). */
export function summarizeByAlgorithm(rows) {
  const groups = new Map()
  rows.forEach((row) => {
    if (!groups.has(row.algoritma_id)) groups.set(row.algoritma_id, [])
    groups.get(row.algoritma_id).push(row)
  })

  return Array.from(groups.entries()).map(([algorithmId, group]) => {
    const enc = group.map((r) => r.waktu_enkripsi_ms)
    const dec = group.map((r) => r.waktu_dekripsi_ms)
    const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0)
    const sd = (list) => {
      if (list.length < 2) return 0
      const m = mean(list)
      return Math.sqrt(list.reduce((acc, v) => acc + (v - m) ** 2, 0) / (list.length - 1))
    }
    return {
      algorithmId,
      label: group[0].algoritma_label,
      n: group.length,
      meanEncrypt: Math.round(mean(enc) * 1000) / 1000,
      sdEncrypt: Math.round(sd(enc) * 1000) / 1000,
      medianEncrypt: Math.round(median(enc) * 1000) / 1000,
      meanDecrypt: Math.round(mean(dec) * 1000) / 1000,
      sdDecrypt: Math.round(sd(dec) * 1000) / 1000,
      medianDecrypt: Math.round(median(dec) * 1000) / 1000,
      meanScore: Math.round(mean(group.map((r) => r.skor_total)) * 10) / 10,
    }
  })
}
