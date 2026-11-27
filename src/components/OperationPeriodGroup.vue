<template>
  <article class="operations-period card">
    <header class="operations-period__header">
      <div class="period-headline">
        <span class="period-badge">{{ group.subtitle }}</span>
        <h2>{{ group.title }}</h2>
      </div>

      <div class="period-summary">
        <span v-if="group.income > 0">Доход <b class="amount--income">{{ formatMoney(group.income, currencySymbol) }}</b></span>
        <span v-if="group.expense > 0">Расход <b class="amount--expense">{{ formatMoney(group.expense, currencySymbol) }}</b></span>
        <span class="period-summary__count">{{ formatOperationsCount(group.count) }}</span>
      </div>
    </header>

    <template v-if="period === 'day'">
      <ul class="operation-list operation-list--detail">
        <OperationListItem
          v-for="operation in visibleDayOperations"
          :key="operation.id"
          :operation="operation"
          :icon="getCategoryIcon?.(operation.categoryID)"
          :title="getCategoryName(operation.categoryID)"
          :subtitle="operation.subcategoryID ? getSubcategory(operation.subcategoryID)?.name : undefined"
          :time-label="formatOperationTime(operation.date)"
          :amount-label="formatMoney(operation.sum, currencySymbol)"
          show-actions
          @edit="$emit('edit', operation)"
          @remove="$emit('remove', operation)"
        />
      </ul>

      <button
        v-if="hiddenDayOperationsCount > 0"
        class="load-more-button load-more-button--inline"
        type="button"
        @click="showMoreDayOperations"
      >
        Показать ещё {{ nextDayOperationsCount }} из {{ hiddenDayOperationsCount }}
      </button>
    </template>

    <div v-else class="category-breakdown">
      <section v-for="category in group.categories" :key="category.key" class="category-breakdown__group">
        <button
          class="category-breakdown__toggle"
          type="button"
          :aria-label="`Показать ${category.name}`"
          :aria-expanded="isAccordionOpen(getCategoryAccordionKey(category.key))"
          @click="toggleAccordion(getCategoryAccordionKey(category.key))"
        >
          <span class="category-breakdown__icon" aria-hidden="true">
            {{ getCategoryIcon?.(category.key) || '•' }}
          </span>

          <span class="category-breakdown__name">
            <strong>{{ category.name }}</strong>
            <span>{{ formatOperationsCount(category.count) }}</span>
          </span>

          <b class="category-breakdown__amount" :class="category.balance >= 0 ? 'amount--income' : 'amount--expense'">
            {{ formatMoney(category.balance, currencySymbol) }}
          </b>

          <span
            class="accordion-chevron"
            :class="{ 'accordion-chevron--open': isAccordionOpen(getCategoryAccordionKey(category.key)) }"
            aria-hidden="true"
          >
            ›
          </span>
        </button>

        <div
          v-if="isAccordionOpen(getCategoryAccordionKey(category.key))"
          class="subcategory-breakdown"
          :class="{ 'subcategory-breakdown--single': category.subcategories.length === 1 }"
        >
          <article v-for="subcategory in category.subcategories" :key="subcategory.key" class="subcategory-breakdown__group">
            <div v-if="category.subcategories.length > 1" class="subcategory-breakdown__header">
              <button
                class="subcategory-breakdown__toggle"
                type="button"
                :aria-label="`Показать ${subcategory.name}`"
                :aria-expanded="isAccordionOpen(getSubcategoryAccordionKey(category.key, subcategory.key))"
                @click="toggleAccordion(getSubcategoryAccordionKey(category.key, subcategory.key))"
              >
                <span
                  class="accordion-chevron accordion-chevron--small"
                  :class="{ 'accordion-chevron--open': isAccordionOpen(getSubcategoryAccordionKey(category.key, subcategory.key)) }"
                  aria-hidden="true"
                >
                  ›
                </span>

                <span class="subcategory-breakdown__name">
                  <strong>{{ subcategory.name }}</strong>
                  <span>{{ formatOperationsCount(subcategory.count) }}</span>
                </span>
              </button>

              <b :class="subcategory.balance >= 0 ? 'amount--income' : 'amount--expense'">
                {{ formatMoney(subcategory.balance, currencySymbol) }}
              </b>
            </div>

            <ul
              v-if="category.subcategories.length === 1 || isAccordionOpen(getSubcategoryAccordionKey(category.key, subcategory.key))"
              class="operation-list operation-list--compact"
            >
              <OperationListItem
                v-for="operation in subcategory.operations"
                :key="operation.id"
                :operation="operation"
                :icon="getCategoryIcon?.(operation.categoryID)"
                :title="formatOperationDateTime(operation.date)"
                :subtitle="operation.note || undefined"
                :time-label="getCategoryName(operation.categoryID)"
                :amount-label="formatMoney(operation.sum, currencySymbol)"
                show-actions
                @edit="$emit('edit', operation)"
                @remove="$emit('remove', operation)"
              />
            </ul>
          </article>
        </div>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import OperationListItem from '@/components/OperationListItem.vue'
import { useLoadMore } from '@/composables/useLoadMore'
import type { Operation, OperationPeriodGroup, OperationsPeriod, Subcategory } from '@/types'
import { toggleSetMember } from '@/utils/collections'
import {
  formatMoney,
  formatOperationDateTime,
  formatOperationTime,
  formatOperationsCount,
} from '@/utils/formatters'

const props = defineProps<{
  currencySymbol: string
  getCategoryName: (id: string | null) => string
  getSubcategory: (id: string | null) => Subcategory | null | undefined
  getCategoryIcon?: (id: string | null) => string | undefined
  group: OperationPeriodGroup
  period: OperationsPeriod
}>()

defineEmits<{
  edit: [operation: Operation]
  remove: [operation: Operation]
}>()

const openedAccordions = ref(new Set<string>())
const dayOperationsPageSize = 40
const {
  visibleItems: visibleDayOperations,
  hiddenCount: hiddenDayOperationsCount,
  nextCount: nextDayOperationsCount,
  loadMore: showMoreDayOperations,
  reset: resetDayOperationsPagination,
} = useLoadMore(() => props.group.operations, () => dayOperationsPageSize)

watch(() => props.group.key, resetDayOperationsPagination)

function toggleAccordion(key: string) {
  openedAccordions.value = toggleSetMember(openedAccordions.value, key)
}

function isAccordionOpen(key: string) {
  return openedAccordions.value.has(key)
}

function getCategoryAccordionKey(categoryKey: string) {
  return `category:${props.group.key}:${categoryKey}`
}

function getSubcategoryAccordionKey(categoryKey: string, subcategoryKey: string) {
  return `subcategory:${props.group.key}:${categoryKey}:${subcategoryKey}`
}
</script>
