import { decryptHybrid } from "@/lib/hybrid"
import { decryptCaesar } from "@/lib/caesar"
import { decryptAffine } from "@/lib/affine"

export async function POST(req) {
  const { text, mode = "hybrid", a, b, k1, k2 } = await req.json()

  const start = Date.now()
  let result = ""
  if (mode === "caesar") {
    result = decryptCaesar(text, k1)
  } else if (mode === "double-caesar") {
    const step1 = decryptCaesar(text, k2)
    result = decryptCaesar(step1, k1)
  } else if (mode === "affine") {
    result = decryptAffine(text, a, b)
  } else {
    result = decryptHybrid(text, a, b, k1, k2)
  }
  const end = Date.now()

  return Response.json({ result, timeMs: end - start })
}
