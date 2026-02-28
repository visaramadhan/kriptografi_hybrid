import { getLogsCollection } from "@/lib/mongodb"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limitParam = searchParams.get("limit")
    
    let limit = 100
    if (limitParam !== null) {
      const parsed = parseInt(limitParam)
      if (!isNaN(parsed)) {
        limit = parsed
      }
    }

    const query = {}
    if (startDate || endDate) {
      query.createdAt = {}
      if (startDate) {
        query.createdAt.$gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        // Set to end of day if only date is provided
        if (endDate.length <= 10) {
           end.setHours(23, 59, 59, 999)
        }
        query.createdAt.$lte = end
      }
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
    return new Response(
      JSON.stringify({ error: "Gagal mengambil log", details: e.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
