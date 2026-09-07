<script setup>
import { computed } from 'vue'
import { validateIban, formatIban } from '../lib/iban.js'

const props = defineProps({
  rows: { type: Array, required: true },
})

const includedCount = computed(() => props.rows.filter((r) => r.include).length)
const totalAmount = computed(() =>
  props.rows.filter((r) => r.include).reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
)

function ibanCheck(row) {
  if (!row.iban) return { valid: false, reason: 'Falta l’IBAN' }
  return validateIban(row.iban)
}

function toggleAll(value) {
  props.rows.forEach((r) => {
    r.include = value
  })
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-slate-900">3. Revisa i edita abans de generar</h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ includedCount }} de {{ rows.length }} famílies incloses · Total: {{ totalAmount.toFixed(2) }} €
        </p>
      </div>
      <div class="flex gap-2 text-xs">
        <button type="button" class="rounded-md border border-slate-300 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50" @click="toggleAll(true)">
          Inclou-les totes
        </button>
        <button type="button" class="rounded-md border border-slate-300 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50" @click="toggleAll(false)">
          Desmarca-les totes
        </button>
      </div>
    </div>

    <div class="mt-4 overflow-x-auto">
      <table class="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th class="py-2 pr-2">Inclou</th>
            <th class="py-2 pr-3">Titular</th>
            <th class="py-2 pr-3">Fills/es</th>
            <th class="py-2 pr-3">IBAN</th>
            <th class="py-2 pr-3">Referència mandat</th>
            <th class="py-2 pr-3">Data signatura</th>
            <th class="py-2 pr-3 text-right">Import (€)</th>
            <th class="py-2 pr-3">Avisos</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="border-b border-slate-100 align-top"
            :class="!row.include && 'opacity-40'"
          >
            <td class="py-2 pr-2">
              <input type="checkbox" v-model="row.include" class="h-4 w-4 rounded border-slate-300 text-indigo-600" />
            </td>
            <td class="py-2 pr-3">
              <input v-model="row.titular" type="text" class="w-40 rounded border border-slate-200 px-2 py-1 text-sm" />
            </td>
            <td class="py-2 pr-3 text-slate-600">{{ row.childrenNames }}</td>
            <td class="py-2 pr-3">
              <input v-model="row.iban" type="text" class="w-56 rounded border border-slate-200 px-2 py-1 font-mono text-xs" />
              <div class="mt-0.5 text-xs" :class="ibanCheck(row).valid ? 'text-emerald-600' : 'text-red-600'">
                {{ ibanCheck(row).valid ? formatIban(row.iban) : ibanCheck(row).reason }}
              </div>
            </td>
            <td class="py-2 pr-3">
              <input v-model="row.mandateRef" type="text" class="w-32 rounded border border-slate-200 px-2 py-1 font-mono text-xs" />
            </td>
            <td class="py-2 pr-3">
              <input v-model="row.mandateDate" type="date" class="w-36 rounded border border-slate-200 px-2 py-1 text-xs" />
            </td>
            <td class="py-2 pr-3 text-right">
              <input v-model.number="row.amount" type="number" step="0.01" min="0" class="w-24 rounded border border-slate-200 px-2 py-1 text-right text-sm" />
            </td>
            <td class="py-2 pr-3">
              <ul v-if="row.warnings.length" class="space-y-0.5 text-xs text-amber-600">
                <li v-for="(w, i) in row.warnings" :key="i">{{ w }}</li>
              </ul>
              <span v-else class="text-xs text-emerald-600">OK</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
