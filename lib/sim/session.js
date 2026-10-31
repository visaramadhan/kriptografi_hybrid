// Manajemen sesi eksperimen.
//
// Satu sesi menampung banyak "run"; tiap run adalah satu eksekusi
// runExperiment dengan kombinasi parameter tertentu. Seluruh data tetap
// lokal (localStorage / berkas .json) dan tidak pernah dikirim ke server.

export const SESSION_STORAGE_KEY = "sim-akademik:sessions:v1"
export const SESSION_SCHEMA_VERSION = 1

let idCounter = 0

function nextId(prefix) {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`
}

/** Buat sesi kosong. */
export function createSession(name = "Sesi baru") {
  return {
    id: nextId("sesi"),
    name,
    createdAt: new Date().toISOString(),
    runs: [],
  }
}

/** Buat objek run dari hasil runExperiment + deskripsi parameternya. */
export function createRun({ label, params, rows, meta }) {
  const safeRows = Array.isArray(rows) ? rows : []
  return {
    id: nextId("run"),
    label: label || "Run",
    params: params || {},
    rows: safeRows,
    meta: meta || {},
    rowCount: safeRows.length,
    selected: true,
    createdAt: new Date().toISOString(),
  }
}

/** Tambah run ke sesi (immutable). */
export function addRun(session, run) {
  return { ...session, runs: [...session.runs, run] }
}

/** Ubah nama sesi. */
export function renameSession(session, name) {
  return { ...session, name: String(name || "").trim() || session.name }
}

/** Centang / lepas centang satu run. */
export function toggleRun(session, runId, selected) {
  return {
    ...session,
    runs: session.runs.map((run) => (run.id === runId ? { ...run, selected: Boolean(selected) } : run)),
  }
}

/** Set pilihan seluruh run sekaligus. */
export function setAllRuns(session, selected) {
  return { ...session, runs: session.runs.map((run) => ({ ...run, selected: Boolean(selected) })) }
}

/** Hapus satu run dari sesi. */
export function removeRun(session, runId) {
  return { ...session, runs: session.runs.filter((run) => run.id !== runId) }
}

/** Kosongkan seluruh run dalam sesi. */
export function clearRuns(session) {
  return { ...session, runs: [] }
}

/** Run yang sedang tercentang. */
export function selectedRuns(session) {
  if (!session || !Array.isArray(session.runs)) return []
  return session.runs.filter((run) => run.selected)
}

/**
 * Gabungkan baris dari run terpilih untuk analisis/ekspor.
 * Bila lebih dari satu run, `run_id` diberi prefiks agar unik antar run.
 */
export function mergedRows(session) {
  const runs = selectedRuns(session)
  if (runs.length === 0) return []
  const multi = runs.length > 1
  const rows = []
  runs.forEach((run, index) => {
    const prefix = multi ? `r${index + 1}_` : ""
    run.rows.forEach((row) => {
      rows.push(prefix ? { ...row, run_id: `${prefix}${row.run_id}` } : row)
    })
  })
  return rows
}

/** Metadata gabungan (untuk metadata.json) dari run terpilih. */
export function mergedMeta(session) {
  const runs = selectedRuns(session)
  return {
    session: session ? { id: session.id, name: session.name } : null,
    runs: runs.map((run) => ({
      id: run.id,
      label: run.label,
      params: run.params,
      rowCount: run.rowCount,
      seed: run.meta?.seed ?? null,
      dataset: run.meta?.dataset ?? null,
      createdAt: run.createdAt,
    })),
    totalRows: runs.reduce((sum, run) => sum + run.rowCount, 0),
    seed: runs[0]?.meta?.seed ?? null,
    environment: runs[0]?.meta?.environment ?? null,
    timestamp: new Date().toISOString(),
  }
}

/** Ringkasan singkat sebuah sesi. */
export function sessionSummary(session) {
  const runs = session?.runs || []
  const selected = runs.filter((run) => run.selected)
  return {
    runCount: runs.length,
    selectedCount: selected.length,
    totalRows: runs.reduce((sum, run) => sum + run.rowCount, 0),
    selectedRows: selected.reduce((sum, run) => sum + run.rowCount, 0),
  }
}

/** Label ringkas dari kombinasi parameter sebuah run. */
export function describeCombination({ algorithmIds = [], keyModeIds = [], dataTypeIds = [], n = 30, noncePolicy = "unique" } = {}) {
  const nonce = noncePolicy === "reuse" ? "nonce reuse" : "nonce unik"
  return `${algorithmIds.length} alg × ${keyModeIds.length} mode × ${dataTypeIds.length} tipe · n=${n} · ${nonce}`
}

/** Slug aman untuk nama berkas. */
export function slugify(text) {
  const slug = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return slug || "sesi"
}

/** Serialisasi sesi menjadi teks .json. */
export function serializeSessions(sessions) {
  return JSON.stringify(
    { version: SESSION_SCHEMA_VERSION, exportedAt: new Date().toISOString(), sessions },
    null,
    2,
  )
}

function normalizeRun(run) {
  if (!run || !Array.isArray(run.rows)) return null
  return {
    id: run.id || nextId("run"),
    label: run.label || "Run",
    params: run.params || {},
    rows: run.rows,
    meta: run.meta || {},
    rowCount: run.rows.length,
    selected: run.selected !== false,
    createdAt: run.createdAt || new Date().toISOString(),
  }
}

function normalizeSession(session) {
  if (!session || !Array.isArray(session.runs)) return null
  return {
    id: session.id || nextId("sesi"),
    name: session.name || "Sesi",
    createdAt: session.createdAt || new Date().toISOString(),
    runs: session.runs.map(normalizeRun).filter(Boolean),
  }
}

/** Parse teks .json menjadi daftar sesi yang tervalidasi. */
export function parseSessions(text) {
  const data = JSON.parse(text)
  const list = Array.isArray(data) ? data : data?.sessions
  if (!Array.isArray(list)) throw new Error("Format berkas sesi tidak dikenali.")
  const sessions = list.map(normalizeSession).filter(Boolean)
  if (sessions.length === 0) throw new Error("Tidak ada sesi valid di dalam berkas.")
  return sessions
}

function defaultStorage() {
  return typeof globalThis !== "undefined" && globalThis.localStorage ? globalThis.localStorage : null
}

/** Muat sesi dari localStorage; kembalikan [] bila kosong/gagal. */
export function loadSessions(storage = defaultStorage()) {
  if (!storage) return []
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return []
    return parseSessions(raw)
  } catch {
    return []
  }
}

/**
 * Simpan sesi ke localStorage.
 * @returns {boolean} false bila kuota penuh atau storage tidak tersedia.
 */
export function saveSessions(sessions, storage = defaultStorage()) {
  if (!storage) return false
  try {
    storage.setItem(SESSION_STORAGE_KEY, serializeSessions(sessions))
    return true
  } catch {
    return false
  }
}
