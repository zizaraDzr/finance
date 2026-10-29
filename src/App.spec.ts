import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import { useFinanceStore } from '@/stores/finance'

describe('App', () => {
  it('shows the app version above the page content', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    // App reads IndexedDB on mount; happy-dom has no database, so stub the load.
    vi.spyOn(useFinanceStore(), 'loadFromIndexedDB').mockResolvedValue(true)

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div>Page</div>' } }],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [pinia, router],
      },
    })
    await flushPromises()

    expect(wrapper.get('.app-version').text()).toMatch(/^v\d+\.\d+\.\d+$/)
  })
})
