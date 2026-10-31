"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import ParamTab from "./components/ParamTab"
import SessionPanel from "./components/SessionPanel"
import ResultTab from "./components/ResultTab"
import ChartTab from "./components/ChartTab"
import ExportPanel from "./components/ExportPanel"
import SpssGuideTab from "./components/SpssGuideTab"
import { runExperiment } from "@/lib/sim/runner.js"
import {
  addRun,
  clearRuns,
  createRun,
  createSession,
  describeCombination,
  loadSessions,
  mergedMeta,
  mergedRows,
  parseSessions,
  removeRun,
  renameSession,
  saveSessions,
  sessionSummary,
  setAllRuns,
  toggleRun,
} from "@/lib/sim/session.js"

const TABS = [
  { id: "parameter", label: "Parameter" },
  { id: "hasil", label: "Hasil" },
  { id: "grafik", label: "Grafik" },
  { id: "ekspor", label: "Ekspor" },
  { id: "spss", label: "Panduan SPSS" },
]

function TabButton({ tab, active, onSelect }) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${tab.id}`}
      aria-selected={active}
      aria-controls={`panel-${tab.id}`}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(tab.id)}
      className={`h-9 rounded-xl px-3 text-xs font-medium transition ${
        active ? "bg-slate-900 text-white shadow-sm" : "bg-white text-slate-600 hover:text-slate-900"
      }`}
    >
      {tab.label}
    </button>
  )
}

function PromptCard({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <p className="text-sm font-medium text-slate-700">Sesi belum siap</p>
      <p className="mt-1 text-xs text-slate-500">{children}</p>
    </div>
  )
}

export default function SimulationPage() {
  const [activeTab, setActiveTab] = useState("parameter")
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState("")
  const [hydrated, setHydrated] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  // Muat sesi dari localStorage sekali di sisi klien.
  useEffect(() => {
    const stored = loadSessions()
    const initial = stored.length > 0 ? stored : [createSession("Sesi 1")]
    setSessions(initial)
    setActiveSessionId(initial[0].id)
    setHydrated(true)
  }, [])

  // Persist sesi setiap berubah.
  useEffect(() => {
    if (!hydrated) return
    const ok = saveSessions(sessions)
    setNotice(
      ok
        ? ""
        : "Sesi terlalu besar untuk disimpan otomatis di peramban. Unduh berkas sesi (.json) agar hasil tidak hilang.",
    )
  }, [sessions, hydrated])

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId],
  )
  const rows = useMemo(() => (activeSession ? mergedRows(activeSession) : []), [activeSession])
  const meta = useMemo(() => (activeSession ? mergedMeta(activeSession) : null), [activeSession])
  const summary = activeSession ? sessionSummary(activeSession) : null

  const mutateSession = useCallback((sessionId, updater) => {
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? updater(session) : session)))
  }, [])

  const handleRun = useCallback(
    async (options) => {
      if (!activeSessionId) return
      setRunning(true)
      setError("")
      setNotice("")
      setProgress({ cellIndex: 0, totalCells: 0, rows: 0 })
      try {
        const { rows: runRows, meta: runMeta } = await runExperiment({ ...options, onProgress: setProgress })
        const params = {
          algorithmIds: options.algorithmIds,
          keyModeIds: options.keyModeIds,
          dataTypeIds: options.dataTypeIds,
          n: options.n,
          warmup: options.warmup,
          recordCount: options.recordCount,
          sessions: options.sessions,
          noncePolicy: options.noncePolicy,
          validCells: options.validCells,
          summary: describeCombination(options),
        }
        const run = createRun({ label: "Run", params, rows: runRows, meta: runMeta })
        mutateSession(activeSessionId, (session) =>
          addRun(session, { ...run, label: `Run ${session.runs.length + 1}` }),
        )
        setActiveTab("hasil")
      } catch (err) {
        setError(err?.message || "Eksperimen gagal dijalankan.")
      } finally {
        setRunning(false)
      }
    },
    [activeSessionId, mutateSession],
  )

  const handleCreateSession = useCallback(() => {
    const session = createSession(`Sesi ${sessions.length + 1}`)
    setSessions((prev) => [...prev, session])
    setActiveSessionId(session.id)
  }, [sessions.length])

  const handleDeleteSession = useCallback(
    (sessionId) => {
      const remaining = sessions.filter((session) => session.id !== sessionId)
      if (remaining.length === 0) {
        const fresh = createSession("Sesi 1")
        setSessions([fresh])
        setActiveSessionId(fresh.id)
        return
      }
      setSessions(remaining)
      if (activeSessionId === sessionId) setActiveSessionId(remaining[0].id)
    },
    [sessions, activeSessionId],
  )

  const handleImportSessions = useCallback((text, errorMessage) => {
    if (errorMessage) {
      setError(errorMessage)
      return
    }
    try {
      const imported = parseSessions(text)
      setSessions((prev) => [...prev, ...imported])
      setActiveSessionId(imported[0].id)
      setNotice(`${imported.length} sesi berhasil diimpor.`)
      setError("")
    } catch (err) {
      setError(err?.message || "Berkas sesi gagal diimpor.")
    }
  }, [])

  const hasRows = rows.length > 0

  return (
    <div className="w-full space-y-5">
      <header className="border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Simulasi Keamanan Data Akademik
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Studi perbandingan algoritma, tipe data, mode kunci, dan skenario pelanggaran. Seluruh data dummy dan
              diproses lokal di peramban.
            </p>
          </div>
          {activeSession ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
              {activeSession.name} &middot; {summary.runCount} run &middot; {summary.selectedRows} baris
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
              belum ada sesi
            </span>
          )}
        </div>
      </header>

      <div
        role="tablist"
        aria-label="Bagian simulasi"
        className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
      >
        {TABS.map((tab) => (
          <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onSelect={setActiveTab} />
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {notice}
        </p>
      ) : null}

      <div role="tabpanel" id="panel-parameter" aria-labelledby="tab-parameter" hidden={activeTab !== "parameter"}>
        <div className="space-y-5">
          <SessionPanel
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={setActiveSessionId}
            onCreateSession={handleCreateSession}
            onRenameSession={(sessionId, name) => mutateSession(sessionId, (session) => renameSession(session, name))}
            onDeleteSession={handleDeleteSession}
            onImportSessions={handleImportSessions}
            onToggleRun={(sessionId, runId, selected) =>
              mutateSession(sessionId, (session) => toggleRun(session, runId, selected))
            }
            onSetAllRuns={(sessionId, selected) =>
              mutateSession(sessionId, (session) => setAllRuns(session, selected))
            }
            onRemoveRun={(sessionId, runId) => mutateSession(sessionId, (session) => removeRun(session, runId))}
            onClearRuns={(sessionId) => mutateSession(sessionId, (session) => clearRuns(session))}
          />
          <ParamTab onRun={handleRun} running={running} progress={progress} />
        </div>
      </div>

      <div role="tabpanel" id="panel-hasil" aria-labelledby="tab-hasil" hidden={activeTab !== "hasil"}>
        {!activeSession ? (
          <PromptCard>Buka tab Parameter untuk memilih atau membuat sesi terlebih dahulu.</PromptCard>
        ) : !hasRows ? (
          <PromptCard>
            Belum ada run tercentang pada sesi &ldquo;{activeSession.name}&rdquo;. Jalankan eksperimen atau centang run di
            tab Parameter.
          </PromptCard>
        ) : (
          <ResultTab rows={rows} />
        )}
      </div>

      <div role="tabpanel" id="panel-grafik" aria-labelledby="tab-grafik" hidden={activeTab !== "grafik"}>
        {!activeSession ? (
          <PromptCard>Buka tab Parameter untuk memilih atau membuat sesi terlebih dahulu.</PromptCard>
        ) : !hasRows ? (
          <PromptCard>
            Belum ada run tercentang pada sesi &ldquo;{activeSession.name}&rdquo;. Jalankan eksperimen atau centang run di
            tab Parameter.
          </PromptCard>
        ) : (
          <ChartTab rows={rows} />
        )}
      </div>

      <div role="tabpanel" id="panel-ekspor" aria-labelledby="tab-ekspor" hidden={activeTab !== "ekspor"}>
        {!activeSession ? (
          <PromptCard>Buka tab Parameter untuk memilih atau membuat sesi terlebih dahulu.</PromptCard>
        ) : !hasRows ? (
          <PromptCard>
            Belum ada run tercentang pada sesi &ldquo;{activeSession.name}&rdquo;. Jalankan eksperimen atau centang run di
            tab Parameter.
          </PromptCard>
        ) : (
          <ExportPanel rows={rows} meta={meta} sessionName={activeSession.name} />
        )}
      </div>

      <div role="tabpanel" id="panel-spss" aria-labelledby="tab-spss" hidden={activeTab !== "spss"}>
        <SpssGuideTab />
      </div>
    </div>
  )
}
