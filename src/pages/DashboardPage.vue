<template>
  <section class="dashboard">
    <header class="page-head">
      <div class="page-head__text">
        <p class="eyebrow">Обзор</p>

        <div class="page-head__title-row">
          <h1>{{ selectedMonthTitle }}</h1>

          <div class="month-nav" aria-label="Выбор месяца">
            <button class="month-nav__button" type="button" aria-label="Предыдущий месяц" @click="selectPreviousMonth">
              <AppIcon name="chevron-left" :size="18" />
            </button>
            <button
              class="month-nav__button"
              type="button"
              aria-label="Следующий месяц"
              :disabled="!hasNextMonth"
              @click="selectNextMonth"
            >
              <AppIcon name="chevron-right" :size="18" />
            </button>
          </div>
        </div>

        <div class="page-head__links">
          <button class="text-link" type="button" @click="openCategoriesPage">Категории</button>
          <span class="text-link__dot" aria-hidden="true">·</span>
          <button class="text-link" type="button" @click="openExpenseAnalyticsPage">Аналитика</button>
        </div>
      </div>

      <div class="page-head__actions">
        <button
          class="button button--ghost sync-button"
          :class="{ 'sync-button--error': syncError }"
          type="button"
          :disabled="isSyncing"
          @click="syncData"
        >
          <AppIcon name="refresh" :size="17" />
          <span>{{ isSyncing ? 'Обновление…' : 'Обновить' }}</span>
          <small v-if="syncMessage">{{ syncMessage }}</small>
        </button>

        <button class="button button--primary add-button" type="button" @click="openAddPage">
          <AppIcon name="plus" :size="18" />
          <span>Новая операция</span>
        </button>
      </div>
    </header>

    <section class="hero" aria-label="Итоги месяца">
      <div class="hero__body">
        <div class="hero__main">
          <p class="hero__label">Баланс месяца</p>
          <strong class="hero__amount" :class="{ 'hero__amount--negative': monthBalance < 0 }">
            {{ formatMoney(monthBalance, store.currencySymbol) }}
          </strong>
          <p class="hero__note">{{ heroNote }}</p>
        </div>

        <div class="hero__stats">
          <div class="hero-stat">
            <span>Доходы</span>
            <strong>{{ formatMoney(currentMonth.income, store.currencySymbol) }}</strong>
          </div>
          <div class="hero-stat">
            <span>Расходы</span>
            <strong>{{ formatMoney(currentMonth.expense, store.currencySymbol) }}</strong>
          </div>
          <div class="hero-stat">
            <span>Норма сбережений</span>
            <strong>{{ savingsRateLabel }}</strong>
          </div>
        </div>
      </div>

      <div class="hero__meter" aria-hidden="true">
        <span class="hero__meter-label">{{ heroMeterLabel }}</span>
        <span class="hero__meter-track">
          <span class="hero__meter-fill" :style="{ width: `${expenseShare}%` }"></span>
        </span>
      </div>
    </section>

    <div class="dashboard__grid">
      <div class="dashboard__main">
        <ExpenseTrendChart :selected-month-key="selectedMonthKey" />

        <section class="card recent-card">
          <header class="card__head">
            <div>
              <p class="eyebrow">Движение</p>
              <h2>Последние операции</h2>
            </div>
            <button class="text-link" type="button" @click="openOperationsPage">Все операции</button>
          </header>

          <p v-if="recentOperations.length === 0" class="empty-state">
            За этот месяц операций пока нет. Добавьте первую запись — и здесь появится история.
          </p>

          <ul v-else class="operation-list operation-list--recent">
            <OperationListItem
              v-for="operation in recentOperations"
              :key="operation.id"
              :operation="operation"
              :icon="store.getCategory(operation.categoryID)?.icon"
              :title="store.getCategoryName(operation.categoryID)"
              :subtitle="operation.subcategoryID ? store.getSubcategory(operation.subcategoryID)?.name : undefined"
              :time-label="formatDate(operation.date)"
              :amount-label="formatMoney(operation.sum, store.currencySymbol)"
            />
          </ul>
        </section>
      </div>

      <aside class="dashboard__side">
        <section class="card categories-card">
          <header class="card__head">
            <div>
              <p class="eyebrow">Структура</p>
              <h2>Куда уходят деньги</h2>
            </div>
            <button class="text-link" type="button" @click="openExpenseAnalyticsPage">Подробнее</button>
          </header>

          <p v-if="topCategories.length === 0" class="empty-state">
            В этом месяце расходов ещё не было.
          </p>

          <div v-else class="spending-list">
            <div v-for="category in topCategories" :key="category.id" class="spending-row">
              <span class="spending-row__icon" aria-hidden="true">{{ category.icon || '•' }}</span>

              <div class="spending-row__main">
                <div class="spending-row__line">
                  <strong>{{ category.name }}</strong>
                  <b>{{ formatMoney(category.amount, store.currencySymbol) }}</b>
                </div>
                <span class="share-bar" aria-hidden="true">
                  <span :style="{ width: `${Math.max(category.share, 2)}%` }"></span>
                </span>
                <span class="spending-row__meta">
                  {{ formatPercent(category.share) }} · {{ formatOperationsCount(category.count) }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section class="card recap-card">
          <header class="card__head">
            <div>
              <p class="eyebrow">Сравнение</p>
              <h2>{{ previousMonthTitle }}</h2>
            </div>
          </header>

          <dl class="recap">
            <div>
              <dt>Доходы</dt>
              <dd class="amount--income">{{ formatMoney(previousMonth.income, store.currencySymbol) }}</dd>
            </div>
            <div>
              <dt>Расходы</dt>
              <dd class="amount--expense">{{ formatMoney(previousMonth.expense, store.currencySymbol) }}</dd>
            </div>
            <div>
              <dt>Баланс</dt>
              <dd :class="previousMonth.balance >= 0 ? 'amount--income' : 'amount--expense'">
                {{ formatMoney(previousMonth.balance, store.currencySymbol) }}
              </dd>
            </div>
          </dl>

          <p class="recap__hint">{{ expenseComparisonText }}</p>
        </section>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import ExpenseTrendChart from '@/components/ExpenseTrendChart.vue'
import OperationListItem from '@/components/OperationListItem.vue'
import { requestAppUpdate } from '@/services/appUpdate'
import { syncFinanceData } from '@/services/financeSync'
import { useFinanceStore } from '@/stores/finance'
import { getMonthKey, shiftMonthKey } from '@/utils/date'
import {
  formatDate,
  formatMoney,
  formatMonthTitle,
  formatOperationsCount,
  formatPercent,
} from '@/utils/formatters'
import { buildCategoryBreakdown, sortOperationsByDateDesc } from '@/utils/operations'
import { readMonthQuery } from '@/utils/routeQuery'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const isSyncing = ref(false)
const syncMessage = ref('')
const syncError = ref(false)

const selectedMonthKey = computed(() => readMonthQuery(route.query.month, store.currentMonthKey))
const previousMonthKey = computed(() => shiftMonthKey(selectedMonthKey.value, -1))
const currentMonth = computed(() => store.getMonthlySummary(selectedMonthKey.value))
const previousMonth = computed(() => store.getMonthlySummary(previousMonthKey.value))
const monthBalance = computed(() => currentMonth.value.balance)
const selectedMonthTitle = computed(() => formatMonthTitle(selectedMonthKey.value))
const previousMonthTitle = computed(() => formatMonthTitle(previousMonthKey.value))
const hasNextMonth = computed(() => selectedMonthKey.value < store.currentMonthKey)
const savingsRate = computed(() =>
  currentMonth.value.income > 0 ? Math.round((monthBalance.value / currentMonth.value.income) * 100) : 0,
)
const savingsRateLabel = computed(() =>
  currentMonth.value.income > 0 ? `${savingsRate.value}%` : '—',
)
const expenseShare = computed(() => {
  if (currentMonth.value.income <= 0) {
    return currentMonth.value.expense > 0 ? 100 : 0
  }

  return Math.min(100, Math.round((currentMonth.value.expense / currentMonth.value.income) * 100))
})
const heroNote = computed(() => {
  if (currentMonth.value.income === 0 && currentMonth.value.expense === 0) {
    return 'Пока нет операций за этот месяц'
  }

  if (currentMonth.value.income === 0) {
    return 'Доходы в этом месяце не внесены'
  }

  return monthBalance.value >= 0
    ? `Доходы покрывают расходы за ${selectedMonthTitle.value.toLowerCase()}`
    : `Расходы больше доходов за ${selectedMonthTitle.value.toLowerCase()}`
})
const heroMeterLabel = computed(() => {
  if (currentMonth.value.income > 0) {
    return `Из дохода потрачено ${expenseShare.value}%`
  }

  return currentMonth.value.expense > 0
    ? 'Доходы не внесены — процент не посчитать'
    : 'Добавьте первую операцию, чтобы увидеть динамику'
})

const recentOperations = computed(() =>
  sortOperationsByDateDesc(
    store.activeOperations.filter(
      operation => getMonthKey(new Date(operation.date)) === selectedMonthKey.value,
    ),
  ).slice(0, 5),
)

const monthExpenses = computed(() =>
  store.activeOperations.filter(operation => {
    if (operation.type !== 1) {
      return false
    }

    const date = new Date(operation.date)
    return !Number.isNaN(date.getTime()) && getMonthKey(date) === selectedMonthKey.value
  }),
)

const topCategories = computed(() => {
  const total = monthExpenses.value.reduce((sum, operation) => sum + operation.sum, 0)

  return buildCategoryBreakdown(monthExpenses.value, {
    getCategoryName: store.getCategoryName,
    getSubcategory: store.getSubcategory,
  })
    .slice(0, 5)
    .map(category => ({
      id: category.key,
      name: category.name,
      icon: store.getCategory(category.key)?.icon,
      amount: category.expense,
      count: category.count,
      share: total > 0 ? (category.expense / total) * 100 : 0,
    }))
})

const expenseComparisonText = computed(() => {
  const current = currentMonth.value.expense
  const previous = previousMonth.value.expense

  if (previous === 0) {
    return current > 0
      ? 'Это первый месяц с расходами — сравнивать пока не с чем.'
      : 'В прошлом месяце расходов тоже не было.'
  }

  const difference = current - previous
  const percent = Math.abs(Math.round((difference / previous) * 100))

  if (difference === 0) {
    return 'Расходы держатся на уровне прошлого месяца.'
  }

  return difference > 0
    ? `Расходы выросли на ${percent}% к прошлому месяцу.`
    : `Расходы снизились на ${percent}% к прошлому месяцу.`
})

function selectMonth(month: string) {
  router.push({
    name: 'dashboard',
    query: {
      month,
    },
  })
}

function selectPreviousMonth() {
  selectMonth(previousMonthKey.value)
}

function selectNextMonth() {
  if (!hasNextMonth.value) {
    return
  }

  selectMonth(shiftMonthKey(selectedMonthKey.value, 1))
}

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
  syncError.value = false

  try {
    const result = await syncFinanceData(store)

    if (result.status === 'uploaded') {
      syncMessage.value = 'Сервер обновлен'
    } else if (result.status === 'downloaded') {
      syncMessage.value = 'Загружено с сервера'
    } else {
      syncMessage.value = 'Все актуально'
    }
  } catch (error) {
    syncMessage.value = describeSyncError(error)
    syncError.value = true
  } finally {
    isSyncing.value = false
  }

  // Новую версию приложения просим только по этой кнопке.
  if (await requestAppUpdate()) {
    location.reload()
  }
}

function describeSyncError(error: unknown) {
  if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return 'Нет связи с сервером'
  }

  if (error instanceof TypeError) {
    return 'Нет связи с сервером'
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Ошибка синхронизации'
}
</script>
