<template>
  <li class="operation-row">
    <span class="operation-row__icon" aria-hidden="true">{{ icon || '•' }}</span>

    <div class="operation-main">
      <div class="operation-text">
        <strong>{{ title }}</strong>
        <span v-if="subtitle" class="operation-text__subtitle">{{ subtitle }}</span>
        <span class="operation-text__meta">{{ timeLabel }}</span>
      </div>

      <div class="operation-side">
        <b :class="operation.type === 0 ? 'amount--income' : 'amount--expense'">
          {{ operation.type === 0 ? '+' : '−' }}{{ amountLabel }}
        </b>

        <div v-if="showActions" class="operation-actions">
          <button class="icon-button icon-button--small" type="button" :aria-label="`Редактировать ${title}`"
            @click="$emit('edit', operation)">
            <AppIcon name="pencil" :size="15" />
          </button>
          <button class="icon-button icon-button--small icon-button--danger" type="button"
            :aria-label="`Удалить ${title}`" @click="$emit('remove', operation)">
            <AppIcon name="trash" :size="15" />
          </button>
        </div>
      </div>
    </div>
  </li>
</template>

<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import type { Operation } from '@/types'

defineProps<{
  operation: Operation
  title: string
  subtitle?: string
  timeLabel: string
  amountLabel: string
  showActions?: boolean
  icon?: string
}>()

defineEmits<{
  edit: [operation: Operation]
  remove: [operation: Operation]
}>()
</script>
