"use client"

import { ChartCard, algorithmColor, formatValue, scaleLinear } from "./primitives.jsx"

const WIDTH = 640
const HEIGHT = 260
const PAD = { top: 16, right: 16, bottom: 44, left: 48 }

/** Grafik batang overhead ukuran ciphertext (%) per algoritma. */
export default function OverheadChart({ items }) {
  if (!items || items.length === 0) {
    return <ChartCard title="Overhead ukuran ciphertext"><p className="text-xs text-slate-500">Belum ada data.</p></ChartCard>
  }

  const maxValue = Math.max(1, ...items.map((item) => item.overhead))
  const y = scaleLinear(0, maxValue, HEIGHT - PAD.bottom, PAD.top)
  const bandWidth = (WIDTH - PAD.left - PAD.right) / items.length
  const barWidth = Math.min(38, bandWidth * 0.55)

  return (
    <ChartCard
      title="Overhead ukuran ciphertext"
      caption="Selisih ukuran ciphertext dibanding plaintext (%)."
      tableFallback={
        <table className="w-full text-left">
          <thead><tr><th>Algoritma</th><th>Overhead (%)</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.algorithmId}><td>{item.label}</td><td>{formatValue(item.overhead, 2)}</td></tr>
            ))}
          </tbody>
        </table>
      }
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Grafik batang overhead ukuran ciphertext per algoritma">
        {[0, 0.5, 1].map((tick) => {
          const yPos = y(maxValue * tick)
          return (
            <g key={tick}>
              <line x1={PAD.left} y1={yPos} x2={WIDTH - PAD.right} y2={yPos} stroke="#e2e8f0" />
              <text x={PAD.left - 6} y={yPos + 3} textAnchor="end" fontSize="9" fill="#64748b">{(maxValue * tick).toFixed(0)}%</text>
            </g>
          )
        })}
        {items.map((item, index) => {
          const x = PAD.left + bandWidth * index + (bandWidth - barWidth) / 2
          return (
            <g key={item.algorithmId}>
              <rect x={x} y={y(item.overhead)} width={barWidth} height={HEIGHT - PAD.bottom - y(item.overhead)} fill={algorithmColor(item.algorithmId, index)} rx="3" />
              <text x={x + barWidth / 2} y={y(item.overhead) - 4} textAnchor="middle" fontSize="9" fill="#334155">{formatValue(item.overhead, 1)}</text>
              <text x={x + barWidth / 2} y={HEIGHT - PAD.bottom + 14} textAnchor="middle" fontSize="9" fill="#475569">{item.label}</text>
            </g>
          )
        })}
        <line x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} stroke="#94a3b8" />
      </svg>
    </ChartCard>
  )
}
