"use client"

// Primitif grafik bersama (DRY). Semua grafik memakai SVG sehingga tidak
// memerlukan library chart tambahan.

export function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin || 1
  return (value) => rangeMin + ((value - domainMin) / span) * (rangeMax - rangeMin)
}

export function scoreColor(score) {
  const clamped = Math.max(0, Math.min(100, score))
  const hue = 8 + (clamped / 100) * 130 // merah -> hijau
  return `hsl(${hue} 75% ${88 - clamped * 0.35}%)`
}

const TONE = {
  caesar: "#64748b",
  "double-caesar": "#3b82f6",
  affine: "#8b5cf6",
  hybrid: "#6366f1",
  "secure-hybrid": "#10b981",
  "secure-ecdh": "#f43f5e",
}

export function algorithmColor(algorithmId, index = 0) {
  return TONE[algorithmId] || ["#0ea5e9", "#f59e0b", "#14b8a6", "#a855f7", "#ef4444", "#22c55e"][index % 6]
}

/**
 * Kartu pembungkus grafik dengan padanan tabel agar terbaca screen reader.
 */
export function ChartCard({ title, caption, children, tableFallback }) {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <figcaption>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {caption ? <p className="mt-1 text-[11px] text-slate-500">{caption}</p> : null}
      </figcaption>
      <div className="mt-3">{children}</div>
      {tableFallback ? (
        <details className="mt-3 text-[11px] text-slate-600">
          <summary className="cursor-pointer select-none text-slate-500">Tabel data (aksesibilitas)</summary>
          <div className="mt-2 overflow-auto">{tableFallback}</div>
        </details>
      ) : null}
    </figure>
  )
}

export function Legend({ items }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export function formatValue(value, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—"
  return Number(value).toFixed(digits)
}
