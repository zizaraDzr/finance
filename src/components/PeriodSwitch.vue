<template>
  <section class="ledger-toolbar" aria-label="Фильтры операций">
    <div class="ledger-toolbar__types" role="group" aria-label="Тип операций">
      <button
        v-for="option in operationTypeOptions"
        :key="option.value"
        class="chip"
        :class="{ 'chip--active': operationType === option.value }"
        type="button"
        :aria-pressed="operationType === option.value"
        @click="$emit('update:operationType', option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="ledger-toolbar__period">
      <span class="ledger-toolbar__label">Группировка</span>

      <div class="segmented" role="group" aria-label="Период">
        <button
          v-for="option in periodOptions"
          :key="option.value"
          class="segmented__button"
          :class="{ 'segmented__button--active': modelValue === option.value }"
          type="button"
          :aria-pressed="modelValue === option.value"
          @click="$emit('update:modelValue', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { OperationTypeFilter, OperationsPeriod, PeriodOption } from '@/types'

const periodOptions: PeriodOption[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]
const operationTypeOptions: Array<{ value: OperationTypeFilter; label: string }> = [
  { value: 'expense', label: 'Расходы' },
  { value: 'income', label: 'Доходы' },
]

defineProps<{
  modelValue: OperationsPeriod
  operationType: OperationTypeFilter
}>()

defineEmits<{
  'update:modelValue': [value: OperationsPeriod]
  'update:operationType': [value: OperationTypeFilter]
}>()
</script>
