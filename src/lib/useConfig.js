import { reactive } from 'vue'

/**
 * School-year label for a given date: from 1 September of year X to 31 August of
 * year X+1 is course "X-X+1". Before 1 September it's still the previous course.
 */
export function currentCourseLabel(date = new Date()) {
  const year = date.getFullYear()
  const septFirst = new Date(year, 8, 1) // month 8 = September (0-indexed)
  const startYear = date >= septFirst ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

// Formats a Date as 'YYYY-MM-DD' using local time (matches <input type="date">).
function toDateInputValue(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function defaultConfig() {
  const today = new Date()
  const collectionDefault = new Date(today)
  // 3 dies de marge per defecte (les normes SEPA exigeixen avisar amb prou
  // antelació abans de la data de cobrament, sobretot per a primers cobraments FRST).
  collectionDefault.setDate(collectionDefault.getDate() + 3)

  return {
    creditorName: 'AFA Fructuós Gelabert',
    creditorId: 'ES67000G63755813',
    creditorIban: 'ES9600810199520001407643',
    creditorBic: '',
    quotaAmount: 50,
    conceptPrefix: `Quota AFA curs ${currentCourseLabel()}`,
    collectionDate: toDateInputValue(collectionDefault),
    mandateSignatureDate: toDateInputValue(today),
  }
}

// No localStorage, no persistence: the config always starts fresh from the
// computed defaults on every page load. Nothing about the AFA's bank data is
// ever written to the browser's storage.
export function useConfig() {
  const config = reactive(defaultConfig())

  function clear() {
    Object.assign(config, defaultConfig())
  }

  return { config, clear }
}
