"use client"

import { formatValue } from "../charts/primitives.jsx"

const TH = "px-3 py-2 text-left font-medium"
const TD = "px-3 py-2"

/**
 * T1 — Ringkasan statistik per algoritma (dari summarizeByAlgorithm).
 * @param {{summary:Array<object>}} props
 */
export default function T1({ summary }) {
  if (!summary || summary.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">T1. Ringkasan per algoritma</h3>
        <p className="mt-3 text-xs text-slate-500">Belum ada data.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">T1. Ringkasan per algoritma</h3>
      <p className="mt-1 text-[11px] text-slate-500">
        Rata-rata gabungan semua tipe data &amp; mode kunci yang dijalankan. Waktu dilaporkan dalam milidetik (rata-rata &plusmn; simpangan baku).
      </p>
      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-left text-xs">
          <caption className="sr-only">Ringkasan statistik per algoritma</caption>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className={TH}>Algoritma</th>
              <th scope="col" className={TH}>n</th>
              <th scope="col" className={TH}>Enkripsi (ms)</th>
              <th scope="col" className={TH}>Median enkripsi</th>
              <th scope="col" className={TH}>Dekripsi (ms)</th>
              <th scope="col" className={TH}>Median dekripsi</th>
              <th scope="col" className={TH}>Skor rata-rata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {summary.map((item) => (
              <tr key={item.algorithmId}>
                <td className={`${TD} font-medium text-slate-800`}>{item.label}</td>
                <td className={`${TD} font-mono`}>{item.n}</td>
                <td className={`${TD} font-mono`}>
                  {formatValue(item.meanEncrypt, 3)} &plusmn; {formatValue(item.sdEncrypt, 3)}
                </td>
                <td className={`${TD} font-mono`}>{formatValue(item.medianEncrypt, 3)}</td>
                <td className={`${TD} font-mono`}>
                  {formatValue(item.meanDecrypt, 3)} &plusmn; {formatValue(item.sdDecrypt, 3)}
                </td>
                <td className={`${TD} font-mono`}>{formatValue(item.medianDecrypt, 3)}</td>
                <td className={`${TD} font-mono`}>{formatValue(item.meanScore, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
