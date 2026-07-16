<template>
  <main class="app-shell">
    <RouterView v-if="isReady" />

    <aside v-if="needRefresh" class="update-widget" role="status" aria-live="polite">
      <div>
        <strong>Доступна новая версия</strong>
        <p>{{ isUpdating ? 'Обновляем приложение. Подождите немного.' : 'Можно обновить приложение сейчас.' }}</p>
      </div>

      <div class="update-widget__actions">
        <button class="update-widget__button update-widget__button--primary" type="button" :disabled="isUpdating" @click="updateApp">
          {{ isUpdating ? 'Обновление' : 'Обновить' }}
        </button>
        <button class="update-widget__button" type="button" :disabled="isUpdating" @click="dismissUpdate">
          Позже
        </button>
      </div>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { RouterView } from 'vue-router'
import defaultData from '../default.json'
import { fetchServerFinanceSnapshot } from '@/services/financeSync'
import { useFinanceStore } from '@/stores/finance'

const store = useFinanceStore()
const isReady = ref(false)
const isUpdating = ref(false)
const { needRefresh, updateServiceWorker } = useRegisterSW()

onMounted(async () => {
  const hasStoredData = await store.loadFromIndexedDB()

  if (!hasStoredData) {
    const serverSnapshot = await loadServerSnapshot()

    if (serverSnapshot) {
      await store.saveSnapshotToIndexedDB(serverSnapshot)
    } else {
      store.loadData(defaultData)
      await store.saveToIndexedDB()
    }
  }

  isReady.value = true
})

async function loadServerSnapshot() {
  try {
    return await fetchServerFinanceSnapshot()
  } catch {
    return null
  }
}

async function updateApp() {
  isUpdating.value = true

  try {
    await updateServiceWorker(true)
  } finally {
    isUpdating.value = false
  }
}

function dismissUpdate() {
  needRefresh.value = false
}
</script>
