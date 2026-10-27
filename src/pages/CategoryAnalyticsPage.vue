<template>
  <section class="analytics-page">
    <header class="analytics-page__header">
      <button class="back-button" type="button" @click="goHome">Назад</button>

      <div>
        <h3>Аналитика</h3>
      </div>
    </header>

    <div v-if="categoryOptions.length === 0" class="panel">
      <p class="empty-state">Категорий с расходами пока нет.</p>
    </div>

    <template v-else>
      <fieldset class="period-switch category-analytics__picker">
        <legend>Категория</legend>
        <button
          v-for="option in categoryOptions"
          :key="option.key"
          type="button"
          :aria-pressed="option.key === selectedCategoryKey"
          :class="{ 'period-switch__button--active': option.key === selectedCategoryKey }"
          @click="selectCategory(option.key)"
        >
          {{ option.name }}
        </button>
      </fieldset>

      <section class="analytics-grid">
        <article class="panel analytics-summary">
          <div class="panel__header">
            <div>
              <h2>{{ selectedCategoryName }}</h2>
              <span>Расход за всё время</span>
            </div>
            <strong class="amount--expense">{{ formatMoney(summary.total, store.currencySymbol) }}</strong>
          </div>

          <div class="comparison">
            <div>
              <span>В среднем в месяц</span>
              <strong>{{ formatMoney(summary.average, store.currencySymbol) }}</strong>
            </div>
            <div>
              <span>{{ lastMonthTitle }}</span>
              <strong>{{ formatMoney(summary.lastAmount, store.currencySymbol) }}</strong>
            </div>
            <div>
              <span>К предыдущему месяцу</span>
              <strong class="analytics-change" :class="getChangeClass(summary.percentChange)">
                {{ formatSignedPercent(summary.percentChange) }}
              </strong>
            </div>
          </div>
        </article>

        <CategoryTrendChart :points="trendPoints" :average="summary.average" />
      </section>

      <article v-if="hasSubcategories" class="panel analytics-panel category-analytics__breakdown">
        <div class="panel__header">
          <div>
            <h2>Подкатегории</h2>
            <span>{{ formatSubcategoryCount(subcategoryRows.length) }}</span>
          </div>
        </div>

        <div class="expense-breakdown">
          <section
            v-for="row in subcategoryRows"
            :key="row.key"
            class="expense-breakdown__group category-analytics__subcategory"
          >
            <div class="expense-breakdown__row">
              <div>
                <strong>{{ row.name }}</strong>
                <span>{{ row.lastMonthTitle }}: {{ formatMoney(row.lastAmount, store.currencySymbol) }}</span>
              </div>

              <div class="expense-breakdown__amount">
                <b>{{ formatMoney(row.total, store.currencySymbol) }}</b>
                <span>{{ formatPercent(row.share) }}</span>
              </div>
            </div>

            <div class="expense-share" aria-hidden="true">
              <span :style="{ width: `${row.share}%` }"></span>
            </div>

            <p class="category-analytics__change analytics-change" :class="getChangeClass(row.percentChange)">
              {{ formatSignedPercent(row.percentChange) }} к предыдущему месяцу
            </p>
          </section>
        </div>
      </article>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CategoryTrendChart from '@/components/CategoryTrendChart.vue'
import { useFinanceStore } from '@/stores/finance'
import type { MonthlyAmount } from '@/types'
import { buildCategorySeries, summarizeAmounts } from '@/utils/analytics'
import type { CategorySeries } from '@/utils/analytics'
import { isValidDate } from '@/utils/date'
import {
  formatMoney,
  formatMonthTitle,
  formatPercent,
  formatSignedPercent,
  formatSubcategoryCount,
} from '@/utils/formatters'
import { buildCategoryBreakdown } from '@/utils/operations'
import { readOptionalMonthQuery } from '@/utils/routeQuery'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()

const returnMonth = computed(() => readOptionalMonthQuery(route.query.month))
const names = {
  getCategoryName: store.getCategoryName,
  getSubcategory: store.getSubcategory,
}

const expenseOperations = computed(() =>
  store.activeOperations.filter(
    operation => operation.type === 1 && isValidDate(new Date(operation.date)),
  ),
)
const categoryOptions = computed(() =>
  buildCategoryBreakdown(
    expenseOperations.value.filter(operation => operation.categoryID),
    names,
  ),
)
const selectedCategoryKey = computed(() => {
  const requested = typeof route.query.category === 'string' ? route.query.category : ''
  const matched = categoryOptions.value.find(option => option.key === requested)

  return matched?.key ?? categoryOptions.value[0]?.key ?? null
})
const selectedCategoryName = computed(
  () => categoryOptions.value.find(option => option.key === selectedCategoryKey.value)?.name ?? '',
)
const series = computed<CategorySeries>(() => {
  if (!selectedCategoryKey.value) {
    return { months: [], amounts: [], subcategories: [] }
  }

  return buildCategorySeries(expenseOperations.value, selectedCategoryKey.value, names)
})
const summary = computed(() => summarizeAmounts(series.value.amounts))
const trendPoints = computed<MonthlyAmount[]>(() =>
  series.value.months.map((month, index) => ({
    month,
    amount: series.value.amounts[index] ?? 0,
  })),
)
const lastMonthKey = computed(() => series.value.months.at(-1) ?? '')
const lastMonthTitle = computed(() =>
  lastMonthKey.value ? formatMonthTitle(lastMonthKey.value) : '',
)
const hasSubcategories = computed(() =>
  expenseOperations.value.some(
    operation => operation.subcategoryID && operation.categoryID === selectedCategoryKey.value,
  ),
)
const subcategoryRows = computed(() =>
  series.value.subcategories.map(subcategory => {
    const subcategorySummary = summarizeAmounts(subcategory.amounts)

    return {
      key: subcategory.key,
      name: subcategory.name,
      total: subcategorySummary.total,
      lastAmount: subcategorySummary.lastAmount,
      percentChange: subcategorySummary.percentChange,
      share: summary.value.total > 0 ? (subcategorySummary.total / summary.value.total) * 100 : 0,
      lastMonthTitle: lastMonthTitle.value,
    }
  }),
)

function getChangeClass(percentChange: number | null) {
  if (!percentChange) {
    return 'analytics-change--flat'
  }

  return percentChange > 0 ? 'analytics-change--up' : 'analytics-change--down'
}

function goHome() {
  router.push({
    name: 'dashboard',
    query: returnMonth.value ? { month: returnMonth.value } : {},
  })
}

function selectCategory(categoryKey: string) {
  router.push({
    name: 'category-analytics',
    query: {
      ...(returnMonth.value ? { month: returnMonth.value } : {}),
      category: categoryKey,
    },
  })
}
</script>
