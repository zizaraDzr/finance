<template>
  <li>
    <div class="operation-main">
      <div class="operation-text">
        <strong>{{ title }}</strong>
        <span v-if="subtitle">{{ subtitle }}</span>
        <span>{{ timeLabel }}</span>
      </div>

      <div class="operation-side">
        <b :class="operation.type === 0 ? 'amount--income' : 'amount--expense'">
          {{ operation.type === 0 ? '+' : '-' }}{{ amountLabel }}
        </b>

        <div v-if="showActions" class="operation-actions">
          <button type="button" :aria-label="`Редактировать ${title}`" @click="$emit('edit', operation)">
            Изм.
          </button>
          <button type="button" :aria-label="`Удалить ${title}`" @click="$emit('remove', operation)">
            Удалить
          </button>
        </div>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { Operation } from '@/types'

defineProps<{
  operation: Operation
  title: string
  subtitle?: string
  timeLabel: string
  amountLabel: string
  showActions?: boolean
}>()

defineEmits<{
  edit: [operation: Operation]
  remove: [operation: Operation]
}>()
</script>
