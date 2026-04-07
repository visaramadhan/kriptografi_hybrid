import { getLogsCollection, getSessionsCollection, toObjectId } from "@/lib/mongodb"

export const runtime = "nodejs"

function asNumber(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function normalizeKeyMode(keyMode) {
  if (typeof keyMode !== "string") return ""
  return keyMode.trim().toLowerCase()
}

function keyCategoryFromKeyMode(keyMode) {
  const km = normalizeKeyMode(keyMode)
  if (!km) return null
  if (km.includes("manual") || km.includes("static") || km.includes("fixed") || km.includes("tetap")) {
    return "static"
  }
  if (
    km.includes("random") ||
    km.includes("timestamp") ||
    km.includes("rotate") ||
    km.includes("rotating") ||
    km.includes("dinamis") ||
    km.includes("per-request") ||
    km.includes("per request")
  ) {
    return "rotating"
  }
  return "rotating"
}

function bucketKbFromTextLength(textLength) {
  const len = asNumber(textLength)
  if (!len || len <= 0) return null
  const kb = len / 1024
  if (kb <= 30) return 10
  if (kb <= 75) return 50
  return 100
}

function bucketKbFromDataSizeKb(sizeKb) {
  const kb = asNumber(sizeKb)
  if (!kb || kb <= 0) return null
  if (kb <= 30) return 10
  if (kb <= 75) return 50
  return 100
}

function mean(values) {
  if (!values.length) return null
  let sum = 0
  for (const v of values) sum += v
  return sum / values.length
}

function ensureCell(table, bucketKb) {
  if (!table[bucketKb]) {
    table[bucketKb] = { static: [], rotating: [] }
  }
  return table[bucketKb]
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionIdParam = searchParams.get("sessionId")

    let sessionId = typeof sessionIdParam === "string" && sessionIdParam ? sessionIdParam : null
    let sessionNumber = null
    let sessionMeta = null

    if (!sessionId) {
      const sc = await getSessionsCollection()
      const latest = await sc.find({}).sort({ createdAt: -1 }).limit(1).toArray()
      if (latest.length) {
        sessionId = latest[0]._id.toString()
        sessionNumber = typeof latest[0].number === "number" ? latest[0].number : null
        sessionMeta = {
          algorithm: latest[0].algorithm || null,
          keyMode: latest[0].keyMode || null,
          testType: latest[0].testType || null,
          group: latest[0].group || null,
          groupNo: typeof latest[0].groupNo === "number" ? latest[0].groupNo : null,
          createdAt: latest[0].createdAt || null,
        }
      }
    } else {
      const sc = await getSessionsCollection()
      let found = null
      try {
        found = await sc.findOne(
          { _id: toObjectId(sessionId) },
          { projection: { number: 1, algorithm: 1, keyMode: 1, testType: 1, group: 1, groupNo: 1, createdAt: 1 } },
        )
      } catch {
        found = null
      }
      sessionNumber = found && typeof found.number === "number" ? found.number : null
      sessionMeta = found
        ? {
            algorithm: found.algorithm || null,
            keyMode: found.keyMode || null,
            testType: found.testType || null,
            group: found.group || null,
            groupNo: typeof found.groupNo === "number" ? found.groupNo : null,
            createdAt: found.createdAt || null,
          }
        : null
    }

    const lc = await getLogsCollection()
    const query = {
      timeMs: { $type: "number" },
      processType: { $in: ["encrypt", "decrypt"] },
    }
    if (sessionId) query.sessionId = sessionId

    const docs = await lc
      .find(query)
      .project({
        timeMs: 1,
        processType: 1,
        keyMode: 1,
        textLength: 1,
        dataSizeKb: 1,
        mode: 1,
        createdAt: 1,
        plaintext: 1,
        ciphertext: 1,
      })
      .sort({ createdAt: -1 })
      .limit(5000)
      .toArray()

    const buckets = [10, 50, 100]
    const encrypt = {}
    const decrypt = {}
    for (const b of buckets) {
      encrypt[b] = { static: [], rotating: [] }
      decrypt[b] = { static: [], rotating: [] }
    }

    const matchedDocs = docs.length
    const lastDocAt = docs.length && docs[0].createdAt ? docs[0].createdAt : null

    let lastLogAt = null
    let total = 0
    for (const d of docs) {
      const t = asNumber(d.timeMs)
      if (t == null) continue
      const cat = keyCategoryFromKeyMode(d.keyMode)
      if (!cat) continue

      const dataBucket = bucketKbFromDataSizeKb(d.dataSizeKb)
      const derivedLength =
        typeof d.textLength === "number" && Number.isFinite(d.textLength)
          ? d.textLength
          : typeof d.plaintext === "string"
          ? d.plaintext.replace(/[^A-Za-z]/g, "").length
          : typeof d.ciphertext === "string"
          ? d.ciphertext.replace(/[^A-Za-z]/g, "").length
          : null
      const bucket = dataBucket || bucketKbFromTextLength(derivedLength)
      if (!bucket) continue
      if (!buckets.includes(bucket)) continue

      const pt = typeof d.processType === "string" ? d.processType : ""
      if (pt === "encrypt") {
        ensureCell(encrypt, bucket)[cat].push(t)
      } else if (pt === "decrypt") {
        ensureCell(decrypt, bucket)[cat].push(t)
      } else {
        continue
      }

      total += 1
      if (!lastLogAt && d.createdAt) {
        lastLogAt = d.createdAt
      }
    }

    const encryptAvgMs = {}
    const decryptAvgMs = {}
    const throughputKbps = {}
    for (const b of buckets) {
      encryptAvgMs[b] = {
        static: mean(encrypt[b].static),
        rotating: mean(encrypt[b].rotating),
        nStatic: encrypt[b].static.length,
        nRotating: encrypt[b].rotating.length,
      }
      decryptAvgMs[b] = {
        static: mean(decrypt[b].static),
        rotating: mean(decrypt[b].rotating),
        nStatic: decrypt[b].static.length,
        nRotating: decrypt[b].rotating.length,
      }

      const calcThroughput = (avgMs) => {
        if (avgMs == null || avgMs <= 0) return null
        const sec = avgMs / 1000
        return b / sec
      }
      throughputKbps[b] = {
        static: calcThroughput(encryptAvgMs[b].static),
        rotating: calcThroughput(encryptAvgMs[b].rotating),
      }
    }

    const overall = {
      encryptMs: { static: [], rotating: [] },
      decryptMs: { static: [], rotating: [] },
    }
    for (const b of buckets) {
      if (encrypt[b].static.length) overall.encryptMs.static.push(...encrypt[b].static)
      if (encrypt[b].rotating.length) overall.encryptMs.rotating.push(...encrypt[b].rotating)
      if (decrypt[b].static.length) overall.decryptMs.static.push(...decrypt[b].static)
      if (decrypt[b].rotating.length) overall.decryptMs.rotating.push(...decrypt[b].rotating)
    }

    const overallSummary = {
      encryptMs: {
        static: mean(overall.encryptMs.static),
        rotating: mean(overall.encryptMs.rotating),
      },
      decryptMs: {
        static: mean(overall.decryptMs.static),
        rotating: mean(overall.decryptMs.rotating),
      },
    }

    return Response.json({
      sessionId,
      sessionNumber,
      sessionMeta,
      bucketsKb: buckets,
      encryptAvgMs,
      decryptAvgMs,
      throughputKbps,
      overallSummary,
      lastLogAt,
      totalRows: total,
      matchedDocs,
      lastDocAt,
      keyModeMapping: {
        static: ["manual", "static", "fixed", "tetap"],
        rotating: ["random", "timestamp", "rotating", "dinamis", "per-request"],
      },
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Gagal membuat ringkasan real-time", details: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
