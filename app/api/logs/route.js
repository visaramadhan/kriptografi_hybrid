import { getLogsCollection } from "@/lib/mongodb"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limitParam = searchParams.get("limit")
    
    let limit = 100
    if (limitParam !== null) {
      const parsed = parseInt(limitParam, 10)
      if (!isNaN(parsed)) {
        limit = parsed
      }
    }
    if (limit > 5000) {
      limit = 5000
    }

    const query = {}
    if (startDate || endDate) {
      let startJsDate = null
      let endJsDate = null

      if (startDate) {
        const d = new Date(startDate)
        if (isNaN(d.getTime())) {
          return new Response(
            JSON.stringify({ error: "Format startDate tidak valid" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          )
        }
        startJsDate = d
      }

      if (endDate) {
        const d = new Date(endDate)
        if (isNaN(d.getTime())) {
          return new Response(
            JSON.stringify({ error: "Format endDate tidak valid" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          )
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          d.setHours(23, 59, 59, 999)
        }
        endJsDate = d
      }

      if (startJsDate && endJsDate && startJsDate > endJsDate) {
        return new Response(
          JSON.stringify({ error: "startDate harus ≤ endDate" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        )
      }

      query.createdAt = {}
      if (startJsDate) query.createdAt.$gte = startJsDate
      if (endJsDate) query.createdAt.$lte = endJsDate
    }

    const collection = await getLogsCollection()
    // If we have a filter, we might want to default to sorted by createdAt descending
    let cursor = collection.find(query).sort({ createdAt: -1 })

    if (limit > 0) {
      cursor = cursor.limit(limit)
    }

    const docs = await cursor.toArray()

    const logs = docs.map((doc) => ({
      id: doc._id.toString(),
      plaintext: doc.plaintext,
      ciphertext: doc.ciphertext,
      mode: doc.mode,
      keys: doc.keys,
      processType: doc.processType || "encrypt",
      timeMs: doc.timeMs,
      createdAt: doc.createdAt,
      keyMode: doc.keyMode || null,
      textLength: doc.textLength || null,
      source: doc.source || null,
    }))

    return Response.json({ logs })
  } catch (e) {
    console.error("GET /api/logs error:", e)
    return new Response(
      JSON.stringify({ error: "Gagal mengambil log", details: e.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
