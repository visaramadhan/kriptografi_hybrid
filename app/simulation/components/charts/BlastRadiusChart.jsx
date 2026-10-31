"use client"

import { ChartCard, algorithmColor, formatValue, Legend, scaleLinear } from "./primitives.jsx"

const WIDTH = 640
const HEIGHT = 260
const PAD = { top: 16, right: 16, bottom: 44, left: 48 }

/**
 * Bar blast radius: perbandingan mode statis vs dinamis per algoritma.
 * @param {{items:Array<{algorithmId:string,label:string,staticBlast:number,dynamicBlast:number}>}} props
 */
export default function BlastRadiusChart({ items }) {
  if (!items || items.length === 0) {
    return <ChartCard title="Blast radius statis vs dinamis"><p className="text-xs text-slate-500">Belum ada data.</p></ChartCard>
  }

  const y = scaleLinear(0, 100, HEIGHT - PAD.bottom, PAD.top)
  const bandWidth = (WIDTH - PAD.left - PAD.right) / items.length
  const barWidth = Math.min(20, bandWidth / 3)

  return (
    <ChartCard
      title="Blast radius: statis vs dinamis"
      caption="Persentase record terbuka bila satu kunci data bocor."
      tableFallback={
        <table className="w-full text-left">
          <thead><tr><th>Algoritma</th><th>Statis (%)</th><th>Dinamis (%)</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.algorithmId}>
                <td>{item.label}</td>
                <td>{formatValue(item.staticBlast, 2)}</td>
                <td>{formatValue(item.dynamicBlast, 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Grafik batang blast radius statis versus dinamis">
        {[0, 25, 50, 75, 100].map((tick) => {
          const yPos = y(tick)
          return (
            <g key={tick}>
              <line x1={PAD.left} y1={yPos} x2={WIDTH - PAD.right} y2={yPos} stroke="#e2e8f0" />
              <text x={PAD.left - 6} y={yPos + 3} textAnchor="end" fontSize="9" fill="#64748b">{tick}%</text>
            </g>
          )
        })}
        {items.map((item, index) => {
          const center = PAD.left + bandWidth * index + bandWidth / 2
          return (
            <g key={item.algorithmId}>
              <rect x={center - barWidth - 1} y={y(item.staticBlast)} width={barWidth} height={HEIGHT - PAD.bottom - y(item.staticBlast)} fill={algorithmColor(item.algorithmId, index)} rx="2" />
              <rect x={center + 1} y={y(item.dynamicBlast)} width={barWidth} height={Math.max(HEIGHT - PAD.bottom - y(item.dynamicBlast), 1)} fill="#22c55e" rx="2" />
              <text x={center} y={HEIGHT - PAD.bottom + 14} textAnchor="middle" fontSize="9" fill="#475569">{item.label}</text>
            </g>
          )
        })}
        <line x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} stroke="#94a3b8" />
      </svg>
      <Legend items={[{ label: "Statis", color: "#6366f1" }, { label: "Dinamis", color: "#22c55e" }]} />
    </ChartCard>
  )
}
