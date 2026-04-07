import { getServerRsaKeypair } from "@/lib/secureKeypair"

export const runtime = "nodejs"

export async function GET() {
  const { spkiDerB64, fingerprintHex } = getServerRsaKeypair()
  return Response.json({
    spkiDerB64,
    fingerprintHex,
    algorithm: "RSA-OAEP-SHA256",
  })
}

