import * as XLSX from 'xlsx'
import { validateIban, cleanIban } from './iban.js'

function normalizeHeader(h) {
  return String(h ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents (after NFD normalization)
    .trim()
    .toUpperCase()
}

const HEADER_ALIASES = {
  CURS: ['CURS', 'CLASSE'],
  INFANT: ['INFANT', 'ALUMNE', 'ALUMNE/A', 'NOM ALUMNE'],
  TITULAR: ['TITULAR', 'NOM TITULAR', 'TITULAR DEL COMPTE'],
  IBAN: ['IBAN'],
  DNI: ['DNI', 'DNI/NIE', 'NIF'],
  MANDAT: ['REFERENCIA MANDAT', 'REF MANDAT', 'REFERENCIA DEL MANDAT', 'MANDAT'],
  DATA_SIGNATURA: [
    'DATA SIGNATURA MANDAT',
    'DATA DE SIGNATURA DEL MANDAT',
    'DATA DE SIGNATURA',
    'DATA SIGNATURA',
    'DATA MANDAT',
  ],
}

function findColumnIndex(headerRow, keys) {
  const normalized = headerRow.map(normalizeHeader)
  for (const key of keys) {
    const idx = normalized.indexOf(key)
    if (idx !== -1) return idx
  }
  return -1
}

function cell(row, idx) {
  if (idx === -1 || idx == null) return ''
  const v = row[idx]
  return v == null ? '' : String(v).trim()
}

// Normalizes a date cell (which may arrive as 'DD/MM/YYYY', 'YYYY-MM-DD', or
// other locale text since the sheet is read with raw: false) into the
// 'YYYY-MM-DD' shape used by <input type="date">. Returns '' if unparseable.
function normalizeDateCell(raw) {
  const v = String(raw ?? '').trim()
  if (!v) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v

  const dmy = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (dmy) {
    const [, d, mo, y] = dmy
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  const parsed = new Date(v)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const mo = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${mo}-${d}`
  }

  return ''
}

/**
 * Groups raw spreadsheet rows into families.
 *
 * Two conventions are both supported, and can be mixed in the same file:
 *  1. "Merged cell" style: only the first row of a family has TITULAR/IBAN/
 *     REFERÈNCIA MANDAT filled in; sibling rows below leave those blank and
 *     just carry another INFANT name — they're attached to the family above.
 *  2. "Repeated IBAN" style: every child's row has TITULAR/IBAN filled in
 *     independently. These get merged together in a second pass, below,
 *     whenever two groups share the same IBAN.
 */
function groupRowsIntoFamilies(rows, col) {
  const families = []
  let current = null

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    const rowNumber = r + 1 // 1-based, matches Excel row numbers
    const infant = cell(row, col.infant)
    const titular = cell(row, col.titular)
    const iban = cell(row, col.iban)
    const dni = cell(row, col.dni)
    const mandat = cell(row, col.mandat)
    const curs = cell(row, col.curs)
    const mandateSignatureDate = normalizeDateCell(cell(row, col.dataSignatura))

    // Skip fully blank rows.
    if (!infant && !titular && !iban && !mandat) continue

    const startsNewFamily = Boolean(mandat) || Boolean(titular)

    if (startsNewFamily) {
      current = {
        id: mandat || `SENSE-REF-${rowNumber}`,
        titular,
        iban,
        dni,
        mandateRef: mandat,
        mandateSignatureDate,
        children: [],
        sourceRows: [],
        rowWarnings: [],
      }
      families.push(current)
    }

    if (!current) {
      // Row with only an infant name and no family context yet — start an orphan group.
      current = {
        id: `SENSE-REF-${rowNumber}`,
        titular: '',
        iban: '',
        dni: '',
        mandateRef: '',
        mandateSignatureDate: '',
        children: [],
        sourceRows: [],
        rowWarnings: [],
      }
      families.push(current)
    }

    if (!current.mandateSignatureDate && mandateSignatureDate) {
      current.mandateSignatureDate = mandateSignatureDate
    }

    if (infant) current.children.push({ name: infant, curs })
    current.sourceRows.push(rowNumber)
  }

  return families
}

/**
 * Merges family groups that share the same IBAN into one — covers the case
 * where a family's IBAN was typed on every child's row instead of left blank.
 */
function mergeFamiliesBySharedIban(families) {
  const byIban = new Map()
  const merged = []

  for (const fam of families) {
    const key = fam.iban ? cleanIban(fam.iban) : ''
    if (!key) {
      merged.push(fam)
      continue
    }

    const existing = byIban.get(key)
    if (!existing) {
      byIban.set(key, fam)
      merged.push(fam)
      continue
    }

    // Same IBAN as an earlier group — treat as the same family.
    existing.children.push(...fam.children)
    existing.sourceRows.push(...fam.sourceRows)
    if (!existing.titular && fam.titular) existing.titular = fam.titular
    if (!existing.dni && fam.dni) existing.dni = fam.dni
    if (!existing.mandateSignatureDate && fam.mandateSignatureDate) {
      existing.mandateSignatureDate = fam.mandateSignatureDate
    }

    if (!existing.mandateRef && fam.mandateRef) {
      existing.mandateRef = fam.mandateRef
      existing.id = existing.mandateRef
    } else if (existing.mandateRef && fam.mandateRef && existing.mandateRef !== fam.mandateRef) {
      existing.rowWarnings.push(
        `Aquest IBAN també apareix amb la referència de mandat "${fam.mandateRef}" (fila ${fam.sourceRows[0]}) — revisa si és la mateixa família.`,
      )
    }

    for (const w of fam.rowWarnings) {
      if (!existing.rowWarnings.includes(w)) existing.rowWarnings.push(w)
    }
  }

  return merged
}

/**
 * Reads an .xlsx File and returns { families, warnings, sheetNames, usedSheet }
 * families: [{ id, titular, iban, dni, mandateRef, children: [{name, curs}], sourceRows: [rowNumber,...] }]
 *
 * The workbook doesn't need to follow a fixed layout: it looks for a sheet
 * literally named "SEPA" (falling back to the first sheet if none matches),
 * then locates each column by its header text rather than by position — so
 * columns can be reordered as long as the header names stay recognisable.
 */
export async function parseSepaWorkbook(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })

  const sheetName = wb.SheetNames.find((n) => normalizeHeader(n) === 'SEPA') || wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })

  if (!rows.length) {
    return { families: [], warnings: ['El full de càlcul està buit.'], sheetNames: wb.SheetNames, usedSheet: sheetName }
  }

  const headerRow = rows[0]
  const col = {
    curs: findColumnIndex(headerRow, HEADER_ALIASES.CURS),
    infant: findColumnIndex(headerRow, HEADER_ALIASES.INFANT),
    titular: findColumnIndex(headerRow, HEADER_ALIASES.TITULAR),
    iban: findColumnIndex(headerRow, HEADER_ALIASES.IBAN),
    dni: findColumnIndex(headerRow, HEADER_ALIASES.DNI),
    mandat: findColumnIndex(headerRow, HEADER_ALIASES.MANDAT),
    dataSignatura: findColumnIndex(headerRow, HEADER_ALIASES.DATA_SIGNATURA),
  }

  const warnings = []
  if (col.infant === -1) warnings.push('No s’ha trobat la columna "INFANT".')
  if (col.titular === -1) warnings.push('No s’ha trobat la columna "TITULAR".')
  if (col.iban === -1) warnings.push('No s’ha trobat la columna "IBAN".')
  if (col.mandat === -1) warnings.push('No s’ha trobat la columna "REFERÈNCIA MANDAT".')

  const rawFamilies = groupRowsIntoFamilies(rows, col)
  const families = mergeFamiliesBySharedIban(rawFamilies)

  // Cross-family validation: same mandate reference used by two different IBANs.
  const seenMandates = new Map()
  for (const fam of families) {
    if (fam.mandateRef) {
      const firstRow = fam.sourceRows[0]
      if (seenMandates.has(fam.mandateRef)) {
        fam.rowWarnings.push(`Referència de mandat "${fam.mandateRef}" duplicada (també a la fila ${seenMandates.get(fam.mandateRef)}).`)
      } else {
        seenMandates.set(fam.mandateRef, firstRow)
      }
    }
  }

  // Per-family validation.
  for (const fam of families) {
    if (!fam.mandateRef) fam.rowWarnings.push('Falta la referència del mandat SEPA.')
    if (!fam.iban) {
      fam.rowWarnings.push('Falta l’IBAN.')
    } else {
      const check = validateIban(fam.iban)
      if (!check.valid) fam.rowWarnings.push(`IBAN invàlid: ${check.reason}.`)
    }
    if (!fam.titular) fam.rowWarnings.push('Falta el nom del titular.')
  }

  return { families, warnings, sheetNames: wb.SheetNames, usedSheet: sheetName }
}
