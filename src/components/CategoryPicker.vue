<template>
  <section class="category-picker" aria-labelledby="category-picker-title">
    <header class="category-picker__header">
      <div class="category-picker__headline">
        <span id="category-picker-title" class="field-label">Категория</span>
        <b v-if="selectedCategory">{{ selectedCategory.label }}</b>
        <small v-else>Выберите категорию или подкатегорию</small>
      </div>

      <span v-if="selectedCategory" class="category-picker__check" aria-hidden="true">
        <AppIcon name="check" :size="15" />
      </span>
    </header>

    <div class="category-list">
      <article
        v-for="group in groups"
        :key="group.id"
        class="category-group"
        :class="{ 'category-group--selected': isGroupSelected(group.id) }"
      >
        <button
          v-if="group.subcategories.length === 0"
          class="category-select"
          :class="{ 'category-select--active': modelValue === group.option.value }"
          type="button"
          @click="selectCategory(group.option)"
        >
          <span class="category-select__icon" aria-hidden="true">{{ getCategoryIcon?.(group.id) || '•' }}</span>
          <span class="category-select__name">{{ group.name }}</span>
          <span class="category-select__mark" aria-hidden="true">
            <AppIcon :name="modelValue === group.option.value ? 'check' : 'plus'" :size="15" />
          </span>
        </button>

        <template v-else>
          <div class="category-group__head">
            <span class="category-group__icon" aria-hidden="true">{{ getCategoryIcon?.(group.id) || '•' }}</span>
            <strong>{{ group.name }}</strong>
            <span class="category-group__count">{{ group.subcategories.length }}</span>
          </div>

          <div class="subcategory-list">
            <button
              v-for="option in group.subcategories"
              :key="option.value"
              class="subcategory-button"
              :class="{ 'subcategory-button--active': modelValue === option.value }"
              type="button"
              @click="selectCategory(option)"
            >
              {{ option.name }}
            </button>
          </div>
        </template>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { CategoryOption, CategoryPickerGroup } from '@/types'

const props = defineProps<{
  groups: CategoryPickerGroup[]
  modelValue: string
  getCategoryIcon?: (id: string) => string | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [option: CategoryOption]
}>()

const categoryOptions = computed(() =>
  props.groups.flatMap(group => (group.subcategories.length ? group.subcategories : [group.option])),
)
const selectedCategory = computed(() => categoryOptions.value.find(option => option.value === props.modelValue))

function isGroupSelected(groupId: string) {
  const group = props.groups.find(item => item.id === groupId)

  if (!group) {
    return false
  }

  return (
    group.option.value === props.modelValue ||
    group.subcategories.some(option => option.value === props.modelValue)
  )
}

function selectCategory(option: CategoryOption) {
  emit('update:modelValue', option.value)
  emit('select', option)
}
</script>
