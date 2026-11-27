<template>
  <section class="add-page">
    <header class="page-head page-head--form">
      <div class="page-head__text">
        <p class="eyebrow">{{ isEditPage ? 'Редактирование' : 'Новая запись' }}</p>
        <h1>{{ isEditPage ? 'Редактировать операцию' : 'Добавить операцию' }}</h1>
      </div>

      <button class="button button--ghost back-button" type="button" @click="goBack()">
        <AppIcon name="arrow-left" :size="17" />
        <span>Назад</span>
      </button>
    </header>

    <div class="form-layout">
      <form class="operation-form card" @submit.prevent="submitOperation">
        <label class="amount-field">
          <span class="field-label">Сумма</span>
          <span class="amount-field__control">
            <input
              v-model.number="form.sum"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              placeholder="0"
              autofocus
            />
            <span class="amount-field__currency" aria-hidden="true">{{ store.currencySymbol }}</span>
          </span>
        </label>

        <fieldset class="type-switch">
          <legend class="field-label">Тип операции</legend>
          <label :class="{ 'type-switch__item--active': form.type === 1 }">
            <input v-model="form.type" type="radio" :value="1" @change="resetCategorySelection" />
            <span>Расход</span>
          </label>
          <label :class="{ 'type-switch__item--active': form.type === 0 }">
            <input v-model="form.type" type="radio" :value="0" @change="resetCategorySelection" />
            <span>Доход</span>
          </label>
        </fieldset>

        <CategoryPicker
          v-model="form.categoryValue"
          :groups="categoryGroups"
          :get-category-icon="getCategoryIcon"
          @select="clearFormError()"
        />

        <div class="form-row">
          <label class="field">
            <span class="field-label">Дата</span>
            <span class="field-with-icon">
              <AppIcon name="calendar" :size="17" />
              <input v-model="form.date" type="date" />
            </span>
          </label>

          <label class="field">
            <span class="field-label">Заметка <small>необязательно</small></span>
            <input v-model="form.note" type="text" maxlength="120" placeholder="Например, обед с коллегами" />
          </label>
        </div>

        <div class="date-quick" role="group" aria-label="Быстрый выбор даты">
          <button
            v-for="option in quickDateOptions"
            :key="option.offset"
            class="chip"
            :class="{ 'chip--active': form.date === option.value }"
            type="button"
            @click="setQuickDate(option.offset)"
          >
            {{ option.label }}
          </button>
        </div>

        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

        <div class="form-actions">
          <button class="button button--primary submit-button" type="submit" :disabled="isSubmitting">
            {{ isEditPage ? 'Сохранить изменения' : 'Добавить запись' }}
          </button>
          <button class="button button--quiet" type="button" @click="goBack()">Отмена</button>
        </div>
      </form>

      <aside class="receipt" aria-label="Сводка операции">
        <p class="eyebrow">Сводка</p>

        <strong class="receipt__amount" :class="form.type === 1 ? 'amount--expense' : 'amount--income'">
          {{ form.type === 1 ? '−' : '+' }}
          {{ formatMoney(form.sum || 0, store.currencySymbol) }}
        </strong>

        <dl class="receipt__list">
          <div>
            <dt>Тип</dt>
            <dd>{{ form.type === 1 ? 'Расход' : 'Доход' }}</dd>
          </div>
          <div>
            <dt>Категория</dt>
            <dd :class="{ 'receipt__empty': !selectedCategory }">
              {{ selectedCategory?.label || 'Не выбрана' }}
            </dd>
          </div>
          <div>
            <dt>Дата</dt>
            <dd>{{ formattedDate }}</dd>
          </div>
          <div v-if="form.note.trim()">
            <dt>Заметка</dt>
            <dd>{{ form.note.trim() }}</dd>
          </div>
        </dl>

        <p class="receipt__hint">
          Запись сохранится на этом устройстве и попадёт в ближайшую синхронизацию.
        </p>
      </aside>
    </div>

    <div v-if="isSubmitting" class="page-loader" role="status" aria-live="polite">
      <span class="page-loader__spinner" aria-hidden="true"></span>
      <p>{{ isEditPage ? 'Сохраняем изменения…' : 'Сохраняем запись…' }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import CategoryPicker from '@/components/CategoryPicker.vue'
import { useFinanceStore } from '@/stores/finance'
import type { Operation } from '@/types'
import { buildCategoryPickerGroups, getCategoryValue } from '@/utils/categories'
import { createOperationDate, formatDateInput, getMonthKey } from '@/utils/date'
import { waitForMinimumDuration } from '@/utils/delay'
import { formatDate, formatMoney } from '@/utils/formatters'
import { readMonthQuery, readOperationsPeriod, readOperationType } from '@/utils/routeQuery'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const formError = ref('')
const isSubmitting = ref(false)
const form = ref({
  sum: null as number | null,
  type: 1,
  categoryValue: '',
  date: formatDateInput(new Date()),
  note: '',
})

const isEditPage = computed(() => route.name === 'operation-edit')
const editingOperationId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const editingOperation = computed(() =>
  editingOperationId.value
    ? store.operations.find(operation => operation.id === editingOperationId.value)
    : null,
)
const categoryGroups = computed(() =>
  buildCategoryPickerGroups(store.categories, store.subcategories, form.value.type, store.activeOperations),
)
const categoryOptions = computed(() =>
  categoryGroups.value.flatMap(group => (group.subcategories.length ? group.subcategories : [group.option])),
)
const selectedCategory = computed(() =>
  categoryOptions.value.find(option => option.value === form.value.categoryValue),
)
const selectedMonthKey = computed(() => readMonthQuery(route.query.month, store.currentMonthKey))
const formattedDate = computed(() => {
  const [year, month, day] = form.value.date.split('-').map(Number)

  if (!year || !month || !day) {
    return '—'
  }

  return formatDate(new Date(year, month - 1, day, 12).toISOString())
})

const quickDateOptions = computed(() => [
  { offset: 0, label: 'Сегодня', value: formatDateInput(new Date()) },
  { offset: -1, label: 'Вчера', value: formatDateInput(addDays(new Date(), -1)) },
  { offset: -2, label: 'Позавчера', value: formatDateInput(addDays(new Date(), -2)) },
])

watch(
  editingOperation,
  operation => {
    if (operation) {
      fillFormFromOperation(operation)
    }
  },
  { immediate: true },
)

async function submitOperation() {
  if (isSubmitting.value) {
    return
  }

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

  const loaderStartedAt = Date.now()
  isSubmitting.value = true

  try {
    const operationDate = createOperationDate(form.value.date)
    const note = form.value.note.trim() || null

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
        note,
      })
      await waitForMinimumDuration(loaderStartedAt)
      resetForm()
      await goBack(getMonthKey(operationDate))
      return
    }

    const operation = await store.addOperation({
      sum,
      date: operationDate.toISOString(),
      type: form.value.type,
      accountID: store.accounts[0]?.id || '',
      categoryID: selectedCategory.value.categoryID,
      subcategoryID: selectedCategory.value.subcategoryID,
      note,
      tags: [],
      targetID: null,
      transferAccountID: null,
      paymentID: null,
      isActive: true,
    })

    await waitForMinimumDuration(loaderStartedAt)
    resetForm()
    await goBack(getMonthKey(new Date(operation.date)))
  } catch (err) {
    formError.value = `${err}`
  } finally {
    await waitForMinimumDuration(loaderStartedAt)
    isSubmitting.value = false
  }
}

async function goBack(month = selectedMonthKey.value) {
  if (route.query.from === 'operations') {
    await router.push({
      name: 'operations',
      query: {
        month,
        period: readOperationsPeriod(route.query.period),
        type: readOperationType(route.query.type),
      },
    })
    return
  }

  await router.push({
    name: 'dashboard',
    query: {
      month,
    },
  })
}

function resetForm() {
  form.value = {
    sum: null,
    type: 1,
    categoryValue: '',
    date: formatDateInput(new Date()),
    note: '',
  }
  formError.value = ''
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
    note: operation.note || '',
  }
  formError.value = ''
}

function clearFormError() {
  formError.value = ''
}

function setQuickDate(offset: number) {
  form.value.date = formatDateInput(addDays(new Date(), offset))
}

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function getCategoryIcon(categoryId: string) {
  return store.getCategory(categoryId)?.icon
}
</script>
