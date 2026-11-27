<template>
  <svg
    class="icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(path, index) in iconPaths" :key="index" :d="path" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    size?: number
  }>(),
  {
    size: 20,
  },
)

// A small, dependency-free icon set. Every glyph is a set of stroke paths so it
// inherits color and weight from the text around it.
const icons: Record<string, string[]> = {
  grid: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h6v6h-6z'],
  list: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  chart: ['M3 20h18', 'M6 20v-8', 'M12 20V5', 'M18 20v-5'],
  tag: [
    'M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z',
    'M7.5 7.5h.01',
  ],
  plus: ['M12 5v14', 'M5 12h14'],
  refresh: [
    'M20 11a8 8 0 0 0-14.9-4',
    'M4 4v5h5',
    'M4 13a8 8 0 0 0 14.9 4',
    'M20 20v-5h-5',
  ],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
    'M12 2v2',
    'M12 20v2',
    'M4.9 4.9l1.4 1.4',
    'M17.7 17.7l1.4 1.4',
    'M2 12h2',
    'M20 12h2',
    'M4.9 19.1l1.4-1.4',
    'M17.7 6.3l1.4-1.4',
  ],
  moon: ['M20.5 14.3A8.5 8.5 0 0 1 9.7 3.5 8.5 8.5 0 1 0 20.5 14.3Z'],
  'chevron-left': ['M15 6l-6 6 6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
  'chevron-down': ['M6 9l6 6 6-6'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z', 'M21 21l-4.3-4.3'],
  calendar: [
    'M7 3v3',
    'M17 3v3',
    'M4 8h16',
    'M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  ],
  'arrow-left': ['M19 12H5', 'M11 18l-6-6 6-6'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  pencil: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z'],
  trash: [
    'M4 7h16',
    'M10 11v6',
    'M14 11v6',
    'M6 7l1 13h10l1-13',
    'M9 7V4h6v3',
  ],
  check: ['M4 12l5 5L20 6'],
  wallet: [
    'M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
    'M3 7V5a2 2 0 0 1 2-2h11',
    'M16 12h.01',
  ],
  'arrow-up-right': ['M7 17 17 7', 'M9 7h8v8'],
  'arrow-down-right': ['M7 7l10 10', 'M17 9v8H9'],
  filter: ['M3 5h18l-7 8v6l-4 2v-8L3 5Z'],
  dots: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  spark: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z'],
  cloud: [
    'M7 18a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.6 1.4A3.3 3.3 0 0 1 17 18H7Z',
  ],
  info: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 11v5', 'M12 8h.01'],
  circle: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'],
}

const iconPaths = computed(() => icons[props.name] ?? icons.circle)
</script>
