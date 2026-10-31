// Skenario pelanggaran kunci (tombol di UI). Semua komputasi lokal.

import { isClassicAlgorithm } from "./classic.js"
import { blastRadius, forwardSecrecy } from "./metrics.js"
import * as secure from "./secure.js"

export const SCENARIOS = [
  { id: "blast-radius", label: "Bocorkan satu kunci data" },
  { id: "kek-breach", label: "Bocorkan KEK" },
  { id: "forward-secrecy", label: "Bocorkan kunci privat server (hari ke-N)" },
  { id: "nonce-reuse", label: "Ulang nonce (AES-GCM)" },
  { id: "rotation", label: "Rotasi kunci" },
  { id: "copy-attack", label: "Serangan salin ciphertext antar record" },
  { id: "tamper", label: "Ubah 1 bit ciphertext" },
]

function recordShare(keyModeId, { recordCount, sessions }) {
  if (keyModeId === "statis") return 100
  if (keyModeId === "dinamis_per_sesi") return Math.round((100 / Math.max(sessions, 1)) * 100) / 100
  return Math.round((100 / Math.max(recordCount, 1)) * 10000) / 10000
}

/**
 * Jalankan satu skenario.
 * @param {string} scenarioId
 * @param {{algorithmId:string,dataTypeId:string,keyModeId:string,recordCount:number,sessions:number}} ctx
 */
export async function runScenario(scenarioId, ctx) {
  const { algorithmId, keyModeId, recordCount, sessions } = ctx
  const classic = isClassicAlgorithm(algorithmId)

  if (scenarioId === "blast-radius") {
    const percent = blastRadius({ keyModeId, recordCount, sessions })
    return {
      scenarioId,
      hasil: `${percent}% record terbuka`,
      detail: [
        { label: "Mode kunci", value: keyModeId },
        { label: "Record", value: recordCount },
        { label: "Sesi", value: sessions },
      ],
      catatan:
        keyModeId === "statis"
          ? "Satu kunci melindungi semua record: kebocoran kunci membuka seluruh data."
          : "Kunci terpisah membatasi dampak kebocoran ke sebagian kecil record.",
    }
  }

  if (scenarioId === "kek-breach") {
    const percent = recordShare(keyModeId, { recordCount, sessions })
    return {
      scenarioId,
      hasil: classic ? "Tidak berlaku (cipher klasik tanpa KEK/DEK)" : `${percent}% DEK terbuka -> ${percent}% record terbuka`,
      detail: [
        { label: "Envelope", value: keyModeId === "dinamis_per_record" ? "KEK + DEK per record" : "tidak dipakai" },
        { label: "Panggilan KMS (rotasi)", value: keyModeId === "statis" ? 2 : Math.min(sessions, recordCount, 500) },
      ],
      catatan: "Bila KEK bocor dan seluruh DEK dienkripsi dengannya, semua record dapat didekripsi.",
    }
  }

  if (scenarioId === "forward-secrecy") {
    const ephemeral = forwardSecrecy({ algorithmId, keyModeId, ephemeral: true })
    const staticMode = forwardSecrecy({ algorithmId, keyModeId, ephemeral: false })
    const leaked = staticMode ? 100 : 0
    return {
      scenarioId,
      hasil: `${leaked}% sesi lama terbuka setelah kunci privat server bocor`,
      detail: [
        { label: "Parameter sekarang", value: ephemeral ? "efemeral (forward secrecy)" : "statis" },
        { label: "Pembanding ECDH statis", value: "100% sesi lama terbuka" },
      ],
      catatan: "Forward secrecy hanya muncul bila kunci sesi efemeral dan dibuang setelah sesi berakhir.",
    }
  }

  if (scenarioId === "nonce-reuse") {
    if (classic) {
      return { scenarioId, hasil: "Tidak berlaku", detail: [], catatan: "Cipher klasik tidak memakai nonce." }
    }
    const key = await secure.createAesKey()
    const { relationLeaked } = await secure.nonceReuseRevealsRelation({ key, plainA: "RAHASIA-AAAA", plainB: "RAHASIA-BBBB" })
    return {
      scenarioId,
      hasil: relationLeaked ? "Hubungan antar plaintext bocor" : "Tidak terbaca",
      detail: [{ label: "Nonce diulang", value: "ya" }],
      catatan: "Nonce yang diulang pada AES-GCM membocorkan XOR plaintext; gunakan nonce unik per operasi.",
    }
  }

  if (scenarioId === "rotation") {
    const key = classic ? null : await secure.createAesKey()
    if (classic) {
      return {
        scenarioId,
        hasil: "Rotasi tidak mengubah kelemahan",
        detail: [{ label: "Catatan", value: "Cipher klasik tetap dapat dipecahkan walau kunci sering dirotasi." }],
        catatan: "Biaya rotasi pada cipher klasik hampir nol, tetapi keamanan tidak meningkat.",
      }
    }
    const result = await secure.measureRotationCost({ key, recordCount, sessions, keyModeId })
    return {
      scenarioId,
      hasil: `${result.costMs} ms untuk ${result.reEncrypted} record`,
      detail: [
        { label: "Panggilan KMS", value: result.kmsCalls },
        { label: "Record dienkripsi ulang", value: result.reEncrypted },
      ],
      catatan: "Biaya rotasi bergantung jumlah record dan mode kunci (envelope = KMS lebih banyak).",
    }
  }

  if (scenarioId === "copy-attack") {
    if (classic) {
      return {
        scenarioId,
        hasil: "Serangan berhasil",
        detail: [{ label: "Tanpa AAD", value: "berhasil" }],
        catatan: "Cipher klasik deterministik tanpa pengikat konteks; ciphertext bebas dipindah antar record.",
      }
    }
    const key = await secure.createAesKey()
    const without = await secure.tryCopyAttack({ key, plainA: "RECORD-A", plainB: "RECORD-B", withAad: false })
    const withAad = await secure.tryCopyAttack({ key, plainA: "RECORD-A", plainB: "RECORD-B", withAad: true })
    return {
      scenarioId,
      hasil: withAad ? "Berhasil" : "Gagal (ditolak)",
      detail: [
        { label: "Tanpa AAD", value: without ? "berhasil" : "gagal" },
        { label: "Dengan AAD (id konteks)", value: withAad ? "berhasil" : "gagal" },
      ],
      catatan: "AAD mengikat ciphertext ke konteks record sehingga pemindahan ciphertext terdeteksi.",
    }
  }

  if (scenarioId === "tamper") {
    if (classic) {
      return {
        scenarioId,
        hasil: "Tidak terdeteksi",
        detail: [{ label: "Integritas", value: "tidak ada MAC" }],
        catatan: "Cipher klasik tidak mendeteksi perubahan ciphertext; plaintext hasil dekripsi menjadi rusak tanpa peringatan.",
      }
    }
    const key = await secure.createAesKey()
    const detected = await secure.detectsTampering({ text: "NILAI|A|IPK3.5", key })
    return {
      scenarioId,
      hasil: detected ? "Manipulasi terdeteksi" : "Tidak terdeteksi",
      detail: [{ label: "Verifikasi tag", value: detected ? "gagal (ditolak)" : "lolos" }],
      catatan: "AES-GCM memverifikasi tag autentikasi; 1 bit yang diubah membuat dekripsi ditolak.",
    }
  }

  return { scenarioId, hasil: "Skenario tidak dikenal", detail: [], catatan: "" }
}
