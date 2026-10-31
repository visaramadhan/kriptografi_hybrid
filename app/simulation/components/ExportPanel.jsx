"use client"

import { useMemo, useState } from "react"
import {
  buildCodebookCsv,
  buildDatasetCsv,
  buildMetadataJson,
  buildSpssSyntax,
  downloadText,
} from "@/lib/sim/export.js"
import { slugify } from "@/lib/sim/session.js"

const BUTTON =
  "inline-flex h-10 items-center justify-center rounded-xl border px-3 text-xs font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"

/**
 * Panel ekspor: dataset CSV, codebook, syntax SPSS, dan metadata JSON.
 * Nama berkas mengikuti sesi aktif agar gabungan beberapa run mudah dibedakan.
 * @param {{rows:Array<object>, meta:object, sessionName?:string}} props
 */
export default function ExportPanel({ rows, meta, sessionName = "" }) {
  const [copied, setCopied] = useState("")
  const hasRows = Boolean(rows && rows.length)
  const slug = slugify(sessionName)

  const files = useMemo(
    () => ({
      dataset: `dataset_simulasi_${slug}.csv`,
      codebook: `codebook_${slug}.csv`,
      syntax: `impor_spss_${slug}.sps`,
      metadata: `metadata_${slug}.json`,
    }),
    [slug],
  )

  const payloads = useMemo(() => {
    if (!hasRows) return null
    return {
      dataset: buildDatasetCsv(rows),
      codebook: buildCodebookCsv(),
      syntax: buildSpssSyntax(),
      metadata: buildMetadataJson(meta || {}),
    }
  }, [rows, meta, hasRows])

  const preview = useMemo(() => {
    if (!payloads) return ""
    return payloads.dataset.split("\n").slice(0, 6).join("\n")
  }, [payloads])

  const download = (filename, content, mime) => {
    if (!content) return
    downloadText(filename, content, mime)
  }

  const copy = async (key, content) => {
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(key)
      window.setTimeout(() => setCopied(""), 1500)
    } catch {
      setCopied("gagal")
      window.setTimeout(() => setCopied(""), 1500)
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Ekspor hasil simulasi</h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Empat berkas siap diimpor ke SPSS. Hanya run tercentang pada sesi
          {sessionName ? ` \u201c${sessionName}\u201d` : " aktif"} yang disertakan. Seluruh proses berjalan lokal di
          peramban; tidak ada data yang dikirim ke server.
        </p>
      </div>

      {!hasRows ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Jalankan eksperimen terlebih dahulu pada tab Parameter agar berkas dapat dibuat.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!hasRows}
          onClick={() => download(files.dataset, payloads?.dataset, "text/csv;charset=utf-8")}
          className={`${BUTTON} border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300`}
        >
          {files.dataset}
        </button>
        <button
          type="button"
          disabled={!hasRows}
          onClick={() => download(files.codebook, payloads?.codebook, "text/csv;charset=utf-8")}
          className={`${BUTTON} border-slate-300 bg-white text-slate-700 hover:border-slate-400`}
        >
          {files.codebook}
        </button>
        <button
          type="button"
          disabled={!hasRows}
          onClick={() => download(files.syntax, payloads?.syntax, "text/plain;charset=utf-8")}
          className={`${BUTTON} border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300`}
        >
          {files.syntax}
        </button>
        <button
          type="button"
          disabled={!hasRows}
          onClick={() => download(files.metadata, payloads?.metadata, "application/json;charset=utf-8")}
          className={`${BUTTON} border-slate-300 bg-white text-slate-700 hover:border-slate-400`}
        >
          {files.metadata}
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-700">Pratinjau dataset (6 baris pertama)</span>
          <button
            type="button"
            disabled={!hasRows}
            onClick={() => copy("dataset", payloads?.dataset)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-600 transition hover:border-slate-400 disabled:opacity-50"
          >
            {copied === "dataset" ? "Tersalin" : "Salin"}
          </button>
        </div>
        <pre className="mt-2 overflow-auto whitespace-pre font-mono text-[10px] leading-relaxed text-slate-600">
          {hasRows ? preview : "\u2014"}
        </pre>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-700">Syntax impor SPSS</span>
          <button
            type="button"
            disabled={!hasRows}
            onClick={() => copy("syntax", payloads?.syntax)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-600 transition hover:border-slate-400 disabled:opacity-50"
          >
            {copied === "syntax" ? "Tersalin" : "Salin"}
          </button>
        </div>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre font-mono text-[10px] leading-relaxed text-slate-600">
          {hasRows ? payloads?.syntax : "\u2014"}
        </pre>
      </div>

      {meta ? (
        <dl className="grid gap-2 rounded-xl border border-slate-200 p-3 text-[11px] text-slate-600 sm:grid-cols-3">
          <div>
            <dt className="text-slate-400">Seed</dt>
            <dd className="font-mono text-slate-800">{String(meta.seed ?? "\u2014")}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Ulangan per sel (n)</dt>
            <dd className="font-mono text-slate-800">{String(meta.params?.n ?? "\u2014")}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Sel valid</dt>
            <dd className="font-mono text-slate-800">{String(meta.params?.validCells ?? "\u2014")}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Jumlah record</dt>
            <dd className="font-mono text-slate-800">{String(meta.params?.recordCount ?? "\u2014")}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Runtime</dt>
            <dd className="font-mono text-slate-800">{String(meta.environment?.runtime ?? "\u2014")}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Total baris</dt>
            <dd className="font-mono text-slate-800">{hasRows ? rows.length : 0}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  )
}
