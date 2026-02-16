import { encryptAffine, decryptAffine } from "./affine.js"
import { encryptCaesar, decryptCaesar } from "./caesar.js"

export function encryptHybrid(text, a, b, k1, k2) {
  const step1 = encryptAffine(text, a, b)
  const step2 = encryptCaesar(step1, k1)
  const step3 = encryptCaesar(step2, k2)
  return step3
}

export function decryptHybrid(text, a, b, k1, k2) {
  const step1 = decryptCaesar(text, k2)
  const step2 = decryptCaesar(step1, k1)
  const step3 = decryptAffine(step2, a, b)
  return step3
}
