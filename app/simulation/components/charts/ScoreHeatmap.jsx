"use client"

import { ChartCard, scoreColor, formatValue } from "./primitives.jsx"

/**
 * Rata-rata skor_total per sel (algoritma x tipe data) untuk mode tertentu.
 * @returns {Map<string, number|null>} key = `${algorithmId}::${dataTypeId}`
 */
function averageByCell(rows, modePredicate) {
  const sums = new Map()
  rows.forEach((row) => {
    if (!modePredicate(row.mode_kunci_id)) return
    const key = `${row.algoritma_id}::${row.tipe_data_id}`
    const entry = sums.get(key) || { sum: 0, count: 0 }
    entry.sum += row.skor_total
    entry.count += 1
    sums.set(key, entry)
  })

  const result = new Map()
  sums.forEach((entry, key) => {
    result.set(key, entry.count ? entry.sum / entry.count : null)
  })
  return result
}

function HeatPanel({ title, matrix, algorithms, dataTypes }) {
  return (
    <div className="min-w-0">
      <h4 className="mb-2 text-[11px] font-semibold text-slate-700">{title}</h4>
      <div className="overflow-auto">
        <table className="w-full border-separate border-spacing-[2px] text-[10px]">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col" className="px-1 py-1 text-left font-medium text-slate-500">
                Algoritma
              </th>
              {dataTypes.map((dataType) => (
                <th key={dataType.id} scope="col" className="px-1 py-1 text-center font-medium text-slate-500">
                  {dataType.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {algorithms.map((algorithm) => (
              <tr key={algorithm.id}>
                <th scope="row" className="whitespace-nowrap px-1 py-1 text-left font-medium text-slate-600">
                  {algorithm.label}
                </th>
                {dataTypes.map((dataType) => {
                  const value = matrix.get(`${algorithm.id}::${dataType.id}`)
                  const style =
                    value == null
                      ? { backgroundColor: "#f1f5f9", color: "#94a3b8" }
                      : { backgroundColor: scoreColor(value), color: "#0f172a" }
                  return (
                    <td
                      key={dataType.id}
                      className="rounded px-1 py-1 text-center font-mono tabular-nums"
                      style={style}
                      title={`${algorithm.label} \u00d7 ${dataType.label}: ${
                        value == null ? "tidak ada data" : formatValue(value, 1)
                      }`}
                    >
                      {value == null ? "\u2014" : value.toFixed(0)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Peta panas skor kecocokan: panel mode statis berdampingan dengan mode dinamis.
 * @param {{rows:Array<object>, algorithms:Array<{id:string,label:string}>, dataTypes:Array<{id:string,label:string}>}} props
 */
export default function ScoreHeatmap({ rows, algorithms, dataTypes }) {
  if (!rows || rows.length === 0) {
    return (
      <ChartCard title="Peta panas skor kecocokan">
        <p className="text-xs text-slate-500">Belum ada data.</p>
      </ChartCard>
    )
  }

  const staticMatrix = averageByCell(rows, (modeId) => modeId === "statis")
  const dynamicMatrix = averageByCell(rows, (modeId) => modeId !== "statis")

  const accessTable = (
    <table className="w-full text-left">
      <caption className="sr-only">Skor rata-rata per algoritma dan tipe data</caption>
      <thead>
        <tr>
          <th scope="col">Mode</th>
          <th scope="col">Algoritma</th>
          <th scope="col">Tipe data</th>
          <th scope="col">Skor rata-rata</th>
        </tr>
      </thead>
      <tbody>
        {[
          ["Statis", staticMatrix],
          ["Dinamis", dynamicMatrix],
        ].flatMap(([modeLabel, matrix]) =>
          algorithms.flatMap((algorithm) =>
            dataTypes.map((dataType) => {
              const value = matrix.get(`${algorithm.id}::${dataType.id}`)
              return (
                <tr key={`${modeLabel}-${algorithm.id}-${dataType.id}`}>
                  <td>{modeLabel}</td>
                  <td>{algorithm.label}</td>
                  <td>{dataType.label}</td>
                  <td>{value == null ? "\u2014" : formatValue(value, 1)}</td>
                </tr>
              )
            }),
          ),
        )}
      </tbody>
    </table>
  )

  return (
    <ChartCard
      title="Peta panas skor kecocokan (statis vs dinamis)"
      caption="Warna sel mengikuti skor rata-rata 0-100: merah = rendah, hijau = tinggi. Mode dinamis menggabungkan per sesi dan per record."
      tableFallback={accessTable}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <HeatPanel title="Mode kunci statis" matrix={staticMatrix} algorithms={algorithms} dataTypes={dataTypes} />
        <HeatPanel title="Mode kunci dinamis" matrix={dynamicMatrix} algorithms={algorithms} dataTypes={dataTypes} />
      </div>
    </ChartCard>
  )
}
