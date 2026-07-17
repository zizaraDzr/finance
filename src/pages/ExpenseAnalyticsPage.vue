<template>
  <section class="analytics-page">
    <header class="analytics-page__header">
      <button class="back-button" type="button" @click="goHome">Назад</button>

      <div class="analytics-month">
        <button class="month-nav-button" type="button" :aria-label="previousPeriodLabel" @click="selectPreviousMonth">
          <span class="accordion-chevron__nav">‹</span>
        </button>

        <div>
          <p class="eyebrow">Аналитика расходов</p>
          <h1>{{ selectedPeriodTitle }}</h1>
        </div>

        <button v-if="hasNextPeriod" class="month-nav-button" type="button" :aria-label="nextPeriodLabel"
          @click="selectNextMonth">
          <span class="accordion-chevron__nav">›</span>
        </button>
      </div>
    </header>

    <section class="operations-toolbar analytics-toolbar" aria-label="Период аналитики">
      <div class="operations-total operations-total--negative">
        <span>{{ analyticsPeriodLabel }}</span>
        <strong>{{ formatMoney(totalExpense, store.currencySymbol) }}</strong>
      </div>

      <fieldset class="period-switch analytics-period-switch">
        <legend>Период</legend>
        <button v-for="option in analyticsPeriodOptions" :key="option.value" type="button"
          :class="{ 'period-switch__button--active': analyticsPeriod === option.value }"
          @click="setAnalyticsPeriod(option.value)">
          {{ option.label }}
        </button>
      </fieldset>
    </section>

    <section class="analytics-grid">
      <article class="panel analytics-panel">
        <div class="panel__header">
          <div>
            <h2>Назначение</h2>
            <span>{{ formatOperationsCount(expenseOperations.length) }}</span>
          </div>
          <strong class="amount--expense">{{ formatMoney(totalExpense, store.currencySymbol) }}</strong>
        </div>

        <p v-if="expenseGroups.length === 0" class="empty-state">За этот период расходов пока нет.</p>

        <div v-else class="expense-breakdown">
          <section v-for="category in visibleExpenseGroups" :key="category.key" class="expense-breakdown__group">
            <div class="expense-breakdown__row">
              <div class="breakdown-title">
                <button class="accordion-toggle" type="button"
                  :class="{ 'accordion-toggle--open': isCategoryOpen(category.key) }"
                  :aria-label="`Показать ${category.name}`" @click="toggleCategory(category.key)">
                  <span class="accordion-chevron">›</span>
                </button>

                <div>
                  <strong>{{ category.name }}</strong>
                  <span>{{ formatOperationsCount(category.count) }}</span>
                </div>
              </div>

              <div class="expense-breakdown__amount">
                <b>{{ formatMoney(category.amount, store.currencySymbol) }}</b>
                <span>{{ formatPercent(category.percent) }}</span>
              </div>
            </div>

            <div class="expense-share" aria-hidden="true">
              <span :style="{ width: `${category.percent}%` }"></span>
            </div>

            <div v-if="isCategoryOpen(category.key)" class="expense-subcategories">
              <article v-for="subcategory in category.subcategories" :key="subcategory.key"
                class="expense-subcategories__item">
                <div class="expense-breakdown__row">
                  <div>
                    <strong>{{ subcategory.name }}</strong>
                    <span>{{ formatOperationsCount(subcategory.count) }}</span>
                  </div>

                  <div class="expense-breakdown__amount">
                    <b>{{ formatMoney(subcategory.amount, store.currencySymbol) }}</b>
                    <span>{{ formatPercent(subcategory.percent) }}</span>
                  </div>
                </div>

                <div class="expense-share expense-share--subtle" aria-hidden="true">
                  <span :style="{ width: `${subcategory.percent}%` }"></span>
                </div>
              </article>
            </div>
          </section>

          <button v-if="hiddenExpenseGroupsCount > 0" class="load-more-button" type="button"
            @click="showAllExpenseGroups">
            Показать больше
          </button>
        </div>
      </article>

      <ExpenseTrendChart :period="analyticsPeriod" :selected-month-key="selectedMonthKey" />
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExpenseTrendChart from '@/components/ExpenseTrendChart.vue'
import { useFinanceStore } from '@/stores/finance'
import type { Operation } from '@/types'
import { getMonthKey, isValidDate, isValidMonthKey, shiftMonthKey } from '@/utils/date'
import { formatMoney, formatMonthTitle, formatOperationsCount, formatPercent } from '@/utils/formatters'

type ExpenseAnalyticsPeriod = 'month' | 'year'

type ExpenseSubcategoryGroup = {
  key: string
  name: string
  amount: number
  count: number
  percent: number
}

type ExpenseCategoryGroup = ExpenseSubcategoryGroup & {
  subcategories: ExpenseSubcategoryGroup[]
}

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const openedCategories = ref(new Set<string>())
const expenseGroupsPreviewCount = 3
const isAllExpenseGroupsVisible = ref(false)

const analyticsPeriodOptions: Array<{ value: ExpenseAnalyticsPeriod; label: string }> = [
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

const selectedMonthKey = computed(() => {
  const month = typeof route.query.month === 'string' ? route.query.month : null
  return isValidMonthKey(month) ? month : store.currentMonthKey
})
const previousMonthKey = computed(() => shiftMonthKey(selectedMonthKey.value, -1))
const nextMonthKey = computed(() => shiftMonthKey(selectedMonthKey.value, 1))
const selectedYear = computed(() => Number(selectedMonthKey.value.slice(0, 4)))
const selectedMonthNumber = computed(() => Number(selectedMonthKey.value.slice(5, 7)))
const currentYear = computed(() => Number(store.currentMonthKey.slice(0, 4)))
const currentMonthNumber = computed(() => Number(store.currentMonthKey.slice(5, 7)))
const selectedMonthTitle = computed(() => formatMonthTitle(selectedMonthKey.value))
const analyticsPeriod = computed<ExpenseAnalyticsPeriod>(() => {
  const period = typeof route.query.expensePeriod === 'string' ? route.query.expensePeriod : null
  return period === 'year' ? 'year' : 'month'
})
const selectedPeriodTitle = computed(() =>
  analyticsPeriod.value === 'year' ? String(selectedYear.value) : selectedMonthTitle.value,
)
const previousPeriodKey = computed(() =>
  analyticsPeriod.value === 'year'
    ? createMonthKey(selectedYear.value - 1, selectedMonthNumber.value)
    : previousMonthKey.value,
)
const nextPeriodKey = computed(() => {
  if (analyticsPeriod.value === 'month') {
    return nextMonthKey.value
  }

  const nextYear = selectedYear.value + 1
  const nextMonth = nextYear === currentYear.value
    ? Math.min(selectedMonthNumber.value, currentMonthNumber.value)
    : selectedMonthNumber.value

  return createMonthKey(nextYear, nextMonth)
})
const hasNextPeriod = computed(() =>
  analyticsPeriod.value === 'year'
    ? selectedYear.value < currentYear.value
    : nextMonthKey.value <= store.currentMonthKey,
)
const analyticsPeriodLabel = computed(() =>
  analyticsPeriod.value === 'month' ? 'Расход за месяц' : 'Расход за год',
)
const previousPeriodLabel = computed(() =>
  analyticsPeriod.value === 'year' ? 'Предыдущий год' : 'Предыдущий месяц',
)
const nextPeriodLabel = computed(() =>
  analyticsPeriod.value === 'year' ? 'Следующий год' : 'Следующий месяц',
)

const expenseOperations = computed(() =>
  store.activeOperations.filter(operation => {
    const date = new Date(operation.date)

    if (operation.type !== 1 || !isValidDate(date)) {
      return false
    }

    if (analyticsPeriod.value === 'year') {
      return date.getFullYear() === selectedYear.value
    }

    return getMonthKey(date) === selectedMonthKey.value
  }),
)
const totalExpense = computed(() => expenseOperations.value.reduce((sum, operation) => sum + operation.sum, 0))
const expenseGroups = computed(() => buildExpenseGroups(expenseOperations.value, totalExpense.value))
const visibleExpenseGroups = computed(() =>
  isAllExpenseGroupsVisible.value ? expenseGroups.value : expenseGroups.value.slice(0, expenseGroupsPreviewCount),
)
const hiddenExpenseGroupsCount = computed(() =>
  Math.max(expenseGroups.value.length - visibleExpenseGroups.value.length, 0),
)

watch([selectedMonthKey, analyticsPeriod], () => {
  openedCategories.value = new Set()
  isAllExpenseGroupsVisible.value = false
})

function goHome() {
  router.push({
    name: 'dashboard',
    query: {
      month: store.currentMonthKey,
    },
  })
}

function selectPreviousMonth() {
  setSelectedMonth(previousPeriodKey.value)
}

function selectNextMonth() {
  setSelectedMonth(nextPeriodKey.value)
}

function setSelectedMonth(month: string) {
  router.push({
    name: 'expense-analytics',
    query: {
      month,
      expensePeriod: analyticsPeriod.value,
    },
  })
}

function setAnalyticsPeriod(period: ExpenseAnalyticsPeriod) {
  router.push({
    name: 'expense-analytics',
    query: {
      month: selectedMonthKey.value,
      expensePeriod: period,
    },
  })
}

function toggleCategory(key: string) {
  const nextOpenedCategories = new Set(openedCategories.value)

  if (nextOpenedCategories.has(key)) {
    nextOpenedCategories.delete(key)
  } else {
    nextOpenedCategories.add(key)
  }

  openedCategories.value = nextOpenedCategories
}

function isCategoryOpen(key: string) {
  return openedCategories.value.has(key)
}

function showAllExpenseGroups() {
  isAllExpenseGroupsVisible.value = true
}

function createMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

function buildExpenseGroups(operations: Operation[], total: number) {
  const categories = new Map<string, ExpenseCategoryGroup>()

  operations.forEach(operation => {
    const categoryKey = operation.categoryID || 'without-category'
    const subcategoryKey = operation.subcategoryID || `${categoryKey}:without-subcategory`
    const category = categories.get(categoryKey) || {
      key: categoryKey,
      name: store.getCategoryName(operation.categoryID),
      amount: 0,
      count: 0,
      percent: 0,
      subcategories: [],
    }
    const subcategory =
      category.subcategories.find(item => item.key === subcategoryKey) ||
      createExpenseSubcategory(subcategoryKey, operation)

    category.amount += operation.sum
    category.count += 1
    subcategory.amount += operation.sum
    subcategory.count += 1

    if (!category.subcategories.some(item => item.key === subcategory.key)) {
      category.subcategories.push(subcategory)
    }

    categories.set(categoryKey, category)
  })

  return Array.from(categories.values())
    .map(category => ({
      ...category,
      percent: getSharePercent(category.amount, total),
      subcategories: category.subcategories
        .map(subcategory => ({
          ...subcategory,
          percent: getSharePercent(subcategory.amount, total),
        }))
        .sort((first, second) => second.amount - first.amount),
    }))
    .sort((first, second) => second.amount - first.amount)
}

function createExpenseSubcategory(key: string, operation: Operation): ExpenseSubcategoryGroup {
  return {
    key,
    name: operation.subcategoryID
      ? store.getSubcategory(operation.subcategoryID)?.name || 'Без подкатегории'
      : 'Без подкатегории',
    amount: 0,
    count: 0,
    percent: 0,
  }
}

function getSharePercent(amount: number, total: number) {
  return total > 0 ? (amount / total) * 100 : 0
}

</script>
