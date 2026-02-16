import { getLogsCollection, toObjectId } from "@/lib/mongodb"

export async function GET(req, { params }) {
  try {
    const collection = await getLogsCollection()
    const doc = await collection.findOne({ _id: toObjectId(params.id) })

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
      keys: doc.keys,
      processType: doc.processType,
      timeMs: doc.timeMs,
      createdAt: doc.createdAt,
    }

    return Response.json({ log })
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

