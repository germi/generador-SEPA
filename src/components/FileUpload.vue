<script setup>
import { ref } from 'vue'
import { downloadTemplate } from '../lib/template.js'

const emit = defineEmits(['file-selected'])
const isDragging = ref(false)
const fileName = ref('')
const errorMsg = ref('')

function handleFiles(files) {
  errorMsg.value = ''
  const file = files?.[0]
  if (!file) return

  const okExt = /\.xlsx?$/i.test(file.name)
  if (!okExt) {
    errorMsg.value = 'El fitxer ha de ser un .xlsx (o .xls).'
    return
  }

  fileName.value = file.name
  emit('file-selected', file)
}

function onDrop(e) {
  isDragging.value = false
  handleFiles(e.dataTransfer.files)
}

function onInputChange(e) {
  handleFiles(e.target.files)
}
</script>

<template>
  <section class="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-slate-900">1. Puja l'Excel</h2>
        <p class="mt-1 text-sm text-slate-500">
          Busca un full anomenat <span class="font-medium">"SEPA"</span> (si no n'hi ha cap amb
          aquest nom, fa servir el primer full). Les columnes es reconeixen pel seu
          <span class="font-medium">nom de capçalera</span> — CURS, INFANT, TITULAR, IBAN, DNI,
          REFERÈNCIA MANDAT — no per la seva posició, així que es poden reordenar. Tot es
          processa al navegador — cap dada surt del teu ordinador.
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        @click="downloadTemplate"
      >
        Descarrega plantilla Excel
      </button>
    </div>

    <label
      class="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors"
      :class="isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
      </svg>
      <p class="mt-2 text-sm text-slate-600">
        <span class="font-medium text-indigo-600">Fes clic per triar un fitxer</span> o arrossega'l aquí
      </p>
      <p v-if="fileName" class="mt-2 text-sm font-medium text-slate-800">{{ fileName }}</p>
      <input type="file" accept=".xlsx,.xls" class="hidden" @change="onInputChange" />
    </label>

    <p v-if="errorMsg" class="mt-3 text-sm text-red-600">{{ errorMsg }}</p>
  </section>
</template>
