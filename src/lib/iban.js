// IBAN validation (ISO 7064 mod-97-10 checksum) — generic, works for any SEPA country.

const IBAN_LENGTHS = {
  ES: 24, FR: 27, DE: 22, IT: 27, PT: 25, NL: 18, BE: 16, GB: 22,
  IE: 22, LU: 20, AT: 20, FI: 18, GR: 27, LT: 20, LV: 21, EE: 20,
  SK: 24, SI: 19, CY: 28, MT: 31, AD: 24, MC: 27, SM: 27,
}

export function cleanIban(raw) {
  return String(raw || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

export function formatIban(raw) {
  const clean = cleanIban(raw)
  return clean.replace(/(.{4})/g, '$1 ').trim()
}

function mod97(numericString) {
  let remainder = numericString
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9)
    remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(block.length)
  }
  return parseInt(remainder, 10) % 97
}

/**
 * Validates an IBAN checksum + basic country length.
 * Returns { valid: boolean, reason?: string }
 */
export function validateIban(raw) {
  const iban = cleanIban(raw)

  if (!iban) return { valid: false, reason: 'IBAN buit' }
  if (!/^[A-Z]{2}[0-9A-Z]+$/.test(iban)) return { valid: false, reason: 'Format d’IBAN incorrecte' }

  const country = iban.slice(0, 2)
  const expectedLength = IBAN_LENGTHS[country]
  if (expectedLength && iban.length !== expectedLength) {
    return { valid: false, reason: `Un IBAN ${country} ha de tenir ${expectedLength} caràcters (en té ${iban.length})` }
  }
  if (!expectedLength && (iban.length < 15 || iban.length > 34)) {
    return { valid: false, reason: 'Longitud d’IBAN invàlida' }
  }

  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numeric = rearranged
    .split('')
    .map((ch) => (/[0-9]/.test(ch) ? ch : (ch.charCodeAt(0) - 55).toString()))
    .join('')

  const valid = mod97(numeric) === 1
  return valid ? { valid: true } : { valid: false, reason: 'Dígits de control de l’IBAN incorrectes' }
}
