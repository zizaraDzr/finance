<template>
  <section class="operations-toolbar" aria-label="Фильтры операций">
    <fieldset class="period-switch operation-type-switch">
      <legend>Тип операций</legend>
      <button
        v-for="option in operationTypeOptions"
        :key="option.value"
        type="button"
        :class="{ 'period-switch__button--active': operationType === option.value }"
        @click="$emit('update:operationType', option.value)"
      >
        {{ option.label }}
      </button>
    </fieldset>

    <fieldset class="period-switch">
      <legend>Период</legend>
      <button
        v-for="option in periodOptions"
        :key="option.value"
        type="button"
        :class="{ 'period-switch__button--active': modelValue === option.value }"
        @click="$emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </fieldset>
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
