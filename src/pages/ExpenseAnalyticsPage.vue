<template>
  <section class="analytics-page">
    <header class="page-head">
      <div class="page-head__text">
        <p class="eyebrow">Аналитика</p>

        <div class="page-head__title-row">
          <h1>{{ selectedPeriodTitle }}</h1>

          <div class="month-nav" aria-label="Выбор периода">
            <button class="month-nav__button" type="button" :aria-label="previousPeriodLabel" @click="selectPreviousMonth">
              <AppIcon name="chevron-left" :size="18" />
            </button>
            <button
              v-if="hasNextPeriod"
              class="month-nav__button"
              type="button"
              :aria-label="nextPeriodLabel"
              @click="selectNextMonth"
            >
              <AppIcon name="chevron-right" :size="18" />
            </button>
          </div>
        </div>

        <nav class="analytics-tabs" aria-label="Вид аналитики">
          <button class="analytics-tabs__item analytics-tabs__item--active" type="button">Расходы</button>
          <button class="analytics-tabs__item" type="button" @click="openCategoryAnalytics">По категориям</button>
        </nav>
      </div>

      <div class="page-head__actions">
        <div class="segmented" role="group" aria-label="Период аналитики">
          <button
            v-for="option in analyticsPeriodOptions"
            :key="option.value"
            class="segmented__button"
            :class="{ 'segmented__button--active': analyticsPeriod === option.value }"
            type="button"
            :aria-pressed="analyticsPeriod === option.value"
            @click="setAnalyticsPeriod(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </header>

    <section class="analytics-hero" aria-label="Сводка расходов">
      <div class="analytics-hero__main">
        <p class="eyebrow">{{ analyticsPeriodLabel }}</p>
        <!-- key заставляет iOS Safari перерисовать текст после смены периода/суммы -->
        <strong :key="`${analyticsPeriod}-${selectedMonthKey}-${totalExpense}`">
          {{ formatMoney(totalExpense, store.currencySymbol) }}
        </strong>
        <span>{{ formatOperationsCount(expenseOperations.length) }}</span>
      </div>

      <div class="analytics-hero__aside">
        <div class="analytics-hero__stat">
          <span>В среднем в {{ analyticsPeriod === 'year' ? 'месяц' : 'день' }}</span>
          <strong>{{ formatMoney(averageExpense, store.currencySymbol) }}</strong>
        </div>
        <div class="analytics-hero__stat">
          <span>Самая крупная категория</span>
          <strong>{{ topCategoryName }}</strong>
        </div>
      </div>
    </section>

    <section class="analytics-grid">
      <article class="card analytics-panel">
        <header class="card__head">
          <div>
            <p class="eyebrow">Структура</p>
            <h2>Расходы по категориям</h2>
            <span>{{ formatOperationsCount(expenseOperations.length) }}</span>
          </div>
          <strong class="amount--expense">{{ formatMoney(totalExpense, store.currencySymbol) }}</strong>
        </header>

        <p v-if="expenseGroups.length === 0" class="empty-state">За этот период расходов пока нет.</p>

        <div v-else class="expense-breakdown">
          <section v-for="category in visibleExpenseGroups" :key="category.key" class="expense-breakdown__group">
            <button
              class="expense-breakdown__toggle"
              type="button"
              :aria-label="`Показать ${category.name}`"
              :aria-expanded="isCategoryOpen(category.key)"
              @click="toggleCategory(category.key)"
            >
              <span class="breakdown-icon" aria-hidden="true">{{ store.getCategory(category.key)?.icon || '•' }}</span>

              <span class="breakdown-title">
                <strong>{{ category.name }}</strong>
                <span>{{ formatOperationsCount(category.count) }}</span>
              </span>

              <span class="expense-breakdown__amount">
                <b>{{ formatMoney(category.amount, store.currencySymbol) }}</b>
                <span>{{ formatPercent(category.percent) }}</span>
              </span>

              <span class="accordion-chevron" :class="{ 'accordion-chevron--open': isCategoryOpen(category.key) }" aria-hidden="true">
                ›
              </span>
            </button>

            <div class="expense-share" aria-hidden="true">
              <span :style="{ width: `${category.percent}%` }"></span>
            </div>

            <div v-if="isCategoryOpen(category.key)" class="expense-subcategories">
              <article v-for="subcategory in category.subcategories" :key="subcategory.key"
                class="expense-subcategories__item">
                <button class="expense-subcategories__toggle" type="button"
                  :class="{ 'expense-subcategories__toggle--open': isSubcategoryOpen(category.key, subcategory.key) }"
                  :aria-expanded="isSubcategoryOpen(category.key, subcategory.key)"
                  :aria-label="`${isSubcategoryOpen(category.key, subcategory.key) ? 'Скрыть' : 'Показать'} операции: ${subcategory.name}`"
                  @click="toggleSubcategory(category.key, subcategory.key)">
                  <span class="accordion-chevron accordion-chevron--small"
                    :class="{ 'accordion-chevron--open': isSubcategoryOpen(category.key, subcategory.key) }" aria-hidden="true">
                    ›
                  </span>

                  <span class="expense-subcategories__info">
                    <strong>{{ subcategory.name }}</strong>
                    <span>{{ formatOperationsCount(subcategory.count) }}</span>
                  </span>

                  <span class="expense-breakdown__amount">
                    <b>{{ formatMoney(subcategory.amount, store.currencySymbol) }}</b>
                    <span>{{ formatPercent(subcategory.percent) }}</span>
                  </span>
                </button>

                <div class="expense-share expense-share--subtle" aria-hidden="true">
                  <span :style="{ width: `${subcategory.percent}%` }"></span>
                </div>

                <ul v-if="isSubcategoryOpen(category.key, subcategory.key)"
                  class="operation-list operation-list--compact expense-subcategories__operations">
                  <OperationListItem
                    v-for="operation in subcategory.operations"
                    :key="operation.id"
                    :operation="operation"
                    :icon="store.getCategory(operation.categoryID)?.icon"
                    :title="formatOperationDateTime(operation.date)"
                    :subtitle="operation.note || undefined"
                    :time-label="store.getCategoryName(operation.categoryID)"
                    :amount-label="formatMoney(operation.sum, store.currencySymbol)"
                  />
                </ul>
              </article>
            </div>
          </section>

          <button v-if="hiddenExpenseGroupsCount > 0" class="load-more-button" type="button"
            @click="showAllExpenseGroups">
            Показать больше
          </button>
        </div>
      </article>

      <div class="analytics-charts">
        <ExpenseMonthlyHistogram v-if="analyticsPeriod === 'year'" :selected-year="selectedYear"
          @select-month="openMonthAnalytics" />
        <ExpenseTrendChart :period="analyticsPeriod" :selected-month-key="selectedMonthKey" />
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ExpenseMonthlyHistogram from '@/components/ExpenseMonthlyHistogram.vue'
import ExpenseTrendChart from '@/components/ExpenseTrendChart.vue'
import OperationListItem from '@/components/OperationListItem.vue'
import { useLoadMore } from '@/composables/useLoadMore'
import { useFinanceStore } from '@/stores/finance'
import type { ExpensePeriod, Operation } from '@/types'
import { toggleSetMember } from '@/utils/collections'
import { createMonthKey, getMonthKey, isValidDate, parseMonthKey, shiftMonthKey } from '@/utils/date'
import {
  formatMoney,
  formatMonthTitle,
  formatOperationDateTime,
  formatOperationsCount,
  formatPercent,
} from '@/utils/formatters'
import { buildCategoryBreakdown, sortOperationsByDateDesc } from '@/utils/operations'
import { readExpensePeriod, readMonthQuery } from '@/utils/routeQuery'

type ExpenseAmountGroup = {
  key: string
  name: string
  amount: number
  count: number
  percent: number
}

type ExpenseSubcategoryGroup = ExpenseAmountGroup & {
  operations: Operation[]
}

type ExpenseCategoryGroup = ExpenseAmountGroup & {
  subcategories: ExpenseSubcategoryGroup[]
}

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const openedCategories = ref(new Set<string>())
const openedSubcategories = ref(new Set<string>())
const expenseGroupsPreviewCount = 5

const analyticsPeriodOptions: Array<{ value: ExpensePeriod; label: string }> = [
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

const selectedMonthKey = computed(() => readMonthQuery(route.query.month, store.currentMonthKey))
const previousMonthKey = computed(() => shiftMonthKey(selectedMonthKey.value, -1))
const nextMonthKey = computed(() => shiftMonthKey(selectedMonthKey.value, 1))
const selectedYear = computed(() => parseMonthKey(selectedMonthKey.value).year)
const selectedMonthNumber = computed(() => parseMonthKey(selectedMonthKey.value).month)
const currentYear = computed(() => parseMonthKey(store.currentMonthKey).year)
const currentMonthNumber = computed(() => parseMonthKey(store.currentMonthKey).month)
const selectedMonthTitle = computed(() => formatMonthTitle(selectedMonthKey.value))
const analyticsPeriod = computed<ExpensePeriod>(() => readExpensePeriod(route.query.expensePeriod))
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
const averageExpense = computed(() => {
  if (analyticsPeriod.value === 'year') {
    const months = selectedYear.value === currentYear.value ? currentMonthNumber.value : 12
    return months > 0 ? totalExpense.value / months : 0
  }

  // Average per calendar day that has already passed in the selected month.
  const days = selectedMonthKey.value === store.currentMonthKey
    ? new Date().getDate()
    : new Date(selectedYear.value, selectedMonthNumber.value, 0).getDate()

  return days > 0 ? totalExpense.value / days : 0
})
const expenseGroups = computed(() => buildExpenseGroups(expenseOperations.value, totalExpense.value))
const topCategoryName = computed(() => expenseGroups.value[0]?.name ?? '—')
const {
  visibleItems: visibleExpenseGroups,
  hiddenCount: hiddenExpenseGroupsCount,
  showAll: showAllExpenseGroups,
  reset: resetExpenseGroupsVisibility,
} = useLoadMore(() => expenseGroups.value, () => expenseGroupsPreviewCount)

watch([selectedMonthKey, analyticsPeriod], () => {
  openedCategories.value = new Set()
  openedSubcategories.value = new Set()
  resetExpenseGroupsVisibility()
})

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

function openMonthAnalytics(month: string) {
  router.push({
    name: 'expense-analytics',
    query: {
      month,
      expensePeriod: 'month',
    },
  })
}

function setAnalyticsPeriod(period: ExpensePeriod) {
  router.push({
    name: 'expense-analytics',
    query: {
      month: selectedMonthKey.value,
      expensePeriod: period,
    },
  })
}

function openCategoryAnalytics() {
  router.push({
    name: 'category-analytics',
    query: {
      month: selectedMonthKey.value,
      granularity: analyticsPeriod.value === 'year' ? 'year' : 'month',
    },
  })
}

function toggleCategory(key: string) {
  openedCategories.value = toggleSetMember(openedCategories.value, key)
}

function isCategoryOpen(key: string) {
  return openedCategories.value.has(key)
}

function toggleSubcategory(categoryKey: string, subcategoryKey: string) {
  openedSubcategories.value = toggleSetMember(
    openedSubcategories.value,
    getSubcategoryToggleKey(categoryKey, subcategoryKey),
  )
}

function isSubcategoryOpen(categoryKey: string, subcategoryKey: string) {
  return openedSubcategories.value.has(getSubcategoryToggleKey(categoryKey, subcategoryKey))
}

function getSubcategoryToggleKey(categoryKey: string, subcategoryKey: string) {
  return `${categoryKey}:${subcategoryKey}`
}

function buildExpenseGroups(operations: Operation[], total: number): ExpenseCategoryGroup[] {
  return buildCategoryBreakdown(operations, {
    getCategoryName: store.getCategoryName,
    getSubcategory: store.getSubcategory,
  })
    .map(category => ({
      key: category.key,
      name: category.name,
      amount: category.expense,
      count: category.count,
      percent: getSharePercent(category.expense, total),
      subcategories: category.subcategories
        .map(subcategory => ({
          key: subcategory.key,
          name: subcategory.name,
          amount: subcategory.expense,
          count: subcategory.count,
          percent: getSharePercent(subcategory.expense, total),
          operations: sortOperationsByDateDesc(subcategory.operations),
        }))
        .sort((first, second) => second.amount - first.amount),
    }))
    .sort((first, second) => second.amount - first.amount)
}

function getSharePercent(amount: number, total: number) {
  return total > 0 ? (amount / total) * 100 : 0
}
</script>
