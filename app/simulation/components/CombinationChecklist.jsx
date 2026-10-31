"use client"

/**
 * Checklist kombinasi parameter sebelum eksperimen dijalankan.
 * Memilih himpunan algoritma, mode kunci, dan tipe data; sel yang tidak valid
 * (mis. cipher klasik x dinamis per record) otomatis dilewati oleh runner.
 * @param {{
 *   algorithms: Array<object>,
 *   keyModes: Array<object>,
 *   dataTypes: Array<object>,
 *   selection: {algorithmIds:string[], keyModeIds:string[], dataTypeIds:string[]},
 *   onChange: Function,
 *   validCells: number,
 * }} props
 */
export default function CombinationChecklist({ algorithms, keyModes, dataTypes, selection, onChange, validCells }) {
  const toggle = (key, id) => {
    const current = selection[key] || []
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    onChange({ ...selection, [key]: next })
  }

  const selectAll = () => {
    onChange({
      algorithmIds: algorithms.map((item) => item.id),
      keyModeIds: keyModes.map((item) => item.id),
      dataTypeIds: dataTypes.map((item) => item.id),
    })
  }

  const clearAll = () => {
    onChange({ algorithmIds: [], keyModeIds: [], dataTypeIds: [] })
  }

  const groups = [
    { key: "algorithmIds", legend: "Algoritma", items: algorithms },
    { key: "keyModeIds", legend: "Mode kunci", items: keyModes },
    { key: "dataTypeIds", legend: "Tipe data", items: dataTypes },
  ]

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Checklist kombinasi</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Centang kombinasi yang ingin dijalankan. Sel tidak valid (lihat matriks di bawah) otomatis dilewati.
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700">
          {validCells} sel valid
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {groups.map((group) => (
          <fieldset key={group.key} className="rounded-xl border border-slate-200 p-3">
            <legend className="px-1 text-[11px] font-medium text-slate-500">{group.legend}</legend>
            <div className="flex flex-wrap gap-2">
              {group.items.map((item) => {
                const checked = (selection[group.key] || []).includes(item.id)
                return (
                  <label
                    key={item.id}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1 text-xs transition ${
                      checked ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-blue-600"
                      checked={checked}
                      onChange={() => toggle(group.key, item.id)}
                    />
                    {item.label}
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAll}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-700 transition hover:border-slate-300"
        >
          Pilih semua
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-[11px] text-slate-700 transition hover:border-slate-300"
        >
          Kosongkan
        </button>
      </div>
    </section>
  )
}
