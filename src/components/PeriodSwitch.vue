<template>
  <section class="operations-toolbar" aria-label="Фильтры операций">
    <div class="operations-total" :class="summary.balance >= 0 ? 'operations-total--positive' : 'operations-total--negative'">
      <span>{{ formatOperationsCount(count) }}</span>
      <strong>{{ formatMoney(summary.balance, currencySymbol) }}</strong>
    </div>

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
import type { OperationSummary, OperationsPeriod, PeriodOption } from '@/types'
import { formatMoney, formatOperationsCount } from '@/utils/formatters'

const periodOptions: PeriodOption[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

defineProps<{
  count: number
  currencySymbol: string
  modelValue: OperationsPeriod
  summary: OperationSummary
}>()

defineEmits<{
  'update:modelValue': [value: OperationsPeriod]
}>()
</script>
