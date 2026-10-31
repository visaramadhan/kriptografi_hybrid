"use client"

import { useMemo } from "react"
import { summarizeByAlgorithm } from "@/lib/sim/runner.js"
import { recommendPerDataType } from "@/lib/sim/recommend.js"
import T1 from "./tables/T1"
import T2 from "./tables/T2"
import T3 from "./tables/T3"
import T4 from "./tables/T4"

/**
 * Tab Hasil: tabel T1 (ringkasan), T2 (matriks keamanan),
 * T3 (rekomendasi), dan T4 (data mentah berpaginasi).
 * @param {{rows:Array<object>}} props
 */
export default function ResultTab({ rows }) {
  const summary = useMemo(() => (rows && rows.length ? summarizeByAlgorithm(rows) : []), [rows])
  const recommendations = useMemo(() => (rows && rows.length ? recommendPerDataType(rows) : []), [rows])

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-700">Belum ada hasil</p>
        <p className="mt-1 text-xs text-slate-500">
          Buka tab Parameter dan tekan &ldquo;Jalankan eksperimen&rdquo; untuk mengisi tabel.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <T1 summary={summary} />
      <T2 rows={rows} />
      <T3 recommendations={recommendations} />
      <T4 rows={rows} />
    </div>
  )
}
