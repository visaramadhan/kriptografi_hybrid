import { readFile } from "node:fs/promises"
import path from "node:path"
import * as XLSX from "xlsx"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DATASET_FILE = "Data_Fiktif_Keamanan_Akademik.xlsx"

// Pemetaan sheet pada berkas Excel ke id tipe data simulasi.
const SHEET_TO_DATA_TYPE = {
  "1_Identitas": "umum",
  "2_Data_Pribadi": "sensitif",
  "3_Keuangan": "keuangan",
  "4_Nilai_KHS": "nilai",
  "5_Ijazah_Digital": "ijazah",
  "6_Password_Hash": "kredensial",
}

async function readDatasetBuffer() {
  const candidates = [
    new URL(`../../../docs/${DATASET_FILE}`, import.meta.url),
    path.join(process.cwd(), "docs", DATASET_FILE),
  ]

  let lastError = null
  for (const candidate of candidates) {
    try {
      return await readFile(candidate)
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(lastError?.message || `Berkas ${DATASET_FILE} tidak dapat dibaca`)
}

function readSheet(sheet) {
  if (!sheet) return { columns: [], records: [] }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  })
  if (matrix.length < 2) return { columns: [], records: [] }

  const headerRow = matrix[0].map((cell) => String(cell ?? "").trim())
  const columns = headerRow.filter(Boolean)

  const records = matrix
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""))
    .map((row) => {
      const record = {}
      headerRow.forEach((column, index) => {
        if (!column) return
        record[column] = String(row[index] ?? "").trim()
      })
      return record
    })

  return { columns, records }
}

export async function GET() {
  try {
    const workbook = XLSX.read(await readDatasetBuffer(), { type: "buffer" })

    const dataTypes = {}
    let total = 0

    for (const [sheetName, dataTypeId] of Object.entries(SHEET_TO_DATA_TYPE)) {
      const { columns, records } = readSheet(workbook.Sheets[sheetName])
      dataTypes[dataTypeId] = { sheet: sheetName, columns, records }
      total += records.length
    }

    if (total === 0) {
      throw new Error("Tidak ada sheet data yang cocok pada berkas Excel")
    }

    return Response.json({ source: DATASET_FILE, dataTypes })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Gagal membaca dataset simulasi akademik",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
