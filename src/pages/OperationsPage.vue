<template>
  <section class="operations-page" :aria-busy="isDeleting">
    <header class="page-head">
      <div class="page-head__text">
        <p class="eyebrow">Журнал</p>

        <div class="page-head__title-row">
          <h1>Операции</h1>

          <div class="month-nav" aria-label="Выбор периода">
            <button class="month-nav__button" type="button" aria-label="Предыдущий период" @click="shiftScope(-1)">
              <AppIcon name="chevron-left" :size="18" />
            </button>
            <button
              class="month-nav__button"
              type="button"
              aria-label="Следующий период"
              :disabled="!hasNextScope"
              @click="shiftScope(1)"
            >
              <AppIcon name="chevron-right" :size="18" />
            </button>
          </div>
        </div>

        <p class="page-lead">
          {{ scopeTitle }} · {{ headline }}
        </p>
      </div>

      <div class="page-head__actions">
        <button class="button button--primary" type="button" @click="openAddPage">
          <AppIcon name="plus" :size="18" />
          <span>Добавить</span>
        </button>
      </div>
    </header>

    <div class="ledger-top">
      <label class="search-field">
        <AppIcon name="search" :size="18" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Категория, подкатегория или заметка"
          aria-label="Поиск операций"
        />
        <button
          v-if="searchQuery"
          class="search-field__clear"
          type="button"
          aria-label="Очистить поиск"
          @click="searchQuery = ''"
        >
          <AppIcon name="close" :size="14" />
        </button>
      </label>

      <PeriodSwitch
        :model-value="operationsPeriod"
        :operation-type="operationType"
        @update:model-value="setOperationsPeriod"
        @update:operation-type="setOperationType"
      />
    </div>

    <p v-if="operationGroups.length === 0" class="empty-state empty-state--card">
      {{ emptyStateText }}
    </p>

    <section v-else class="operations-groups">
      <OperationPeriodGroup
        v-for="group in visibleOperationGroups"
        :key="group.key"
        :currency-symbol="store.currencySymbol"
        :get-category-name="store.getCategoryName"
        :get-subcategory="store.getSubcategory"
        :get-category-icon="getCategoryIcon"
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
import AppIcon from '@/components/AppIcon.vue'
import OperationPeriodGroup from '@/components/OperationPeriodGroup.vue'
import PeriodSwitch from '@/components/PeriodSwitch.vue'
import { useLoadMore } from '@/composables/useLoadMore'
import { useFinanceStore } from '@/stores/finance'
import type { Operation, OperationTypeFilter, OperationsPeriod } from '@/types'
import { getMonthKey, isValidDate, parseMonthKey, shiftMonthKey } from '@/utils/date'
import { waitForMinimumDuration } from '@/utils/delay'
import { formatMonthTitle, formatOperationsCount } from '@/utils/formatters'
import { buildOperationPeriodGroups, sortOperationsByDateDesc } from '@/utils/operations'
import { readMonthQuery, readOperationsPeriod, readOperationType } from '@/utils/routeQuery'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const operationGroupPageSizes: Record<OperationsPeriod, number> = {
  day: 14,
  week: 12,
  month: 12,
  year: 12,
}
const isDeleting = ref(false)
const searchQuery = ref('')

const selectedMonthKey = computed(() => readMonthQuery(route.query.month, store.currentMonthKey))
const operationsPeriod = computed<OperationsPeriod>(() => readOperationsPeriod(route.query.period))
const operationType = computed<OperationTypeFilter>(() => readOperationType(route.query.type))
const isYearlyScope = computed(() => operationsPeriod.value === 'year')
const selectedYear = computed(() => parseMonthKey(selectedMonthKey.value).year)
const currentYear = computed(() => parseMonthKey(store.currentMonthKey).year)
const hasNextScope = computed(() =>
  isYearlyScope.value
    ? selectedYear.value < currentYear.value
    : selectedMonthKey.value < store.currentMonthKey,
)
const scopeTitle = computed(() =>
  isYearlyScope.value ? String(selectedYear.value) : formatMonthTitle(selectedMonthKey.value),
)
const sortedOperations = computed(() => sortOperationsByDateDesc(store.activeOperations))
const scopedOperations = computed(() =>
  sortedOperations.value.filter(operation => {
    const date = new Date(operation.date)

    if (!isValidDate(date)) {
      return false
    }

    return isYearlyScope.value
      ? date.getFullYear() === selectedYear.value
      : getMonthKey(date) === selectedMonthKey.value
  }),
)
const filteredOperations = computed(() => {
  const numericType = getOperationNumericType(operationType.value)
  const query = searchQuery.value.trim().toLowerCase()

  return scopedOperations.value.filter(operation => {
    if (operation.type !== numericType) {
      return false
    }

    if (!query) {
      return true
    }

    const subcategory = operation.subcategoryID
      ? store.getSubcategory(operation.subcategoryID)?.name ?? ''
      : ''

    return [
      store.getCategoryName(operation.categoryID),
      subcategory,
      operation.note ?? '',
    ].some(value => value.toLowerCase().includes(query))
  })
})
const operationGroups = computed(() =>
  buildOperationPeriodGroups(filteredOperations.value, operationsPeriod.value, {
    getCategoryName: store.getCategoryName,
    getSubcategory: store.getSubcategory,
  }),
)
const operationGroupsPageSize = computed(() => operationGroupPageSizes[operationsPeriod.value])
const {
  visibleItems: visibleOperationGroups,
  hiddenCount: hiddenOperationGroupsCount,
  nextCount: nextOperationGroupsCount,
  loadMore: showMoreOperationGroups,
  reset: resetOperationGroupsPagination,
} = useLoadMore(() => operationGroups.value, () => operationGroupsPageSize.value)

const headline = computed(() => {
  if (filteredOperations.value.length === 0) {
    return 'нет записей'
  }

  const typeLabel = operationType.value === 'income' ? 'доходов' : 'расходов'

  return `${formatOperationsCount(filteredOperations.value.length)} ${typeLabel}`
})
const emptyStateText = computed(() => {
  if (searchQuery.value.trim()) {
    return 'По этому запросу ничего не нашлось. Попробуйте другую категорию или очистите поиск.'
  }

  return operationType.value === 'income'
    ? 'Доходов за этот период нет. Добавьте первую запись.'
    : 'Расходов за этот период нет. Добавьте первую запись.'
})

watch([operationsPeriod, operationType, selectedMonthKey, searchQuery], resetOperationGroupsPagination, {
  immediate: true,
})

function shiftScope(direction: number) {
  if (direction > 0 && !hasNextScope.value) {
    return
  }

  const step = isYearlyScope.value ? 12 : 1
  const month = shiftMonthKey(selectedMonthKey.value, direction * step)

  router.push({
    name: 'operations',
    query: {
      month,
      period: operationsPeriod.value,
      type: operationType.value,
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

function openAddPage() {
  router.push({
    name: 'operation-add',
    query: {
      month: selectedMonthKey.value,
      from: 'operations',
      period: operationsPeriod.value,
      type: operationType.value,
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

function getOperationNumericType(type: OperationTypeFilter) {
  return type === 'income' ? 0 : 1
}

function getCategoryIcon(categoryId: string | null) {
  return store.getCategory(categoryId)?.icon
}
</script>
