"use client"

import { ChartCard, algorithmColor, formatValue, Legend, scaleLinear } from "./primitives.jsx"

const WIDTH = 640
const HEIGHT = 300
const PAD = { top: 20, right: 20, bottom: 48, left: 56 }

/**
 * Seri waktu enkripsi terhadap ukuran plaintext, satu garis per algoritma.
 * Setiap titik adalah rata-rata pada satu tipe data (ukuran berbeda).
 * @returns {Array<{algorithmId:string,label:string,points:Array<{size:number,time:number,dataTypeLabel:string}>}>}
 */
function buildSeries(rows) {
  const order = []
  const byAlgorithm = new Map()

  rows.forEach((row) => {
    if (!byAlgorithm.has(row.algoritma_id)) {
      byAlgorithm.set(row.algoritma_id, { algorithmId: row.algoritma_id, label: row.algoritma_label, cells: new Map() })
      order.push(row.algoritma_id)
    }
    const group = byAlgorithm.get(row.algoritma_id)
    const key = row.tipe_data_id
    const cell = group.cells.get(key) || { sizeSum: 0, timeSum: 0, count: 0, dataTypeLabel: row.tipe_data_label }
    cell.sizeSum += row.ukuran_data_byte
    cell.timeSum += row.waktu_enkripsi_ms
    cell.count += 1
    group.cells.set(key, cell)
  })

  return order.map((algorithmId) => {
    const group = byAlgorithm.get(algorithmId)
    const points = Array.from(group.cells.values())
      .map((cell) => ({
        size: cell.sizeSum / cell.count,
        time: cell.timeSum / cell.count,
        dataTypeLabel: cell.dataTypeLabel,
      }))
      .sort((a, b) => a.size - b.size)
    return { algorithmId, label: group.label, points }
  })
}

/** Grafik garis: waktu enkripsi terhadap ukuran data per algoritma. */
export default function SizeTimeChart({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <ChartCard title="Waktu enkripsi vs ukuran data">
        <p className="text-xs text-slate-500">Belum ada data.</p>
      </ChartCard>
    )
  }

  const series = buildSeries(rows)
  const allPoints = series.flatMap((item) => item.points)
  const maxSize = Math.max(1, ...allPoints.map((point) => point.size))
  const maxTime = Math.max(0.001, ...allPoints.map((point) => point.time))

  const x = scaleLinear(0, maxSize, PAD.left, WIDTH - PAD.right)
  const y = scaleLinear(0, maxTime, HEIGHT - PAD.bottom, PAD.top)

  return (
    <ChartCard
      title="Waktu enkripsi vs ukuran data"
      caption="Tiap titik = rata-rata satu tipe data. Sumbu ukuran & waktu berskala linear; nilai ekstrem (ijazah) dapat merapatkan titik lain."
      tableFallback={
        <table className="w-full text-left">
          <caption className="sr-only">Waktu enkripsi rata-rata terhadap ukuran data</caption>
          <thead>
            <tr>
              <th scope="col">Algoritma</th>
              <th scope="col">Tipe data</th>
              <th scope="col">Ukuran (byte)</th>
              <th scope="col">Waktu enkripsi (ms)</th>
            </tr>
          </thead>
          <tbody>
            {series.flatMap((item) =>
              item.points.map((point) => (
                <tr key={`${item.algorithmId}-${point.dataTypeLabel}`}>
                  <td>{item.label}</td>
                  <td>{point.dataTypeLabel}</td>
                  <td>{formatValue(point.size, 0)}</td>
                  <td>{formatValue(point.time, 3)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      }
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label="Grafik garis waktu enkripsi terhadap ukuran data per algoritma"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const yPos = y(maxTime * tick)
          return (
            <g key={`y-${tick}`}>
              <line x1={PAD.left} y1={yPos} x2={WIDTH - PAD.right} y2={yPos} stroke="#e2e8f0" />
              <text x={PAD.left - 6} y={yPos + 3} textAnchor="end" fontSize="9" fill="#64748b">
                {(maxTime * tick).toFixed(2)}
              </text>
            </g>
          )
        })}

        {[0, 0.5, 1].map((tick) => {
          const xPos = x(maxSize * tick)
          return (
            <g key={`x-${tick}`}>
              <line x1={xPos} y1={PAD.top} x2={xPos} y2={HEIGHT - PAD.bottom} stroke="#f1f5f9" />
              <text x={xPos} y={HEIGHT - PAD.bottom + 14} textAnchor="middle" fontSize="9" fill="#64748b">
                {Math.round(maxSize * tick)}
              </text>
            </g>
          )
        })}

        {series.map((item, index) => {
          const color = algorithmColor(item.algorithmId, index)
          const polyline = item.points.map((point) => `${x(point.size)},${y(point.time)}`).join(" ")
          return (
            <g key={item.algorithmId}>
              {item.points.length > 1 ? <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" /> : null}
              {item.points.map((point) => (
                <circle
                  key={`${item.algorithmId}-${point.dataTypeLabel}`}
                  cx={x(point.size)}
                  cy={y(point.time)}
                  r="3"
                  fill={color}
                >
                  <title>{`${item.label} \u00b7 ${point.dataTypeLabel}: ${formatValue(point.size, 0)} B, ${formatValue(point.time, 3)} ms`}</title>
                </circle>
              ))}
            </g>
          )
        })}

        <line x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} stroke="#94a3b8" />
        <text x={(WIDTH + PAD.left) / 2} y={HEIGHT - 8} textAnchor="middle" fontSize="9" fill="#475569">
          Ukuran plaintext (byte)
        </text>
        <text x={14} y={PAD.top + 2} fontSize="9" fill="#475569">
          ms
        </text>
      </svg>
      <Legend items={series.map((item, index) => ({ label: item.label, color: algorithmColor(item.algorithmId, index) }))} />
    </ChartCard>
  )
}
