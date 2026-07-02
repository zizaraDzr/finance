<template>
  <main class="app-shell">
    <section v-if="isDashboardPage" class="dashboard">
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
            <strong>{{ formatMoney(monthBalance) }}</strong>
          </div>
        </div>
      </header>

      <section class="metrics" aria-label="Сводка доходов и расходов за месяц">
        <article class="metric-card metric-card--income">
          <div class="metric-card__topline">
            <span>Доход</span>
            <span class="metric-card__marker"></span>
          </div>
          <strong>{{ formatMoney(currentMonth.income) }}</strong>
          <p>{{ formatOperationsCount(currentMonth.count) }} за месяц</p>
        </article>

        <article class="metric-card metric-card--expense">
          <div class="metric-card__topline">
            <span>Расход</span>
            <span class="metric-card__marker"></span>
          </div>
          <strong>{{ formatMoney(currentMonth.expense) }}</strong>
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
              <strong>{{ formatMoney(previousMonth.income) }}</strong>
            </div>
            <div>
              <span>Расход прошлого месяца</span>
              <strong>{{ formatMoney(previousMonth.expense) }}</strong>
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
            <li v-for="operation in recentOperations" :key="operation.id">
              <div class="operation-main">
                <div class="operation-text">
                  <strong>{{ store.getCategoryName(operation.categoryID) }}</strong>
                  <span v-if="operation.subcategoryID">{{ store.getSubcategory(operation.subcategoryID)?.name }}</span>
                  <span>{{ formatDate(operation.date) }}</span>
                </div>

                <div class="operation-side">
                  <b :class="operation.type === 0 ? 'amount--income' : 'amount--expense'">
                    {{ operation.type === 0 ? '+' : '-' }}{{ formatMoney(operation.sum) }}
                  </b>
                </div>
              </div>
            </li>
          </ul>
        </article>
      </section>
    </section>

    <section v-else-if="isOperationsPage" class="operations-page">
      <header class="operations-page__header">
        <button class="back-button" type="button" @click="goHome(selectedMonthKey)">Назад</button>
        <div>
          <p class="eyebrow">Детальный просмотр</p>
          <h1>Операции</h1>
        </div>
      </header>

      <section class="operations-toolbar" aria-label="Фильтры операций">
        <div class="operations-total" :class="operationsSummary.balance >= 0 ? 'operations-total--positive' : 'operations-total--negative'">
          <span>{{ formatOperationsCount(sortedOperations.length) }}</span>
          <strong>{{ formatMoney(operationsSummary.balance) }}</strong>
        </div>

        <fieldset class="period-switch">
          <legend>Период</legend>
          <button
            v-for="option in periodOptions"
            :key="option.value"
            type="button"
            :class="{ 'period-switch__button--active': operationsPeriod === option.value }"
            @click="setOperationsPeriod(option.value)"
          >
            {{ option.label }}
          </button>
        </fieldset>
      </section>

      <p v-if="operationGroups.length === 0" class="empty-state">Операций пока нет.</p>

      <section v-else class="operations-groups">
        <article v-for="group in operationGroups" :key="group.key" class="operations-period">
          <header class="operations-period__header">
            <div>
              <p>{{ group.subtitle }}</p>
              <h2>{{ group.title }}</h2>
            </div>

            <div class="period-summary">
              <span>Доход <b class="amount--income">{{ formatMoney(group.income) }}</b></span>
              <span>Расход <b class="amount--expense">{{ formatMoney(group.expense) }}</b></span>
            </div>
          </header>

          <ul v-if="operationsPeriod === 'day'" class="operation-list operation-list--detail">
            <li v-for="operation in group.operations" :key="operation.id">
              <div class="operation-main">
                <div class="operation-text">
                  <strong>{{ store.getCategoryName(operation.categoryID) }}</strong>
                  <span v-if="operation.subcategoryID">{{ store.getSubcategory(operation.subcategoryID)?.name }}</span>
                  <span>{{ formatOperationTime(operation.date) }}</span>
                </div>

                <div class="operation-side">
                  <b :class="operation.type === 0 ? 'amount--income' : 'amount--expense'">
                    {{ operation.type === 0 ? '+' : '-' }}{{ formatMoney(operation.sum) }}
                  </b>

                  <div class="operation-actions">
                    <button type="button" :aria-label="`Редактировать ${store.getCategoryName(operation.categoryID)}`" @click="openEditPage(operation)">
                      Изм.
                    </button>
                    <button type="button" :aria-label="`Удалить ${store.getCategoryName(operation.categoryID)}`" @click="removeOperation(operation)">
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            </li>
          </ul>

          <div v-else class="category-breakdown">
            <section v-for="category in group.categories" :key="category.key" class="category-breakdown__group">
              <div class="category-breakdown__header">
                <div class="breakdown-title">
                  <button
                    class="accordion-toggle"
                    type="button"
                    :class="{ 'accordion-toggle--open': isAccordionOpen(getCategoryAccordionKey(group.key, category.key)) }"
                    :aria-label="`Показать ${category.name}`"
                    @click="toggleAccordion(getCategoryAccordionKey(group.key, category.key))"
                  >
                    <span class="accordion-chevron">›</span>
                  </button>

                  <div>
                    <strong>{{ category.name }}</strong>
                    <span>{{ formatOperationsCount(category.count) }}</span>
                  </div>
                </div>

                <div class="period-summary period-summary--compact">
                  <span>Доход <b class="amount--income">{{ formatMoney(category.income) }}</b></span>
                  <span>Расход <b class="amount--expense">{{ formatMoney(category.expense) }}</b></span>
                </div>
              </div>

              <div v-if="isAccordionOpen(getCategoryAccordionKey(group.key, category.key))" class="subcategory-breakdown">
                <article v-for="subcategory in category.subcategories" :key="subcategory.key" class="subcategory-breakdown__group">
                  <div class="subcategory-breakdown__header">
                    <div class="breakdown-title">
                      <button
                        class="accordion-toggle accordion-toggle--subtle"
                        type="button"
                        :class="{ 'accordion-toggle--open': isAccordionOpen(getSubcategoryAccordionKey(group.key, category.key, subcategory.key)) }"
                        :aria-label="`Показать ${subcategory.name}`"
                        @click="toggleAccordion(getSubcategoryAccordionKey(group.key, category.key, subcategory.key))"
                      >
                        <span class="accordion-chevron">›</span>
                      </button>

                      <div>
                        <strong>{{ subcategory.name }}</strong>
                        <span>{{ formatOperationsCount(subcategory.count) }}</span>
                      </div>
                    </div>

                    <b :class="subcategory.balance >= 0 ? 'amount--income' : 'amount--expense'">{{ formatMoney(subcategory.balance) }}</b>
                  </div>

                  <ul v-if="isAccordionOpen(getSubcategoryAccordionKey(group.key, category.key, subcategory.key))" class="operation-list operation-list--compact">
                    <li v-for="operation in subcategory.operations" :key="operation.id">
                      <div class="operation-main">
                        <div class="operation-text">
                          <strong>{{ formatOperationDateTime(operation.date) }}</strong>
                          <span v-if="operation.note">{{ operation.note }}</span>
                        </div>

                        <div class="operation-side">
                          <b :class="operation.type === 0 ? 'amount--income' : 'amount--expense'">
                            {{ operation.type === 0 ? '+' : '-' }}{{ formatMoney(operation.sum) }}
                          </b>

                          <div class="operation-actions">
                            <button type="button" :aria-label="`Редактировать ${store.getCategoryName(operation.categoryID)}`" @click="openEditPage(operation)">
                              Изм.
                            </button>
                            <button type="button" :aria-label="`Удалить ${store.getCategoryName(operation.categoryID)}`" @click="removeOperation(operation)">
                              Удалить
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </article>
              </div>
            </section>
          </div>
        </article>
      </section>
    </section>

    <section v-else class="add-page">
      <header class="add-page__header">
        <button class="back-button" type="button" @click="goBackFromForm()">Назад</button>
        <div>
          <p class="eyebrow">{{ isEditPage ? 'Редактирование' : 'Новая операция' }}</p>
          <h1>{{ isEditPage ? 'Редактировать запись' : 'Добавить запись' }}</h1>
        </div>
      </header>

      <form class="operation-form" @submit.prevent="submitOperation">
        <label class="field field--amount">
          <span>Сумма</span>
          <input v-model.number="form.sum" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0" autofocus />
        </label>

        <fieldset class="type-switch">
          <legend>Тип операции</legend>
          <label :class="{ 'type-switch__item--active': form.type === 1 }">
            <input v-model="form.type" type="radio" :value="1" @change="resetCategorySelection" />
            <span>Расход</span>
          </label>
          <label :class="{ 'type-switch__item--active': form.type === 0 }">
            <input v-model="form.type" type="radio" :value="0" @change="resetCategorySelection" />
            <span>Доход</span>
          </label>
        </fieldset>

        <section class="category-picker" aria-labelledby="category-picker-title">
          <div class="category-picker__header">
            <span id="category-picker-title">Категория</span>
            <b v-if="selectedCategory">{{ selectedCategory.label }}</b>
          </div>

          <div class="category-list">
            <article v-for="group in categoryGroups" :key="group.id" class="category-group">
              <div class="category-row">
                <div>
                  <strong>{{ group.name }}</strong>
                  <span v-if="group.subcategories.length">
                    {{ formatSubcategoryCount(group.subcategories.length) }}
                  </span>
                </div>

                <button
                  v-if="group.subcategories.length === 0"
                  class="category-select"
                  type="button"
                  :class="{ 'category-select--active': isCategorySelected(group.option) }"
                  @click="selectCategory(group.option)"
                >
                  {{ isCategorySelected(group.option) ? 'Выбрано' : 'Выбрать' }}
                </button>
              </div>

              <div v-if="group.subcategories.length" class="subcategory-list">
                <button
                  v-for="option in group.subcategories"
                  :key="option.value"
                  class="subcategory-button"
                  type="button"
                  :class="{ 'subcategory-button--active': isCategorySelected(option) }"
                  @click="selectCategory(option)"
                >
                  {{ option.name }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <label class="field">
          <span>Дата</span>
          <input v-model="form.date" type="date" />
        </label>

        <p v-if="formError" class="form-error">{{ formError }}</p>

        <button class="submit-button" type="submit">{{ isEditPage ? 'Сохранить' : 'Добавить' }}</button>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import defaultData from '../default.json'
import { useFinanceStore } from '@/stores/finance'
import type { Operation } from '@/types'

type CategoryOption = {
  value: string
  label: string
  name: string
  categoryID: string
  subcategoryID: string | null
}

type CategoryGroup = {
  id: string
  name: string
  option: CategoryOption
  subcategories: CategoryOption[]
}

type OperationsPeriod = 'day' | 'week' | 'month' | 'year'

type PeriodOption = {
  value: OperationsPeriod
  label: string
}

type OperationSummary = {
  income: number
  expense: number
  balance: number
  count: number
}

type OperationSubcategoryGroup = OperationSummary & {
  key: string
  name: string
  operations: Operation[]
}

type OperationCategoryGroup = OperationSummary & {
  key: string
  name: string
  subcategories: OperationSubcategoryGroup[]
}

type OperationPeriodGroup = OperationSummary & {
  key: string
  title: string
  subtitle: string
  operations: Operation[]
  categories: OperationCategoryGroup[]
}

const store = useFinanceStore()
const routePath = ref(normalizePath(window.location.pathname))
const selectedMonthKey = ref(getMonthFromUrl() || store.currentMonthKey)
const editingOperationId = ref(getOperationIdFromUrl())
const operationsPeriod = ref<OperationsPeriod>(getOperationsPeriodFromUrl() || 'day')
const openedAccordions = ref(new Set<string>())
const formError = ref('')
const form = ref({
  sum: null as number | null,
  type: 1,
  categoryValue: '',
  date: formatDateInput(new Date()),
})

onMounted(async () => {
  const hasStoredData = await store.loadFromIndexedDB()

  if (!hasStoredData) {
    store.loadData(defaultData)
    await store.saveToIndexedDB()
  }

  syncRouteFromUrl()

  if (isDashboardPage.value) {
    syncMonthUrl(selectedMonthKey.value, 'replace')
  }

  window.addEventListener('popstate', syncRouteFromUrl)
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', syncRouteFromUrl)
})

const isAddPage = computed(() => routePath.value === '/add')
const isEditPage = computed(() => routePath.value === '/edit')
const isOperationsPage = computed(() => routePath.value === '/operations')
const isFormPage = computed(() => isAddPage.value || isEditPage.value)
const isDashboardPage = computed(() => routePath.value === '/')
const previousMonthKey = computed(() => shiftMonthKey(selectedMonthKey.value, -1))

const currentMonth = computed(() => store.getMonthlySummary(selectedMonthKey.value))
const previousMonth = computed(() => store.getMonthlySummary(previousMonthKey.value))
const monthBalance = computed(() => currentMonth.value.balance)

const periodOptions: PeriodOption[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

const recentOperations = computed(() =>
  store.activeOperations
    .filter(operation => getMonthKey(new Date(operation.date)) === selectedMonthKey.value)
    .slice()
    .sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
    .slice(0, 5),
)

const selectedMonthTitle = computed(() => formatMonthTitle(selectedMonthKey.value))
const previousMonthTitle = computed(() => formatMonthTitle(previousMonthKey.value))
const editingOperation = computed(() =>
  editingOperationId.value ? store.operations.find(operation => operation.id === editingOperationId.value) : null,
)

const sortedOperations = computed(() =>
  store.activeOperations
    .filter(operation => isValidDate(new Date(operation.date)))
    .slice()
    .sort((first, second) => getOperationTimestamp(second) - getOperationTimestamp(first)),
)

const operationsSummary = computed(() => summarizeOperations(sortedOperations.value))

const operationGroups = computed<OperationPeriodGroup[]>(() => {
  const groups = new Map<string, OperationPeriodGroup>()

  sortedOperations.value.forEach(operation => {
    const date = new Date(operation.date)
    const key = getOperationPeriodKey(date, operationsPeriod.value)
    const existingGroup = groups.get(key)
    const group = existingGroup || createOperationPeriodGroup(key, date, operationsPeriod.value)

    applyOperationToSummary(group, operation)
    group.operations.push(operation)
    groups.set(key, group)
  })

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      categories: operationsPeriod.value === 'day' ? [] : buildCategoryGroups(group.operations),
    }))
    .sort((first, second) => second.key.localeCompare(first.key))
})

const categoryGroups = computed<CategoryGroup[]>(() => {
  return store.categories
    .filter(category => category.type === form.value.type && category.isActive && !category.isDeleted)
    .sort((first, second) => first.position - second.position)
    .map(category => {
      const name = category.name.trim() || 'Без названия'
      const option: CategoryOption = {
        value: `category:${category.id}`,
        label: name,
        name,
        categoryID: category.id,
        subcategoryID: null,
      }
      const subcategories = store.subcategories
        .filter(subcategory => subcategory.categoryID === category.id && subcategory.isActive && !subcategory.isDeleted)
        .sort((first, second) => first.position - second.position)
        .map(subcategory => ({
          value: `subcategory:${category.id}:${subcategory.id}`,
          label: `${name} / ${subcategory.name.trim() || 'Без названия'}`,
          name: subcategory.name.trim() || 'Без названия',
          categoryID: category.id,
          subcategoryID: subcategory.id,
        }))

      return {
        id: category.id,
        name,
        option,
        subcategories,
      }
    })
})

const categoryOptions = computed(() =>
  categoryGroups.value.flatMap(group => (group.subcategories.length ? group.subcategories : [group.option])),
)

const selectedCategory = computed(() => categoryOptions.value.find(option => option.value === form.value.categoryValue))

const expenseTrend = computed(() => {
  const currentExpense = currentMonth.value.expense
  const previousExpense = previousMonth.value.expense
  const difference = currentExpense - previousExpense

  if (previousExpense === 0) {
    if (currentExpense === 0) {
      return { tone: 'neutral', text: 'Нет расходов в текущем и прошлом месяце' }
    }

    return { tone: 'bad', text: 'Больше прошлого месяца: тогда расходов не было' }
  }

  if (difference === 0) {
    return { tone: 'neutral', text: 'На уровне прошлого месяца' }
  }

  const percent = Math.abs((difference / previousExpense) * 100)

  if (difference > 0) {
    return { tone: 'bad', text: `Больше прошлого месяца на ${formatPercent(percent)}` }
  }

  return { tone: 'good', text: `Меньше прошлого месяца на ${formatPercent(percent)}` }
})

const expenseTrendText = computed(() => expenseTrend.value.text)
const expenseTrendClass = computed(() => `expense-trend--${expenseTrend.value.tone}`)

const moneyFormatter = computed(
  () =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: store.currencySymbol === '$' ? 'USD' : 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }),
)

async function submitOperation() {
  formError.value = ''
  const sum = form.value.sum

  if (!sum || sum <= 0) {
    formError.value = 'Введите сумму больше нуля.'
    return
  }

  if (!selectedCategory.value) {
    formError.value = 'Выберите категорию.'
    return
  }

  try {
    const operationDate = createOperationDate(form.value.date)

    if (isEditPage.value) {
      if (!editingOperation.value) {
        formError.value = 'Операция не найдена.'
        return
      }

      await store.updateOperation(editingOperation.value.id, {
        sum,
        date: operationDate.toISOString(),
        type: form.value.type,
        categoryID: selectedCategory.value.categoryID,
        subcategoryID: selectedCategory.value.subcategoryID,
      })
      resetForm()
      goBackFromForm(getMonthKey(operationDate))
      return
    }

    const operation = await store.addOperation({
      sum,
      date: operationDate.toISOString(),
      type: form.value.type,
      accountID: store.accounts[0]?.id || '',
      categoryID: selectedCategory.value.categoryID,
      subcategoryID: selectedCategory.value.subcategoryID,
      note: null,
      tags: [],
      targetID: null,
      transferAccountID: null,
      paymentID: null,
      isActive: true,
    })

    resetForm()
    goBackFromForm(getMonthKey(new Date(operation.date)))
  } catch {
    formError.value = 'Не удалось сохранить запись. Попробуйте еще раз.'
  }
}

function openAddPage() {
  resetForm()
  navigateTo('/add', {
    month: selectedMonthKey.value,
    from: isOperationsPage.value ? 'operations' : 'dashboard',
    period: operationsPeriod.value,
  })
}

function openOperationsPage() {
  navigateTo('/operations', {
    month: selectedMonthKey.value,
    period: 'day',
  })
}

function openEditPage(operation: Operation) {
  fillFormFromOperation(operation)
  navigateTo('/edit', {
    id: operation.id,
    month: getMonthKey(new Date(operation.date)),
    from: isOperationsPage.value ? 'operations' : 'dashboard',
    period: operationsPeriod.value,
  })
}

async function removeOperation(operation: Operation) {
  await store.deleteOperation(operation.id)
}

function goHome(month: string) {
  selectedMonthKey.value = month
  navigateTo('/', { month })
}

function goBackFromForm(month = selectedMonthKey.value) {
  if (getReturnPageFromUrl() === 'operations') {
    selectedMonthKey.value = month
    navigateTo('/operations', {
      month,
      period: operationsPeriod.value,
    })
    return
  }

  goHome(month)
}

function setOperationsPeriod(period: OperationsPeriod) {
  operationsPeriod.value = period
  openedAccordions.value = new Set()

  if (isOperationsPage.value) {
    navigateTo('/operations', {
      month: selectedMonthKey.value,
      period,
    })
  }
}

function toggleAccordion(key: string) {
  const nextOpenedAccordions = new Set(openedAccordions.value)

  if (nextOpenedAccordions.has(key)) {
    nextOpenedAccordions.delete(key)
  } else {
    nextOpenedAccordions.add(key)
  }

  openedAccordions.value = nextOpenedAccordions
}

function isAccordionOpen(key: string) {
  return openedAccordions.value.has(key)
}

function getCategoryAccordionKey(periodKey: string, categoryKey: string) {
  return `category:${periodKey}:${categoryKey}`
}

function getSubcategoryAccordionKey(periodKey: string, categoryKey: string, subcategoryKey: string) {
  return `subcategory:${periodKey}:${categoryKey}:${subcategoryKey}`
}

function navigateTo(path: string, params: Record<string, string>) {
  const url = new URL(window.location.href)
  url.pathname = path
  url.search = ''

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  window.history.pushState({}, '', url)
  syncRouteFromUrl()
}

function syncRouteFromUrl() {
  routePath.value = normalizePath(window.location.pathname)
  selectedMonthKey.value = getMonthFromUrl() || store.currentMonthKey
  editingOperationId.value = getOperationIdFromUrl()
  const nextOperationsPeriod = getOperationsPeriodFromUrl() || operationsPeriod.value

  if (nextOperationsPeriod !== operationsPeriod.value) {
    openedAccordions.value = new Set()
  }

  operationsPeriod.value = nextOperationsPeriod

  if (isEditPage.value && editingOperation.value) {
    fillFormFromOperation(editingOperation.value)
  }
}

function syncMonthUrl(month: string, mode: 'push' | 'replace') {
  const url = new URL(window.location.href)
  url.pathname = '/'
  url.searchParams.set('month', month)
  window.history[mode === 'push' ? 'pushState' : 'replaceState']({}, '', url)
}

function resetForm() {
  form.value = {
    sum: null,
    type: 1,
    categoryValue: '',
    date: formatDateInput(new Date()),
  }
  formError.value = ''
  editingOperationId.value = null
}

function resetCategorySelection() {
  form.value.categoryValue = ''
}

function fillFormFromOperation(operation: Operation) {
  form.value = {
    sum: operation.sum,
    type: operation.type,
    categoryValue: getCategoryValue(operation),
    date: formatDateInput(new Date(operation.date)),
  }
  formError.value = ''
}

function getCategoryValue(operation: Operation) {
  if (operation.subcategoryID) {
    return `subcategory:${operation.categoryID}:${operation.subcategoryID}`
  }

  return operation.categoryID ? `category:${operation.categoryID}` : ''
}

function selectCategory(option: CategoryOption) {
  form.value.categoryValue = option.value
  formError.value = ''
}

function isCategorySelected(option: CategoryOption) {
  return form.value.categoryValue === option.value
}

function formatMoney(value: number) {
  return moneyFormatter.value.format(value)
}

function formatOperationsCount(count: number) {
  const plural = new Intl.PluralRules('ru-RU').select(count)
  const word = plural === 'one' ? 'операция' : plural === 'few' ? 'операции' : 'операций'

  return `${count} ${word}`
}

function formatSubcategoryCount(count: number) {
  const plural = new Intl.PluralRules('ru-RU').select(count)
  const word = plural === 'one' ? 'подкатегория' : plural === 'few' ? 'подкатегории' : 'подкатегорий'

  return `${count} ${word}`
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 1,
  }).format(value)}%`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function formatOperationDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatOperationTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatMonthTitle(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year || 0, (month || 1) - 1, 1)
  const title = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
  }).format(date)

  return title.charAt(0).toUpperCase() + title.slice(1)
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function summarizeOperations(operations: Operation[]) {
  const summary = createEmptySummary()

  operations.forEach(operation => {
    applyOperationToSummary(summary, operation)
  })

  return summary
}

function createEmptySummary(): OperationSummary {
  return {
    income: 0,
    expense: 0,
    balance: 0,
    count: 0,
  }
}

function applyOperationToSummary(summary: OperationSummary, operation: Operation) {
  if (operation.type === 0) {
    summary.income += operation.sum
  } else if (operation.type === 1) {
    summary.expense += operation.sum
  }

  summary.balance = summary.income - summary.expense
  summary.count += 1
}

function createOperationPeriodGroup(key: string, date: Date, period: OperationsPeriod): OperationPeriodGroup {
  return {
    key,
    title: formatOperationPeriodTitle(date, period),
    subtitle: formatOperationPeriodSubtitle(date, period),
    operations: [],
    categories: [],
    ...createEmptySummary(),
  }
}

function buildCategoryGroups(operations: Operation[]) {
  const categoryMap = new Map<string, OperationCategoryGroup>()

  operations.forEach(operation => {
    const categoryKey = operation.categoryID || 'without-category'
    const subcategoryKey = operation.subcategoryID || `${categoryKey}:without-subcategory`
    const category = categoryMap.get(categoryKey) || {
      key: categoryKey,
      name: store.getCategoryName(operation.categoryID),
      subcategories: [],
      ...createEmptySummary(),
    }
    const subcategory =
      category.subcategories.find(item => item.key === subcategoryKey) || createSubcategoryGroup(subcategoryKey, operation)

    applyOperationToSummary(category, operation)
    applyOperationToSummary(subcategory, operation)
    subcategory.operations.push(operation)

    if (!category.subcategories.some(item => item.key === subcategory.key)) {
      category.subcategories.push(subcategory)
    }

    categoryMap.set(categoryKey, category)
  })

  return Array.from(categoryMap.values())
    .map(category => ({
      ...category,
      subcategories: category.subcategories.sort((first, second) => second.count - first.count),
    }))
    .sort((first, second) => second.count - first.count)
}

function createSubcategoryGroup(key: string, operation: Operation): OperationSubcategoryGroup {
  return {
    key,
    name: operation.subcategoryID ? store.getSubcategory(operation.subcategoryID)?.name || 'Без подкатегории' : 'Без подкатегории',
    operations: [],
    ...createEmptySummary(),
  }
}

function createOperationDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  const now = new Date()

  return new Date(
    year || now.getFullYear(),
    (month || now.getMonth() + 1) - 1,
    day || now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  )
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonthKey(monthKey: string, offset: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year || 0, (month || 1) - 1 + offset, 1)
  return getMonthKey(date)
}

function getYearKey(date: Date) {
  return String(date.getFullYear())
}

function getDayKey(date: Date) {
  return formatDateInput(date)
}

function getWeekKey(date: Date) {
  return formatDateInput(getStartOfWeek(date))
}

function getOperationPeriodKey(date: Date, period: OperationsPeriod) {
  if (period === 'year') {
    return getYearKey(date)
  }

  if (period === 'month') {
    return getMonthKey(date)
  }

  if (period === 'week') {
    return getWeekKey(date)
  }

  return getDayKey(date)
}

function getStartOfWeek(date: Date) {
  const start = new Date(date)
  const day = start.getDay() || 7
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - day + 1)
  return start
}

function getEndOfWeek(date: Date) {
  const end = getStartOfWeek(date)
  end.setDate(end.getDate() + 6)
  return end
}

function formatOperationPeriodTitle(date: Date, period: OperationsPeriod) {
  if (period === 'year') {
    return new Intl.DateTimeFormat('ru-RU', { year: 'numeric' }).format(date)
  }

  if (period === 'month') {
    return formatMonthTitle(getMonthKey(date))
  }

  if (period === 'week') {
    const start = getStartOfWeek(date)
    const end = getEndOfWeek(date)
    return `${formatShortDate(start)} - ${formatShortDate(end)}`
  }

  return formatDayTitle(date)
}

function formatOperationPeriodSubtitle(date: Date, period: OperationsPeriod) {
  if (period === 'day') {
    return new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(date)
  }

  if (period === 'week') {
    return 'Неделя'
  }

  if (period === 'month') {
    return 'Месяц'
  }

  return 'Год'
}

function formatDayTitle(date: Date) {
  const title = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

  return title.charAt(0).toUpperCase() + title.slice(1)
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function getOperationTimestamp(operation: Operation) {
  return new Date(operation.date).getTime()
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime())
}

function isValidMonthKey(value: string | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return false
  }

  const [, month] = value.split('-').map(Number)
  return Boolean(month && month >= 1 && month <= 12)
}

function getMonthFromUrl() {
  const month = new URLSearchParams(window.location.search).get('month')
  return isValidMonthKey(month) ? month : null
}

function getOperationIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id')
}

function getReturnPageFromUrl() {
  return new URLSearchParams(window.location.search).get('from')
}

function isOperationsPeriod(value: string | null): value is OperationsPeriod {
  return value === 'day' || value === 'week' || value === 'month' || value === 'year'
}

function getOperationsPeriodFromUrl() {
  const period = new URLSearchParams(window.location.search).get('period')
  return isOperationsPeriod(period) ? period : null
}

function normalizePath(path: string) {
  return path === '/add' || path === '/edit' || path === '/operations' ? path : '/'
}
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  color: #f8f4ff;
  background:
    radial-gradient(circle at top left, rgba(132, 89, 255, 0.28), transparent 34rem),
    linear-gradient(135deg, #160f23 0%, #21132f 48%, #150f1f 100%);
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button,
input {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

.app-shell {
  width: 100%;
  min-height: 100vh;
  padding: 40px 18px;
}

.dashboard,
.add-page,
.operations-page {
  width: min(1120px, 100%);
  margin: 0 auto;
}

.dashboard__header,
.add-page__header,
.operations-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

.add-page__header,
.operations-page__header {
  align-items: center;
  justify-content: flex-start;
}

.month-heading {
  min-width: 0;
}

.header-actions {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.add-button,
.back-button,
.submit-button,
.panel-link-button,
.accordion-toggle,
.period-switch button {
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;
}

.add-button {
  display: inline-grid;
  place-items: center;
  width: 56px;
  min-height: 78px;
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(132, 89, 255, 0.42), rgba(211, 87, 111, 0.22));
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
  font-size: 2.2rem;
  line-height: 1;
}

.back-button {
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
}

.add-button:hover,
.back-button:hover,
.submit-button:hover,
.panel-link-button:hover,
.accordion-toggle:hover,
.period-switch button:hover {
  border-color: rgba(216, 199, 255, 0.55);
  background: rgba(132, 89, 255, 0.22);
  transform: translateY(-1px);
}

.eyebrow {
  margin: 0 0 8px;
  color: #d8c7ff;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 0;
  font-size: clamp(2.15rem, 5vw, 4.8rem);
  line-height: 0.95;
}

h2 {
  margin-bottom: 0;
  color: #fff9ff;
  font-size: 1rem;
}

.balance-pill {
  display: grid;
  gap: 4px;
  min-width: 210px;
  padding: 14px 18px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
}

.balance-pill span,
.panel__header span,
.comparison span,
.operation-list span,
.empty-state,
.operations-total span,
.operations-period__header p,
.category-breakdown__header span,
.subcategory-breakdown__header span {
  color: #bbaaca;
  font-size: 0.83rem;
}

.balance-pill strong {
  font-size: 1.25rem;
}

.balance-pill--positive strong,
.amount--income {
  color: #8df3b5;
}

.balance-pill--negative strong,
.amount--expense {
  color: #ff8d97;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 18px;
}

.metric-card,
.panel,
.operation-form,
.operations-toolbar,
.operations-period {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(28, 18, 42, 0.82);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px);
}

.metric-card {
  min-height: 250px;
  padding: 28px;
}

.metric-card::before {
  position: absolute;
  inset: 0;
  content: "";
  opacity: 0.84;
  pointer-events: none;
}

.metric-card--income::before {
  background:
    linear-gradient(145deg, rgba(127, 86, 217, 0.42), transparent 56%),
    linear-gradient(0deg, rgba(141, 243, 181, 0.12), transparent 62%);
}

.metric-card--expense::before {
  background:
    linear-gradient(145deg, rgba(211, 87, 111, 0.46), transparent 58%),
    linear-gradient(0deg, rgba(132, 89, 255, 0.15), transparent 64%);
}

.metric-card > * {
  position: relative;
  z-index: 1;
}

.metric-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #f2eaff;
  font-size: 0.94rem;
  font-weight: 700;
}

.metric-card__marker {
  width: 42px;
  height: 4px;
  border-radius: 999px;
  background: #8d6cff;
}

.metric-card--expense .metric-card__marker {
  background: #ff737f;
}

.metric-card strong {
  display: block;
  margin-top: 52px;
  color: #fff;
  font-size: clamp(2.45rem, 7vw, 5.5rem);
  line-height: 0.9;
}

.metric-card p {
  margin: 18px 0 0;
  color: #cbbcd8;
  font-size: 0.95rem;
}

.expense-trend {
  max-width: 420px;
  font-weight: 700;
}

.expense-trend--good {
  color: #8df3b5;
}

.expense-trend--bad {
  color: #ff8d97;
}

.expense-trend--neutral {
  color: #d8c7ff;
}

.details-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 18px;
}

.panel {
  padding: 22px;
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.panel__header > div {
  display: grid;
  gap: 4px;
}

.panel-link-button {
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  color: #d8c7ff;
  font-size: 0.8rem;
  font-weight: 800;
  white-space: nowrap;
}

.comparison {
  display: grid;
  gap: 12px;
}

.comparison div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 58px;
  padding: 14px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.comparison strong {
  color: #fff;
  font-size: 1.18rem;
}

.operation-list {
  display: grid;
  gap: 0;
  padding: 0;
  margin: 0;
  list-style: none;
}

.operation-list li {
  min-height: 58px;
  padding: 14px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.operation-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.operation-text {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.operation-list strong {
  overflow: hidden;
  color: #fff;
  font-size: 0.96rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operation-list b {
  white-space: nowrap;
}

.operation-side {
  display: grid;
  justify-items: end;
  gap: 8px;
  flex: 0 0 auto;
}

.operation-actions {
  display: flex;
  gap: 6px;
}

.operation-actions button {
  min-height: 30px;
  padding: 0 9px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #d8c7ff;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 800;
}

.operation-actions button:hover {
  border-color: rgba(216, 199, 255, 0.52);
  background: rgba(132, 89, 255, 0.18);
}

.operations-toolbar {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 18px;
  padding: 18px;
  margin-bottom: 18px;
}

.operations-total {
  display: grid;
  gap: 4px;
  min-width: 220px;
}

.operations-total strong {
  font-size: 1.65rem;
}

.operations-total--positive strong {
  color: #8df3b5;
}

.operations-total--negative strong {
  color: #ff8d97;
}

.period-switch {
  display: grid;
  grid-template-columns: repeat(4, minmax(86px, 1fr));
  gap: 8px;
  padding: 0;
  margin: 0;
  border: 0;
}

.period-switch legend {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.period-switch button {
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  color: #d8c7ff;
  font-weight: 800;
}

.period-switch__button--active {
  border-color: rgba(141, 243, 181, 0.68) !important;
  color: #aef8c9 !important;
  background: rgba(141, 243, 181, 0.12) !important;
}

.operations-groups {
  display: grid;
  gap: 18px;
}

.operations-period {
  padding: 22px;
}

.operations-period__header,
.category-breakdown__header,
.subcategory-breakdown__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.operations-period__header {
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.operations-period__header p {
  margin-bottom: 6px;
  text-transform: capitalize;
}

.operations-period__header h2 {
  font-size: 1.2rem;
}

.period-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px 14px;
  text-align: right;
}

.period-summary span {
  color: #bbaaca;
  font-size: 0.84rem;
  white-space: nowrap;
}

.period-summary b {
  margin-left: 4px;
}

.period-summary--compact {
  max-width: 360px;
}

.operation-list--detail li:first-child,
.operation-list--compact li:first-child {
  border-top: 0;
}

.category-breakdown {
  display: grid;
  gap: 14px;
  padding-top: 18px;
}

.category-breakdown__group {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}

.breakdown-title,
.breakdown-title > div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.breakdown-title {
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
}

.accordion-toggle {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 8px;
  color: #d8c7ff;
}

.accordion-toggle--subtle {
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.05);
}

.accordion-chevron {
  display: inline-block;
  font-size: 1.45rem;
  line-height: 1;
  transform: rotate(0deg);
  transition: transform 160ms ease;
}

.accordion-toggle--open .accordion-chevron {
  transform: rotate(90deg);
}

.category-breakdown__header strong,
.subcategory-breakdown__header strong {
  color: #fff;
}

.subcategory-breakdown {
  display: grid;
  gap: 10px;
}

.subcategory-breakdown__group {
  display: grid;
  gap: 8px;
  padding: 12px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.operation-list--compact li {
  min-height: 48px;
  padding: 10px 0;
}

.subcategory-breakdown__group .operation-list--compact {
  padding-left: 38px;
}

.operation-list--compact .operation-text strong {
  font-size: 0.9rem;
}

.empty-state {
  margin-bottom: 0;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.operation-form {
  display: grid;
  gap: 18px;
  width: min(620px, 100%);
  padding: 26px;
}

.field {
  display: grid;
  gap: 8px;
}

.field span,
.type-switch legend,
.category-picker__header span {
  color: #d8c7ff;
  font-size: 0.9rem;
  font-weight: 700;
}

.field input {
  width: 100%;
  min-height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
  outline: none;
}

.field input {
  padding: 0 16px;
}

.field input:focus {
  border-color: rgba(216, 199, 255, 0.68);
  box-shadow: 0 0 0 4px rgba(132, 89, 255, 0.18);
}

.field--amount input {
  min-height: 84px;
  font-size: clamp(2rem, 7vw, 4rem);
  font-weight: 800;
}

.type-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 0;
  margin: 0;
  border: 0;
}

.type-switch legend {
  grid-column: 1 / -1;
  margin-bottom: 8px;
}

.type-switch label {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #d8c7ff;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  font-weight: 800;
}

.type-switch input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.type-switch__item--active:first-of-type {
  border-color: rgba(255, 141, 151, 0.6);
  color: #ffb5bd;
  background: rgba(211, 87, 111, 0.16);
}

.type-switch__item--active:last-of-type {
  border-color: rgba(141, 243, 181, 0.6);
  color: #aef8c9;
  background: rgba(141, 243, 181, 0.12);
}

.category-picker {
  display: grid;
  gap: 10px;
}

.category-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.category-picker__header b {
  overflow: hidden;
  color: #fff;
  font-size: 0.86rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-list {
  display: grid;
  gap: 10px;
  max-height: 360px;
  overflow: auto;
  padding-right: 4px;
}

.category-group {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}

.category-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.category-row div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.category-row strong {
  overflow: hidden;
  color: #fff;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-row span {
  color: #bbaaca;
  font-size: 0.82rem;
}

.category-select,
.subcategory-button {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #f8f4ff;
  background: rgba(255, 255, 255, 0.07);
  cursor: pointer;
  font-weight: 800;
}

.category-select {
  min-height: 40px;
  padding: 0 14px;
}

.subcategory-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.subcategory-button {
  min-height: 38px;
  padding: 0 12px;
  color: #d8c7ff;
}

.category-select:hover,
.subcategory-button:hover {
  border-color: rgba(216, 199, 255, 0.52);
  background: rgba(132, 89, 255, 0.18);
}

.category-select--active,
.subcategory-button--active {
  border-color: rgba(141, 243, 181, 0.68);
  color: #aef8c9;
  background: rgba(141, 243, 181, 0.12);
}

.form-error {
  margin: 0;
  color: #ffb5bd;
  font-weight: 700;
}

.submit-button {
  min-height: 56px;
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(132, 89, 255, 0.48), rgba(211, 87, 111, 0.28));
  font-weight: 900;
}

@media (max-width: 760px) {
  .app-shell {
    padding: 26px 12px;
  }

  .dashboard__header,
  .operations-page__header,
  .metrics,
  .details-grid,
  .operations-toolbar {
    grid-template-columns: 1fr;
  }

  .dashboard__header,
  .operations-toolbar {
    display: grid;
    align-items: start;
  }

  .header-actions {
    display: grid;
    grid-template-columns: 56px minmax(0, 1fr);
    width: 100%;
  }

  .balance-pill {
    width: 100%;
    min-width: 0;
  }

  .metric-card {
    min-height: 210px;
    padding: 22px;
  }

  .metric-card strong {
    margin-top: 38px;
  }

  .add-page__header,
  .operations-page__header {
    display: grid;
    justify-items: start;
  }

  .operations-total {
    min-width: 0;
  }

  .period-switch {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .operations-period {
    padding: 18px;
  }

  .operations-period__header,
  .category-breakdown__header,
  .subcategory-breakdown__header {
    display: grid;
    justify-items: start;
  }

  .period-summary {
    justify-content: flex-start;
    text-align: left;
  }

  .category-breakdown__group {
    padding: 14px;
  }

  .operation-form {
    padding: 18px;
  }

  .operation-main {
    align-items: flex-start;
  }

  .operation-actions button {
    padding: 0 8px;
  }
}
</style>
