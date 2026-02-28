export const runtime = "nodejs"

export async function GET() {
  try {
    const hasUri = typeof process.env.MONGODB_URI === "string" && process.env.MONGODB_URI.length > 0
    const dbName = process.env.MONGODB_DB_NAME || "kriptografi_hybrid"
    let canConnect = false
    let reason = null

    if (!hasUri) {
      return Response.json({ ok: false, hasUri: false, canConnect: false, dbName, reason: "MONGODB_URI missing" }, { status: 200 })
    }

    // Import on-demand to avoid overhead if URI missing
    const { getLogsCollection } = await import("@/lib/mongodb")
    try {
      const col = await getLogsCollection()
      // Small no-op query to assert connectivity
      await col.find({}).limit(1).toArray()
      canConnect = true
    } catch (e) {
      reason = e.message
    }

    return Response.json({ ok: canConnect, hasUri, canConnect, dbName, reason: canConnect ? null : reason })
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: "health_check_failed", details: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
