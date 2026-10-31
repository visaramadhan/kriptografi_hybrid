"use client"

import { ChartCard, Legend, scaleLinear } from "./primitives.jsx"

const WIDTH = 640
const HEIGHT = 240
const PAD = { top: 16, right: 16, bottom: 40, left: 48 }

/**
 * Garis waktu forward secrecy: RSA statis vs ECDHE efemeral.
 * Kedua garis merepresentasikan % sesi lama yang terbuka setelah kunci
 * privat server bocor pada hari ke-N.
 */
export default function ForwardSecrecyChart({ days = 30 }) {
  const points = Array.from({ length: days + 1 }, (_, day) => day)
  const x = scaleLinear(0, days, PAD.left, WIDTH - PAD.right)
  const y = scaleLinear(0, 100, HEIGHT - PAD.bottom, PAD.top)

  const staticLine = points.map((day) => `${x(day)},${y(100)}`).join(" ")
  const ephemeralLine = points.map((day) => `${x(day)},${y(0)}`).join(" ")

  return (
    <ChartCard
      title="Forward secrecy: RSA statis vs ECDHE efemeral"
      caption="% sesi lama yang terbuka bila kunci privat server bocor pada hari ke-N."
      tableFallback={
        <table className="w-full text-left">
          <thead><tr><th>Hari</th><th>RSA statis (%)</th><th>ECDHE efemeral (%)</th></tr></thead>
          <tbody>
            {[0, Math.round(days / 2), days].map((day) => (
              <tr key={day}><td>{day}</td><td>100</td><td>0</td></tr>
            ))}
          </tbody>
        </table>
      }
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label="Grafik garis forward secrecy RSA statis versus ECDHE efemeral">
        {[0, 50, 100].map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} y1={y(tick)} x2={WIDTH - PAD.right} y2={y(tick)} stroke="#e2e8f0" />
            <text x={PAD.left - 6} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="#64748b">{tick}%</text>
          </g>
        ))}
        <polyline points={staticLine} fill="none" stroke="#f97316" strokeWidth="2" />
        <polyline points={ephemeralLine} fill="none" stroke="#10b981" strokeWidth="2" />
        <text x={x(days)} y={y(100) - 6} textAnchor="end" fontSize="9" fill="#c2410c">RSA statis</text>
        <text x={x(days)} y={y(0) + 12} textAnchor="end" fontSize="9" fill="#047857">ECDHE efemeral</text>
        <text x={(WIDTH + PAD.left) / 2} y={HEIGHT - 8} textAnchor="middle" fontSize="9" fill="#475569">Hari ke-N setelah kebocoran kunci</text>
      </svg>
      <Legend items={[{ label: "RSA statis (tanpa FS)", color: "#f97316" }, { label: "ECDHE efemeral (FS)", color: "#10b981" }]} />
    </ChartCard>
  )
}
