import { encryptCaesar } from "@/lib/caesar"
import { encryptAffine } from "@/lib/affine"
import { encryptHybrid } from "@/lib/hybrid"
import { getLogsCollection } from "@/lib/mongodb"

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
  } = body

  const start = Date.now()

  let result = ""
  if (mode === "caesar") {
    result = encryptCaesar(text, k1)
  } else if (mode === "double-caesar") {
    const step1 = encryptCaesar(text, k1)
    result = encryptCaesar(step1, k2)
  } else if (mode === "affine") {
    result = encryptAffine(text, a, b)
  } else {
    result = encryptHybrid(text, a, b, k1, k2)
  }

  const end = Date.now()
  const timeMs = end - start

  let logId = null
  try {
    const collection = await getLogsCollection()
    const doc = {
      plaintext: text,
      ciphertext: result,
      mode,
      keys: { a, b, k1, k2 },
      processType: "encrypt",
      timeMs,
      keyMode: keyMode || null,
      textLength: typeof text === "string" ? text.replace(/[^A-Za-z]/g, "").length : null,
      source: source || "dashboard",
      createdAt: new Date(),
    }
    const insertResult = await collection.insertOne(doc)
    logId = insertResult.insertedId.toString()
  } catch (e) {
  }

  return Response.json({ result, timeMs, logId })
}
