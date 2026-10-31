"use client"

import { useMemo, useState } from "react"
import { formatValue } from "../charts/primitives.jsx"

const TH = "px-3 py-2 text-left font-medium whitespace-nowrap"
const TD = "px-3 py-2 whitespace-nowrap"

const PAGE_SIZES = [10, 25, 50, 100]

const COLUMNS = [
  ["run_id", "run_id"],
  ["ulangan", "Ulangan"],
  ["algoritma_label", "Algoritma"],
  ["tipe_data_label", "Tipe data"],
  ["mode_kunci_label", "Mode kunci"],
  ["ukuran_data_byte", "Ukuran data (B)"],
  ["waktu_enkripsi_ms", "Enkripsi (ms)"],
  ["waktu_dekripsi_ms", "Dekripsi (ms)"],
  ["ukuran_cipher_byte", "Cipher (B)"],
  ["overhead_persen", "Overhead (%)"],
  ["entropi_cipher", "Entropi"],
  ["blast_radius_persen", "Blast (%)"],
  ["skor_total", "Skor"],
  ["layak", "Layak"],
]

/**
 * T4 — Tabel data mentah berpaginasi.
 * @param {{rows:Array<object>}} props
 */
export default function T4({ rows }) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  const total = rows ? rows.length : 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount - 1)

  const visible = useMemo(() => {
    if (!rows) return []
    const start = safePage * pageSize
    return rows.slice(start, start + pageSize)
  }, [rows, safePage, pageSize])

  if (!rows || rows.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">T4. Data mentah</h3>
        <p className="mt-3 text-xs text-slate-500">Belum ada data.</p>
      </section>
    )
  }

  const startIndex = safePage * pageSize + 1
  const endIndex = Math.min(total, (safePage + 1) * pageSize)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">T4. Data mentah</h3>
          <p className="mt-1 text-[11px] text-slate-500">
            Menampilkan {startIndex}&ndash;{endIndex} dari {total} baris.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-slate-500">
          Baris per halaman
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(0)
            }}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 overflow-auto">
        <table className="min-w-full text-left text-xs">
          <caption className="sr-only">Data mentah percobaan</caption>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {COLUMNS.map(([key, label]) => (
                <th key={key} scope="col" className={TH}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {visible.map((row, index) => (
              <tr key={`${row.run_id}-${row.ulangan}-${safePage}-${index}`}>
                {COLUMNS.map(([key]) => (
                  <td key={key} className={TD}>
                    {key === "layak" ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          row.layak ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {row.layak ? "Ya" : "Tidak"}
                      </span>
                    ) : typeof row[key] === "number" ? (
                      <span className="font-mono tabular-nums">{formatValue(row[key], key === "entropi_cipher" ? 3 : 1)}</span>
                    ) : (
                      String(row[key] ?? "\u2014")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
        <button
          type="button"
          onClick={() => setPage((value) => Math.max(0, value - 1))}
          disabled={safePage === 0}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sebelumnya
        </button>
        <span>
          Halaman {safePage + 1} dari {pageCount}
        </span>
        <button
          type="button"
          onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
          disabled={safePage >= pageCount - 1}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Berikutnya
        </button>
      </div>
    </section>
  )
}
