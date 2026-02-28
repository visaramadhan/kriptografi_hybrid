import { MongoClient, ObjectId } from "mongodb"

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB_NAME || "kriptografi_hybrid"

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
  const db = client.db(dbName)
  return db.collection("logs")
}

export async function getAttacksCollection() {
  const client = await getClient()
  const db = client.db(dbName)
  return db.collection("attacks")
}

export function toObjectId(id) {
  return new ObjectId(id)
}
