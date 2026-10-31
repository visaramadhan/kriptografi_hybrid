"use client"

import { useMemo } from "react"
import { algorithmCatalog, dataTypes } from "@/lib/simulation-config"
import { summarizeByAlgorithm } from "@/lib/sim/runner.js"
import BarTimeChart from "./charts/BarTimeChart"
import OverheadChart from "./charts/OverheadChart"
import BlastRadiusChart from "./charts/BlastRadiusChart"
import ForwardSecrecyChart from "./charts/ForwardSecrecyChart"
import ScoreHeatmap from "./charts/ScoreHeatmap"
import SizeTimeChart from "./charts/SizeTimeChart"
import RadarChart from "./charts/RadarChart"

function mean(list) {
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0
}

function buildOverheadItems(rows) {
  const groups = new Map()
  rows.forEach((row) => {
    if (!groups.has(row.algoritma_id)) groups.set(row.algoritma_id, [])
    groups.get(row.algoritma_id).push(row)
  })
  return Array.from(groups.values()).map((group) => ({
    algorithmId: group[0].algoritma_id,
    label: group[0].algoritma_label,
    overhead: mean(group.map((row) => row.overhead_persen)),
  }))
}

function buildBlastItems(rows) {
  const groups = new Map()
  rows.forEach((row) => {
    if (!groups.has(row.algoritma_id)) groups.set(row.algoritma_id, { label: row.algoritma_label, statis: [], dinamis: [] })
    const group = groups.get(row.algoritma_id)
    if (row.mode_kunci_id === "statis") group.statis.push(row.blast_radius_persen)
    else group.dinamis.push(row.blast_radius_persen)
  })
  return Array.from(groups.entries()).map(([algorithmId, group]) => ({
    algorithmId,
    label: group.label,
    staticBlast: mean(group.statis),
    dynamicBlast: mean(group.dinamis),
  }))
}

const RADAR_FIELDS = [
  "skor_kerahasiaan",
  "skor_integritas",
  "skor_dampak_bocor",
  "skor_performa",
  "skor_kompleksitas",
]

function buildRadarItems(rows) {
  const groups = new Map()
  rows.forEach((row) => {
    if (!groups.has(row.algoritma_id)) groups.set(row.algoritma_id, [])
    groups.get(row.algoritma_id).push(row)
  })
  return Array.from(groups.entries()).map(([algorithmId, group]) => ({
    algorithmId,
    label: group[0].algoritma_label,
    values: RADAR_FIELDS.map((field) => mean(group.map((row) => row[field]))),
  }))
}

/**
 * Tab Grafik: tujuh visualisasi hasil eksperimen.
 * @param {{rows:Array<object>}} props
 */
export default function ChartTab({ rows }) {
  const hasRows = Boolean(rows && rows.length)

  const timeItems = useMemo(() => (hasRows ? summarizeByAlgorithm(rows) : []), [rows, hasRows])
  const overheadItems = useMemo(() => (hasRows ? buildOverheadItems(rows) : []), [rows, hasRows])
  const blastItems = useMemo(() => (hasRows ? buildBlastItems(rows) : []), [rows, hasRows])
  const radarItems = useMemo(() => (hasRows ? buildRadarItems(rows) : []), [rows, hasRows])

  if (!hasRows) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-700">Belum ada grafik</p>
        <p className="mt-1 text-xs text-slate-500">
          Buka tab Parameter dan tekan &ldquo;Jalankan eksperimen&rdquo; untuk menampilkan tujuh grafik.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <BarTimeChart items={timeItems} />
      <OverheadChart items={overheadItems} />
      <BlastRadiusChart items={blastItems} />
      <ForwardSecrecyChart days={30} />
      <div className="xl:col-span-2">
        <ScoreHeatmap rows={rows} algorithms={algorithmCatalog} dataTypes={dataTypes} />
      </div>
      <SizeTimeChart rows={rows} />
      <RadarChart items={radarItems} />
    </div>
  )
}
