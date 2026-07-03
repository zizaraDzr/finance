<template>
  <article class="operations-period">
    <header class="operations-period__header">
      <div>
        <p>{{ group.subtitle }}</p>
        <h2>{{ group.title }}</h2>
      </div>

      <div class="period-summary">
        <span>Доход <b class="amount--income">{{ formatMoney(group.income, currencySymbol) }}</b></span>
        <span>Расход <b class="amount--expense">{{ formatMoney(group.expense, currencySymbol) }}</b></span>
      </div>
    </header>

    <ul v-if="period === 'day'" class="operation-list operation-list--detail">
      <OperationListItem
        v-for="operation in group.operations"
        :key="operation.id"
        :operation="operation"
        :title="getCategoryName(operation.categoryID)"
        :subtitle="operation.subcategoryID ? getSubcategory(operation.subcategoryID)?.name : undefined"
        :time-label="formatOperationTime(operation.date)"
        :amount-label="formatMoney(operation.sum, currencySymbol)"
        show-actions
        @edit="$emit('edit', operation)"
        @remove="$emit('remove', operation)"
      />
    </ul>

    <div v-else class="category-breakdown">
      <section v-for="category in group.categories" :key="category.key" class="category-breakdown__group">
        <div class="category-breakdown__header">
          <div class="breakdown-title">
            <button
              class="accordion-toggle"
              type="button"
              :class="{ 'accordion-toggle--open': isAccordionOpen(getCategoryAccordionKey(category.key)) }"
              :aria-label="`Показать ${category.name}`"
              @click="toggleAccordion(getCategoryAccordionKey(category.key))"
            >
              <span class="accordion-chevron">›</span>
            </button>

            <div>
              <strong>{{ category.name }}</strong>
              <span>{{ formatOperationsCount(category.count) }}</span>
            </div>
          </div>

          <div class="period-summary period-summary--compact">
            <span>Доход <b class="amount--income">{{ formatMoney(category.income, currencySymbol) }}</b></span>
            <span>Расход <b class="amount--expense">{{ formatMoney(category.expense, currencySymbol) }}</b></span>
          </div>
        </div>

        <div v-if="isAccordionOpen(getCategoryAccordionKey(category.key))" class="subcategory-breakdown">
          <article v-for="subcategory in category.subcategories" :key="subcategory.key" class="subcategory-breakdown__group">
            <div class="subcategory-breakdown__header">
              <div class="breakdown-title">
                <button
                  class="accordion-toggle accordion-toggle--subtle"
                  type="button"
                  :class="{ 'accordion-toggle--open': isAccordionOpen(getSubcategoryAccordionKey(category.key, subcategory.key)) }"
                  :aria-label="`Показать ${subcategory.name}`"
                  @click="toggleAccordion(getSubcategoryAccordionKey(category.key, subcategory.key))"
                >
                  <span class="accordion-chevron">›</span>
                </button>

                <div>
                  <strong>{{ subcategory.name }}</strong>
                  <span>{{ formatOperationsCount(subcategory.count) }}</span>
                </div>
              </div>

              <b :class="subcategory.balance >= 0 ? 'amount--income' : 'amount--expense'">
                {{ formatMoney(subcategory.balance, currencySymbol) }}
              </b>
            </div>

            <ul v-if="isAccordionOpen(getSubcategoryAccordionKey(category.key, subcategory.key))" class="operation-list operation-list--compact">
              <OperationListItem
                v-for="operation in subcategory.operations"
                :key="operation.id"
                :operation="operation"
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
import { ref } from 'vue'
import OperationListItem from '@/components/OperationListItem.vue'
import type { Operation, OperationPeriodGroup, OperationsPeriod, Subcategory } from '@/types'
import { formatMoney, formatOperationDateTime, formatOperationTime, formatOperationsCount } from '@/utils/formatters'

const props = defineProps<{
  currencySymbol: string
  getCategoryName: (id: string | null) => string
  getSubcategory: (id: string | null) => Subcategory | null | undefined
  group: OperationPeriodGroup
  period: OperationsPeriod
}>()

defineEmits<{
  edit: [operation: Operation]
  remove: [operation: Operation]
}>()

const openedAccordions = ref(new Set<string>())

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

function getCategoryAccordionKey(categoryKey: string) {
  return `category:${props.group.key}:${categoryKey}`
}

function getSubcategoryAccordionKey(categoryKey: string, subcategoryKey: string) {
  return `subcategory:${props.group.key}:${categoryKey}:${subcategoryKey}`
}
</script>
