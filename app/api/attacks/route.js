import { getAttacksCollection } from "@/lib/mongodb"
export const runtime = "nodejs"

export async function GET() {
  try {
    const collection = await getAttacksCollection()
    const docs = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray()

    const attacks = docs.map((doc) => ({
      id: doc._id.toString(),
      algorithm: doc.algorithm,
      ciphertextLength: doc.ciphertextLength,
      totalTried: doc.totalTried,
      attackTime: doc.attackTime,
      trueFoundInSearch: doc.trueFoundInSearch,
      trueRank: doc.trueRank,
      createdAt: doc.createdAt,
    }))

    return Response.json({ attacks })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Gagal mengambil riwayat attacker", details: e.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const {
      algorithm,
      ciphertextLength,
      totalTried,
      attackTime,
      trueFoundInSearch,
      trueRank,
    } = body || {}

    if (!algorithm) {
      return new Response(
        JSON.stringify({ error: "Algoritma wajib diisi untuk mencatat serangan" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    const doc = {
      algorithm,
      ciphertextLength: typeof ciphertextLength === "number" ? ciphertextLength : null,
      totalTried: typeof totalTried === "number" ? totalTried : null,
      attackTime: typeof attackTime === "number" ? attackTime : null,
      trueFoundInSearch:
        typeof trueFoundInSearch === "boolean" ? trueFoundInSearch : null,
      trueRank: typeof trueRank === "number" ? trueRank : null,
      createdAt: new Date(),
    }

    const collection = await getAttacksCollection()
    const result = await collection.insertOne(doc)

    return Response.json({ id: result.insertedId.toString() })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Gagal menyimpan riwayat attacker", details: e.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
