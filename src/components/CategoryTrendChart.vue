<template>
  <article class="panel analytics-panel analytics-chart">
    <div class="panel__header">
      <div>
        <h2>Расход по месяцам</h2>
        <span>{{ pointsLabel }}</span>
      </div>
    </div>

    <p v-if="points.length === 0" class="empty-state">За это время расходов по категории не было.</p>

    <div v-else class="histogram-chart category-trend-chart">
      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" role="img" aria-label="Расход по месяцам">
        <line
          class="histogram-chart__baseline"
          :x1="chartPlotLeft"
          :x2="chartWidth - chartPlotRight"
          :y1="chartHeight - chartPlotBottom"
          :y2="chartHeight - chartPlotBottom"
        />
        <line
          v-if="average > 0"
          class="histogram-chart__average"
          :x1="chartPlotLeft"
          :x2="chartWidth - chartPlotRight"
          :y1="averageY"
          :y2="averageY"
        />

        <g v-for="(point, index) in points" :key="point.month">
          <rect
            class="histogram-chart__bar category-trend-chart__bar"
            :class="{ 'histogram-chart__bar--max': index === maxIndex }"
            :x="getBarX(index)"
            :y="getBarY(point.amount)"
            :width="barWidth"
            :height="getBarHeight(point.amount)"
            rx="7"
          />
          <text
            v-if="isLabelVisible(index)"
            class="histogram-chart__label"
            :x="getBarCenterX(index)"
            :y="chartHeight - 18"
          >
            {{ formatMonthShortTitle(point.month) }}
          </text>
        </g>
      </svg>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MonthlyAmount } from '@/types'
import { formatMonthShortTitle } from '@/utils/formatters'

const props = defineProps<{
  points: MonthlyAmount[]
  average: number
}>()

const chartWidth = 720
const chartHeight = 280
const chartPlotLeft = 28
const chartPlotRight = 28
const chartPlotTop = 28
const chartPlotBottom = 42
const barGapRatio = 0.38
const maxBarWidth = 84
const maxLabelCount = 14

const pointsLabel = computed(() => {
  const first = props.points[0]
  const last = props.points.at(-1)

  if (!first || !last) {
    return 'За всё время'
  }

  return first.month === last.month
    ? formatMonthShortTitle(first.month)
    : `${formatMonthShortTitle(first.month)} — ${formatMonthShortTitle(last.month)}`
})
const maxAmount = computed(() => Math.max(...props.points.map(point => point.amount), 0))
const maxIndex = computed(() =>
  maxAmount.value > 0 ? props.points.findIndex(point => point.amount === maxAmount.value) : -1,
)
const chartMaxValue = computed(() => Math.max(maxAmount.value, props.average, 1))
const plotWidth = computed(() => chartWidth - chartPlotLeft - chartPlotRight)
const plotHeight = computed(() => chartHeight - chartPlotTop - chartPlotBottom)
const slotWidth = computed(() => plotWidth.value / Math.max(props.points.length, 1))
const barWidth = computed(() =>
  Math.min(slotWidth.value * (1 - barGapRatio), maxBarWidth),
)
const averageY = computed(() => getBarY(props.average))
const labelStep = computed(() => Math.ceil(props.points.length / maxLabelCount))

function isLabelVisible(index: number) {
  return index % labelStep.value === 0
}

function getBarX(index: number) {
  return chartPlotLeft + slotWidth.value * index + (slotWidth.value - barWidth.value) / 2
}

function getBarCenterX(index: number) {
  return getBarX(index) + barWidth.value / 2
}

function getBarY(amount: number) {
  return chartPlotTop + plotHeight.value - (amount / chartMaxValue.value) * plotHeight.value
}

function getBarHeight(amount: number) {
  return Math.max(chartHeight - chartPlotBottom - getBarY(amount), amount > 0 ? 4 : 0)
}
</script>
