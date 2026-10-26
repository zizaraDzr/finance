import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import CategoriesPage from '@/pages/CategoriesPage.vue'
import { useFinanceStore } from '@/stores/finance'
import type { FinanceData } from '@/storage/financeDb'
import { writeFinanceSnapshot } from '@/storage/financeDb'
import { createAccount, createCategory, createOperation, createSubcategory } from '@/test/fixtures'

vi.mock('@/storage/financeDb', () => ({
  readFinanceSnapshot: vi.fn(),
  writeFinanceSnapshot: vi.fn(),
}))

const writeSnapshot = vi.mocked(writeFinanceSnapshot)

async function mountPage(data: FinanceData = {}) {  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useFinanceStore()
  store.loadData({
    Account: [createAccount()],
    Category: [],
    Operation: [],
    Subcategory: [],
    Target: [],
    ...data,
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'dashboard', component: { template: '<div />' } },
      { path: '/categories', name: 'categories', component: { template: '<div />' } },
    ],
  })
  await router.push('/categories?month=2026-10')
  await router.isReady()

  const wrapper = mount(CategoriesPage, {
    global: {
      plugins: [pinia, router],
    },
  })

  return { wrapper, store, router }
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    writeSnapshot.mockReset()
    writeSnapshot.mockResolvedValue('key')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows categories of the selected type and switches type', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const salary = createCategory({ id: 'cat-salary', name: 'Зарплата', type: 0 })
    const { wrapper } = await mountPage({ Category: [food, salary] })

    expect(wrapper.text()).toContain('Продукты')
    expect(wrapper.text()).not.toContain('Зарплата')

    await wrapper.find('input[type="radio"][value="0"]').setValue()

    expect(wrapper.text()).toContain('Зарплата')
    expect(wrapper.text()).not.toContain('Продукты')
  })

  it('adds a new category at the top and marks it for the appear animation', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1, position: 0 })
    const { wrapper, store } = await mountPage({ Category: [food] })
    const createForm = wrapper.find('.category-create')

    await createForm.find('input[placeholder="Название"]').setValue('Новая')
    await createForm.trigger('submit')
    await flushPromises()

    const items = wrapper.findAll('.category-manager__item')
    expect(items).toHaveLength(2)
    expect(items[0]?.text()).toContain('Новая')
    expect(items[0]?.classes()).toContain('category-manager__item--new')
    expect(store.categories.find(category => category.name === 'Новая')?.position).toBeLessThan(
      food.position,
    )
  })

  it('does not render reorder arrows', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const { wrapper } = await mountPage({ Category: [food] })

    const arrows = wrapper
      .findAll('button')
      .filter(button => button.text() === '↑' || button.text() === '↓')

    expect(arrows).toHaveLength(0)
  })

  it('soft-deletes a category with its subcategories after confirmation', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const dairy = createSubcategory({ id: 'sub-dairy', name: 'Молочные', categoryID: 'cat-food' })
    const { wrapper, store } = await mountPage({ Category: [food], Subcategory: [dairy] })
    const confirmMock = vi.fn(() => true)
    vi.stubGlobal('confirm', confirmMock)

    const categoryRow = wrapper.find('.category-manager__item .category-manager__row')
    const removeButton = categoryRow.findAll('button').find(button => button.text() === 'Удалить')

    expect(removeButton).toBeTruthy()
    await removeButton?.trigger('click')
    await flushPromises()

    expect(confirmMock).toHaveBeenCalledWith(expect.stringContaining('Продукты'))
    expect(store.categories[0]?.isDeleted).toBe(true)
    expect(store.subcategories[0]?.isDeleted).toBe(true)
    expect(wrapper.find('.category-manager__item').exists()).toBe(false)
  })

  it('locks the category type when operations are attached', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const operation = createOperation({ id: 'op-food', categoryID: 'cat-food', type: 1 })
    const { wrapper } = await mountPage({ Category: [food], Operation: [operation] })

    const categoryRow = wrapper.find('.category-manager__item .category-manager__row')
    await categoryRow.findAll('button').find(button => button.text() === 'Изм.')?.trigger('click')

    const typeButtons = wrapper.findAll('.category-edit__type button')
    expect(typeButtons).toHaveLength(2)
    typeButtons.forEach(button => {
      expect(button.attributes('disabled')).toBeDefined()
    })
    expect(wrapper.text()).toContain('Тип нельзя изменить')
  })

  it('renames a category', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const { wrapper, store } = await mountPage({ Category: [food] })
    const categoryRow = wrapper.find('.category-manager__item .category-manager__row')

    await categoryRow.findAll('button').find(button => button.text() === 'Изм.')?.trigger('click')

    const editForm = wrapper.find('.category-edit')
    await editForm.find('.category-edit__input').setValue('Еда')
    await editForm.trigger('submit')
    await flushPromises()

    expect(store.categories[0]?.name).toBe('Еда')
    expect(wrapper.find('.category-manager__title').text()).toContain('Еда')
  })

  it('adds a subcategory to a category', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1 })
    const { wrapper, store } = await mountPage({ Category: [food] })
    const subcategoryForm = wrapper.find('.subcategory-create')

    await subcategoryForm.find('input').setValue('Сладости')
    await subcategoryForm.trigger('submit')
    await flushPromises()

    expect(store.subcategories[0]).toMatchObject({
      name: 'Сладости',
      categoryID: 'cat-food',
      isDeleted: false,
    })
    expect(wrapper.text()).toContain('Сладости')
  })

  it('toggles category activity', async () => {
    const food = createCategory({ id: 'cat-food', name: 'Продукты', type: 1, isActive: true })
    const { wrapper, store } = await mountPage({ Category: [food] })
    const checkbox = wrapper.find('.category-manager__toggle input')

    await checkbox.setValue(false)
    await flushPromises()

    expect(store.categories[0]?.isActive).toBe(false)
    expect(wrapper.text()).toContain('неактивна')
  })
})
