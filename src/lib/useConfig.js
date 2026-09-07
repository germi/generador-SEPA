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

function defaultConfig() {
  return {
    creditorName: 'AFA Fructuós Gelabert',
    creditorId: '',
    creditorIban: '',
    creditorBic: '',
    quotaAmount: 50,
    conceptPrefix: `Quota AFA curs ${currentCourseLabel()}`,
    collectionDate: '',
    mandateSignatureDate: '',
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig()
    return { ...defaultConfig(), ...JSON.parse(raw) }
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
