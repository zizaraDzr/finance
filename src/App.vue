<template>
  <main class="app-shell">
    <RouterView v-if="isReady" />
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import defaultData from '../default.json'
import { useFinanceStore } from '@/stores/finance'

const store = useFinanceStore()
const isReady = ref(false)

onMounted(async () => {
  const hasStoredData = await store.loadFromIndexedDB()

  if (!hasStoredData) {
    store.loadData(defaultData)
    await store.saveToIndexedDB()
  }

  isReady.value = true
})
</script>
