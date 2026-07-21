<template>
  <article class="panel analytics-panel monthly-histogram">
    <div class="panel__header">
      <div>
        <h2>Расходы по месяцам</h2>
        <span>Среднее {{ formatMoney(averageExpense, store.currencySymbol) }}</span>
      </div>
      <strong class="amount--expense">{{ formatMoney(maxExpense, store.currencySymbol) }}</strong>
    </div>

    <p v-if="totalExpense === 0" class="empty-state">За этот год расходов пока нет.</p>

    <div v-else class="histogram-chart">
      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" role="img" aria-label="Расходы по месяцам">
        <line
          class="histogram-chart__baseline"
          :x1="chartPlotLeft"
          :x2="chartWidth - chartPlotRight"
          :y1="chartHeight - chartPlotBottom"
          :y2="chartHeight - chartPlotBottom"
        />
        <line
          class="histogram-chart__average"
          :x1="chartPlotLeft"
          :x2="chartWidth - chartPlotRight"
          :y1="averageY"
          :y2="averageY"
        />
        <text
          class="histogram-chart__average-label"
          :x="chartWidth - chartPlotRight"
          :y="averageY - 8"
        >
          Среднее {{ formatMoney(averageExpense, store.currencySymbol) }}
        </text>

        <g v-for="month in monthlyExpenses" :key="month.key">
          <rect
            class="histogram-chart__bar"
            :class="{ 'histogram-chart__bar--max': month.index === maxExpenseIndex }"
            :x="getBarX(month.index)"
            :y="getBarY(month.amount)"
            :width="barWidth"
            :height="getBarHeight(month.amount)"
            rx="7"
          />
          <text
            class="histogram-chart__label"
            :x="getBarCenterX(month.index)"
            :y="chartHeight - 18"
          >
            {{ month.label }}
          </text>
          <text
            v-if="month.index === maxExpenseIndex"
            class="histogram-chart__max-label"
            :x="getMaxLabelX(month.index)"
            :y="getMaxLabelY(month.amount)"
            :text-anchor="getMaxLabelAnchor(month.index)"
          >
            <tspan>Максимум</tspan>
            <tspan :x="getMaxLabelX(month.index)" dy="15">
              {{ formatMoney(month.amount, store.currencySymbol) }}
            </tspan>
          </text>
        </g>
      </svg>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { isValidDate } from '@/utils/date'
import { formatMoney } from '@/utils/formatters'

const props = defineProps<{
  selectedYear: number
}>()

const store = useFinanceStore()
const chartWidth = 720
const chartHeight = 280
const chartPlotLeft = 28
const chartPlotRight = 28
const chartPlotTop = 34
const chartPlotBottom = 42
const monthLabels = [
  'Янв',
  'Фев',
  'Мар',
  'Апр',
  'Май',
  'Июн',
  'Июл',
  'Авг',
  'Сен',
  'Окт',
  'Ноя',
  'Дек',
]
const barGapRatio = 0.38

const currentYear = computed(() => Number(store.currentMonthKey.slice(0, 4)))
const currentMonthNumber = computed(() => Number(store.currentMonthKey.slice(5, 7)))
const monthlyExpenses = computed(() => {
  const amounts = Array.from({ length: 12 }, () => 0)

  store.activeOperations.forEach((operation) => {
    const date = new Date(operation.date)

    if (operation.type === 1 && isValidDate(date) && date.getFullYear() === props.selectedYear) {
      const monthIndex = date.getMonth()
      amounts[monthIndex] = (amounts[monthIndex] || 0) + operation.sum
    }
  })

  return amounts.map((amount, index) => ({
    amount,
    index,
    key: `${props.selectedYear}-${String(index + 1).padStart(2, '0')}`,
    label: monthLabels[index] || String(index + 1),
  }))
})
const totalExpense = computed(() =>
  monthlyExpenses.value.reduce((sum, month) => sum + month.amount, 0),
)
const maxExpense = computed(() =>
  Math.max(...monthlyExpenses.value.map((month) => month.amount), 0),
)
const maxExpenseIndex = computed(() =>
  monthlyExpenses.value.findIndex((month) => month.amount === maxExpense.value),
)
const averageMonthCount = computed(() => {
  if (props.selectedYear > currentYear.value) {
    return 0
  }

  return props.selectedYear === currentYear.value ? currentMonthNumber.value : 12
})
const averageExpense = computed(() =>
  averageMonthCount.value > 0 ? totalExpense.value / averageMonthCount.value : 0,
)
const chartMaxValue = computed(() => Math.max(maxExpense.value, averageExpense.value, 1))
const plotWidth = computed(() => chartWidth - chartPlotLeft - chartPlotRight)
const plotHeight = computed(() => chartHeight - chartPlotTop - chartPlotBottom)
const monthSlotWidth = computed(() => plotWidth.value / monthlyExpenses.value.length)
const barWidth = computed(() => monthSlotWidth.value * (1 - barGapRatio))
const averageY = computed(() => getBarY(averageExpense.value))

function getBarX(index: number) {
  return chartPlotLeft + monthSlotWidth.value * index + (monthSlotWidth.value - barWidth.value) / 2
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

function getMaxLabelX(index: number) {
  const offset = index >= monthlyExpenses.value.length - 3 ? -8 : barWidth.value + 8
  return getBarX(index) + (offset < 0 ? 0 : offset)
}

function getMaxLabelY(amount: number) {
  return Math.max(getBarY(amount) + 14, chartPlotTop + 16)
}

function getMaxLabelAnchor(index: number) {
  return index >= monthlyExpenses.value.length - 3 ? 'end' : 'start'
}
</script>
