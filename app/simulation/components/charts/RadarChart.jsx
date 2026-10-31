"use client"

import { ChartCard, algorithmColor, formatValue, Legend } from "./primitives.jsx"

const SIZE = 360
const CX = SIZE / 2
const CY = SIZE / 2 + 4
const R = 116
const RINGS = [25, 50, 75, 100]

export const RADAR_AXES = ["Kerahasiaan", "Integritas", "Dampak bocor", "Performa", "Kompleksitas"]

function polarPoint(axisIndex, axisCount, value) {
  const angle = -Math.PI / 2 + (axisIndex * 2 * Math.PI) / axisCount
  const radius = (R * Math.max(0, Math.min(100, value))) / 100
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)]
}

function ringPath(axisCount, value) {
  return Array.from({ length: axisCount }, (_, index) => polarPoint(index, axisCount, value).join(",")).join(" ")
}

function labelAnchor(x) {
  if (Math.abs(x - CX) < 4) return "middle"
  return x > CX ? "start" : "end"
}

/**
 * Radar 5 kriteria per algoritma (rata-rata seluruh kombinasi yang disediakan).
 * @param {{items:Array<{algorithmId:string,label:string,values:number[]}>}} props
 */
export default function RadarChart({ items }) {
  if (!items || items.length === 0) {
    return (
      <ChartCard title="Profil 5 kriteria">
        <p className="text-xs text-slate-500">Belum ada data.</p>
      </ChartCard>
    )
  }

  const axisCount = RADAR_AXES.length

  return (
    <ChartCard
      title="Profil 5 kriteria per algoritma"
      caption="Setiap sumbu berskala 0-100. Semakin luas poligon, semakin tinggi kecocokan pada kriteria tersebut."
      tableFallback={
        <table className="w-full text-left">
          <caption className="sr-only">Nilai rata-rata lima kriteria per algoritma</caption>
          <thead>
            <tr>
              <th scope="col">Algoritma</th>
              {RADAR_AXES.map((axis) => (
                <th key={axis} scope="col">
                  {axis}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.algorithmId}>
                <td>{item.label}</td>
                {RADAR_AXES.map((axis, index) => (
                  <td key={axis}>{formatValue(item.values[index], 1)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="flex flex-col items-center gap-2">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-auto w-full max-w-[360px]"
          role="img"
          aria-label="Diagram radar lima kriteria per algoritma"
        >
          {RINGS.map((ring) => (
            <polygon key={ring} points={ringPath(axisCount, ring)} fill="none" stroke="#e2e8f0" strokeWidth="1" />
          ))}

          {RADAR_AXES.map((axis, index) => {
            const [ex, ey] = polarPoint(index, axisCount, 100)
            const [lx, ly] = polarPoint(index, axisCount, 116)
            return (
              <g key={axis}>
                <line x1={CX} y1={CY} x2={ex} y2={ey} stroke="#e2e8f0" strokeWidth="1" />
                <text x={lx} y={ly + 3} textAnchor={labelAnchor(lx)} fontSize="9" fill="#475569">
                  {axis}
                </text>
              </g>
            )
          })}

          {items.map((item, index) => {
            const color = algorithmColor(item.algorithmId, index)
            const polygon = item.values.map((value, axisIndex) => polarPoint(axisIndex, axisCount, value).join(",")).join(" ")
            return (
              <g key={item.algorithmId}>
                <polygon points={polygon} fill={color} fillOpacity="0.16" stroke={color} strokeWidth="2" />
                {item.values.map((value, axisIndex) => {
                  const [px, py] = polarPoint(axisIndex, axisCount, value)
                  return <circle key={`${item.algorithmId}-${axisIndex}`} cx={px} cy={py} r="2.2" fill={color} />
                })}
              </g>
            )
          })}
        </svg>
        <Legend items={items.map((item, index) => ({ label: item.label, color: algorithmColor(item.algorithmId, index) }))} />
      </div>
    </ChartCard>
  )
}
