"use client"

import { formatValue } from "../charts/primitives.jsx"

const TH = "px-3 py-2 text-left font-medium"
const TD = "px-3 py-2"

/**
 * T3 — Rekomendasi algoritma + mode kunci terbaik per tipe data.
 * @param {{recommendations:Array<object>}} props
 */
export default function T3({ recommendations }) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">T3. Rekomendasi per tipe data</h3>
        <p className="mt-3 text-xs text-slate-500">Belum ada data.</p>
      </section>
    )
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">T3. Rekomendasi per tipe data</h3>
        <p className="mt-1 text-[11px] text-slate-500">
          Tiga peringkat teratas berdasarkan skor kecocokan berbobot. Rekomendasi hanya saran edukasi, bukan keputusan produksi.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {recommendations.map((item) => (
          <div key={item.tipeDataId} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-slate-800">{item.label}</h4>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  item.diabaikan ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.diabaikan ? "Di luar perankingan" : `${item.peringkat.length} kandidat`}
              </span>
            </div>

            {item.catatan ? <p className="mt-2 text-[11px] text-slate-500">{item.catatan}</p> : null}

            {item.diabaikan ? null : (
              <div className="mt-2 overflow-auto">
                <table className="w-full text-left text-[11px]">
                  <caption className="sr-only">{`Rekomendasi untuk ${item.label}`}</caption>
                  <thead className="text-slate-500">
                    <tr>
                      <th scope="col" className={`${TH} !px-2 !py-1`}>Algoritma</th>
                      <th scope="col" className={`${TH} !px-2 !py-1`}>Mode kunci</th>
                      <th scope="col" className={`${TH} !px-2 !py-1`}>Skor</th>
                      <th scope="col" className={`${TH} !px-2 !py-1`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {item.peringkat.map((rank) => (
                      <tr key={`${rank.algoritmaId}-${rank.modeKunciId}`}>
                        <td className={`${TD} !px-2 !py-1`} title={rank.alasan}>
                          {rank.algoritmaLabel}
                        </td>
                        <td className={`${TD} !px-2 !py-1`}>{rank.modeKunciLabel}</td>
                        <td className={`${TD} !px-2 !py-1 font-mono`}>{formatValue(rank.skor, 1)}</td>
                        <td className={`${TD} !px-2 !py-1`}>
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                              rank.layak ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            }`}
                          >
                            {rank.layak ? "Layak" : "Tidak layak"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {item.peringkat[0]?.kontrolTambahan?.length ? (
                  <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[10px] text-slate-500">
                    {item.peringkat[0].kontrolTambahan.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
