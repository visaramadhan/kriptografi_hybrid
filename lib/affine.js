function modInverse(a, m) {
  for (let x = 1; x < m; x++) {
    if ((a * x) % m === 1) return x
  }
  return null
}

export function encryptAffine(text, a, b) {
  return text
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0) - 65
      const encrypted = (a * code + b) % 26
      return String.fromCharCode(encrypted + 65)
    })
    .join("")
}

export function decryptAffine(text, a, b) {
  const a_inv = modInverse(a, 26)
  if (!a_inv) throw new Error("a tidak memiliki invers modular")

  return text
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0) - 65
      const decrypted = (a_inv * (code - b + 26)) % 26
      return String.fromCharCode(decrypted + 65)
    })
    .join("")
}

