import { decryptHybrid } from "@/lib/hybrid"
import { decryptCaesar } from "@/lib/caesar"
import { decryptAffine } from "@/lib/affine"
import { getLogsCollection } from "@/lib/mongodb"

export const runtime = "nodejs"

export async function POST(req) {
  const body = await req.json()
  const { text, mode = "hybrid", a, b, k1, k2, keyMode, source, sessionId } = body || {}

  const start = Date.now()
  let result = ""
  if (mode === "caesar") {
    result = decryptCaesar(text, k1)
  } else if (mode === "double-caesar") {
    const step1 = decryptCaesar(text, k2)
    result = decryptCaesar(step1, k1)
  } else if (mode === "affine") {
    result = decryptAffine(text, a, b)
  } else {
    result = decryptHybrid(text, a, b, k1, k2)
  }
  const end = Date.now()
  const timeMs = end - start

  let logId = null
  try {
    const collection = await getLogsCollection()
    const dataSizeBytes = typeof result === "string" ? Buffer.byteLength(result, "utf8") : null
    const doc = {
      plaintext: result,
      ciphertext: text,
      mode,
      keys: { a, b, k1, k2 },
      processType: "decrypt",
      timeMs,
      keyMode: keyMode || null,
      textLength: typeof result === "string" ? result.replace(/[^A-Za-z]/g, "").length : null,
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

  return Response.json({ result, timeMs, logId })
}
