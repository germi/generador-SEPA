<script setup>
defineProps({
  config: { type: Object, required: true },
})
const emit = defineEmits(['clear', 'sync-rows'])
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h2 class="text-base font-semibold text-slate-900">2. Dades de l'AFA i de la remesa</h2>
        <p class="mt-1 text-sm text-slate-500">
          Es desa només al teu navegador (localStorage) — no s'envia enlloc.
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 text-xs font-medium text-slate-400 hover:text-red-600"
        @click="emit('clear')"
      >
        Esborra dades desades
      </button>
    </div>

    <div class="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label class="block text-sm font-medium text-slate-700">Nom del creditor (AFA)</label>
        <input
          v-model="config.creditorName"
          type="text"
          placeholder="AFA Escola Fructuós Gelabert"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">
          Identificador de creditor SEPA
        </label>
        <input
          v-model="config.creditorId"
          type="text"
          placeholder="ES00ZZZ00000000000"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p class="mt-1 text-xs text-slate-400">El vas rebre del banc en donar-vos d'alta com a creditor SEPA.</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">IBAN del compte de l'AFA</label>
        <input
          v-model="config.creditorIban"
          type="text"
          placeholder="ES00 0000 0000 0000 0000 0000"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">BIC del banc (opcional)</label>
        <input
          v-model="config.creditorBic"
          type="text"
          placeholder="BSABESBBXXX"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">Import de la quota (€)</label>
        <input
          v-model="config.quotaAmount"
          type="number"
          step="0.01"
          min="0"
          placeholder="30.00"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p class="mt-1 text-xs text-slate-400">S'aplica a totes les famílies; podràs canviar-la per fila després.</p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">Concepte (text del rebut)</label>
        <input
          v-model="config.conceptPrefix"
          type="text"
          placeholder="Quota AFA curs 2026-2027"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">Data de cobrament</label>
        <input
          v-model="config.collectionDate"
          type="date"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p class="mt-1 text-xs text-slate-400">
          Com que sempre es tramet com a primer cobrament (FRST), deixa marge de dies hàbils abans que el banc l'executi.
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium text-slate-700">Data de signatura del mandat</label>
        <input
          v-model="config.mandateSignatureDate"
          type="date"
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <p class="mt-1 text-xs text-slate-400">
          Valor per defecte per a totes les files; editable individualment si cal.
        </p>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
      <p class="text-xs text-slate-500">
        Si canvies l'import o la data de signatura del mandat aquí un cop ja has pujat l'Excel,
        cal sincronitzar-los amb la taula de sota perquè s'apliquin a totes les files.
      </p>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
        @click="emit('sync-rows')"
      >
        Sincronitza import i data a totes les files
      </button>
    </div>
  </section>
</template>
