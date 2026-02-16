import { MongoClient, ObjectId } from "mongodb"

const uri = process.env.MONGODB_URI

let clientPromise = null

async function getClient() {
  if (!uri) {
    throw new Error("MONGODB_URI tidak dikonfigurasi")
  }

  if (!clientPromise) {
    const client = new MongoClient(uri)
    clientPromise = client.connect()
  }

  return clientPromise
}

export async function getLogsCollection() {
  const client = await getClient()
  const db = client.db("kriptografi_hybrid")
  return db.collection("logs")
}

export function toObjectId(id) {
  return new ObjectId(id)
}

