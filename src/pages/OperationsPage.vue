<template>
  <section class="operations-page">
    <header class="operations-page__header">
      <button class="back-button" type="button" @click="goHome">Назад</button>
      <div>
        <p class="eyebrow">Детальный просмотр</p>
        <h1>Операции</h1>
      </div>
    </header>

    <PeriodSwitch
      :count="sortedOperations.length"
      :currency-symbol="store.currencySymbol"
      :model-value="operationsPeriod"
      :summary="operationsSummary"
      @update:model-value="setOperationsPeriod"
    />

    <p v-if="operationGroups.length === 0" class="empty-state">Операций пока нет.</p>

    <section v-else class="operations-groups">
      <OperationPeriodGroup
        v-for="group in operationGroups"
        :key="group.key"
        :currency-symbol="store.currencySymbol"
        :get-category-name="store.getCategoryName"
        :get-subcategory="store.getSubcategory"
        :group="group"
        :period="operationsPeriod"
        @edit="openEditPage"
        @remove="removeOperation"
      />
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OperationPeriodGroup from '@/components/OperationPeriodGroup.vue'
import PeriodSwitch from '@/components/PeriodSwitch.vue'
import { useFinanceStore } from '@/stores/finance'
import type { Operation, OperationsPeriod } from '@/types'
import { getMonthKey, isValidMonthKey } from '@/utils/date'
import { buildOperationPeriodGroups, sortOperationsByDateDesc, summarizeOperations } from '@/utils/operations'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()

const selectedMonthKey = computed(() => {
  const month = typeof route.query.month === 'string' ? route.query.month : null
  return isValidMonthKey(month) ? month : store.currentMonthKey
})
const operationsPeriod = computed<OperationsPeriod>(() => {
  const period = typeof route.query.period === 'string' ? route.query.period : null
  return isOperationsPeriod(period) ? period : 'day'
})
const sortedOperations = computed(() => sortOperationsByDateDesc(store.activeOperations))
const operationsSummary = computed(() => summarizeOperations(sortedOperations.value))
const operationGroups = computed(() =>
  buildOperationPeriodGroups(sortedOperations.value, operationsPeriod.value, {
    getCategoryName: store.getCategoryName,
    getSubcategory: store.getSubcategory,
  }),
)

function goHome() {
  router.push({
    name: 'dashboard',
    query: {
      month: selectedMonthKey.value,
    },
  })
}

function setOperationsPeriod(period: OperationsPeriod) {
  router.push({
    name: 'operations',
    query: {
      month: selectedMonthKey.value,
      period,
    },
  })
}

function openEditPage(operation: Operation) {
  router.push({
    name: 'operation-edit',
    params: {
      id: operation.id,
    },
    query: {
      month: getMonthKey(new Date(operation.date)),
      from: 'operations',
      period: operationsPeriod.value,
    },
  })
}

async function removeOperation(operation: Operation) {
  await store.deleteOperation(operation.id)
}

function isOperationsPeriod(value: string | null): value is OperationsPeriod {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year'
}
</script>
