<template>
  <section class="operations-page" :aria-busy="isDeleting">
    <header class="operations-page__header">
      <button class="back-button" type="button" @click="goHome">Назад</button>
      <div>
        <h3>Операции</h3>
      </div>
    </header>

    <PeriodSwitch
      :model-value="operationsPeriod"
      :operation-type="operationType"
      @update:model-value="setOperationsPeriod"
      @update:operation-type="setOperationType"
    />

    <p v-if="operationGroups.length === 0" class="empty-state">Операций пока нет.</p>

    <section v-else class="operations-groups">
      <OperationPeriodGroup
        v-for="group in visibleOperationGroups"
        :key="group.key"
        :currency-symbol="store.currencySymbol"
        :get-category-name="store.getCategoryName"
        :get-subcategory="store.getSubcategory"
        :group="group"
        :period="operationsPeriod"
        @edit="openEditPage"
        @remove="removeOperation"
      />

      <button
        v-if="hiddenOperationGroupsCount > 0"
        class="load-more-button"
        type="button"
        @click="showMoreOperationGroups"
      >
        Показать ещё {{ nextOperationGroupsCount }} из {{ hiddenOperationGroupsCount }}
      </button>
    </section>

    <div v-if="isDeleting" class="page-loader" role="status" aria-live="polite">
      <span class="page-loader__spinner" aria-hidden="true"></span>
      <p>Удаляем запись…</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OperationPeriodGroup from '@/components/OperationPeriodGroup.vue'
import PeriodSwitch from '@/components/PeriodSwitch.vue'
import { useFinanceStore } from '@/stores/finance'
import type { Operation, OperationTypeFilter, OperationsPeriod } from '@/types'
import { getMonthKey, isValidMonthKey } from '@/utils/date'
import { waitForMinimumDuration } from '@/utils/delay'
import { buildOperationPeriodGroups, sortOperationsByDateDesc } from '@/utils/operations'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const operationGroupPageSizes: Record<OperationsPeriod, number> = {
  day: 14,
  week: 12,
  month: 12,
  year: 12,
}
const visibleOperationGroupsCount = ref(operationGroupPageSizes.day)
const isDeleting = ref(false)

const selectedMonthKey = computed(() => {
  const month = typeof route.query.month === 'string' ? route.query.month : null
  return isValidMonthKey(month) ? month : store.currentMonthKey
})
const operationsPeriod = computed<OperationsPeriod>(() => {
  const period = typeof route.query.period === 'string' ? route.query.period : null
  return isOperationsPeriod(period) ? period : 'day'
})
const operationType = computed<OperationTypeFilter>(() => {
  const type = typeof route.query.type === 'string' ? route.query.type : null
  return isOperationTypeFilter(type) ? type : 'expense'
})
const sortedOperations = computed(() => sortOperationsByDateDesc(store.activeOperations))
const filteredOperations = computed(() =>
  sortedOperations.value.filter(operation => operation.type === getOperationNumericType(operationType.value)),
)
const operationGroups = computed(() =>
  buildOperationPeriodGroups(filteredOperations.value, operationsPeriod.value, {
    getCategoryName: store.getCategoryName,
    getSubcategory: store.getSubcategory,
  }),
)
const operationGroupsPageSize = computed(() => operationGroupPageSizes[operationsPeriod.value])
const visibleOperationGroups = computed(() => operationGroups.value.slice(0, visibleOperationGroupsCount.value))
const hiddenOperationGroupsCount = computed(() =>
  Math.max(operationGroups.value.length - visibleOperationGroups.value.length, 0),
)
const nextOperationGroupsCount = computed(() =>
  Math.min(operationGroupsPageSize.value, hiddenOperationGroupsCount.value),
)

watch(
  [operationsPeriod, operationType, selectedMonthKey],
  ([period]) => {
    visibleOperationGroupsCount.value = operationGroupPageSizes[period]
  },
  { immediate: true },
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
      type: operationType.value,
    },
  })
}

function setOperationType(type: OperationTypeFilter) {
  router.push({
    name: 'operations',
    query: {
      month: selectedMonthKey.value,
      period: operationsPeriod.value,
      type,
    },
  })
}

function showMoreOperationGroups() {
  visibleOperationGroupsCount.value += operationGroupsPageSize.value
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
      type: operationType.value,
    },
  })
}

async function removeOperation(operation: Operation) {
  if (isDeleting.value) {
    return
  }

  const loaderStartedAt = Date.now()
  isDeleting.value = true

  try {
    await store.deleteOperation(operation.id)
  } finally {
    await waitForMinimumDuration(loaderStartedAt)
    isDeleting.value = false
  }
}

function isOperationsPeriod(value: string | null): value is OperationsPeriod {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year'
}

function isOperationTypeFilter(value: string | null): value is OperationTypeFilter {
  return value === 'income' || value === 'expense'
}

function getOperationNumericType(type: OperationTypeFilter) {
  return type === 'income' ? 0 : 1
}
</script>
