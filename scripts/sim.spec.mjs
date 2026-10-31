// Unit test deterministik untuk mesin simulasi (node --test).
// Jalankan: npm run test:sim

import test from "node:test"
import assert from "node:assert/strict"

import {
  CLASSIC_ALPHABET,
  fromIndex,
  gcd,
  invertibleMultipliers,
  modInverse,
  normalizeToAlphabet,
  toIndex,
} from "../lib/sim/alphabet.js"
import { decryptClassic, encryptClassic, generateClassicKeys, keySpaceBits } from "../lib/sim/classic.js"
import { createSeededRandom } from "../lib/sim/prng.js"
import { DATA_TYPE_IDS, generateDummyRecords, samplePlaintext } from "../lib/sim/dataset.js"
import {
  blastRadius,
  bruteForceSeconds,
  byteLength,
  detectPatternLeak,
  forwardSecrecy,
  overheadPercent,
  shannonEntropy,
} from "../lib/sim/metrics.js"
import { computeSubScores, eligibility, weightsSumToOne, weightedTotal } from "../lib/sim/scoring.js"
import {
  buildExperimentCells,
  coveragePercent,
  explainInvalid,
  isValidCombination,
  keySpaceBitsFor,
} from "../lib/sim/matrix.js"
import { createAesKey, decryptAead, encryptAead, nonceReuseRevealsRelation, tryCopyAttack } from "../lib/sim/secure.js"
import { runExperiment } from "../lib/sim/runner.js"
import {
  DATASET_COLUMNS,
  buildCodebookCsv,
  buildDatasetCsv,
  buildMetadataJson,
  buildSpssSyntax,
  formatCsvNumber,
} from "../lib/sim/export.js"
import { dataTypes } from "../lib/simulation-config.js"
import {
  addRun,
  clearRuns,
  createRun,
  createSession,
  describeCombination,
  mergedRows,
  parseSessions,
  removeRun,
  renameSession,
  selectedRuns,
  serializeSessions,
  sessionSummary,
  setAllRuns,
  slugify,
  toggleRun,
} from "../lib/sim/session.js"

test("alphabet: gcd, modInverse, dan pengali invertibel", () => {
  assert.equal(gcd(36, 24), 12)
  assert.equal(modInverse(5, 36), 29)
  assert.equal(modInverse(2, 36), null)
  assert.equal(invertibleMultipliers().length, 12)
  assert.equal(CLASSIC_ALPHABET.length, 36)
})

test("alphabet: normalisasi dan pemetaan indeks", () => {
  assert.equal(normalizeToAlphabet("NIM: 2301-abc!"), "NIM2301ABC")
  assert.equal(fromIndex(toIndex("Q", CLASSIC_ALPHABET), CLASSIC_ALPHABET), "Q")
  assert.equal(fromIndex(26, CLASSIC_ALPHABET), "0")
})

test("classic: round-trip enkripsi/dekripsi untuk 4 algoritma", () => {
  const rand = createSeededRandom(7)
  const plaintext = "NIM2301234UKT500000"
  for (const algorithmId of ["caesar", "double-caesar", "affine", "hybrid"]) {
    const keys = generateClassicKeys(algorithmId, rand)
    const cipher = encryptClassic(algorithmId, plaintext, keys)
    assert.equal(decryptClassic(algorithmId, cipher, keys), plaintext, algorithmId)
    assert.ok(keySpaceBits(algorithmId) > 0)
  }
})

test("classic: caesar menggeser sesuai alfabet 36 simbol", () => {
  // Alfabet = A..Z (indeks 0-25) lalu 0..9 (indeks 26-35), sehingga:
  // A->B, Z->0, 0->1, 9->A
  const cipher = encryptClassic("caesar", "AZ09", { k: 1 })
  assert.equal(cipher, "B01A")
})

test("dataset: deterministik terhadap seed", () => {
  assert.equal(samplePlaintext("umum", { seed: 42 }), samplePlaintext("umum", { seed: 42 }))
  assert.notEqual(samplePlaintext("umum", { seed: 42 }), samplePlaintext("umum", { seed: 43 }))
  assert.notEqual(samplePlaintext("umum", { seed: 42 }), samplePlaintext("keuangan", { seed: 42 }))
  assert.equal(DATA_TYPE_IDS.length, 6)
  assert.equal(generateDummyRecords("nilai", { seed: 1, recordCount: 3 }).length, 3)
})

test("metrics: entropi, ukuran, overhead, blast, forward secrecy", () => {
  assert.equal(shannonEntropy("AAAA"), 0)
  assert.equal(shannonEntropy("ABCD"), 2)
  assert.equal(byteLength("é"), 2)
  assert.equal(overheadPercent(100, 110), 10)
  assert.equal(blastRadius({ keyModeId: "statis" }), 100)
  assert.equal(blastRadius({ keyModeId: "dinamis_per_sesi", sessions: 20 }), 5)
  assert.equal(blastRadius({ keyModeId: "dinamis_per_record", recordCount: 500 }), 0.2)
  assert.equal(forwardSecrecy({ algorithmId: "secure-ecdh", keyModeId: "dinamis_per_sesi", ephemeral: true }), 1)
  assert.equal(forwardSecrecy({ algorithmId: "secure-ecdh", keyModeId: "dinamis_per_sesi", ephemeral: false }), 0)
  assert.equal(forwardSecrecy({ algorithmId: "secure-hybrid", keyModeId: "dinamis_per_sesi" }), 1)
  assert.equal(forwardSecrecy({ algorithmId: "hybrid", keyModeId: "statis" }), 0)
  assert.equal(bruteForceSeconds(0), 0)
  assert.equal(detectPatternLeak("ABC", "ABC"), 1)
  assert.equal(detectPatternLeak("ABC", "ABD"), 0)
})

test("scoring: sub-skor, bobot, dan gerbang kelayakan", () => {
  dataTypes.forEach((dataType) => assert.ok(weightsSumToOne(dataType.weight), dataType.id))

  const metrics = {
    ruang_kunci_bit: 256,
    pola_bocor: 0,
    cakupan_persen: 60,
    deteksi_manipulasi: 1,
    serangan_salin_berhasil: 0,
    blast_radius_persen: 0.1,
    forward_secrecy: 1,
    overhead_persen: 28,
    waktu_enkripsi_ms: 4,
    biaya_rotasi_ms: 900,
    panggilan_kms: 30,
    implementasi_native: 1,
  }
  const umum = dataTypes.find((item) => item.id === "umum")
  const sub = computeSubScores(metrics, umum)
  Object.values(sub).forEach((v) => {
    assert.ok(v >= 0 && v <= 100)
  })
  const total = weightedTotal(sub, umum.weight)
  assert.ok(total >= 0 && total <= 100)

  assert.equal(eligibility({ algorithmId: "caesar", dataType: umum, subScores: sub }).layak, 0)
  assert.equal(eligibility({ algorithmId: "secure-hybrid", dataType: umum, subScores: sub }).layak, 1)

  const ijazah = dataTypes.find((item) => item.id === "ijazah")
  const weak = { ...sub, integritas: 30 }
  assert.equal(eligibility({ algorithmId: "secure-hybrid", dataType: ijazah, subScores: weak }).layak, 0)

  const kredensial = dataTypes.find((item) => item.id === "kredensial")
  assert.equal(eligibility({ algorithmId: "secure-hybrid", dataType: kredensial, subScores: sub }).layak, 0)
})

test("matrix: validitas kombinasi dan cakupan", () => {
  assert.equal(isValidCombination("caesar", "statis"), true)
  assert.equal(isValidCombination("caesar", "dinamis_per_record"), false)
  assert.ok(explainInvalid("caesar", "dinamis_per_record").length > 0)
  assert.equal(isValidCombination("secure-ecdh", "dinamis_per_sesi"), true)
  assert.equal(coveragePercent("caesar"), 20)
  assert.equal(coveragePercent("secure-hybrid"), 60)
  assert.ok(keySpaceBitsFor("affine") > 0)
  assert.equal(keySpaceBitsFor("secure-hybrid"), 256)

  const cellsA = buildExperimentCells({
    algorithmIds: ["caesar", "secure-hybrid"],
    dataTypeIds: ["umum", "nilai"],
    keyModeIds: ["statis", "dinamis_per_record"],
    rand: createSeededRandom(1),
  })
  const cellsB = buildExperimentCells({
    algorithmIds: ["caesar", "secure-hybrid"],
    dataTypeIds: ["umum", "nilai"],
    keyModeIds: ["statis", "dinamis_per_record"],
    rand: createSeededRandom(1),
  })
  assert.deepEqual(cellsA, cellsB)
  assert.ok(cellsA.every((cell) => isValidCombination(cell.algorithmId, cell.keyModeId)))
  // caesar tidak boleh muncul dengan dinamis_per_record
  assert.ok(!cellsA.some((cell) => cell.algorithmId === "caesar" && cell.keyModeId === "dinamis_per_record"))
})

test("secure: enkripsi AEAD, deteksi tamper, salin ciphertext, nonce reuse", async () => {
  const key = await createAesKey()
  const { ivB64, cipherB64 } = await encryptAead("RAHASIA|NIM2301", key, { aad: "record:A" })
  assert.equal(await decryptAead(cipherB64, key, { ivB64, aad: "record:A" }), "RAHASIA|NIM2301")

  // AAD berbeda -> gagal
  await assert.rejects(() => decryptAead(cipherB64, key, { ivB64, aad: "record:B" }))

  assert.equal(await tryCopyAttack({ key, plainA: "A", plainB: "B", withAad: false }), 1)
  assert.equal(await tryCopyAttack({ key, plainA: "A", plainB: "B", withAad: true }), 0)

  const reuse = await nonceReuseRevealsRelation({ key, plainA: "RAHASIA-1", plainB: "RAHASIA-2" })
  assert.equal(reuse.relationLeaked, true)
})

test("export: header CSV, codebook, syntax SPSS, dan format angka", () => {
  const rows = [
    {
      run_id: "run-caesar-umum-statis",
      ulangan: 1,
      algoritma: 1,
      tipe_data: 1,
      mode_kunci: 1,
      ukuran_data_byte: 120,
      waktu_enkripsi_ms: 0.031,
      waktu_dekripsi_ms: 0.029,
      ukuran_cipher_byte: 130,
      overhead_persen: 8.33,
      entropi_cipher: 4.15,
      ruang_kunci_bit: 5.17,
      waktu_bruteforce_detik: 36,
      pola_bocor: 1,
      deteksi_manipulasi: 0,
      serangan_salin_berhasil: 1,
      forward_secrecy: 0,
      blast_radius_persen: 100,
      biaya_rotasi_ms: 110,
      panggilan_kms: 2,
      cakupan_persen: 20,
      implementasi_native: 0,
      skor_kerahasiaan: 12.4,
      skor_integritas: 10,
      skor_dampak_bocor: 28,
      skor_performa: 82,
      skor_kompleksitas: 74,
      skor_total: 41.6,
      layak: 0,
    },
  ]
  const csv = buildDatasetCsv(rows)
  const lines = csv.trim().split("\n")
  assert.equal(lines[0], DATASET_COLUMNS.join(","))
  assert.equal(lines.length, 2)
  assert.equal(lines[1].split(",").length, DATASET_COLUMNS.length)

  const codebook = buildCodebookCsv()
  assert.match(codebook, /nama_variabel,label,tipe,skala_ukur,value_labels/)
  assert.match(codebook, /1 'Caesar'/)

  const sps = buildSpssSyntax()
  assert.match(sps, /GET DATA/)
  assert.match(sps, /VALUE LABELS/)
  assert.match(sps, /VARIABLE LEVEL/)

  const meta = JSON.parse(buildMetadataJson({ seed: 2024 }))
  assert.equal(meta.seed, 2024)

  assert.equal(formatCsvNumber(0.031), "0.031")
  assert.equal(formatCsvNumber(null), "")
  assert.match(formatCsvNumber(1.1e77), /^\d+$/)
})

test("runner: jumlah baris, determinisme field non-waktu, dan rentang skor", async () => {
  const options = {
    seed: 2024,
    algorithmIds: ["caesar", "secure-hybrid"],
    dataTypeIds: ["umum"],
    keyModeIds: ["statis"],
    n: 2,
    warmup: 1,
    recordCount: 100,
    sessions: 10,
  }
  const first = await runExperiment(options)
  const second = await runExperiment(options)

  assert.equal(first.rows.length, 4) // 2 sel x n=2
  assert.equal(first.meta.seed, 2024)
  assert.ok(first.meta.environment.timestamp)

  const stableFields = [
    "algoritma",
    "tipe_data",
    "mode_kunci",
    "blast_radius_persen",
    "cakupan_persen",
    "pola_bocor",
    "deteksi_manipulasi",
    "serangan_salin_berhasil",
    "forward_secrecy",
    "implementasi_native",
    "ruang_kunci_bit",
  ]
  first.rows.forEach((row, index) => {
    stableFields.forEach((field) => {
      assert.deepEqual(row[field], second.rows[index][field], `${field}@${index}`)
    })
    assert.ok(row.skor_total >= 0 && row.skor_total <= 100)
    assert.ok([0, 1].includes(row.layak))
  })

  // urutan ulangan harus 1..n per sel
  const firstCell = first.rows.filter((row) => row.run_id === first.rows[0].run_id)
  assert.deepEqual(firstCell.map((row) => row.ulangan), [1, 2])
})

function fakeRun(prefix, count) {
  const rows = Array.from({ length: count }, (_, i) => ({ run_id: `${prefix}-${i + 1}`, ulangan: i + 1 }))
  return createRun({ label: prefix, params: { n: count }, rows, meta: { seed: 2024 } })
}

test("session: createSession, addRun, dan ringkasan", () => {
  let session = createSession("Uji")
  assert.equal(session.name, "Uji")
  assert.equal(session.runs.length, 0)
  assert.equal(sessionSummary(session).runCount, 0)

  session = addRun(session, fakeRun("a", 2))
  session = addRun(session, fakeRun("b", 3))
  const summary = sessionSummary(session)
  assert.equal(summary.runCount, 2)
  assert.equal(summary.selectedCount, 2)
  assert.equal(summary.totalRows, 5)
  assert.equal(summary.selectedRows, 5)

  // run baru tercentang secara default
  assert.equal(session.runs.every((run) => run.selected), true)
  assert.equal(session.runs[0].rowCount, 2)
})

test("session: toggle, setAll, hapus, dan kosongkan run", () => {
  let session = addRun(addRun(createSession(), fakeRun("a", 1)), fakeRun("b", 1))
  const [first, second] = session.runs

  session = toggleRun(session, first.id, false)
  assert.equal(selectedRuns(session).length, 1)
  assert.equal(sessionSummary(session).selectedRows, 1)

  session = setAllRuns(session, true)
  assert.equal(selectedRuns(session).length, 2)

  session = removeRun(session, second.id)
  assert.equal(session.runs.length, 1)
  assert.equal(session.runs[0].id, first.id)

  session = clearRuns(session)
  assert.equal(session.runs.length, 0)
  assert.equal(mergedRows(session).length, 0)
})

test("session: mergedRows tanpa prefiks untuk 1 run, berprefiks untuk >1 run", () => {
  const single = addRun(createSession(), fakeRun("a", 2))
  const singleRows = mergedRows(single)
  assert.equal(singleRows.length, 2)
  assert.equal(singleRows[0].run_id, "a-1")

  const multi = addRun(addRun(createSession(), fakeRun("a", 2)), fakeRun("b", 2))
  const multiRows = mergedRows(multi)
  assert.equal(multiRows.length, 4)
  assert.equal(multiRows[0].run_id, "r1_a-1")
  assert.equal(multiRows[3].run_id, "r2_b-2")
  // id run asli tetap unik setelah diberi prefiks
  assert.equal(new Set(multiRows.map((row) => row.run_id)).size, 4)
})

test("session: mergedRows hanya menyertakan run tercentang", () => {
  let session = addRun(addRun(createSession(), fakeRun("a", 2)), fakeRun("b", 3))
  session = toggleRun(session, session.runs[0].id, false)
  const rows = mergedRows(session)
  assert.equal(rows.length, 3)
  // tinggal 1 run terpilih -> tanpa prefiks
  assert.equal(rows[0].run_id, "b-1")
})

test("session: rename dan slugify", () => {
  const session = renameSession(createSession("lama"), "  Sesi Efek Nonce  ")
  assert.equal(session.name, "Sesi Efek Nonce")
  // nama kosong diabaikan
  assert.equal(renameSession(session, "   ").name, "Sesi Efek Nonce")
  assert.equal(slugify("Sesi Efek Nonce"), "sesi-efek-nonce")
  assert.equal(slugify("###"), "sesi")
})

test("session: serialize -> parse round-trip", () => {
  const session = addRun(createSession("Round Trip"), fakeRun("a", 2))
  const text = serializeSessions([session])
  const restored = parseSessions(text)
  assert.equal(restored.length, 1)
  assert.equal(restored[0].name, "Round Trip")
  assert.equal(restored[0].runs.length, 1)
  assert.equal(restored[0].runs[0].rowCount, 2)
  assert.equal(restored[0].runs[0].selected, true)
  assert.equal(mergedRows(restored[0]).length, 2)
})

test("session: parse menolak berkas tanpa sesi valid", () => {
  assert.throws(() => parseSessions("{bukan json"))
  assert.throws(() => parseSessions(JSON.stringify({ version: 1 })))
  assert.throws(() => parseSessions(JSON.stringify({ sessions: [] })))
  assert.throws(() => parseSessions(JSON.stringify({ sessions: [{ name: "tanpa runs" }] })))
})

test("session: describeCombination merangkum parameter", () => {
  const text = describeCombination({
    algorithmIds: ["caesar", "affine"],
    keyModeIds: ["statis"],
    dataTypeIds: ["umum", "nilai", "keuangan"],
    n: 30,
    noncePolicy: "reuse",
  })
  assert.match(text, /2 alg × 1 mode × 3 tipe/)
  assert.match(text, /n=30/)
  assert.match(text, /nonce reuse/)
})
