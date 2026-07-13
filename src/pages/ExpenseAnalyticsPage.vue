<template>
  <section class="analytics-page">
    <header class="analytics-page__header">
      <button class="back-button" type="button" @click="goHome">Назад</button>

      <div class="analytics-month">
        <button
          class="month-nav-button"
          type="button"
          :aria-label="previousPeriodLabel"
          @click="selectPreviousMonth"
        >
          ‹
        </button>

        <div>
          <p class="eyebrow">Аналитика расходов</p>
          <h1>{{ selectedPeriodTitle }}</h1>
        </div>

        <button
          v-if="hasNextPeriod"
          class="month-nav-button"
          type="button"
          :aria-label="nextPeriodLabel"
          @click="selectNextMonth"
        >
          ›
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
        <button
          v-for="option in analyticsPeriodOptions"
          :key="option.value"
          type="button"
          :class="{ 'period-switch__button--active': analyticsPeriod === option.value }"
          @click="setAnalyticsPeriod(option.value)"
        >
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
                <button
                  class="accordion-toggle"
                  type="button"
                  :class="{ 'accordion-toggle--open': isCategoryOpen(category.key) }"
                  :aria-label="`Показать ${category.name}`"
                  @click="toggleCategory(category.key)"
                >
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
              <article
                v-for="subcategory in category.subcategories"
                :key="subcategory.key"
                class="expense-subcategories__item"
              >
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

          <button
            v-if="hiddenExpenseGroupsCount > 0"
            class="load-more-button"
            type="button"
            @click="showAllExpenseGroups"
          >
            Показать больше
          </button>
        </div>
      </article>

      <article class="panel analytics-panel">
        <div class="panel__header">
          <div>
            <h2>Тенденция</h2>
            <span>{{ trendSubtitle }}</span>
          </div>
        </div>

        <div class="trend-legend" aria-label="Легенда графика">
          <span><i class="trend-legend__marker trend-legend__marker--current"></i>{{ trendCurrentLabel }}</span>
          <span><i class="trend-legend__marker trend-legend__marker--previous"></i>{{ trendPreviousLabel }}</span>
        </div>

        <div class="trend-chart">
          <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" role="img" aria-label="Тенденция расходов">
            <line
              class="trend-chart__baseline"
              :x1="chartPlotLeft"
              :x2="chartWidth - chartPlotRight"
              :y1="chartHeight - chartPlotBottom"
              :y2="chartHeight - chartPlotBottom"
            />
            <line
              v-if="currentMarkerX !== null"
              class="trend-chart__today"
              :x1="currentMarkerX"
              :x2="currentMarkerX"
              :y1="chartPlotTop"
              :y2="chartHeight - chartPlotBottom"
            />
            <polyline class="trend-chart__line trend-chart__line--previous" :points="previousTrendPoints" />
            <polyline class="trend-chart__line trend-chart__line--current" :points="currentTrendPoints" />

            <g v-for="label in chartLabels" :key="label.key">
              <line
                class="trend-chart__tick"
                :x1="label.x"
                :x2="label.x"
                :y1="chartHeight - chartPlotBottom"
                :y2="chartHeight - chartPlotBottom + 5"
              />
              <text class="trend-chart__label" :x="label.x" :y="chartHeight - 18">
                {{ label.label }}
              </text>
            </g>
          </svg>
        </div>

        <p class="trend-description">{{ trendDescription }}</p>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

type TrendPoint = {
  label: string
  value: number
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

const chartWidth = 720
const chartHeight = 260
const chartPlotLeft = 28
const chartPlotRight = 18
const chartPlotTop = 18
const chartPlotBottom = 48
const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

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

const trendData = computed(() =>
  analyticsPeriod.value === 'year'
    ? buildYearTrend(selectedYear.value)
    : buildMonthTrend(selectedMonthKey.value, previousMonthKey.value),
)
const trendSubtitle = computed(() =>
  analyticsPeriod.value === 'month' ? 'Текущий месяц к предыдущему' : 'Текущий год к предыдущему',
)
const trendCurrentLabel = computed(() =>
  analyticsPeriod.value === 'month' ? selectedMonthTitle.value : String(selectedYear.value),
)
const trendPreviousLabel = computed(() =>
  analyticsPeriod.value === 'month' ? formatMonthTitle(previousMonthKey.value) : String(selectedYear.value - 1),
)
const trendMaxValue = computed(() =>
  Math.max(
    ...trendData.value.current.map(point => point.value),
    ...trendData.value.previous.map(point => point.value),
    1,
  ),
)
const currentTrendDataLength = computed(() => getCurrentTrendDataLength(trendData.value.current.length))
const visibleCurrentTrendData = computed(() =>
  trendData.value.current.slice(0, currentTrendDataLength.value),
)
const currentTrendPoints = computed(() => getTrendPoints(visibleCurrentTrendData.value, trendData.value.current.length))
const previousTrendPoints = computed(() => getTrendPoints(trendData.value.previous))
const trendComparison = computed(() => {
  const index = currentTrendDataLength.value - 1
  const currentValue = index >= 0 ? trendData.value.current[index]?.value || 0 : 0
  const previousValue = index >= 0 ? trendData.value.previous[index]?.value || 0 : 0

  return {
    currentValue,
    difference: currentValue - previousValue,
    previousValue,
  }
})
const trendDescription = computed(() => {
  const { currentValue, difference, previousValue } = trendComparison.value
  const periodPointLabel = analyticsPeriod.value === 'year' ? 'к этому месяцу' : 'к этому дню'

  if (currentTrendDataLength.value === 0) {
    return 'За выбранный период пока нет данных для сравнения.'
  }

  if (previousValue === 0) {
    if (currentValue === 0) {
      return `Вы потратили ${periodPointLabel} столько же, сколько в прошлом периоде.`
    }

    return `Вы потратили ${periodPointLabel} на ${formatMoney(currentValue, store.currencySymbol)} больше, чем в прошлом периоде.`
  }

  const percentDifference = Math.abs((difference / previousValue) * 100)

  if (difference > 0) {
    return `Вы потратили ${periodPointLabel} на ${formatPercent(percentDifference)} больше, чем в прошлом периоде.`
  }

  if (difference < 0) {
    return `Вы потратили ${periodPointLabel} на ${formatPercent(percentDifference)} меньше, чем в прошлом периоде.`
  }

  return `Вы потратили ${periodPointLabel} столько же, сколько в прошлом периоде.`
})
const chartLabels = computed(() =>
  trendData.value.current.map((point, index, points) => ({
    key: `${point.label}:${index}`,
    label: point.label,
    x: getChartX(index, points.length),
  })),
)
const currentMarkerX = computed(() => {
  const today = new Date()

  if (analyticsPeriod.value === 'year') {
    return today.getFullYear() === selectedYear.value ? getChartX(today.getMonth(), 12) : null
  }

  if (getMonthKey(today) !== selectedMonthKey.value) {
    return null
  }

  return getChartX(today.getDate() - 1, trendData.value.current.length)
})

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

function buildMonthTrend(currentMonth: string, previousMonth: string) {
  return {
    current: getDailyExpenseTrend(currentMonth),
    previous: getDailyExpenseTrend(previousMonth),
  }
}

function buildYearTrend(year: number) {
  return {
    current: getMonthlyExpenseTrend(year),
    previous: getMonthlyExpenseTrend(year - 1),
  }
}

function getDailyExpenseTrend(month: string) {
  const amounts = Array.from({ length: getDaysInMonth(month) }, () => 0)

  store.activeOperations.forEach(operation => {
    const date = new Date(operation.date)

    if (operation.type === 1 && isValidDate(date) && getMonthKey(date) === month) {
      const dayIndex = date.getDate() - 1
      amounts[dayIndex] = (amounts[dayIndex] || 0) + operation.sum
    }
  })

  return createCumulativeTrend(amounts, index => String(index + 1))
}

function getMonthlyExpenseTrend(year: number) {
  const amounts = Array.from({ length: 12 }, () => 0)

  store.activeOperations.forEach(operation => {
    const date = new Date(operation.date)

    if (operation.type === 1 && isValidDate(date) && date.getFullYear() === year) {
      const monthIndex = date.getMonth()
      amounts[monthIndex] = (amounts[monthIndex] || 0) + operation.sum
    }
  })

  return createCumulativeTrend(amounts, index => monthLabels[index] || String(index + 1))
}

function createCumulativeTrend(amounts: number[], getLabel: (index: number) => string) {
  let total = 0

  return amounts.map((amount, index): TrendPoint => {
    total += amount

    return {
      label: getLabel(index),
      value: total,
    }
  })
}

function getDaysInMonth(month: string) {
  const [year, monthIndex] = month.split('-').map(Number)
  return new Date(year || 0, monthIndex || 1, 0).getDate()
}

function getCurrentTrendDataLength(totalLength: number) {
  const today = new Date()

  if (analyticsPeriod.value === 'year') {
    if (selectedYear.value > currentYear.value) {
      return 0
    }

    return selectedYear.value === currentYear.value ? today.getMonth() + 1 : totalLength
  }

  if (selectedMonthKey.value > store.currentMonthKey) {
    return 0
  }

  return selectedMonthKey.value === store.currentMonthKey ? today.getDate() : totalLength
}

function getTrendPoints(points: TrendPoint[], totalLength = points.length) {
  return points
    .map((point, index) => `${getChartX(index, totalLength)},${getChartY(point.value)}`)
    .join(' ')
}

function getChartX(index: number, count: number) {
  const plotWidth = chartWidth - chartPlotLeft - chartPlotRight

  if (count <= 1) {
    return chartPlotLeft
  }

  return chartPlotLeft + (plotWidth * index) / (count - 1)
}

function getChartY(value: number) {
  const plotHeight = chartHeight - chartPlotTop - chartPlotBottom
  return chartPlotTop + plotHeight - (value / trendMaxValue.value) * plotHeight
}
</script>
