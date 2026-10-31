// Rekomendasi per tipe data (tabel T3).

import { dataTypes } from "../simulation-config.js"
import { findAlgorithm } from "./matrix.js"

function mean(list) {
  return list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0
}

function round1(value) {
  return Math.round(value * 10) / 10
}

/**
 * Peringkat algoritma + mode kunci terbaik per tipe data.
 * Tipe data "kredensial" tidak diperingkat (hanya peringatan hashing).
 * @returns {Array<object>}
 */
export function recommendPerDataType(rows) {
  return dataTypes
    .map((dataType) => {
      const subset = rows.filter((row) => row.tipe_data_id === dataType.id)

      if (dataType.isPassword) {
        return {
          tipeDataId: dataType.id,
          label: dataType.label,
          catatan: dataType.warning,
          diabaikan: true,
          peringkat: [],
        }
      }

      const groups = new Map()
      subset.forEach((row) => {
        const key = `${row.algoritma_id}::${row.mode_kunci_id}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(row)
      })

      const peringkat = Array.from(groups.values())
        .map((group) => {
          const algorithmId = group[0].algoritma_id
          const algorithm = findAlgorithm(algorithmId)
          const skor = round1(mean(group.map((r) => r.skor_total)))
          const integritas = round1(mean(group.map((r) => r.skor_integritas)))
          const blast = round1(mean(group.map((r) => r.blast_radius_persen)))
          const layak = group[0].layak

          const kontrolTambahan = [...new Set(group.flatMap((r) => r.catatan || []))]

          return {
            algoritmaId: algorithmId,
            algoritmaLabel: algorithm ? algorithm.label : algorithmId,
            modeKunciId: group[0].mode_kunci_id,
            modeKunciLabel: group[0].mode_kunci_label,
            skor,
            layak,
            alasan: `Skor ${skor}, integritas ${integritas}, blast radius ${blast}%, cakupan ${group[0].cakupan_persen}%.`,
            kontrolTambahan,
          }
        })
        .sort((a, b) => b.skor - a.skor)
        .slice(0, 3)

      return {
        tipeDataId: dataType.id,
        label: dataType.label,
        catatan: dataType.warning,
        diabaikan: false,
        peringkat,
      }
    })
    .filter((item) => item.peringkat.length > 0 || item.diabaikan)
}
