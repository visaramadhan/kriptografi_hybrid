import { encryptCaesar } from "@/lib/caesar"
import { encryptAffine } from "@/lib/affine"
import { encryptHybrid } from "@/lib/hybrid"
import { getLogsCollection } from "@/lib/mongodb"
export const runtime = "nodejs"

const invertibleAValues = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]

function normalizeKeyMode(keyMode) {
  if (typeof keyMode !== "string") return ""
  return keyMode.trim().toLowerCase()
}

function isPresentNumber(v) {
  return typeof v === "number" && Number.isFinite(v)
}

function generateKeys(keyMode) {
  const km = normalizeKeyMode(keyMode)
  if (km.includes("timestamp")) {
    const now = Date.now()
    const a = invertibleAValues[now % invertibleAValues.length]
    const b = now % 26
    const k1 = (now >> 3) % 26
    const k2 = (now >> 5) % 26
    return { a, b, k1, k2 }
  }

  const a = invertibleAValues[Math.floor(Math.random() * invertibleAValues.length)]
  const b = Math.floor(Math.random() * 26)
  const k1 = 1 + Math.floor(Math.random() * 25)
  const k2 = 1 + Math.floor(Math.random() * 25)
  return { a, b, k1, k2 }
}

export async function POST(req) {
  const body = await req.json()
  const {
    text,
    mode = "hybrid",
    a,
    b,
    k1,
    k2,
    keyMode,
    source,
    sessionId,
  } = body

  const km = normalizeKeyMode(keyMode)
  const needsKeyGen =
    (km && km !== "manual" && km !== "static" && km !== "fixed" && km !== "tetap") ||
    !isPresentNumber(a) ||
    !isPresentNumber(b) ||
    !isPresentNumber(k1) ||
    !isPresentNumber(k2)

  const keysUsed = needsKeyGen ? generateKeys(km) : { a, b, k1, k2 }

  const start = Date.now()

  let result = ""
  if (mode === "caesar") {
    result = encryptCaesar(text, keysUsed.k1)
  } else if (mode === "double-caesar") {
    const step1 = encryptCaesar(text, keysUsed.k1)
    result = encryptCaesar(step1, keysUsed.k2)
  } else if (mode === "affine") {
    result = encryptAffine(text, keysUsed.a, keysUsed.b)
  } else {
    result = encryptHybrid(text, keysUsed.a, keysUsed.b, keysUsed.k1, keysUsed.k2)
  }

  const end = Date.now()
  const timeMs = end - start

  let logId = null
  try {
    const collection = await getLogsCollection()
    const dataSizeBytes = typeof text === "string" ? Buffer.byteLength(text, "utf8") : null
    const doc = {
      plaintext: text,
      ciphertext: result,
      mode,
      keys: keysUsed,
      processType: "encrypt",
      timeMs,
      keyMode: keyMode || null,
      textLength: typeof text === "string" ? text.replace(/[^A-Za-z]/g, "").length : null,
      dataSizeBytes,
      dataSizeKb: typeof dataSizeBytes === "number" ? dataSizeBytes / 1024 : null,
      source: source || "dashboard",
      createdAt: new Date(),
      sessionId: typeof sessionId === "string" ? sessionId : null,
    }
    const insertResult = await collection.insertOne(doc)
    logId = insertResult.insertedId.toString()
  } catch (e) {
  }

  return Response.json({ result, timeMs, logId, keys: keysUsed })
}
