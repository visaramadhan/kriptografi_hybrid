import { getLogsCollection } from "@/lib/mongodb"

export async function POST(req) {
  try {
    const body = await req.json()
    const {
      type = "analysis",
      text = "",
      mode,
      keyMode,
      keys,
      metrics,
      textLength,
      source,
    } = body || {}

    const baseText = typeof text === "string" ? text : ""
    const normalizedLength =
      typeof textLength === "number"
        ? textLength
        : baseText.replace(/[^A-Za-z]/g, "").length

    const computedMode =
      type === "analysis" ? "analysis" : mode || "unknown"

    const timeFromMetrics =
      metrics &&
      metrics.hybrid &&
      typeof metrics.hybrid.avgTime === "number"
        ? metrics.hybrid.avgTime
        : metrics && typeof metrics.timeMs === "number"
        ? metrics.timeMs
        : null

    const doc = {
      plaintext: baseText,
      ciphertext:
        metrics &&
        metrics.hybrid &&
        typeof metrics.hybrid.cipher === "string"
          ? metrics.hybrid.cipher
          : "",
      mode: computedMode,
      keys: keys || null,
      processType: type,
      timeMs: timeFromMetrics,
      createdAt: new Date(),
      keyMode: keyMode || null,
      textLength: normalizedLength,
      source: source || null,
      metrics: metrics || null,
    }

    const collection = await getLogsCollection()
    const insertResult = await collection.insertOne(doc)

    return Response.json({ ok: true, id: insertResult.insertedId.toString() })
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Gagal menyimpan hasil pengujian",
        details: e.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

