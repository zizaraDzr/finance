<template>
  <main class="app-shell">
    <RouterView v-if="isReady" />
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import defaultSnapshotJson from '../default.json'
import { fetchServerFinanceSnapshot } from '@/services/financeSync'
import type { FinanceData } from '@/storage/financeDb'
import { useFinanceStore } from '@/stores/finance'

const store = useFinanceStore()
const isReady = ref(false)

onMounted(async () => {
  const hasStoredData = await store.loadFromIndexedDB()

  if (!hasStoredData) {
    const serverSnapshot = await loadServerSnapshot()

    if (serverSnapshot) {
      await store.saveSnapshotToIndexedDB(serverSnapshot)
    } else {
      store.loadData(toFinanceData(defaultSnapshotJson))
      await store.saveToIndexedDB()
    }
  }

  isReady.value = true
})

// default.json встречается в двух видах: «голые» данные (FinanceData) и снапшот
// с обёрткой { data, updatedAt } (как его отдаёт сервер и сохраняет экспорт).
// Приводим оба варианта к FinanceData, иначе данные молча теряются.
function toFinanceData(value: unknown): FinanceData {
  const candidate = value as { data?: FinanceData } | null

  if (candidate && typeof candidate === 'object' && candidate.data) {
    return candidate.data
  }

  return (value ?? {}) as FinanceData
}

async function loadServerSnapshot() {
  try {
    return await fetchServerFinanceSnapshot()
  } catch {
    return null
  }
}
</script>
