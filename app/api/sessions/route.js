import { getSessionsCollection } from "@/lib/mongodb"
export const runtime = "nodejs"

export async function GET() {
  try {
    const col = await getSessionsCollection()
    const docs = await col.find({}).sort({ createdAt: -1 }).limit(200).toArray()
    const sessions = docs.map((d) => ({
      id: d._id.toString(),
      number: d.number,
      algorithm: d.algorithm,
      keyMode: d.keyMode,
      textLength: d.textLength,
      runCount: d.runCount,
      testType: d.testType,
      group: d.group || null,
      groupNo: typeof d.groupNo === "number" ? d.groupNo : null,
      createdAt: d.createdAt,
    }))
    return Response.json({ sessions })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Gagal mengambil sesi", details: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { algorithm, keyMode, textLength, runCount, testType, group, groupNo } = body || {}

    const col = await getSessionsCollection()
    const last = await col.find({}).project({ number: 1 }).sort({ number: -1 }).limit(1).toArray()
    const nextNumber = last.length > 0 && typeof last[0].number === "number" ? last[0].number + 1 : 1

    const doc = {
      number: nextNumber,
      algorithm: algorithm || null,
      keyMode: keyMode || null,
      textLength: typeof textLength === "number" ? textLength : null,
      runCount: typeof runCount === "number" ? runCount : null,
      testType: testType || null,
      group: typeof group === "string" && group ? group : null,
      groupNo: typeof groupNo === "number" ? groupNo : null,
      createdAt: new Date(),
    }
    const res = await col.insertOne(doc)
    return Response.json({
      id: res.insertedId.toString(),
      number: doc.number,
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Gagal membuat sesi", details: e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}
