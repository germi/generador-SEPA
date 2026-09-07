// The SEPA XML "Latin character set" used by Spanish banks (Iberpay/AEB rulebook) is
// stricter than plain UTF-8. This sanitizes free-text fields (names, remittance info)
// so the generated file isn't rejected by the bank's validator.

const ACCENT_MAP = {
  à: 'a', è: 'e', ì: 'i', ò: 'o', ù: 'u',
  ê: 'e', î: 'i', ô: 'o', û: 'u', â: 'a',
  ë: 'e', ï: 'i', ö: 'o', ã: 'a', õ: 'o',
}

// Explicitly allowed characters per the Spanish SEPA rulebook "Latin character set":
// letters, digits, space, and: / - ? : ( ) . , ' +
// plus the Spanish-specific extras most banks accept: á é í ó ú ü ñ ç (and uppercase).
const ALLOWED = /[^A-Za-z0-9ÁÉÍÓÚÜÑÇáéíóúüñç/\-?:().,'+ ]/g

export function sanitizeSepaText(input, maxLength = 140) {
  if (!input) return ''
  let text = String(input).normalize('NFC')

  // Fold accents that aren't in the explicitly-allowed Spanish set (e.g. à, ê) to plain ASCII.
  text = text.replace(/[àèìòùêîôûâëïöãõÀÈÌÒÙÊÎÔÛÂËÏÖÃÕ]/g, (ch) => {
    const lower = ACCENT_MAP[ch.toLowerCase()]
    if (!lower) return ch
    return ch === ch.toUpperCase() ? lower.toUpperCase() : lower
  })

  text = text.replace(ALLOWED, ' ')
  text = text.replace(/\s+/g, ' ').trim()

  if (text.length > maxLength) text = text.slice(0, maxLength).trim()
  return text
}

export function escapeXml(input) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
