// Ekspor hasil simulasi: dataset CSV, codebook, syntax SPSS, dan metadata.
//
// Format CSV mengikuti ketentuan impor SPSS:
// UTF-8, pemisah koma, titik desimal, tanpa pemisah ribuan, header baris 1,
// semua kategori dikodekan angka, data hilang dikosongkan.

import { algorithmCatalog, dataTypes, keyModes } from "../simulation-config.js"
import { ALGORITHM_CODES, DATA_TYPE_CODES, KEY_MODE_CODES } from "./matrix.js"

export const DATASET_COLUMNS = [
  "run_id",
  "ulangan",
  "algoritma",
  "tipe_data",
  "mode_kunci",
  "ukuran_data_byte",
  "waktu_enkripsi_ms",
  "waktu_dekripsi_ms",
  "ukuran_cipher_byte",
  "overhead_persen",
  "entropi_cipher",
  "ruang_kunci_bit",
  "waktu_bruteforce_detik",
  "pola_bocor",
  "deteksi_manipulasi",
  "serangan_salin_berhasil",
  "forward_secrecy",
  "blast_radius_persen",
  "biaya_rotasi_ms",
  "panggilan_kms",
  "cakupan_persen",
  "implementasi_native",
  "skor_kerahasiaan",
  "skor_integritas",
  "skor_dampak_bocor",
  "skor_performa",
  "skor_kompleksitas",
  "skor_total",
  "layak",
]

/** Format angka untuk CSV: titik desimal, tanpa pemisah ribuan. */
export function formatCsvNumber(value) {
  if (value == null || value === "") return ""
  const num = Number(value)
  if (!Number.isFinite(num)) return ""
  if (Number.isInteger(num) && Math.abs(num) >= 1e21) return BigInt(num).toString()
  return String(num)
}

function escapeCsvField(value) {
  const text = String(value ?? "")
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Bangun isi dataset_simulasi.csv (format panjang). */
export function buildDatasetCsv(rows) {
  const lines = [DATASET_COLUMNS.join(",")]
  rows.forEach((row) => {
    const line = DATASET_COLUMNS.map((column) => {
      const value = row[column]
      return typeof value === "number" ? formatCsvNumber(value) : escapeCsvField(value)
    })
    lines.push(line.join(","))
  })
  return `${lines.join("\n")}\n`
}

function valueLabelsFor(catalog, codes) {
  return catalog.map((item) => `${codes[item.id]} '${item.label}'`).join(" ")
}

/** Bangun isi codebook.csv. */
export function buildCodebookCsv() {
  const binary = "0 'Tidak' 1 'Ya'"
  const rows = [
    ["run_id", "ID percobaan (sel + ulangan)", "String", "Nominal", ""],
    ["ulangan", "Nomor ulangan dalam sel (1..n)", "Integer", "Scale", ""],
    ["algoritma", "Algoritma kriptografi", "Integer", "Nominal", valueLabelsFor(algorithmCatalog, ALGORITHM_CODES)],
    ["tipe_data", "Tipe data akademik", "Integer", "Nominal", valueLabelsFor(dataTypes, DATA_TYPE_CODES)],
    ["mode_kunci", "Mode penggunaan kunci", "Integer", "Nominal", valueLabelsFor(keyModes, KEY_MODE_CODES)],
    ["ukuran_data_byte", "Ukuran plaintext (byte)", "Integer", "Scale", ""],
    ["waktu_enkripsi_ms", "Waktu enkripsi (ms)", "Decimal", "Scale", ""],
    ["waktu_dekripsi_ms", "Waktu dekripsi (ms)", "Decimal", "Scale", ""],
    ["ukuran_cipher_byte", "Ukuran ciphertext (byte)", "Integer", "Scale", ""],
    ["overhead_persen", "Overhead ukuran ciphertext (%)", "Decimal", "Scale", ""],
    ["entropi_cipher", "Entropi Shannon ciphertext (bit/simbol)", "Decimal", "Scale", ""],
    ["ruang_kunci_bit", "Ruang kunci (bit)", "Decimal", "Scale", ""],
    ["waktu_bruteforce_detik", "Estimasi waktu brute force (detik)", "Decimal", "Scale", ""],
    ["pola_bocor", "Plaintext sama menghasilkan ciphertext sama", "Integer", "Nominal", binary],
    ["deteksi_manipulasi", "Manipulasi ciphertext terdeteksi", "Integer", "Nominal", binary],
    ["serangan_salin_berhasil", "Serangan salin ciphertext antar record berhasil", "Integer", "Nominal", binary],
    ["forward_secrecy", "Memiliki forward secrecy", "Integer", "Nominal", binary],
    ["blast_radius_persen", "Persentase record terbuka bila satu kunci bocor (%)", "Decimal", "Scale", ""],
    ["biaya_rotasi_ms", "Biaya rotasi kunci (ms)", "Decimal", "Scale", ""],
    ["panggilan_kms", "Jumlah panggilan KMS per rotasi", "Integer", "Scale", ""],
    ["cakupan_persen", "Cakupan titik jalur terlindungi (%)", "Decimal", "Scale", ""],
    ["implementasi_native", "Implementasi memakai kripto native", "Integer", "Nominal", binary],
    ["skor_kerahasiaan", "Sub-skor kerahasiaan (0-100)", "Decimal", "Scale", ""],
    ["skor_integritas", "Sub-skor integritas (0-100)", "Decimal", "Scale", ""],
    ["skor_dampak_bocor", "Sub-skor dampak kebocoran kunci (0-100)", "Decimal", "Scale", ""],
    ["skor_performa", "Sub-skor performa (0-100)", "Decimal", "Scale", ""],
    ["skor_kompleksitas", "Sub-skor kompleksitas kunci (0-100)", "Decimal", "Scale", ""],
    ["skor_total", "Skor kecocokan total berbobot (0-100)", "Decimal", "Scale", ""],
    ["layak", "Lolos gerbang kelayakan", "Integer", "Nominal", binary],
  ]

  const header = "nama_variabel,label,tipe,skala_ukur,value_labels"
  const body = rows.map((row) => row.map(escapeCsvField).join(","))
  return `${[header, ...body].join("\n")}\n`
}

function spssTypeFor(column) {
  if (column === "run_id") return "A40"
  if (column === "waktu_bruteforce_detik") return "F40.6"
  if (
    [
      "waktu_enkripsi_ms",
      "waktu_dekripsi_ms",
      "overhead_persen",
      "entropi_cipher",
      "ruang_kunci_bit",
      "blast_radius_persen",
      "biaya_rotasi_ms",
      "cakupan_persen",
      "skor_kerahasiaan",
      "skor_integritas",
      "skor_dampak_bocor",
      "skor_performa",
      "skor_kompleksitas",
      "skor_total",
    ].includes(column)
  ) {
    return "F12.6"
  }
  return "F12.0"
}

const VARIABLE_LABELS = {
  run_id: "ID percobaan",
  ulangan: "Nomor ulangan per sel",
  algoritma: "Algoritma kriptografi",
  tipe_data: "Tipe data akademik",
  mode_kunci: "Mode penggunaan kunci",
  ukuran_data_byte: "Ukuran plaintext (byte)",
  waktu_enkripsi_ms: "Waktu enkripsi (ms)",
  waktu_dekripsi_ms: "Waktu dekripsi (ms)",
  ukuran_cipher_byte: "Ukuran ciphertext (byte)",
  overhead_persen: "Overhead ukuran ciphertext (%)",
  entropi_cipher: "Entropi Shannon ciphertext",
  ruang_kunci_bit: "Ruang kunci (bit)",
  waktu_bruteforce_detik: "Estimasi waktu brute force (detik)",
  pola_bocor: "Pola bocor (plaintext sama -> ciphertext sama)",
  deteksi_manipulasi: "Deteksi manipulasi ciphertext",
  serangan_salin_berhasil: "Serangan salin ciphertext berhasil",
  forward_secrecy: "Forward secrecy",
  blast_radius_persen: "Blast radius (% record terbuka)",
  biaya_rotasi_ms: "Biaya rotasi kunci (ms)",
  panggilan_kms: "Panggilan KMS per rotasi",
  cakupan_persen: "Cakupan titik jalur terlindungi (%)",
  implementasi_native: "Implementasi kripto native",
  skor_kerahasiaan: "Sub-skor kerahasiaan",
  skor_integritas: "Sub-skor integritas",
  skor_dampak_bocor: "Sub-skor dampak kebocoran kunci",
  skor_performa: "Sub-skor performa",
  skor_kompleksitas: "Sub-skor kompleksitas kunci",
  skor_total: "Skor kecocokan total",
  layak: "Lolos gerbang kelayakan",
}

const NOMINAL_VARS = [
  "ulangan",
  "algoritma",
  "tipe_data",
  "mode_kunci",
  "pola_bocor",
  "deteksi_manipulasi",
  "serangan_salin_berhasil",
  "forward_secrecy",
  "panggilan_kms",
  "implementasi_native",
  "layak",
]

/** Bangun syntax SPSS (GET DATA + labels + levels). */
export function buildSpssSyntax() {
  const variables = DATASET_COLUMNS.map((column) => `    ${column} ${spssTypeFor(column)}`).join("\n")

  const variableLabels = DATASET_COLUMNS.map(
    (column) => `  ${column} '${(VARIABLE_LABELS[column] || column).replace(/'/g, "''")}'`,
  ).join("\n")

  const valueLabels = [
    `  algoritma ${algorithmCatalog.map((item) => `${ALGORITHM_CODES[item.id]} '${item.label}'`).join(" ")}`,
    `  tipe_data ${dataTypes.map((item) => `${DATA_TYPE_CODES[item.id]} '${item.label}'`).join(" ")}`,
    `  mode_kunci ${keyModes.map((item) => `${KEY_MODE_CODES[item.id]} '${item.label}'`).join(" ")}`,
    `  pola_bocor deteksi_manipulasi serangan_salin_berhasil forward_secrecy implementasi_native layak 0 'Tidak' 1 'Ya'`,
  ].join("\n")

  const levels = DATASET_COLUMNS.map((column) => {
    const measure = NOMINAL_VARS.includes(column) ? "NOMINAL" : "SCALE"
    return `  ${column} (${measure})`
  }).join("\n")

  return `* Impor dataset simulasi kriptografi akademik.
* Sesuaikan path /FILE di bawah dengan lokasi dataset_simulasi.csv.

GET DATA
  /TYPE=TXT
  /FILE='dataset_simulasi.csv'
  /ENCODING='UTF8'
  /DELIMITERS=","
  /QUALIFIER='"'
  /ARRANGEMENT=DELIMITED
  /FIRSTCASE=2
  /VARIABLES=
${variables}
  /MAP.

VARIABLE LABELS
${variableLabels}.

VALUE LABELS
${valueLabels}.

VARIABLE LEVEL
${levels}.

EXECUTE.
`
}

/** Bangun metadata.json. */
export function buildMetadataJson(meta) {
  return `${JSON.stringify(meta, null, 2)}\n`
}

/** Unduh teks sebagai berkas (khusus browser). */
export function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
  if (typeof document === "undefined") return false
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return true
}
