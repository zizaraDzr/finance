import type { MonthlySummary } from '@/stores/finance'
import { formatPercent } from '@/utils/formatters'

export function getExpenseTrend(currentMonth: MonthlySummary, previousMonth: MonthlySummary) {
  const currentExpense = currentMonth.expense
  const previousExpense = previousMonth.expense
  const difference = currentExpense - previousExpense

  if (previousExpense === 0) {
    if (currentExpense === 0) {
      return { tone: 'neutral', text: 'Нет расходов в текущем и прошлом месяце' }
    }

    return { tone: 'bad', text: 'Больше прошлого месяца: тогда расходов не было' }
  }

  if (difference === 0) {
    return { tone: 'neutral', text: 'На уровне прошлого месяца' }
  }

  const percent = Math.abs((difference / previousExpense) * 100)

  if (difference > 0) {
    return { tone: 'bad', text: `Больше прошлого месяца на ${formatPercent(percent)}` }
  }

  return { tone: 'good', text: `Меньше прошлого месяца на ${formatPercent(percent)}` }
}
