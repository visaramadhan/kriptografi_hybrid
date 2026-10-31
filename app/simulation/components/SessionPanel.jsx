"use client"

import { useRef } from "react"
import { downloadText } from "@/lib/sim/export.js"
import { sessionSummary, serializeSessions, slugify } from "@/lib/sim/session.js"

const BUTTON =
  "inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"

const TH = "px-3 py-2 text-left font-medium whitespace-nowrap"
const TD = "px-3 py-2 whitespace-nowrap"

/** Waktu ISO -> "YYYY-MM-DD HH:MM:SS" (deterministik, tanpa locale). */
function stamp(iso) {
  if (!iso) return "\u2014"
  return String(iso).replace("T", " ").slice(0, 19)
}

/**
 * Panel sesi: pilih/buat/ubah nama/hapus sesi, unduh & impor berkas sesi,
 * serta checklist run yang tersimpan di dalam sesi.
 * @param {{
 *   sessions: Array<object>,
 *   activeSessionId: string,
 *   onSelectSession: Function,
 *   onCreateSession: Function,
 *   onRenameSession: Function,
 *   onDeleteSession: Function,
 *   onImportSessions: Function,
 *   onToggleRun: Function,
 *   onSetAllRuns: Function,
 *   onRemoveRun: Function,
 *   onClearRuns: Function,
 * }} props
 */
export default function SessionPanel({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  onImportSessions,
  onToggleRun,
  onSetAllRuns,
  onRemoveRun,
  onClearRuns,
}) {
  const fileRef = useRef(null)
  const active = sessions.find((session) => session.id === activeSessionId) || null
  const summary = active ? sessionSummary(active) : null

  const handleDownload = () => {
    if (!active) return
    downloadText(
      `${slugify(active.name)}-sesi.json`,
      serializeSessions([active]),
      "application/json;charset=utf-8",
    )
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const text = await file.text()
      onImportSessions(text)
    } catch (error) {
      onImportSessions(null, error?.message || "Berkas sesi gagal dibaca.")
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Sesi eksperimen</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Satu sesi menampung banyak run dari kombinasi parameter berbeda. Hasil di tab Hasil/Grafik/Ekspor
            mengikuti run yang dicentang.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
          {sessions.length} sesi tersimpan
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="space-y-1">
          <span className="block text-[11px] font-medium text-slate-500">Sesi aktif</span>
          <select
            value={activeSessionId}
            onChange={(event) => onSelectSession(event.target.value)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {sessions.length === 0 ? <option value="">(belum ada sesi)</option> : null}
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} ({session.runs.length} run)
              </option>
            ))}
          </select>
        </label>

        {active ? (
          <label className="space-y-1">
            <span className="block text-[11px] font-medium text-slate-500">Nama sesi</span>
            <input
              value={active.name}
              onChange={(event) => onRenameSession(active.id, event.target.value)}
              className="h-9 w-48 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button type="button" className={BUTTON} onClick={onCreateSession}>
            Sesi baru
          </button>
          <button type="button" className={BUTTON} disabled={!active} onClick={handleDownload}>
            Unduh .json
          </button>
          <button type="button" className={BUTTON} onClick={() => fileRef.current?.click()}>
            Impor .json
          </button>
          <button
            type="button"
            className={`${BUTTON} border-rose-200 text-rose-700 hover:border-rose-300`}
            disabled={!active || sessions.length <= 1}
            onClick={() => onDeleteSession(active.id)}
            title={sessions.length <= 1 ? "Minimal satu sesi harus ada" : "Hapus sesi ini"}
          >
            Hapus sesi
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFile} />
        </div>
      </div>

      {active ? (
        <>
          <p className="mt-3 text-[11px] text-slate-500">
            {summary.runCount} run &middot; {summary.selectedCount} dicentang &middot; {summary.selectedRows} dari{" "}
            {summary.totalRows} baris disertakan pada analisis.
          </p>

          {active.runs.length === 0 ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
              Belum ada run pada sesi ini. Tentukan kombinasi di bawah, lalu tekan &ldquo;Jalankan eksperimen&rdquo;.
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={BUTTON} onClick={() => onSetAllRuns(active.id, true)}>
                  Centang semua
                </button>
                <button type="button" className={BUTTON} onClick={() => onSetAllRuns(active.id, false)}>
                  Lepas semua
                </button>
                <button
                  type="button"
                  className={`${BUTTON} border-rose-200 text-rose-700 hover:border-rose-300`}
                  onClick={() => onClearRuns(active.id)}
                >
                  Hapus semua run
                </button>
              </div>

              <div className="mt-3 overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <caption className="sr-only">Checklist run yang tersimpan pada sesi aktif</caption>
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th scope="col" className={TH}>Ikut</th>
                      <th scope="col" className={TH}>Label run</th>
                      <th scope="col" className={TH}>Kombinasi</th>
                      <th scope="col" className={TH}>Baris</th>
                      <th scope="col" className={TH}>Waktu</th>
                      <th scope="col" className={TH}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {active.runs.map((run) => (
                      <tr key={run.id}>
                        <td className={TD}>
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-blue-600"
                            checked={run.selected}
                            aria-label={`Sertakan ${run.label}`}
                            onChange={(event) => onToggleRun(active.id, run.id, event.target.checked)}
                          />
                        </td>
                        <td className={TD}>{run.label}</td>
                        <td className={TD}>{run.params?.summary || "\u2014"}</td>
                        <td className={`${TD} font-mono tabular-nums`}>{run.rowCount}</td>
                        <td className={`${TD} text-slate-500`}>{stamp(run.createdAt)}</td>
                        <td className={TD}>
                          <button
                            type="button"
                            onClick={() => onRemoveRun(active.id, run.id)}
                            className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] text-rose-700 transition hover:border-rose-300"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-500">
          Belum ada sesi. Tekan &ldquo;Sesi baru&rdquo; atau impor berkas sesi (.json).
        </p>
      )}
    </section>
  )
}
