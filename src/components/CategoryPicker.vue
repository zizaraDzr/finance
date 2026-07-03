<template>
  <section class="category-picker" aria-labelledby="category-picker-title">
    <div class="category-picker__header">
      <span id="category-picker-title">Категория</span>
      <b v-if="selectedCategory">{{ selectedCategory.label }}</b>
    </div>

    <div class="category-list">
      <article v-for="group in groups" :key="group.id" class="category-group">
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
            :class="{ 'category-select--active': modelValue === group.option.value }"
            @click="selectCategory(group.option)"
          >
            {{ modelValue === group.option.value ? 'Выбрано' : 'Выбрать' }}
          </button>
        </div>

        <div v-if="group.subcategories.length" class="subcategory-list">
          <button
            v-for="option in group.subcategories"
            :key="option.value"
            class="subcategory-button"
            type="button"
            :class="{ 'subcategory-button--active': modelValue === option.value }"
            @click="selectCategory(option)"
          >
            {{ option.name }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CategoryOption, CategoryPickerGroup } from '@/types'
import { formatSubcategoryCount } from '@/utils/formatters'

const props = defineProps<{
  groups: CategoryPickerGroup[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [option: CategoryOption]
}>()

const categoryOptions = computed(() =>
  props.groups.flatMap(group => (group.subcategories.length ? group.subcategories : [group.option])),
)
const selectedCategory = computed(() => categoryOptions.value.find(option => option.value === props.modelValue))

function selectCategory(option: CategoryOption) {
  emit('update:modelValue', option.value)
  emit('select', option)
}
</script>
