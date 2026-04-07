import { getLogsCollection } from "@/lib/mongodb"

export const runtime = "nodejs"

function asNumber(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

export async function POST(req) {
  try {
    const body = await req.json()
    const {
      ciphertextB64 = "",
      tagB64 = "",
      timeMs,
      mode,
      metrics,
      keyMode,
      sessionId,
      textLength,
      source,
    } = body || {}

    const doc = {
      plaintext: "",
      ciphertext: `${ciphertextB64}:${tagB64}`,
      mode: typeof mode === "string" && mode ? mode : "secure-hybrid",
      keys: null,
      processType: "encrypt",
      timeMs: asNumber(timeMs),
      keyMode: typeof keyMode === "string" ? keyMode : null,
      textLength: asNumber(textLength),
      source: typeof source === "string" ? source : "secure-client",
      metrics: metrics && typeof metrics === "object" ? metrics : null,
      createdAt: new Date(),
      sessionId: typeof sessionId === "string" ? sessionId : null,
    }

    const collection = await getLogsCollection()
    const res = await collection.insertOne(doc)
    return Response.json({ ok: true, id: res.insertedId.toString() })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Gagal menyimpan log enkripsi secure", details: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
