<template>
  <section class="dashboard">
    <header class="dashboard__header">
      <div class="month-heading">
        <p class="eyebrow">Личный бюджет</p>
        <h1>{{ selectedMonthTitle }}</h1>
      </div>

      <div class="header-actions">
        <button class="add-button" type="button" aria-label="Добавить запись" @click="openAddPage">
          +
        </button>

        <div class="balance-pill" :class="monthBalance >= 0 ? 'balance-pill--positive' : 'balance-pill--negative'">
          <span>Баланс месяца</span>
          <strong>{{ formatMoney(monthBalance, store.currencySymbol) }}</strong>
        </div>
      </div>
    </header>

    <section class="metrics" aria-label="Сводка доходов и расходов за месяц">
      <article class="metric-card metric-card--income">
        <div class="metric-card__topline">
          <span>Доход</span>
          <span class="metric-card__marker"></span>
        </div>
        <strong>{{ formatMoney(currentMonth.income, store.currencySymbol) }}</strong>
        <p>{{ formatOperationsCount(currentMonth.count) }} за месяц</p>
      </article>

      <article class="metric-card metric-card--expense">
        <div class="metric-card__topline">
          <span>Расход</span>
          <span class="metric-card__marker"></span>
        </div>
        <strong>{{ formatMoney(currentMonth.expense, store.currencySymbol) }}</strong>
        <p class="expense-trend" :class="expenseTrendClass">{{ expenseTrendText }}</p>
      </article>
    </section>

    <section class="details-grid">
      <article class="panel">
        <div class="panel__header">
          <h2>Динамика</h2>
          <span>{{ previousMonthTitle }}</span>
        </div>

        <div class="comparison">
          <div>
            <span>Доход прошлого месяца</span>
            <strong>{{ formatMoney(previousMonth.income, store.currencySymbol) }}</strong>
          </div>
          <div>
            <span>Расход прошлого месяца</span>
            <strong>{{ formatMoney(previousMonth.expense, store.currencySymbol) }}</strong>
          </div>
        </div>
      </article>

      <article class="panel">
        <div class="panel__header">
          <div>
            <h2>Последние операции</h2>
            <span>{{ recentOperations.length }}</span>
          </div>
          <button class="panel-link-button" type="button" @click="openOperationsPage">Все операции</button>
        </div>

        <p v-if="recentOperations.length === 0" class="empty-state">За этот месяц операций пока нет.</p>

        <ul v-else class="operation-list">
          <OperationListItem
            v-for="operation in recentOperations"
            :key="operation.id"
            :operation="operation"
            :title="store.getCategoryName(operation.categoryID)"
            :subtitle="operation.subcategoryID ? store.getSubcategory(operation.subcategoryID)?.name : undefined"
            :time-label="formatDate(operation.date)"
            :amount-label="formatMoney(operation.sum, store.currencySymbol)"
          />
        </ul>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import OperationListItem from '@/components/OperationListItem.vue'
import { useFinanceStore } from '@/stores/finance'
import { getMonthKey, isValidMonthKey, shiftMonthKey } from '@/utils/date'
import { formatDate, formatMoney, formatMonthTitle, formatOperationsCount } from '@/utils/formatters'
import { getExpenseTrend } from '@/utils/monthly'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()

const selectedMonthKey = computed(() => {
  const month = typeof route.query.month === 'string' ? route.query.month : null
  return isValidMonthKey(month) ? month : store.currentMonthKey
})
const previousMonthKey = computed(() => shiftMonthKey(selectedMonthKey.value, -1))
const currentMonth = computed(() => store.getMonthlySummary(selectedMonthKey.value))
const previousMonth = computed(() => store.getMonthlySummary(previousMonthKey.value))
const monthBalance = computed(() => currentMonth.value.balance)
const selectedMonthTitle = computed(() => formatMonthTitle(selectedMonthKey.value))
const previousMonthTitle = computed(() => formatMonthTitle(previousMonthKey.value))

const recentOperations = computed(() =>
  store.activeOperations
    .filter(operation => getMonthKey(new Date(operation.date)) === selectedMonthKey.value)
    .slice()
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, 5),
)

const expenseTrend = computed(() => getExpenseTrend(currentMonth.value, previousMonth.value))

const expenseTrendText = computed(() => expenseTrend.value.text)
const expenseTrendClass = computed(() => `expense-trend--${expenseTrend.value.tone}`)

function openAddPage() {
  router.push({
    name: 'operation-add',
    query: {
      month: selectedMonthKey.value,
      from: 'dashboard',
    },
  })
}

function openOperationsPage() {
  router.push({
    name: 'operations',
    query: {
      month: selectedMonthKey.value,
      period: 'day',
    },
  })
}
</script>
