import { getLogsCollection } from "@/lib/mongodb"

export async function GET() {
  try {
    const collection = await getLogsCollection()
    const docs = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

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
