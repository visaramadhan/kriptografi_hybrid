"use client"

import { ChartCard, algorithmColor, formatValue, Legend, scaleLinear } from "./primitives.jsx"

const WIDTH = 640
const HEIGHT = 280
const PAD = { top: 16, right: 16, bottom: 44, left: 48 }

/**
 * Grafik batang waktu enkripsi & dekripsi per algoritma dengan error bar SD.
 * @param {{items:Array<{algorithmId:string,label:string,meanEncrypt:number,sdEncrypt:number,meanDecrypt:number,sdDecrypt:number}>}} props
 */
export default function BarTimeChart({ items }) {
  if (!items || items.length === 0) {
    return <ChartCard title="Waktu enkripsi & dekripsi"><p className="text-xs text-slate-500">Belum ada data.</p></ChartCard>
  }

  const maxValue = Math.max(0.001, ...items.map((item) => Math.max(item.meanEncrypt + item.sdEncrypt, item.meanDecrypt + item.sdDecrypt)))
  const y = scaleLinear(0, maxValue, HEIGHT - PAD.bottom, PAD.top)
  const bandWidth = (WIDTH - PAD.left - PAD.right) / items.length
  const barWidth = Math.min(22, bandWidth / 3.2)

  return (
    <ChartCard
      title="Waktu enkripsi & dekripsi per algoritma"
      caption="Batang = rata-rata (ms), garis galat = simpangan baku. Waktu bergantung implementasi: lihat kolom implementasi_native."
      tableFallback={
        <table className="w-full text-left">
          <thead>
            <tr><th>Algoritma</th><th>Enkripsi (mean±SD)</th><th>Dekripsi (mean±SD)</th></tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.algorithmId}>
                <td>{item.label}</td>
                <td>{formatValue(item.meanEncrypt, 3)} ± {formatValue(item.sdEncrypt, 3)}</td>
                <td>{formatValue(item.meanDecrypt, 3)} ± {formatValue(item.sdDecrypt, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Grafik batang waktu enkripsi dan dekripsi per algoritma">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const value = maxValue * tick
          const yPos = y(value)
          return (
            <g key={tick}>
              <line x1={PAD.left} y1={yPos} x2={WIDTH - PAD.right} y2={yPos} stroke="#e2e8f0" strokeWidth="1" />
              <text x={PAD.left - 6} y={yPos + 3} textAnchor="end" fontSize="9" fill="#64748b">{value.toFixed(2)}</text>
            </g>
          )
        })}

        {items.map((item, index) => {
          const center = PAD.left + bandWidth * index + bandWidth / 2
          const encX = center - barWidth - 2
          const decX = center + 2
          return (
            <g key={item.algorithmId}>
              <rect x={encX} y={y(item.meanEncrypt)} width={barWidth} height={HEIGHT - PAD.bottom - y(item.meanEncrypt)} fill={algorithmColor(item.algorithmId, index)} rx="2" />
              <rect x={decX} y={y(item.meanDecrypt)} width={barWidth} height={HEIGHT - PAD.bottom - y(item.meanDecrypt)} fill="#94a3b8" rx="2" />
              <line x1={encX + barWidth / 2} y1={y(item.meanEncrypt - item.sdEncrypt)} x2={encX + barWidth / 2} y2={y(item.meanEncrypt + item.sdEncrypt)} stroke="#0f172a" strokeWidth="1" />
              <line x1={decX + barWidth / 2} y1={y(item.meanDecrypt - item.sdDecrypt)} x2={decX + barWidth / 2} y2={y(item.meanDecrypt + item.sdDecrypt)} stroke="#0f172a" strokeWidth="1" />
              <text x={center} y={HEIGHT - PAD.bottom + 14} textAnchor="middle" fontSize="9" fill="#475569">{item.label}</text>
            </g>
          )
        })}
        <line x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} stroke="#94a3b8" />
      </svg>
      <Legend items={[{ label: "Enkripsi", color: "#6366f1" }, { label: "Dekripsi", color: "#94a3b8" }]} />
    </ChartCard>
  )
}
