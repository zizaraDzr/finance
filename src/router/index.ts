import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '@/pages/DashboardPage.vue'
import ExpenseAnalyticsPage from '@/pages/ExpenseAnalyticsPage.vue'
import OperationFormPage from '@/pages/OperationFormPage.vue'
import OperationsPage from '@/pages/OperationsPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage,
    },
    {
      path: '/operations',
      name: 'operations',
      component: OperationsPage,
    },
    {
      path: '/expense-analytics',
      name: 'expense-analytics',
      component: ExpenseAnalyticsPage,
    },
    {
      path: '/add',
      name: 'operation-add',
      component: OperationFormPage,
    },
    {
      path: '/edit/:id',
      name: 'operation-edit',
      component: OperationFormPage,
    },
    {
      path: '/edit',
      redirect: to => {
        const id = typeof to.query.id === 'string' ? to.query.id : ''

        if (!id) {
          return {
            name: 'dashboard',
            query: {
              month: to.query.month,
            },
          }
        }

        return {
          name: 'operation-edit',
          params: { id },
          query: {
            month: to.query.month,
            from: to.query.from,
            period: to.query.period,
            type: to.query.type,
          },
        }
      },
    },
  ],
})

export default router
