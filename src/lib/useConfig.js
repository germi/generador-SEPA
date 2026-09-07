import { reactive, watch } from 'vue'

const STORAGE_KEY = 'afa-sepa-config-v1'

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

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig()
    const stored = JSON.parse(raw)
    // Don't let a blank saved field (e.g. from an earlier version of this app,
    // or a field the user cleared) permanently hide a meaningful default —
    // only non-empty saved values override the computed defaults.
    const nonEmptyStored = Object.fromEntries(
      Object.entries(stored).filter(([, v]) => v !== '' && v != null),
    )
    return { ...defaultConfig(), ...nonEmptyStored }
  } catch {
    return defaultConfig()
  }
}

export function useConfig() {
  const config = reactive(load())

  watch(
    config,
    (val) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      } catch {
        // localStorage unavailable — ignore, config just won't persist.
      }
    },
    { deep: true },
  )

  function clear() {
    Object.assign(config, defaultConfig())
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  return { config, clear }
}
