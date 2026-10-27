<template>
  <section class="dashboard">
    <header class="dashboard__header">
      <div class="month-heading">
        <h2>{{ selectedMonthTitle }}</h2>

        <div class="month-heading__links">
          <button class="month-heading__link" type="button" @click="openCategoriesPage">
            Категории
          </button>
          <button class="month-heading__link" type="button" @click="openCategoryAnalyticsPage">
            Аналитика
          </button>
        </div>
      </div>

      <div class="header-actions">
        <!-- <button class="add-button" type="button" aria-label="Добавить запись" @click="clearDB">
          -
        </button> -->
        <button class="add-button" type="button" aria-label="Добавить запись" @click="openAddPage">
          +
        </button>



        <div class="balance-pill" :class="monthBalance >= 0 ? 'balance-pill--positive' : 'balance-pill--negative'">
          <span>Баланс месяца</span>
          <strong>{{ formatMoney(monthBalance, store.currencySymbol) }}</strong>
        </div>
      </div>
      <button class="sync-button" type="button" :disabled="isSyncing" @click="syncData">
          <span>{{ isSyncing ? 'Синхронизация' : '+' }}</span>
          <small v-if="syncMessage">{{ syncMessage }}</small>
        </button>
    </header>

    <section class="metrics" aria-label="Сводка доходов и расходов за месяц">
      <button class="metric-card metric-card--expense metric-card--button" type="button"
        @click="openExpenseAnalyticsPage">
        <div style="height: 100%; display: grid; align-items: start;">
          <div class="metric-card__topline">
            <span>Расход</span>
            <span class="metric-card__marker"></span>
          </div>
          <strong>{{ formatMoney(currentMonth.expense, store.currencySymbol) }}</strong>
        </div>
      </button>

      <ExpenseTrendChart :selected-month-key="selectedMonthKey" />
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
            <h3>Последние операции</h3>
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
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ExpenseTrendChart from '@/components/ExpenseTrendChart.vue'
import OperationListItem from '@/components/OperationListItem.vue'
import { syncFinanceData } from '@/services/financeSync'
import { useFinanceStore } from '@/stores/finance'
import { getMonthKey, shiftMonthKey } from '@/utils/date'
import { formatDate, formatMoney, formatMonthTitle } from '@/utils/formatters'
import { sortOperationsByDateDesc } from '@/utils/operations'
import { readMonthQuery } from '@/utils/routeQuery'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const isSyncing = ref(false)
const syncMessage = ref('')

const selectedMonthKey = computed(() => readMonthQuery(route.query.month, store.currentMonthKey))
const previousMonthKey = computed(() => shiftMonthKey(selectedMonthKey.value, -1))
const currentMonth = computed(() => store.getMonthlySummary(selectedMonthKey.value))
const previousMonth = computed(() => store.getMonthlySummary(previousMonthKey.value))
const monthBalance = computed(() => currentMonth.value.balance)
const selectedMonthTitle = computed(() => formatMonthTitle(selectedMonthKey.value))
const previousMonthTitle = computed(() => formatMonthTitle(previousMonthKey.value))

const recentOperations = computed(() =>
  sortOperationsByDateDesc(
    store.activeOperations.filter(
      operation => getMonthKey(new Date(operation.date)) === selectedMonthKey.value,
    ),
  ).slice(0, 5),
)

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

function openCategoriesPage() {
  router.push({
    name: 'categories',
    query: {
      month: selectedMonthKey.value,
    },
  })
}

function openCategoryAnalyticsPage() {
  router.push({
    name: 'category-analytics',
    query: {
      month: selectedMonthKey.value,
    },
  })
}

function openExpenseAnalyticsPage() {
  router.push({
    name: 'expense-analytics',
    query: {
      month: selectedMonthKey.value,
      expensePeriod: 'month',
    },
  })
}
async function syncData() {
  isSyncing.value = true
  syncMessage.value = ''

  try {
    const result = await syncFinanceData(store)

    if (result.status === 'uploaded') {
      syncMessage.value = 'Сервер обновлен'
    } else if (result.status === 'downloaded') {
      syncMessage.value = 'Загружено с сервера'
    } else {
      syncMessage.value = 'Все актуально'
    }
  } catch {
    syncMessage.value = 'Ошибка синхронизации'
  } finally {
    isSyncing.value = false
  }
}
</script>
