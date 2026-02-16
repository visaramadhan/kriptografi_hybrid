export function encryptCaesar(text, key) {
  return text
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0) - 65
      const encrypted = (code + key) % 26
      return String.fromCharCode(encrypted + 65)
    })
    .join("")
}

export function decryptCaesar(text, key) {
  return text
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0) - 65
      const decrypted = (code - key + 26) % 26
      return String.fromCharCode(decrypted + 65)
    })
    .join("")
}

