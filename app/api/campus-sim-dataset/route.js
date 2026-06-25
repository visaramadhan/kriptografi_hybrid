import { readFile } from "node:fs/promises"
import path from "node:path"
import * as XLSX from "xlsx"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function asNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function asString(v) {
  return String(v || "").trim()
}

function readSheetRows(sheet) {
  if (!sheet) return []
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  })
  const headerIndex = matrix.findIndex((row) => {
    const normalized = row.map((cell) => asString(cell).toLowerCase())
    return normalized.includes("nim") && normalized.includes("nama mahasiswa")
  })
  if (headerIndex === -1) return []

  const headers = matrix[headerIndex].map((cell) => asString(cell))
  return matrix
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => asString(cell)))
    .map((row) => {
      const mapped = {}
      headers.forEach((header, index) => {
        if (!header) return
        mapped[header] = row[index]
      })
      return mapped
    })
}

async function readDatasetBuffer() {
  const candidates = [
    new URL("../../campus-sim/dataset.xlsx", import.meta.url),
    path.join(process.cwd(), "app", "campus-sim", "dataset.xlsx"),
  ]

  let lastError = null
  for (const candidate of candidates) {
    try {
      return await readFile(candidate)
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(
    lastError?.message ||
      "File dataset.xlsx tidak bisa dibaca dari lokasi route maupun project root",
  )
}

export async function GET() {
  try {
    const workbook = XLSX.read(await readDatasetBuffer(), { type: "buffer" })
    const attendanceSheet = workbook.Sheets["Tabel_Kehadiran"]
    const gradeSheet = workbook.Sheets["Tabel_Nilai"]
    if (!attendanceSheet && !gradeSheet) {
      throw new Error("Sheet Tabel_Kehadiran / Tabel_Nilai tidak ditemukan")
    }

    const attendanceRows = readSheetRows(attendanceSheet)
    const gradeRows = readSheetRows(gradeSheet)
    const merged = new Map()

    function upsertBase(key, row) {
      const existing = merged.get(key) || {}
      merged.set(key, {
        ...existing,
        academicYear: asString(row["Tahun Ajaran"]) || existing.academicYear || "",
        courseCode: asString(row["Kode MK"]) || existing.courseCode || "",
        courseName: asString(row["Mata Kuliah"]) || existing.courseName || "",
        className: asString(row.Kelas) || existing.className || "",
        nim: asString(row.NIM) || existing.nim || "",
        name: asString(row["Nama Mahasiswa"]) || existing.name || "",
        program: "Teknik Informatika",
      })
    }

    for (const row of attendanceRows) {
      const nim = asString(row.NIM)
      const courseCode = asString(row["Kode MK"])
      const courseName = asString(row["Mata Kuliah"])
      if (!nim || !courseCode || !courseName) continue
      const key = `${nim}::${courseCode}::${asString(row.Kelas)}`
      upsertBase(key, row)
      const existing = merged.get(key) || {}
      merged.set(key, {
        ...existing,
        totalMeetings: asNumber(row["Total Pertemuan"]),
        attendanceCount: asNumber(row["Jumlah Hadir (H)"]),
        absentCount: asNumber(row["Jumlah Alpha (A)"]),
        attendancePercentage: asNumber(row["Persentase Kehadiran"]),
        attendanceNote: asString(row.Keterangan),
      })
    }

    for (const row of gradeRows) {
      const nim = asString(row.NIM)
      const courseCode = asString(row["Kode MK"])
      const courseName = asString(row["Mata Kuliah"])
      if (!nim || !courseCode || !courseName) continue
      const key = `${nim}::${courseCode}::${asString(row.Kelas)}`
      upsertBase(key, row)
      const existing = merged.get(key) || {}
      merged.set(key, {
        ...existing,
        assignmentScore: asNumber(row["Tugas Individu (15%)"]),
        quizScore: asNumber(row["Quiz (5%)"]),
        projectScore: asNumber(row["Project Outcome (20%)"]),
        utsScore: asNumber(row["UTS (20%)"]),
        uasScore: asNumber(row["UAS (30%)"]),
        attendanceGradeScore: asNumber(row["Kehadiran (10%)"]),
        finalScore: asNumber(row["Nilai Akhir"]),
        grade: asString(row.Grade),
        passStatus: asString(row["Status Lulus"]),
      })
    }

    const records = Array.from(merged.values())
      .map((row, index) => ({
        id: index + 1,
        ...row,
      }))
      .filter((row) => row.nim && row.name)

    return Response.json({ records })
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Gagal membaca dataset simulasi kampus",
        details: e.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
