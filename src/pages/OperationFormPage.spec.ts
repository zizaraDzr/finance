import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import OperationFormPage from '@/pages/OperationFormPage.vue'
import { useFinanceStore } from '@/stores/finance'
import type { FinanceData } from '@/storage/financeDb'
import { writeFinanceSnapshot } from '@/storage/financeDb'
import { createAccount, createCategory } from '@/test/fixtures'
import { minOperationLoaderDuration } from '@/utils/delay'

vi.mock('@/storage/financeDb', () => ({
  readFinanceSnapshot: vi.fn(),
  writeFinanceSnapshot: vi.fn(),
}))

const writeSnapshot = vi.mocked(writeFinanceSnapshot)

async function mountForm(data: FinanceData = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useFinanceStore()
  store.loadData({
    Account: [createAccount()],
    Category: [createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })],
    Operation: [],
    Subcategory: [],
    Target: [],
    ...data,
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div />' } },
      { path: '/add', name: 'operation-add', component: { template: '<div />' } },
    ],
  })
  await router.push('/add?from=dashboard&month=2026-10')
  await router.isReady()

  const wrapper = mount(OperationFormPage, {
    global: {
      plugins: [pinia, router],
    },
  })

  return { wrapper, store, router }
}

describe('OperationFormPage', () => {
  beforeEach(() => {
    writeSnapshot.mockReset()
    writeSnapshot.mockResolvedValue('key')
  })

  it('keeps the loader visible for at least the minimum duration', async () => {
    const { wrapper, router } = await mountForm()

    await wrapper.find('input[type="number"]').setValue(250)
    await wrapper.find('.category-select').trigger('click')
    await wrapper.find('form.operation-form').trigger('submit')

    expect(wrapper.find('.page-loader').exists()).toBe(true)

    await new Promise(resolve => setTimeout(resolve, minOperationLoaderDuration - 100))
    expect(wrapper.find('.page-loader').exists()).toBe(true)
    expect(router.currentRoute.value.name).toBe('operation-add')

    await new Promise(resolve => setTimeout(resolve, 200))
    await flushPromises()

    expect(wrapper.find('.page-loader').exists()).toBe(false)
    expect(router.currentRoute.value.name).toBe('dashboard')
  })
})
