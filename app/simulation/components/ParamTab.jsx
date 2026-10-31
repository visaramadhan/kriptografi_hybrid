"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ALL_COVERAGE_LAYERS,
  algorithmCatalog,
  dataTypes,
  keyModes,
  coverageLayers,
} from "@/lib/simulation-config"
import { buildExperimentCells, combinationNote, explainInvalid, isValidCombination } from "@/lib/sim/matrix.js"
import { SCENARIOS, runScenario } from "@/lib/sim/scenarios.js"
import CombinationChecklist from "./CombinationChecklist"

const LAYER_LABELS = {
  browser: "Browser",
  jaringan: "Jaringan",
  backend: "Backend",
  database: "Database",
  backup: "Backup",
}

const FIELD =
  "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"

const LABEL = "text-[11px] font-medium text-slate-500"

const NONCE_OPTIONS = [
  { value: "unique", label: "Unik per plaintext (aman)" },
  { value: "reuse", label: "Dipakai ulang (rentan)" },
]

function formatNumber(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return "\u2014"
  return Number(value).toFixed(digits)
}

/**
 * Tab Parameter: pilih tipe data, algoritma, mode kunci, ukuran percobaan,
 * melihat matriks kombinasi, dan menjalankan 7 skenario serangan.
 * @param {{onRun:Function, running:boolean, progress:object|null}} props
 */
export default function ParamTab({ onRun, running, progress }) {
  const [dataTypeId, setDataTypeId] = useState(dataTypes[0].id)
  const [algorithmId, setAlgorithmId] = useState(algorithmCatalog[3].id)
  const [keyModeId, setKeyModeId] = useState(keyModes[0].id)
  const [recordCount, setRecordCount] = useState(1000)
  const [sessions, setSessions] = useState(30)
  const [noncePolicy, setNoncePolicy] = useState("unique")
  const [n, setN] = useState(30)
  const [warmup, setWarmup] = useState(5)

  const [combination, setCombination] = useState({
    algorithmIds: algorithmCatalog.map((item) => item.id),
    keyModeIds: keyModes.map((item) => item.id),
    dataTypeIds: dataTypes.map((item) => item.id),
  })

  const [dataset, setDataset] = useState(null)
  const [datasetStatus, setDatasetStatus] = useState("Memuat dataset uji\u2026")

  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id)
  const [scenarioResult, setScenarioResult] = useState(null)
  const [scenarioRunning, setScenarioRunning] = useState(false)

  const dataType = dataTypes.find((item) => item.id === dataTypeId) || dataTypes[0]
  const algorithm = algorithmCatalog.find((item) => item.id === algorithmId) || algorithmCatalog[0]
  const keyMode = keyModes.find((item) => item.id === keyModeId) || keyModes[0]

  const valid = isValidCombination(algorithmId, keyModeId)
  const invalidReason = explainInvalid(algorithmId, keyModeId)
  const note = combinationNote(algorithmId, keyModeId)
  const layers = coverageLayers[algorithmId] || []

  const datasetEntry = dataset?.dataTypes?.[dataTypeId] || null
  const datasetColumns = datasetEntry?.columns || []
  const datasetPreview = datasetEntry?.records?.slice(0, 3) || []

  // Muat dataset uji (berkas Excel) sekali saat tab dibuka; bila gagal, pakai data sintetis.
  useEffect(() => {
    let cancelled = false

    async function loadDataset() {
      try {
        const response = await fetch("/api/sim-dataset", { cache: "no-store" })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const payload = await response.json()
        if (cancelled) return

        const total = Object.values(payload?.dataTypes || {}).reduce(
          (sum, entry) => sum + (entry.records?.length || 0),
          0,
        )
        if (total === 0) throw new Error("dataset kosong")

        setDataset(payload)
        setDatasetStatus(`${total} record uji dari ${payload.source}`)
      } catch (error) {
        if (cancelled) return
        setDataset(null)
        setDatasetStatus(`Dataset uji tidak dapat dimuat (${error.message}); memakai data sintetis bawaan.`)
      }
    }

    loadDataset()
    return () => {
      cancelled = true
    }
  }, [])

  const validCells = useMemo(
    () =>
      buildExperimentCells({
        algorithmIds: combination.algorithmIds,
        dataTypeIds: combination.dataTypeIds,
        keyModeIds: combination.keyModeIds,
        rand: null,
      }).length,
    [combination],
  )

  const progressPercent = useMemo(() => {
    if (!progress || !progress.totalCells) return 0
    return Math.round((progress.cellIndex / progress.totalCells) * 100)
  }, [progress])

  const handleAlgorithmChange = (nextId) => {
    setAlgorithmId(nextId)
    if (!isValidCombination(nextId, keyModeId)) {
      const next = keyModes.find((item) => isValidCombination(nextId, item.id))
      if (next) setKeyModeId(next.id)
    }
    setScenarioResult(null)
  }

  const handleKeyModeChange = (nextId) => {
    setKeyModeId(nextId)
    setScenarioResult(null)
  }

  const handleRun = () => {
    if (validCells === 0) return
    onRun({
      algorithmIds: combination.algorithmIds,
      dataTypeIds: combination.dataTypeIds,
      keyModeIds: combination.keyModeIds,
      n: Math.max(30, Number(n) || 30),
      warmup: Math.max(1, Number(warmup) || 5),
      recordCount: Math.max(100, Number(recordCount) || 1000),
      sessions: Math.max(1, Number(sessions) || 30),
      noncePolicy,
      dataset,
      validCells,
    })
  }

  const handleScenario = async () => {
    if (!valid) return
    setScenarioRunning(true)
    try {
      const result = await runScenario(scenarioId, {
        algorithmId,
        dataTypeId,
        keyModeId,
        recordCount: Number(recordCount) || 1000,
        sessions: Number(sessions) || 30,
      })
      setScenarioResult(result)
    } finally {
      setScenarioRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <CombinationChecklist
        algorithms={algorithmCatalog}
        keyModes={keyModes}
        dataTypes={dataTypes}
        selection={combination}
        onChange={setCombination}
        validCells={validCells}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Parameter simulasi</h2>
          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">seed: 2024</span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className={LABEL} htmlFor="data-type">
              Tipe data
            </label>
            <select
              id="data-type"
              value={dataTypeId}
              onChange={(event) => setDataTypeId(event.target.value)}
              className={FIELD}
            >
              {dataTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL} htmlFor="algorithm">
              Algoritma
            </label>
            <select
              id="algorithm"
              value={algorithmId}
              onChange={(event) => handleAlgorithmChange(event.target.value)}
              className={FIELD}
            >
              {algorithmCatalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL} htmlFor="key-mode">
              Mode kunci
            </label>
            <select
              id="key-mode"
              value={keyModeId}
              onChange={(event) => handleKeyModeChange(event.target.value)}
              className={FIELD}
            >
              {keyModes.map((item) => (
                <option key={item.id} value={item.id} disabled={!isValidCombination(algorithmId, item.id)}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL} htmlFor="record-count">
              Jumlah record
            </label>
            <input
              id="record-count"
              type="number"
              min={100}
              max={5000}
              value={recordCount}
              onChange={(event) => setRecordCount(Number(event.target.value) || 1000)}
              className={FIELD}
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL} htmlFor="sessions">
              Jumlah sesi (untuk mode dinamis)
            </label>
            <input
              id="sessions"
              type="number"
              min={1}
              max={500}
              value={sessions}
              onChange={(event) => setSessions(Number(event.target.value) || 30)}
              className={FIELD}
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL} htmlFor="nonce-policy">
              Kebijakan nonce
            </label>
            <select
              id="nonce-policy"
              value={noncePolicy}
              onChange={(event) => setNoncePolicy(event.target.value)}
              className={FIELD}
            >
              {NONCE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className={LABEL} htmlFor="repeat">
              Ulangan per sel (n, minimal 30)
            </label>
            <input
              id="repeat"
              type="number"
              min={30}
              max={200}
              value={n}
              onChange={(event) => setN(Number(event.target.value) || 30)}
              className={FIELD}
            />
          </div>

          <div className="space-y-1">
            <label className={LABEL} htmlFor="warmup">
              Warm-up (dibuang)
            </label>
            <input
              id="warmup"
              type="number"
              min={1}
              max={50}
              value={warmup}
              onChange={(event) => setWarmup(Number(event.target.value) || 5)}
              className={FIELD}
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          <p className="font-medium text-slate-800">Metadata tipe data</p>
          <dl className="mt-2 grid gap-2 md:grid-cols-4">
            <div>
              <dt className="text-slate-500">Kelas sensitivitas</dt>
              <dd className="text-slate-800">{dataType.sensitivity}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Prioritas proteksi</dt>
              <dd className="text-slate-800">{dataType.protectionPriority}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Ukuran</dt>
              <dd className="text-slate-800">{dataType.sizeLabel}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Jumlah record</dt>
              <dd className="font-mono text-slate-800">{dataType.records.toLocaleString("id-ID")}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-slate-600">{dataType.warning}</p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-800">Sumber data uji</p>
            <span
              className={`rounded-full px-2 py-1 text-[10px] ${
                dataset ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {dataset ? "Berkas Excel" : "Sintetis"}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{datasetStatus}</p>

          {datasetPreview.length > 0 ? (
            <div className="mt-2 overflow-auto">
              <table className="min-w-full text-left text-[10px]">
                <caption className="sr-only">Pratinjau record dataset uji untuk tipe data terpilih</caption>
                <thead className="text-slate-500">
                  <tr>
                    {datasetColumns.map((column) => (
                      <th key={column} scope="col" className="whitespace-nowrap px-2 py-1 font-medium">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  {datasetPreview.map((record, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      {datasetColumns.map((column) => (
                        <td
                          key={column}
                          className="max-w-[220px] truncate whitespace-nowrap px-2 py-1"
                          title={String(record[column] ?? "")}
                        >
                          {String(record[column] ?? "\u2014")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-3">
          <p className="text-xs font-medium text-slate-800">Cakupan titik jalur data</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_COVERAGE_LAYERS.map((layer) => {
              const covered = layers.includes(layer)
              return (
                <span
                  key={layer}
                  className={`rounded-full px-2 py-1 text-[10px] ${
                    covered ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {LAYER_LABELS[layer]} {covered ? "\u2713" : "\u2717"}
                </span>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Cakupan {formatNumber((layers.length / ALL_COVERAGE_LAYERS.length) * 100, 0)}% &mdash; {algorithm.protection}.
          </p>
        </div>

        <div
          className={`mt-4 rounded-xl border px-3 py-2 text-[11px] ${
            valid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <p className="font-medium">
            {valid ? "Kombinasi valid" : "Kombinasi dinonaktifkan"}: {algorithm.label} &times; {keyMode.label}
          </p>
          {!valid ? <p className="mt-1">{invalidReason}</p> : null}
          {valid && note ? <p className="mt-1">{note}</p> : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRun}
            disabled={running || validCells === 0}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? "Menjalankan\u2026" : "Jalankan eksperimen"}
          </button>
          <span className="text-[11px] text-slate-500">
            {validCells > 0
              ? `Menjalankan ${validCells} sel (kombinasi tercentang) \u00d7 ${Math.max(30, Number(n) || 30)} ulangan.`
              : "Tidak ada kombinasi valid yang tercentang. Pilih minimal satu algoritma, mode kunci, dan tipe data."}
          </span>
        </div>

        {running ? (
          <div className="mt-3" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Sel {progress?.cellIndex ?? 0} dari {progress?.totalCells ?? 0} &middot; {progress?.rows ?? 0} baris terkumpul.
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Matriks kombinasi algoritma &times; mode kunci</h2>
        <p className="mt-1 text-[11px] text-slate-500">
          Sel bertanda &times; tidak dijalankan. Arahkan kursor untuk melihat alasan penonaktifan.
        </p>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-left text-xs">
            <caption className="sr-only">Matriks kombinasi algoritma dan mode kunci</caption>
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Algoritma</th>
                {keyModes.map((mode) => (
                  <th key={mode.id} scope="col" className="px-3 py-2 font-medium">
                    {mode.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {algorithmCatalog.map((item) => (
                <tr key={item.id}>
                  <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-800">
                    {item.label}
                  </th>
                  {keyModes.map((mode) => {
                    const ok = isValidCombination(item.id, mode.id)
                    return (
                      <td key={mode.id} className="px-3 py-2" title={ok ? combinationNote(item.id, mode.id) || "Valid" : explainInvalid(item.id, mode.id)}>
                        <span className={ok ? "text-emerald-600" : "text-rose-500"}>{ok ? "\u2713" : "\u2717"}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">Skenario pelanggaran &amp; serangan</h2>
          <span className="text-[10px] uppercase tracking-wide text-slate-400">data dummy saja</span>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {SCENARIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setScenarioId(item.id)
                setScenarioResult(null)
              }}
              className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                scenarioId === item.id
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleScenario}
            disabled={!valid || scenarioRunning}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scenarioRunning ? "Menjalankan\u2026" : "Jalankan skenario"}
          </button>
          {!valid ? <span className="text-[11px] text-rose-600">Perbaiki kombinasi terlebih dahulu.</span> : null}
        </div>

        {scenarioResult ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4" aria-live="polite">
            <p className="text-sm font-semibold text-slate-900">{scenarioResult.hasil}</p>
            {scenarioResult.detail?.length ? (
              <dl className="mt-2 grid gap-2 text-[11px] sm:grid-cols-2">
                {scenarioResult.detail.map((entry) => (
                  <div key={entry.label} className="flex justify-between gap-2">
                    <dt className="text-slate-500">{entry.label}</dt>
                    <dd className="font-mono text-slate-800">{String(entry.value)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {scenarioResult.catatan ? (
              <p className="mt-2 text-[11px] text-slate-600">{scenarioResult.catatan}</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
