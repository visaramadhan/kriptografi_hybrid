export const dataTypes = [
  {
    id: "umum",
    label: "Identitas umum",
    sensitivity: "Rendah",
    protectionPriority: "Kerahasiaan",
    sizeLabel: "Kecil",
    sizeValue: 0.7,
    records: 5000,
    weight: { confidentiality: 0.25, integrity: 0.15, leakImpact: 0.2, performance: 0.25, keyComplexity: 0.15 },
    warning: "Data umum masih perlu dibatasi akses untuk audit dan pelacakan.",
  },
  {
    id: "sensitif",
    label: "Data pribadi sensitif",
    sensitivity: "Tinggi",
    protectionPriority: "Kerahasiaan",
    sizeLabel: "Sedang",
    sizeValue: 1,
    records: 4000,
    weight: { confidentiality: 0.35, integrity: 0.15, leakImpact: 0.25, performance: 0.1, keyComplexity: 0.15 },
    warning: "Wajib perlindungan kuat; hindari penyimpanan plaintext di storage tidak terenkripsi.",
  },
  {
    id: "keuangan",
    label: "Data keuangan",
    sensitivity: "Sangat tinggi",
    protectionPriority: "Integritas + kerahasiaan",
    sizeLabel: "Kecil",
    sizeValue: 0.8,
    records: 2500,
    weight: { confidentiality: 0.3, integrity: 0.25, leakImpact: 0.25, performance: 0.1, keyComplexity: 0.1 },
    warning: "Batas akses, audit, dan deteksi perubahan harus hadir.",
  },
  {
    id: "nilai",
    label: "Nilai dan transkrip",
    sensitivity: "Tinggi",
    protectionPriority: "Integritas",
    sizeLabel: "Sedang",
    sizeValue: 1.3,
    records: 1800,
    weight: { confidentiality: 0.2, integrity: 0.4, leakImpact: 0.2, performance: 0.1, keyComplexity: 0.1 },
    warning: "Nilai akademik memerlukan integritas tinggi dan traceability.",
  },
  {
    id: "ijazah",
    label: "Ijazah / dokumen besar",
    sensitivity: "Sangat tinggi",
    protectionPriority: "Integritas + keaslian",
    sizeLabel: "Besar",
    sizeValue: 1.8,
    records: 900,
    weight: { confidentiality: 0.15, integrity: 0.4, leakImpact: 0.2, performance: 0.1, keyComplexity: 0.15 },
    warning: "Wajib dapat diverifikasi; perlu tanda tangan digital dan kontrol backup.",
  },
  {
    id: "kredensial",
    label: "Kredensial (password)",
    sensitivity: "Sangat tinggi",
    protectionPriority: "Kerahasiaan",
    sizeLabel: "Kecil",
    sizeValue: 0.5,
    records: 1200,
    weight: { confidentiality: 0.25, integrity: 0.15, leakImpact: 0.2, performance: 0.2, keyComplexity: 0.2 },
    warning: "Gunakan hashing (Argon2/bcrypt), bukan enkripsi.",
    isPassword: true,
  },
]

export const algorithmCatalog = [
  {
    id: "caesar",
    label: "Caesar",
    coverage: 0.2,
    keySpaceBits: 4.7,
    native: 1,
    baseEncryptMs: 0.9,
    baseDecryptMs: 0.8,
    baseCipherSize: 1.1,
    baseOverhead: 8,
    bruteForceSeconds: 26,
    leakPattern: "Ciphertext berulang bila plaintext identik.",
    protection: "Jaringan (lemah) saja",
    validKeyModes: ["statis", "dinamis_per_sesi"],
  },
  {
    id: "double-caesar",
    label: "Double Caesar",
    coverage: 0.25,
    keySpaceBits: 9.4,
    native: 1,
    baseEncryptMs: 1.2,
    baseDecryptMs: 1.1,
    baseCipherSize: 1.2,
    baseOverhead: 10,
    bruteForceSeconds: 676,
    leakPattern: "Masih mudah dikenali dari pola pergeseran berulang.",
    protection: "Jaringan (lemah) saja",
    validKeyModes: ["statis", "dinamis_per_sesi"],
  },
  {
    id: "affine",
    label: "Affine",
    coverage: 0.28,
    keySpaceBits: 20,
    native: 1,
    baseEncryptMs: 1.5,
    baseDecryptMs: 1.4,
    baseCipherSize: 1.3,
    baseOverhead: 12,
    bruteForceSeconds: 128000,
    leakPattern: "Pola linier tetap dapat dipecahkan jika alfabet terbatas.",
    protection: "Jaringan (lemah) saja",
    validKeyModes: ["statis", "dinamis_per_sesi"],
  },
  {
    id: "hybrid",
    label: "Hybrid",
    coverage: 0.45,
    keySpaceBits: 52,
    native: 1,
    baseEncryptMs: 2.6,
    baseDecryptMs: 2.4,
    baseCipherSize: 1.6,
    baseOverhead: 18,
    bruteForceSeconds: 2.8e9,
    leakPattern: "Belum cukup untuk at-rest, tetapi lebih kuat di jaringan.",
    protection: "Jaringan",
    validKeyModes: ["statis", "dinamis_per_sesi", "dinamis_per_record"],
  },
  {
    id: "secure-hybrid",
    label: "Secure Hybrid",
    coverage: 0.82,
    keySpaceBits: 256,
    native: 0,
    baseEncryptMs: 4.6,
    baseDecryptMs: 4.2,
    baseCipherSize: 2.2,
    baseOverhead: 24,
    bruteForceSeconds: 1.1e77,
    leakPattern: "AES-GCM terikat AAD; perubahan 1 bit tag gagal.",
    protection: "Jaringan + database + backup",
    validKeyModes: ["statis", "dinamis_per_sesi", "dinamis_per_record"],
  },
  {
    id: "secure-ecdh",
    label: "Secure ECDHE",
    coverage: 0.38,
    keySpaceBits: 256,
    native: 0,
    baseEncryptMs: 5.1,
    baseDecryptMs: 4.8,
    baseCipherSize: 2.0,
    baseOverhead: 21,
    bruteForceSeconds: 1.1e77,
    leakPattern: "Forward secrecy; sesi lama tetap aman jika kunci privat bocor.",
    protection: "Jaringan saja (tidak mencakup at rest)",
    validKeyModes: ["dinamis_per_sesi"],
  },
]

export const keyModes = [
  { id: "statis", label: "Statis", description: "Satu kunci tetap; konfigurasi rotasi periodik." },
  { id: "dinamis_per_sesi", label: "Dinamis per sesi", description: "Kunci efemeral per sesi, cocok ECDHE." },
  { id: "dinamis_per_record", label: "Dinamis per record", description: "Envelope per record dengan KEK dan DEK terpisah." },
]

const seededRandom = (seed) => {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646

  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const clamp = (val, min, max) => Math.min(Math.max(val, min), max)

export function generateSimulationRows({ seed = 2024, recordCount = 1000 } = {}) {
  const rand = seededRandom(seed)
  const rows = []

  algorithmCatalog.forEach((algorithm, algorithmIndex) => {
    dataTypes.forEach((dataType, dataIndex) => {
      keyModes.forEach((keyMode, keyIndex) => {
        if (!algorithm.validKeyModes.includes(keyMode.id)) {
          return
        }

        const sampleFactor = dataType.sizeValue + (algorithmIndex * 0.2)
        const rngA = rand()
        const rngB = rand()
        const rngC = rand()

        const timeEncryptMs = Number(
          (algorithm.baseEncryptMs * (1 + dataType.sizeValue * 0.8) * (1 + keyIndex * 0.18) + rngA * 14).toFixed(2),
        )
        const timeDecryptMs = Number(
          (algorithm.baseDecryptMs * (1 + dataType.sizeValue * 0.72) * (1 + keyIndex * 0.16) + rngB * 11).toFixed(2),
        )
        const ciphertextSize = Math.round(
          algorithm.baseCipherSize * (recordCount / 1000) * (1 + dataType.sizeValue * 0.7) * (1 + rngC * 0.15),
        )
        const overheadPct = Number((algorithm.baseOverhead + dataType.sizeValue * 8 + keyIndex * 4 + rngA * 8).toFixed(1))
        const entropyCipher = Number((4.2 + algorithm.keySpaceBits / 40 + rngB * 2.2).toFixed(2))
        const keySpaceBit = algorithm.keySpaceBits
        const bruteForceSeconds = Number((algorithm.bruteForceSeconds * (1 + (1 - rngC) * 0.4)).toFixed(2))
        const patternLeak = rngA > 0.85 ? 1 : 0
        const tamperDetected = algorithm.id.includes("secure") || rngA > 0.75 ? 1 : 0
        const copyAttackSuccess = algorithm.id === "caesar" || algorithm.id === "double-caesar" || algorithm.id === "affine" ? 1 : 0
        const forwardSecrecy = algorithm.id === "secure-ecdh" || (algorithm.id === "secure-hybrid" && keyMode.id === "dinamis_per_sesi") ? 1 : 0
        const blastRadius = clamp(
          (algorithm.coverage * 100 - (keyMode.id === "statis" ? 28 : keyMode.id === "dinamis_per_sesi" ? 12 : 6) + (dataType.sensitivity === "Sangat tinggi" ? 8 : 0)),
          4,
          96,
        )
        const rotationCostMs = Math.round(45 + keyIndex * 120 + algorithmIndex * 26 + sampleFactor * 100)
        const kmsCalls = keyMode.id === "dinamis_per_record" ? 12 : keyMode.id === "dinamis_per_sesi" ? 5 : 2
        const coveragePercent = Math.round(algorithm.coverage * 100)
        const native = algorithm.native
        const scoreConfidentiality = Number((algorithm.keySpaceBits / 256 * 100 * (1 + 0.15 * dataType.weight.confidentiality) * (keyMode.id === "dinamis_per_record" ? 1.1 : 1)).toFixed(1))
        const scoreIntegrity = Number(((tamperDetected ? 95 : 30) * (1 + dataType.weight.integrity * 0.55)).toFixed(1))
        const scoreLeakImpact = Number(((100 - blastRadius) * (0.6 + dataType.weight.leakImpact) * (forwardSecrecy ? 1.08 : 1)).toFixed(1))
        const scorePerformance = Number((100 - clamp(overheadPct * 1.7, 0, 65) + (native ? 10 : -6)).toFixed(1))
        const scoreKeyComplexity = Number((100 - clamp(rotationCostMs / 12, 0, 70) - kmsCalls * 2).toFixed(1))

        const scoreTotal = Number(
          (
            scoreConfidentiality * dataType.weight.confidentiality +
            scoreIntegrity * dataType.weight.integrity +
            scoreLeakImpact * dataType.weight.leakImpact +
            scorePerformance * dataType.weight.performance +
            scoreKeyComplexity * dataType.weight.keyComplexity
          ).toFixed(1),
        )

        rows.push({
          run_id: `run-${algorithm.id}-${dataType.id}-${keyMode.id}`,
          ulangan: algorithmIndex * 10 + dataIndex * 3 + keyIndex + 1,
          algoritma: algorithm.label,
          tipe_data: dataType.label,
          mode_kunci: keyMode.label,
          ukuran_data_byte: Math.round(recordCount * (dataType.sizeValue * 120 + 90)),
          waktu_enkripsi_ms: timeEncryptMs,
          waktu_dekripsi_ms: timeDecryptMs,
          ukuran_cipher_byte: ciphertextSize,
          overhead_persen: overheadPct,
          entropi_cipher: entropyCipher,
          ruang_kunci_bit: keySpaceBit,
          waktu_bruteforce_detik: bruteForceSeconds,
          pola_bocor: patternLeak,
          deteksi_manipulasi: tamperDetected,
          serangan_salin_berhasil: copyAttackSuccess,
          forward_secrecy: forwardSecrecy,
          blast_radius_persen: blastRadius,
          biaya_rotasi_ms: rotationCostMs,
          panggilan_kms: kmsCalls,
          cakupan_persen: coveragePercent,
          implementasi_native: native,
          skor_kerahasiaan: Number(scoreConfidentiality.toFixed(1)),
          skor_integritas: Number(scoreIntegrity.toFixed(1)),
          skor_dampak_bocor: Number(scoreLeakImpact.toFixed(1)),
          skor_performa: Number(scorePerformance.toFixed(1)),
          skor_kompleksitas: Number(scoreKeyComplexity.toFixed(1)),
          skor_total: scoreTotal,
          layak: scoreTotal >= 50 ? 1 : 0,
        })
      })
    })
  })

  return rows
}

export function summarizeRows(rows) {
  const total = rows.length
  const averageScore = total ? Number((rows.reduce((sum, row) => sum + row.skor_total, 0) / total).toFixed(1)) : 0
  const averageEncrypt = total ? Number((rows.reduce((sum, row) => sum + row.waktu_enkripsi_ms, 0) / total).toFixed(2)) : 0
  const averageCipherSize = total ? Number((rows.reduce((sum, row) => sum + row.ukuran_cipher_byte, 0) / total).toFixed(0)) : 0

  return {
    total,
    averageScore,
    averageEncrypt,
    averageCipherSize,
  }
}

export function getJsonMetadata() {
  return {
    seed: 2024,
    recordCount: 1000,
    environment: {
      runtime: "Next.js / browser client",
      locale: "id-ID",
      note: "Data dummy; bukan data real, tidak dikirim ke server.",
    },
    algorithms: algorithmCatalog,
    dataTypes,
    keyModes,
  }
}

export const defaultSimulationRows = generateSimulationRows({ seed: 2024, recordCount: 1000 })
export const defaultAlgorithmSummary = algorithmCatalog.map((algorithm) => {
  const rows = defaultSimulationRows.filter((row) => row.algoritma === algorithm.label)
  const scoreAvg = rows.length ? rows.reduce((sum, row) => sum + row.skor_total, 0) / rows.length : 0

  return {
    ...algorithm,
    avgScore: Number(scoreAvg.toFixed(1)),
    totalRuns: rows.length,
  }
})

// Cakupan perlindungan pada 5 titik jalur data (aditif; tidak mengubah
// perilaku lama). Dipakai untuk menghitung cakupan_persen pada skor.
export const ALL_COVERAGE_LAYERS = ["browser", "jaringan", "backend", "database", "backup"]

export const coverageLayers = {
  caesar: ["jaringan"],
  "double-caesar": ["jaringan"],
  affine: ["jaringan"],
  hybrid: ["jaringan"],
  "secure-hybrid": ["jaringan", "database", "backup"],
  "secure-ecdh": ["jaringan"],
}

export const defaultDataTypeSummary = dataTypes.map((dataType) => {
  const rows = defaultSimulationRows.filter((row) => row.tipe_data === dataType.label)
  const scoreAvg = rows.length ? rows.reduce((sum, row) => sum + row.skor_total, 0) / rows.length : 0

  return {
    ...dataType,
    avgScore: Number(scoreAvg.toFixed(1)),
    totalRuns: rows.length,
  }
})
