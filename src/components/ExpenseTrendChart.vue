<template>
  <article class="panel analytics-panel">
    <div class="panel__header">
      <div>
        <h2>Тенденция</h2>
        <span>{{ trendSubtitle }}</span>
      </div>
    </div>

    <div class="trend-legend" aria-label="Легенда графика">
      <span><i class="trend-legend__marker trend-legend__marker--current"></i>{{ trendCurrentLabel }}</span>
      <span><i class="trend-legend__marker trend-legend__marker--previous"></i>{{ trendPreviousLabel }}</span>
    </div>

    <div class="trend-chart">
      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" role="img" aria-label="Тенденция расходов">
        <line
          class="trend-chart__baseline"
          :x1="chartPlotLeft"
          :x2="chartWidth - chartPlotRight"
          :y1="chartHeight - chartPlotBottom"
          :y2="chartHeight - chartPlotBottom"
        />
        <line
          v-if="currentMarkerX !== null"
          class="trend-chart__today"
          :x1="currentMarkerX"
          :x2="currentMarkerX"
          :y1="chartPlotTop"
          :y2="chartHeight - chartPlotBottom"
        />
        <polyline class="trend-chart__line trend-chart__line--previous" :points="previousTrendPoints" />
        <polyline class="trend-chart__line trend-chart__line--current" :points="currentTrendPoints" />

        <g v-for="label in chartLabels" :key="label.key">
          <line
            class="trend-chart__tick"
            :x1="label.x"
            :x2="label.x"
            :y1="chartHeight - chartPlotBottom"
            :y2="chartHeight - chartPlotBottom + 5"
          />
          <text class="trend-chart__label" :x="label.x" :y="chartHeight - 18">
            {{ label.label }}
          </text>
        </g>
      </svg>
    </div>

    <p class="trend-description">{{ trendDescription }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import { getMonthKey, isValidDate, shiftMonthKey } from '@/utils/date'
import { formatMoney, formatMonthTitle, formatPercent } from '@/utils/formatters'

type ExpenseTrendPeriod = 'month' | 'year'

type TrendPoint = {
  label: string
  value: number
}

const props = withDefaults(
  defineProps<{
    period?: ExpenseTrendPeriod
    selectedMonthKey: string
  }>(),
  {
    period: 'month',
  },
)

const store = useFinanceStore()
const chartWidth = 720
const chartHeight = 260
const chartPlotLeft = 28
const chartPlotRight = 18
const chartPlotTop = 18
const chartPlotBottom = 48
const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

const previousMonthKey = computed(() => shiftMonthKey(props.selectedMonthKey, -1))
const selectedYear = computed(() => Number(props.selectedMonthKey.slice(0, 4)))
const currentYear = computed(() => Number(store.currentMonthKey.slice(0, 4)))
const selectedMonthTitle = computed(() => formatMonthTitle(props.selectedMonthKey))
const trendData = computed(() =>
  props.period === 'year'
    ? buildYearTrend(selectedYear.value)
    : buildMonthTrend(props.selectedMonthKey, previousMonthKey.value),
)
const trendSubtitle = computed(() =>
  props.period === 'month' ? 'Текущий месяц к предыдущему' : 'Текущий год к предыдущему',
)
const trendCurrentLabel = computed(() =>
  props.period === 'month' ? selectedMonthTitle.value : String(selectedYear.value),
)
const trendPreviousLabel = computed(() =>
  props.period === 'month' ? formatMonthTitle(previousMonthKey.value) : String(selectedYear.value - 1),
)
const trendMaxValue = computed(() =>
  Math.max(
    ...trendData.value.current.map(point => point.value),
    ...trendData.value.previous.map(point => point.value),
    1,
  ),
)
const currentTrendDataLength = computed(() => getCurrentTrendDataLength(trendData.value.current.length))
const visibleCurrentTrendData = computed(() =>
  trendData.value.current.slice(0, currentTrendDataLength.value),
)
const currentTrendPoints = computed(() => getTrendPoints(visibleCurrentTrendData.value, trendData.value.current.length))
const previousTrendPoints = computed(() => getTrendPoints(trendData.value.previous))
const trendComparison = computed(() => {
  const index = currentTrendDataLength.value - 1
  const currentValue = index >= 0 ? trendData.value.current[index]?.value || 0 : 0
  const previousValue = index >= 0 ? trendData.value.previous[index]?.value || 0 : 0

  return {
    currentValue,
    difference: currentValue - previousValue,
    previousValue,
  }
})
const trendDescription = computed(() => {
  const { currentValue, difference, previousValue } = trendComparison.value
  const periodPointLabel = props.period === 'year' ? 'к этому месяцу' : 'к этому дню'

  if (currentTrendDataLength.value === 0) {
    return 'За выбранный период пока нет данных для сравнения.'
  }

  if (previousValue === 0) {
    if (currentValue === 0) {
      return `Вы потратили ${periodPointLabel} столько же, сколько в прошлом периоде.`
    }

    return `Вы потратили ${periodPointLabel} на ${formatMoney(currentValue, store.currencySymbol)} больше, чем в прошлом периоде.`
  }

  const percentDifference = Math.abs((difference / previousValue) * 100)

  if (difference > 0) {
    return `Вы потратили ${periodPointLabel} на ${formatPercent(percentDifference)} больше, чем в прошлом периоде.`
  }

  if (difference < 0) {
    return `Вы потратили ${periodPointLabel} на ${formatPercent(percentDifference)} меньше, чем в прошлом периоде.`
  }

  return `Вы потратили ${periodPointLabel} столько же, сколько в прошлом периоде.`
})
const chartLabels = computed(() =>
  trendData.value.current
    .filter((_, index) => index % 2 === 0)
    .map((point, index) => ({
      key: `${point.label}:${index}`,
      label: point.label,
      x: getChartX(index * 2, trendData.value.current.length),
    })),
)
const currentMarkerX = computed(() => {
  const today = new Date()

  if (props.period === 'year') {
    return today.getFullYear() === selectedYear.value ? getChartX(today.getMonth(), 12) : null
  }

  if (getMonthKey(today) !== props.selectedMonthKey) {
    return null
  }

  return getChartX(today.getDate() - 1, trendData.value.current.length)
})

function buildMonthTrend(currentMonth: string, previousMonth: string) {
  return {
    current: getDailyExpenseTrend(currentMonth),
    previous: getDailyExpenseTrend(previousMonth),
  }
}

function buildYearTrend(year: number) {
  return {
    current: getMonthlyExpenseTrend(year),
    previous: getMonthlyExpenseTrend(year - 1),
  }
}

function getDailyExpenseTrend(month: string) {
  const amounts = Array.from({ length: getDaysInMonth(month) }, () => 0)

  store.activeOperations.forEach(operation => {
    const date = new Date(operation.date)

    if (operation.type === 1 && isValidDate(date) && getMonthKey(date) === month) {
      const dayIndex = date.getDate() - 1
      amounts[dayIndex] = (amounts[dayIndex] || 0) + operation.sum
    }
  })

  return createCumulativeTrend(amounts, index => String(index + 1))
}

function getMonthlyExpenseTrend(year: number) {
  const amounts = Array.from({ length: 12 }, () => 0)

  store.activeOperations.forEach(operation => {
    const date = new Date(operation.date)

    if (operation.type === 1 && isValidDate(date) && date.getFullYear() === year) {
      const monthIndex = date.getMonth()
      amounts[monthIndex] = (amounts[monthIndex] || 0) + operation.sum
    }
  })

  return createCumulativeTrend(amounts, index => monthLabels[index] || String(index + 1))
}

function createCumulativeTrend(amounts: number[], getLabel: (index: number) => string) {
  let total = 0

  return amounts.map((amount, index): TrendPoint => {
    total += amount

    return {
      label: getLabel(index),
      value: total,
    }
  })
}

function getDaysInMonth(month: string) {
  const [year, monthIndex] = month.split('-').map(Number)
  return new Date(year || 0, monthIndex || 1, 0).getDate()
}

function getCurrentTrendDataLength(totalLength: number) {
  const today = new Date()

  if (props.period === 'year') {
    if (selectedYear.value > currentYear.value) {
      return 0
    }

    return selectedYear.value === currentYear.value ? today.getMonth() + 1 : totalLength
  }

  if (props.selectedMonthKey > store.currentMonthKey) {
    return 0
  }

  return props.selectedMonthKey === store.currentMonthKey ? today.getDate() : totalLength
}

function getTrendPoints(points: TrendPoint[], totalLength = points.length) {
  return points
    .map((point, index) => `${getChartX(index, totalLength)},${getChartY(point.value)}`)
    .join(' ')
}

function getChartX(index: number, count: number) {
  const plotWidth = chartWidth - chartPlotLeft - chartPlotRight

  if (count <= 1) {
    return chartPlotLeft
  }

  return chartPlotLeft + (plotWidth * index) / (count - 1)
}

function getChartY(value: number) {
  const plotHeight = chartHeight - chartPlotTop - chartPlotBottom
  return chartPlotTop + plotHeight - (value / trendMaxValue.value) * plotHeight
}
</script>
