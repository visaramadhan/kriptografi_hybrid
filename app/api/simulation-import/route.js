export const runtime = "nodejs"

export async function POST(req) {
  try {
    const body = await req.json()
    const { datasetName, category, rows = [] } = body || {}

    let saved = 0
    if (process.env.MONGODB_URI) {
      try {
        const { MongoClient } = await import("mongodb")
        const client = new MongoClient(process.env.MONGODB_URI)
        await client.connect()
        const db = client.db(process.env.MONGODB_DB_NAME || "kriptografi_hybrid")
        const collection = db.collection("simulation_imports")
        const result = await collection.insertOne({
          datasetName: String(datasetName || "dataset-import"),
          category: String(category || "Data Akademik"),
          rows: Array.isArray(rows) ? rows : [],
          createdAt: new Date(),
        })
        saved = result.insertedId ? rows.length : 0
        await client.close()
      } catch (mongoError) {
        console.error("Mongo simulation import gagal", mongoError)
      }
    }

    return Response.json({
      ok: true,
      saved,
      category: category || "Data Akademik",
      rows: Array.isArray(rows) ? rows.length : 0,
      note: process.env.MONGODB_URI ? "Data tersimpan ke MongoDB bila koneksi tersedia." : "Database belum dikonfigurasi; import diproses di memory browser.",
    })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "Gagal memproses import dataset",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
