<template>
  <section class="analytics-page">
    <header class="page-head">
      <div class="page-head__text">
        <p class="eyebrow">Аналитика</p>
        <h1>По категориям</h1>

        <nav class="analytics-tabs" aria-label="Вид аналитики">
          <button class="analytics-tabs__item" type="button" @click="openExpenseAnalytics">Расходы</button>
          <button class="analytics-tabs__item analytics-tabs__item--active" type="button">По категориям</button>
        </nav>
      </div>

      <div class="page-head__actions">
        <fieldset class="segmented category-analytics__granularity">
          <legend class="visually-hidden">Группировка</legend>
          <button
            v-for="option in granularityOptions"
            :key="option.value"
            class="segmented__button"
            :class="{ 'segmented__button--active': option.value === granularity }"
            type="button"
            :aria-pressed="option.value === granularity"
            @click="selectGranularity(option.value)"
          >
            {{ option.label }}
          </button>
        </fieldset>
      </div>
    </header>

    <div v-if="categoryOptions.length === 0" class="card">
      <p class="empty-state">Категорий с расходами пока нет.</p>
    </div>

    <template v-else>
      <section class="card category-selector">
        <header class="card__head">
          <div>
            <p class="eyebrow">Категория</p>
            <h2>Что анализируем</h2>
          </div>
          <span class="card__hint">{{ formatOperationsCount(expenseOperations.length) }}</span>
        </header>

        <div class="category-analytics__picker" role="group" aria-label="Категория">
          <button
            v-for="option in categoryOptions"
            :key="option.key"
            class="chip"
            :class="{ 'period-switch__button--active': option.key === selectedCategoryKey }"
            type="button"
            :aria-pressed="option.key === selectedCategoryKey"
            @click="selectCategory(option.key)"
          >
            {{ option.name }}
          </button>
        </div>
      </section>

      <article class="card analytics-summary">
        <header class="card__head">
          <div>
            <p class="eyebrow">Категория</p>
            <h2>{{ selectedCategoryName }}</h2>
            <span>Расход за всё время</span>
          </div>
          <strong class="amount--expense">{{ formatMoney(summary.total, store.currencySymbol) }}</strong>
        </header>

        <div class="analytics-summary__stats">
          <div class="analytics-summary__stat">
            <span>{{ averageCaption }}</span>
            <strong>{{ formatMoney(summary.average, store.currencySymbol) }}</strong>
          </div>

          <div class="analytics-summary__stat">
            <span>{{ lastBucketTitle }}</span>
            <strong>{{ formatMoney(summary.lastAmount, store.currencySymbol) }}</strong>
          </div>

          <div class="analytics-summary__stat">
            <span>{{ changeCaption }}</span>
            <strong class="analytics-change" :class="getChangeClass(summary.percentChange)">
              {{ formatChangeHint(summary.change, summary.percentChange, store.currencySymbol) }}
            </strong>
          </div>
        </div>
      </article>

      <article v-if="hasSubcategories" class="card analytics-panel category-analytics__breakdown">
        <header class="card__head">
          <div>
            <p class="eyebrow">Детализация</p>
            <h2>Подкатегории</h2>
            <span>{{ formatSubcategoryCount(subcategoryRows.length) }}</span>
          </div>
        </header>

        <div class="expense-breakdown">
          <section
            v-for="row in subcategoryRows"
            :key="row.key"
            class="expense-breakdown__group category-analytics__subcategory"
          >
            <div class="expense-breakdown__row">
              <div class="breakdown-title">
                <strong>{{ row.name }}</strong>
                <span>{{ lastBucketTitle }}: {{ formatMoney(row.amount, store.currencySymbol) }}</span>
              </div>

              <div class="expense-breakdown__amount">
                <b>{{ formatMoney(row.total, store.currencySymbol) }}</b>
                <span>{{ formatPercent(row.share) }}</span>
              </div>
            </div>

            <div class="expense-share" aria-hidden="true">
              <span :style="{ width: `${row.share}%` }"></span>
            </div>

            <p
              class="category-analytics__change analytics-change"
              :class="getChangeClass(row.percentChange)"
            >
              <template v-if="row.percentChange === null && row.change === 0">
                Нет данных для сравнения
              </template>
              <template v-else>
                {{ formatChangeHint(row.change, row.percentChange, store.currencySymbol) }}
                {{ previousHint }}
              </template>
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
import { useFinanceStore } from '@/stores/finance'
import type { AnalyticsGranularity } from '@/types'
import { buildCategorySeries, summarizeAmounts } from '@/utils/analytics'
import type { CategorySeries } from '@/utils/analytics'
import { isValidDate } from '@/utils/date'
import {
  formatChangeHint,
  formatMoney,
  formatMonthTitle,
  formatOperationsCount,
  formatPercent,
  formatSubcategoryCount,
} from '@/utils/formatters'
import { buildCategoryBreakdown } from '@/utils/operations'
import { readAnalyticsGranularity, readOptionalMonthQuery } from '@/utils/routeQuery'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()

const granularityOptions: Array<{ value: AnalyticsGranularity; label: string }> = [
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

const returnMonth = computed(() => readOptionalMonthQuery(route.query.month))
const granularity = computed(() => readAnalyticsGranularity(route.query.granularity))
const isYearly = computed(() => granularity.value === 'year')
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
    expenseOperations.value.filter(operation => isCategoryVisible(operation.categoryID)),
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
    return { buckets: [], amounts: [], subcategories: [] }
  }

  return buildCategorySeries(
    expenseOperations.value,
    selectedCategoryKey.value,
    names,
    granularity.value,
  )
})
const summary = computed(() => summarizeAmounts(series.value.amounts))
const lastBucketTitle = computed(() => {
  const bucket = series.value.buckets.at(-1)

  if (!bucket) {
    return ''
  }

  return isYearly.value ? bucket : formatMonthTitle(bucket)
})
const bucketWord = computed(() => (isYearly.value ? 'год' : 'месяц'))
const previousWord = computed(() => (isYearly.value ? 'году' : 'месяцу'))
const averageCaption = computed(() => `В среднем в ${bucketWord.value}`)
const changeCaption = computed(() => `К предыдущему ${previousWord.value}`)
const previousHint = computed(() => `к предыдущему ${previousWord.value}`)
const subcategoryRows = computed(() =>
  series.value.subcategories
    .filter(subcategory => isSubcategoryVisible(subcategory.subcategoryID))
    .map(subcategory => {
      const subcategorySummary = summarizeAmounts(subcategory.amounts)

      return {
        key: subcategory.key,
        name: subcategory.name,
        isSubcategory: subcategory.subcategoryID !== null,
        total: subcategorySummary.total,
        amount: subcategorySummary.lastAmount,
        change: subcategorySummary.change,
        percentChange: subcategorySummary.percentChange,
        share:
          summary.value.total > 0 ? (subcategorySummary.total / summary.value.total) * 100 : 0,
      }
    }),
)
const hasSubcategories = computed(() => subcategoryRows.value.some(row => row.isSubcategory))

function isCategoryVisible(categoryID: string | null) {
  return Boolean(categoryID) && !store.getCategory(categoryID)?.isDeleted
}

function isSubcategoryVisible(subcategoryID: string | null) {
  return !store.getSubcategory(subcategoryID)?.isDeleted
}

function getChangeClass(percentChange: number | null) {
  if (!percentChange) {
    return 'analytics-change--flat'
  }

  return percentChange > 0 ? 'analytics-change--up' : 'analytics-change--down'
}

function navigate(changes: { category?: string; granularity?: AnalyticsGranularity }) {
  router.push({
    name: 'category-analytics',
    query: {
      ...(returnMonth.value ? { month: returnMonth.value } : {}),
      category: changes.category ?? selectedCategoryKey.value ?? '',
      granularity: changes.granularity ?? granularity.value,
    },
  })
}

function selectCategory(categoryKey: string) {
  navigate({ category: categoryKey })
}

function selectGranularity(value: AnalyticsGranularity) {
  navigate({ granularity: value })
}

function openExpenseAnalytics() {
  router.push({
    name: 'expense-analytics',
    query: {
      ...(returnMonth.value ? { month: returnMonth.value } : {}),
      expensePeriod: 'month',
    },
  })
}
</script>
