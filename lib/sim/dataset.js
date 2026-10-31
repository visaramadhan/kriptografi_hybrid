// Generator data akademik DUMMY (berbenih).
//
// PENTING: seluruh isi di sini adalah data sintetis untuk simulasi edukasi.
// Tidak ada data mahasiswa nyata, dan tidak ada data yang dikirim ke server.

import { createSeededRandom, pick, randomInt } from "./prng.js"

export const DATA_TYPE_IDS = ["umum", "sensitif", "keuangan", "nilai", "ijazah", "kredensial"]

const NAMA_DEPAN = ["BUDI", "SITI", "ANDI", "DEWI", "RANGGA", "AYU", "FAJAR", "NIA", "BAYU", "RANI"]
const NAMA_BELAKANG = ["SANTOSO", "RAHAYU", "PRATAMA", "LESTARI", "WIJAYA", "ANGGRAINI", "NUGROHO", "SAFITRI"]
const PRODI = ["TEKNIKINFORMATIKA", "SISTEMINFORMASI", "AKUNTANSI", "MANAJEMEN", "PENDIDIKANMATEMATIKA"]
const KOTA = ["BANDUNG", "SURABAYA", "MAKASSAR", "MEDAN", "SEMARANG", "YOGYAKARTA"]
const MATA_KULIAH = ["IF2101", "IF2102", "IF2103", "MK2201", "AK2001", "MN2002"]

function namaAcak(rand) {
  return `${pick(rand, NAMA_DEPAN)}${pick(rand, NAMA_BELAKANG)}`
}

function angka(rand, panjang) {
  let out = ""
  for (let i = 0; i < panjang; i += 1) out += randomInt(rand, 0, 9)
  return out
}

/**
 * Bangun satu record dummy representatif per tipe data.
 * @returns {Record<string, string>}
 */
function buildRecord(dataTypeId, rand) {
  if (dataTypeId === "umum") {
    return {
      nama: namaAcak(rand),
      nim: `230${angka(rand, 7)}`,
      prodi: pick(rand, PRODI),
    }
  }
  if (dataTypeId === "sensitif") {
    return {
      nik: angka(rand, 16),
      alamat: `JL${pick(rand, KOTA)}NO${angka(rand, 3)}`,
      kontak: `08${angka(rand, 10)}`,
      namaAyah: namaAcak(rand),
      namaIbu: namaAcak(rand),
    }
  }
  if (dataTypeId === "keuangan") {
    return {
      ukt: `RP${randomInt(rand, 500, 12000)}000`,
      kip: rand() > 0.6 ? "YA" : "TIDAK",
      beasiswa: rand() > 0.7 ? "BIDIKMISI" : "NONE",
    }
  }
  if (dataTypeId === "nilai") {
    const baris = []
    for (let i = 0; i < 4; i += 1) {
      baris.push(`${pick(rand, MATA_KULIAH)}:${String.fromCharCode(65 + randomInt(rand, 0, 4))}`)
    }
    return { nim: `230${angka(rand, 7)}`, khs: baris.join("."), ipk: `${randomInt(rand, 25, 40) / 10}` }
  }
  if (dataTypeId === "ijazah") {
    return {
      nomor: `IJZ${angka(rand, 12)}`,
      prodi: pick(rand, PRODI),
      // Berkas besar diwakili string berulang agar ukuran payload realistis.
      berkas: `PDF${"X".repeat(randomInt(rand, 2000, 3600))}${angka(rand, 8)}`,
    }
  }
  return {
    username: `MH${angka(rand, 8)}`,
    password: `DUMMY-${angka(rand, 6)}`,
  }
}

/**
 * Record dari dataset eksternal (mis. berkas Excel uji) untuk satu tipe data.
 * @param {{dataTypes?:Record<string,{records?:Array<object>}>}|null} [dataset]
 * @param {string} dataTypeId
 * @returns {Array<object>|null} null bila dataset tidak menyediakan tipe tersebut
 */
export function datasetRecordsFor(dataset, dataTypeId) {
  const records = dataset?.dataTypes?.[dataTypeId]?.records
  return Array.isArray(records) && records.length > 0 ? records : null
}

/**
 * Gabungkan nilai satu record menjadi satu baris plaintext.
 * @param {Record<string, unknown>} record
 * @returns {string}
 */
export function recordToPlaintext(record) {
  return Object.values(record)
    .map((value) => (value == null ? "" : String(value)))
    .join("|")
}

/**
 * Satu payload plaintext representatif untuk tipe data tertentu.
 * Bila dataset eksternal tersedia, record dipilih deterministik dari dataset itu;
 * jika tidak, dipakai generator sintetis bawaan.
 * @param {string} dataTypeId
 * @param {{seed?:number, dataset?:object|null}} [options]
 * @returns {string}
 */
export function samplePlaintext(dataTypeId, { seed = 2024, dataset = null } = {}) {
  const rand = createSeededRandom(seed + dataTypeId.length)
  const external = datasetRecordsFor(dataset, dataTypeId)
  if (external) {
    return recordToPlaintext(external[randomInt(rand, 0, external.length - 1)])
  }

  const record = buildRecord(dataTypeId, rand)
  return Object.values(record).join("|")
}

/**
 * Daftar record dummy (untuk pratinjau tabel di UI, bukan untuk enkripsi massal).
 * Memakai dataset eksternal bila tersedia.
 * @param {string} dataTypeId
 * @param {{seed?:number, recordCount?:number, dataset?:object|null}} [options]
 */
export function generateDummyRecords(dataTypeId, { seed = 2024, recordCount = 5, dataset = null } = {}) {
  const external = datasetRecordsFor(dataset, dataTypeId)
  if (external) {
    return external.slice(0, recordCount).map((record, index) => ({ id: index + 1, ...record }))
  }

  const rand = createSeededRandom(seed + dataTypeId.length * 7)
  const records = []
  for (let i = 0; i < recordCount; i += 1) {
    records.push({ id: i + 1, ...buildRecord(dataTypeId, rand) })
  }
  return records
}

/** Nama kolom record untuk ditampilkan di tabel pratinjau. */
export function recordColumns(dataTypeId, records) {
  if (!records || records.length === 0) return []
  return Object.keys(records[0]).filter((key) => key !== "id")
}
