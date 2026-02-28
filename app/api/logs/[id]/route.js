import { getLogsCollection, toObjectId } from "@/lib/mongodb"
export const runtime = "nodejs"

export async function GET(req, { params }) {
  try {
    const { id } = params || {}
    if (!id) {
      return new Response(
        JSON.stringify({ error: "ID log tidak diberikan" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const collection = await getLogsCollection()
    const doc = await collection.findOne({ _id: toObjectId(id) })

    if (!doc) {
      return new Response(
        JSON.stringify({ error: "Log tidak ditemukan" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const log = {
      id: doc._id.toString(),
      plaintext: doc.plaintext,
      ciphertext: doc.ciphertext,
      mode: doc.mode,
      keys: doc.keys || null,
      processType: doc.processType || "encrypt",
      timeMs: doc.timeMs,
      createdAt: doc.createdAt,
      keyMode: doc.keyMode || null,
      textLength: doc.textLength || null,
      source: doc.source || null,
      metrics: doc.metrics || null,
    }

    return Response.json({ log })
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "Gagal mengambil detail log",
        details: e.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
