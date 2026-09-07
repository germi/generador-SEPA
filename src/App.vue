<script setup>
import { ref, computed } from 'vue'
import FileUpload from './components/FileUpload.vue'
import ConfigForm from './components/ConfigForm.vue'
import PreviewTable from './components/PreviewTable.vue'
import { parseSepaWorkbook } from './lib/xlsxParser.js'
import { validateIban } from './lib/iban.js'
import { buildPain008Xml } from './lib/painXml.js'
import { useConfig } from './lib/useConfig.js'

const { config, clear: clearConfig } = useConfig()

const logoUrl = '/logo-afa.png'

const rows = ref([])
const parseWarnings = ref([])
const parseError = ref('')
const usedSheet = ref('')
const generatedInfo = ref(null)

function buildRowsFromFamilies(families) {
  return families.map((fam) => ({
    id: fam.id,
    titular: fam.titular,
    iban: fam.iban,
    dni: fam.dni,
    mandateRef: fam.mandateRef,
    mandateDate: fam.mandateSignatureDate || config.mandateSignatureDate,
    childrenList: fam.children.map((c) => c.name),
    childrenNames: fam.children.map((c) => c.name).join(', ') || '—',
    curs: fam.children.map((c) => c.curs).filter(Boolean).join(', '),
    amount: config.quotaAmount ? Number(config.quotaAmount) : 0,
    include: fam.rowWarnings.length === 0,
    warnings: [...fam.rowWarnings],
  }))
}

async function onFileSelected(file) {
  parseError.value = ''
  generatedInfo.value = null
  try {
    const result = await parseSepaWorkbook(file)
    if (!result.families.length) {
      parseError.value = 'No s’ha trobat cap família a l’Excel. Revisa que el full tingui les columnes esperades.'
      rows.value = []
      return
    }
    parseWarnings.value = result.warnings
    usedSheet.value = result.usedSheet
    rows.value = buildRowsFromFamilies(result.families)
  } catch (err) {
    console.error(err)
    parseError.value = 'No s’ha pogut llegir el fitxer. Comprova que sigui un .xlsx vàlid.'
    rows.value = []
  }
}

function syncRowsFromConfig() {
  rows.value.forEach((r) => {
    if (config.quotaAmount !== '' && config.quotaAmount != null) r.amount = Number(config.quotaAmount)
    if (config.mandateSignatureDate) r.mandateDate = config.mandateSignatureDate
  })
}

const readyForPreview = computed(() => rows.value.length > 0)

const creditorErrors = computed(() => {
  const errs = []
  if (!config.creditorName) errs.push('Falta el nom del creditor.')
  if (!config.creditorId) errs.push('Falta l’identificador de creditor SEPA.')
  if (!config.creditorIban) {
    errs.push('Falta l’IBAN de l’AFA.')
  } else if (!validateIban(config.creditorIban).valid) {
    errs.push(`IBAN de l’AFA invàlid: ${validateIban(config.creditorIban).reason}.`)
  }
  if (!config.collectionDate) errs.push('Falta la data de cobrament.')
  return errs
})

const includedRows = computed(() => rows.value.filter((r) => r.include))

const rowErrors = computed(() => {
  const errs = []
  includedRows.value.forEach((r) => {
    if (!r.mandateRef) errs.push(`${r.titular || r.id}: falta la referència del mandat.`)
    if (!validateIban(r.iban).valid) errs.push(`${r.titular || r.id}: IBAN invàlid.`)
    if (!r.amount || Number(r.amount) <= 0) errs.push(`${r.titular || r.id}: import invàlid.`)
    if (!r.mandateDate) errs.push(`${r.titular || r.id}: falta la data de signatura del mandat.`)
  })
  return errs
})

const canGenerate = computed(
  () => readyForPreview.value && includedRows.value.length > 0 && creditorErrors.value.length === 0 && rowErrors.value.length === 0,
)

function generate() {
  if (!canGenerate.value) return

  const transactions = includedRows.value.map((r) => ({
    endToEndId: r.mandateRef,
    debtorName: r.titular,
    debtorIban: r.iban,
    amount: Number(r.amount),
    mandateId: r.mandateRef,
    mandateSignatureDate: r.mandateDate || config.mandateSignatureDate,
    remittanceInfo: `${config.conceptPrefix || 'Quota AFA'} - ${r.childrenNames}`,
  }))

  const xml = buildPain008Xml({
    creditor: {
      name: config.creditorName,
      iban: config.creditorIban,
      bic: config.creditorBic,
      creditorId: config.creditorId,
    },
    requestedCollectionDate: config.collectionDate,
    seqType: 'FRST',
    transactions,
  })

  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const datePart = config.collectionDate || new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `remesa_sepa_AFA_${datePart}.xml`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  generatedInfo.value = {
    count: transactions.length,
    total: transactions.reduce((s, t) => s + t.amount, 0).toFixed(2),
    date: new Date().toLocaleString('ca-ES'),
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-5 sm:px-6">
        <img
          :src="logoUrl"
          alt="Logotip AFA Fructuós Gelabert"
          class="h-14 w-14 shrink-0 object-contain"
        />
        <div>
          <h1 class="text-lg font-semibold text-slate-900">AFA Fructuós Gelabert</h1>
          <p class="mt-0.5 text-sm text-slate-500">Generador de remeses SEPA</p>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <section class="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 class="text-base font-semibold text-slate-900">Per a què serveix això</h2>
        <p class="mt-2 text-sm text-slate-600">
          Cada curs l'AFA ha de cobrar la quota a totes les famílies sòcies mitjançant
          càrrecs directes SEPA als seus comptes bancaris. En comptes d'introduir cada
          família manualment a la web del banc, aquesta eina agafa el llistat de famílies
          i mandats (l'Excel amb IBAN, DNI i referència de mandat) i genera automàticament
          el fitxer que el Banc Sabadell necessita per fer tots aquests cobraments d'un
          sol cop — validant els IBAN i agrupant els germans/es sota un mateix mandat
          familiar pel camí.
        </p>
        <ol class="mt-3 grid grid-cols-1 gap-1.5 text-sm text-slate-500 sm:grid-cols-2">
          <li>1. Puja l'Excel de famílies</li>
          <li>2. Omple les dades de l'AFA i la quota</li>
          <li>3. Revisa i corregeix el que calgui</li>
          <li>4. Genera i puja el fitxer a BSOnline</li>
        </ol>
      </section>

      <FileUpload @file-selected="onFileSelected" />

      <p v-if="parseError" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ parseError }}
      </p>

      <div v-if="parseWarnings.length" class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <p class="font-medium">Avisos en llegir l'Excel (full "{{ usedSheet }}"):</p>
        <ul class="mt-1 list-disc pl-5">
          <li v-for="(w, i) in parseWarnings" :key="i">{{ w }}</li>
        </ul>
      </div>

      <template v-if="readyForPreview">
        <ConfigForm :config="config" @clear="clearConfig" @sync-rows="syncRowsFromConfig" />

        <div v-if="creditorErrors.length" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <ul class="list-disc pl-5">
            <li v-for="(e, i) in creditorErrors" :key="i">{{ e }}</li>
          </ul>
        </div>

        <PreviewTable :rows="rows" />

        <div v-if="rowErrors.length" class="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <p class="font-medium">Cal corregir abans de generar:</p>
          <ul class="mt-1 list-disc pl-5">
            <li v-for="(e, i) in rowErrors" :key="i">{{ e }}</li>
          </ul>
        </div>

        <section class="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 class="text-base font-semibold text-slate-900">4. Genera i descarrega</h2>
          <p class="mt-1 text-sm text-slate-500">
            Genera el fitxer XML SEPA (Adeudos Directos / Càrrecs Directes, esquema CORE, tipus FRST) llest per pujar a BSOnline.
          </p>
          <button
            type="button"
            class="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="!canGenerate"
            @click="generate"
          >
            Descarrega el fitxer XML SEPA
          </button>

          <p v-if="generatedInfo" class="mt-3 text-sm text-emerald-700">
            Generat: {{ generatedInfo.count }} càrrecs, {{ generatedInfo.total }} € en total ({{ generatedInfo.date }}).
          </p>
        </section>

        <section class="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 class="text-base font-semibold text-slate-900">5. Puja el fitxer a BSOnline</h2>
          <p class="mt-1 text-sm text-slate-500">
            Un cop tinguis el fitxer <code class="rounded bg-slate-100 px-1 py-0.5 text-xs">.xml</code> descarregat:
          </p>
          <ol class="mt-3 space-y-2 text-sm text-slate-600">
            <li><span class="font-medium text-slate-800">1.</span> Entra a BSOnline amb les claus de l'AFA.</li>
            <li>
              <span class="font-medium text-slate-800">2.</span> Dins l'entorn d'empreses de BSOnline, ves a
              <span class="font-medium">Fitxers → Enviar Fitxers</span>, i quan et demani l'operativa tria
              <span class="font-medium">SEPA Càrrecs Directes (CORE)</span>. Si el teu BSOnline mostra els
              menús amb un altre nom, busca l'opció que permeti
              <span class="font-medium">pujar un fitxer ja generat</span> (a diferència de l'opció
              "generació online", que és per crear-lo fila a fila manualment).
            </li>
            <li><span class="font-medium text-slate-800">3.</span> Selecciona per pujar el fitxer .xml que t'has descarregat d'aquí.</li>
            <li>
              <span class="font-medium text-slate-800">4.</span> El banc et mostrarà un resum (nombre d'operacions i import
              total). Comprova que coincideix amb el que et mostra aquesta aplicació just després de generar el fitxer.
            </li>
            <li><span class="font-medium text-slate-800">5.</span> Confirma i signa la presentació (signatura electrònica o claus de l'operador de l'AFA).</li>
            <li><span class="font-medium text-slate-800">6.</span> Desa o imprimeix el justificant de presentació que et doni el banc.</li>
          </ol>
          <p class="mt-3 text-xs text-slate-400">
            Els noms exactes dels menús poden variar una mica segons la versió de BSOnline; si no
            trobes l'opció, la gestora/gestor de l'AFA al banc us pot indicar on és exactament.
          </p>
        </section>
      </template>
    </main>

    <footer class="mx-auto max-w-5xl px-4 py-8 text-xs text-slate-400 sm:px-6">
      Aplicació 100% local — l'Excel i les dades bancàries no surten mai del teu navegador.
      Codi font obert a
      <a href="https://github.com/germi/generador-SEPA" target="_blank" rel="noopener" class="underline hover:text-slate-600">github.com/germi/generador-SEPA</a>.
    </footer>
  </div>
</template>
