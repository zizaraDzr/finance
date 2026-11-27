<template>
  <article class="card chart-card monthly-histogram">
    <header class="card__head">
      <div>
        <p class="eyebrow">По месяцам</p>
        <h2>Расходы за год</h2>
        <span>Среднее {{ formatMoney(averageExpense, store.currencySymbol) }}</span>
      </div>
      <strong class="amount--expense">{{ formatMoney(maxExpense, store.currencySymbol) }}</strong>
    </header>

    <p v-if="totalExpense === 0" class="empty-state">За этот год расходов пока нет.</p>

    <div v-else class="histogram-chart">
      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" role="group" aria-label="Расходы по месяцам">
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
          :x="averageLabel.placement.x"
          :y="averageLabel.placement.y"
          :text-anchor="averageLabel.placement.anchor"
        >
          {{ averageLabel.text }}
        </text>

        <g
          v-for="month in chartMonths"
          :key="month.key"
          class="histogram-chart__month"
          :class="{ 'histogram-chart__month--disabled': !isMonthSelectable(month.key) }"
          role="button"
          :tabindex="isMonthSelectable(month.key) ? 0 : -1"
          :aria-label="getMonthAriaLabel(month)"
          :aria-disabled="isMonthSelectable(month.key) ? undefined : 'true'"
          @click="selectMonth(month.key)"
          @keydown.enter.prevent="selectMonth(month.key)"
          @keydown.space.prevent="selectMonth(month.key)"
        >
          <!-- Прозрачная область на всю колонку: клик/тап по пустому месту и подписи тоже открывает месяц -->
          <rect
            class="histogram-chart__hit-area"
            :x="getMonthSlotX(month.index)"
            :y="chartPlotTop"
            :width="monthSlotWidth"
            :height="chartHeight - chartPlotTop"
          />
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
            :y="chartHeight - 22"
          >
            {{ month.label }}
          </text>
          <text
            class="histogram-chart__sum-label"
            :x="month.sumPlacement.x"
            :y="month.sumPlacement.y"
            :text-anchor="month.sumPlacement.anchor"
          >
            {{ month.sumText }}
          </text>
        </g>
      </svg>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { isValidDate, parseMonthKey } from '@/utils/date'
import type { ChartArea, ChartHintPlacement } from '@/utils/chart'
import { fitHintInArea } from '@/utils/chart'
import { formatMoney, formatMonthTitle } from '@/utils/formatters'

type MonthlyExpense = {
  amount: number
  index: number
  key: string
  label: string
}

type ChartMonth = MonthlyExpense & {
  sumText: string
  sumPlacement: ChartHintPlacement
}

const props = defineProps<{
  selectedYear: number
}>()

const emit = defineEmits<{
  selectMonth: [monthKey: string]
}>()

const store = useFinanceStore()
const chartWidth = 720
const chartHeight = 280
const chartPlotLeft = 28
const chartPlotRight = 28
const chartPlotTop = 34
const chartPlotBottom = 42
// Размеры шрифтов подсказок в пользовательских единицах SVG (0.9rem и 0.6rem от 16px).
const hintFontSize = 14.4
const sumLabelFontSize = 9.6
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

const currentYear = computed(() => parseMonthKey(store.currentMonthKey).year)
const currentMonthNumber = computed(() => parseMonthKey(store.currentMonthKey).month)
const monthlyExpenses = computed<MonthlyExpense[]>(() => {
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
const plotArea = computed<ChartArea>(() => ({
  left: chartPlotLeft,
  right: chartWidth - chartPlotRight,
  top: chartPlotTop,
  bottom: chartHeight - chartPlotBottom,
}))
// Суммы месяцев живут в полосе под осью, а не внутри области столбцов.
const labelArea = computed<ChartArea>(() => ({
  left: chartPlotLeft,
  right: chartWidth - chartPlotRight,
  top: chartHeight - chartPlotBottom,
  bottom: chartHeight,
}))
const chartMonths = computed<ChartMonth[]>(() =>
  monthlyExpenses.value.map((month) => {
    const sumText = formatMoney(month.amount, store.currencySymbol)

    return {
      ...month,
      sumText,
      sumPlacement: fitHintInArea({
        text: sumText,
        x: getBarCenterX(month.index),
        y: chartHeight - 6,
        anchor: 'middle',
        fontSize: sumLabelFontSize,
        area: labelArea.value,
      }),
    }
  }),
)
const averageLabel = computed(() => {
  const text = `Среднее ${formatMoney(averageExpense.value, store.currencySymbol)}`

  return {
    text,
    placement: fitHintInArea({
      text,
      x: chartWidth - chartPlotRight,
      y: averageY.value - 8,
      anchor: 'end',
      fontSize: hintFontSize,
      area: plotArea.value,
    }),
  }
})

function getBarX(index: number) {
  return chartPlotLeft + monthSlotWidth.value * index + (monthSlotWidth.value - barWidth.value) / 2
}

function getBarCenterX(index: number) {
  return getBarX(index) + barWidth.value / 2
}

function getMonthSlotX(index: number) {
  return chartPlotLeft + monthSlotWidth.value * index
}

function isMonthSelectable(monthKey: string) {
  return monthKey <= store.currentMonthKey
}

function getMonthAriaLabel(month: MonthlyExpense) {
  return `${formatMonthTitle(month.key)}, расходы: ${formatMoney(month.amount, store.currencySymbol)}`
}

function selectMonth(monthKey: string) {
  if (!isMonthSelectable(monthKey)) {
    return
  }

  emit('selectMonth', monthKey)
}

function getBarY(amount: number) {
  return chartPlotTop + plotHeight.value - (amount / chartMaxValue.value) * plotHeight.value
}

function getBarHeight(amount: number) {
  return Math.max(chartHeight - chartPlotBottom - getBarY(amount), amount > 0 ? 4 : 0)
}
</script>
