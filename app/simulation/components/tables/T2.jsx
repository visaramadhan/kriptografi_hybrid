"use client"

import { formatValue } from "../charts/primitives.jsx"

const TH = "px-3 py-2 text-left font-medium"
const TD = "px-3 py-2"

function mean(list) {
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0
}

function triState(value) {
  if (value >= 0.99) return "Ya"
  if (value <= 0.01) return "Tidak"
  return "Sebagian"
}

/**
 * T2 — Matriks keamanan per kombinasi algoritma x mode kunci.
 * @param {{rows:Array<object>}} props
 */
export default function T2({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">T2. Matriks keamanan</h3>
        <p className="mt-3 text-xs text-slate-500">Belum ada data.</p>
      </section>
    )
  }

  const groups = new Map()
  rows.forEach((row) => {
    const key = `${row.algoritma_id}::${row.mode_kunci_id}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  })

  const items = Array.from(groups.values()).map((group) => {
    const first = group[0]
    const notes = [...new Set(group.flatMap((row) => row.catatan || []))]
    return {
      key: `${first.algoritma_id}::${first.mode_kunci_id}`,
      algorithmLabel: first.algoritma_label,
      modeLabel: first.mode_kunci_label,
      keySpaceBits: first.ruang_kunci_bit,
      coverage: first.cakupan_persen,
      detection: mean(group.map((row) => row.deteksi_manipulasi)),
      forwardSecrecy: mean(group.map((row) => row.forward_secrecy)),
      blast: mean(group.map((row) => row.blast_radius_persen)),
      score: mean(group.map((row) => row.skor_total)),
      layak: group.some((row) => row.layak === 1),
      notes,
    }
  })

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">T2. Matriks keamanan</h3>
      <p className="mt-1 text-[11px] text-slate-500">
        Sifat keamanan per pasangan algoritma &amp; mode kunci (rata-rata lintas tipe data).
      </p>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-left text-xs">
          <caption className="sr-only">Matriks sifat keamanan per algoritma dan mode kunci</caption>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className={TH}>Algoritma</th>
              <th scope="col" className={TH}>Mode kunci</th>
              <th scope="col" className={TH}>Ruang kunci (bit)</th>
              <th scope="col" className={TH}>Cakupan jalur</th>
              <th scope="col" className={TH}>Deteksi manipulasi</th>
              <th scope="col" className={TH}>Forward secrecy</th>
              <th scope="col" className={TH}>Blast radius</th>
              <th scope="col" className={TH}>Skor</th>
              <th scope="col" className={TH}>Kelayakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {items.map((item) => (
              <tr key={item.key}>
                <td className={`${TD} whitespace-nowrap font-medium text-slate-800`}>{item.algorithmLabel}</td>
                <td className={`${TD} whitespace-nowrap`}>{item.modeLabel}</td>
                <td className={`${TD} font-mono`}>{formatValue(item.keySpaceBits, 1)}</td>
                <td className={`${TD} font-mono`}>{item.coverage}%</td>
                <td className={TD}>{triState(item.detection)}</td>
                <td className={TD}>{triState(item.forwardSecrecy)}</td>
                <td className={`${TD} font-mono`}>{formatValue(item.blast, 2)}%</td>
                <td className={`${TD} font-mono`}>{formatValue(item.score, 1)}</td>
                <td className={TD}>
                  <span
                    className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[10px] ${
                      item.layak ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                    title={item.notes.join(" ")}
                  >
                    {item.layak ? "Layak" : "Tidak layak"}
                  </span>
                  {item.notes.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 pl-3 text-[10px] text-slate-500">
                      {item.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
