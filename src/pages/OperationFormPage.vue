<template>
  <section class="add-page">
    <header class="add-page__header">
      <button class="back-button" type="button" @click="goBack()">Назад</button>
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

      <CategoryPicker v-model="form.categoryValue" :groups="categoryGroups" @select="clearFormError()" />

      <label class="field">
        <span>Дата</span>
        <input v-model="form.date" type="date" />
      </label>

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <button class="submit-button" type="submit">{{ isEditPage ? 'Сохранить' : 'Добавить' }}</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CategoryPicker from '@/components/CategoryPicker.vue'
import { useFinanceStore } from '@/stores/finance'
import type { Operation } from '@/types'
import { buildCategoryPickerGroups, getCategoryValue } from '@/utils/categories'
import { createOperationDate, formatDateInput, getMonthKey, isValidMonthKey } from '@/utils/date'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const formError = ref('')
const form = ref({
  sum: null as number | null,
  type: 1,
  categoryValue: '',
  date: formatDateInput(new Date()),
})

const isEditPage = computed(() => route.name === 'operation-edit')
const editingOperationId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const editingOperation = computed(() =>
  editingOperationId.value ? store.operations.find(operation => operation.id === editingOperationId.value) : null,
)
const categoryGroups = computed(() => buildCategoryPickerGroups(store.categories, store.subcategories, form.value.type))
const categoryOptions = computed(() =>
  categoryGroups.value.flatMap(group => (group.subcategories.length ? group.subcategories : [group.option])),
)
const selectedCategory = computed(() => categoryOptions.value.find(option => option.value === form.value.categoryValue))

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
      goBack(getMonthKey(operationDate))
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
    goBack(getMonthKey(new Date(operation.date)))
  } catch (err) {
    // formError.value = 'Не удалось сохранить запись. Попробуйте еще раз.'
    formError.value = `${err }`
  }
}

function goBack(month = selectedMonthKey.value) {
  if (route.query.from === 'operations') {
    router.push({
      name: 'operations',
      query: {
        month,
        period: typeof route.query.period === 'string' ? route.query.period : 'day',
      },
    })
    return
  }

  router.push({
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
  }
  formError.value = ''
}

function clearFormError() {
  formError.value = ''
}

const selectedMonthKey = computed(() => {
  const month = typeof route.query.month === 'string' ? route.query.month : null
  return isValidMonthKey(month) ? month : store.currentMonthKey
})
</script>
