<template>
  <section class="categories-page" :aria-busy="isSaving">
    <header class="categories-page__header">
      <button class="back-button" type="button" @click="goHome">Назад</button>

      <div>
        <h3>Категории</h3>
      </div>
    </header>

    <fieldset class="type-switch categories-type-switch">
      <legend>Тип категорий</legend>
      <label :class="{ 'type-switch__item--active': selectedType === 1 }">
        <input v-model="selectedType" type="radio" :value="1" @change="resetTransientState" />
        <span>Расход</span>
      </label>
      <label :class="{ 'type-switch__item--active': selectedType === 0 }">
        <input v-model="selectedType" type="radio" :value="0" @change="resetTransientState" />
        <span>Доход</span>
      </label>
    </fieldset>

    <form class="category-create panel" @submit.prevent="createCategory">
      <label class="field">
        <span>Новая категория</span>
        <input v-model="newCategoryName" type="text" placeholder="Название" />
      </label>

      <label class="field category-create__icon">
        <span>Иконка</span>
        <input v-model="newCategoryIcon" type="text" placeholder="🎨" maxlength="16" />
      </label>

      <button class="submit-button category-create__submit" type="submit" :disabled="isSaving">
        Добавить
      </button>
    </form>

    <p v-if="message" class="form-error">{{ message }}</p>

    <section class="category-manager panel" aria-label="Список категорий">
      <p v-if="visibleCategories.length === 0" class="empty-state">Категорий этого типа пока нет.</p>

      <article
        v-for="category in visibleCategories"
        :key="category.id"
        class="category-manager__item"
        :class="{ 'category-manager__item--new': category.id === newCategoryId }"
        @animationend="clearNewCategoryAnimation(category)"
      >
        <form
          v-if="editingCategoryId === category.id"
          class="category-edit"
          @submit.prevent="saveCategoryEdit(category)"
        >
          <div class="category-edit__fields">
            <input
              v-model="editingCategory.name"
              class="category-input category-edit__input"
              type="text"
              placeholder="Название"
            />
            <input
              v-model="editingCategory.icon"
              class="category-input category-edit__input category-edit__input--icon"
              type="text"
              placeholder="🎨"
              maxlength="16"
            />
          </div>

          <div class="category-edit__type">
            <span>Тип</span>
            <button
              class="panel-link-button"
              :class="{ 'category-edit__type-button--expense': editingCategory.type === 1 }"
              type="button"
              :disabled="isSaving || categoryHasOperations(category.id)"
              @click="editingCategory.type = 1"
            >
              Расход
            </button>
            <button
              class="panel-link-button"
              :class="{ 'category-edit__type-button--income': editingCategory.type === 0 }"
              type="button"
              :disabled="isSaving || categoryHasOperations(category.id)"
              @click="editingCategory.type = 0"
            >
              Доход
            </button>
          </div>

          <p v-if="categoryHasOperations(category.id)" class="category-edit__hint">
            Тип нельзя изменить: к категории привязаны операции.
          </p>

          <div class="category-manager__actions">
            <button class="panel-link-button panel-link-button--primary" type="submit" :disabled="isSaving">
              Сохранить
            </button>
            <button class="panel-link-button" type="button" :disabled="isSaving" @click="cancelCategoryEdit">
              Отмена
            </button>
          </div>
        </form>

        <div v-else class="category-manager__row">
          <div class="category-manager__title">
            <span v-if="category.icon" class="category-manager__icon" aria-hidden="true">{{ category.icon }}</span>
            <strong>{{ category.name || 'Без названия' }}</strong>
            <span class="category-manager__meta">{{ formatOperationsCount(categoryOperationsCount(category.id)) }}</span>
            <span v-if="!category.isActive" class="category-manager__badge">неактивна</span>
          </div>

          <div class="category-manager__actions">
            <label class="category-manager__toggle">
              <input
                type="checkbox"
                :checked="category.isActive"
                :disabled="isSaving"
                @change="setCategoryActive(category, $event)"
              />
              <span>Активна</span>
            </label>

            <button class="panel-link-button" type="button" :disabled="isSaving" @click="startCategoryEdit(category)">
              Изм.
            </button>
            <button class="panel-link-button" type="button" :disabled="isSaving" @click="removeCategory(category)">
              Удалить
            </button>
          </div>
        </div>

        <form class="subcategory-create" @submit.prevent="createSubcategory(category)">
          <input
            v-model="newSubcategoryNames[category.id]"
            class="category-input"
            type="text"
            placeholder="Новая подкатегория"
          />
          <button class="panel-link-button" type="submit" :disabled="isSaving">Добавить</button>
        </form>

        <ul v-if="categorySubcategories(category.id).length" class="subcategory-manager">
          <li
            v-for="subcategory in categorySubcategories(category.id)"
            :key="subcategory.id"
            class="subcategory-manager__item"
          >
            <form
              v-if="editingSubcategoryId === subcategory.id"
              class="subcategory-manager__row"
              @submit.prevent="saveSubcategoryEdit(subcategory)"
            >
              <input
                v-model="editingSubcategoryName"
                class="category-input subcategory-manager__input"
                type="text"
                placeholder="Название"
              />

              <div class="category-manager__actions">
                <button class="panel-link-button panel-link-button--primary" type="submit" :disabled="isSaving">
                  Сохранить
                </button>
                <button class="panel-link-button" type="button" :disabled="isSaving" @click="cancelSubcategoryEdit">
                  Отмена
                </button>
              </div>
            </form>

            <div v-else class="subcategory-manager__row">
              <div class="subcategory-manager__title">
                <strong>{{ subcategory.name || 'Без названия' }}</strong>
                <span v-if="!subcategory.isActive" class="category-manager__badge">неактивна</span>
              </div>

              <div class="category-manager__actions">
                <label class="category-manager__toggle">
                  <input
                    type="checkbox"
                    :checked="subcategory.isActive"
                    :disabled="isSaving"
                    @change="setSubcategoryActive(subcategory, $event)"
                  />
                  <span>Активна</span>
                </label>

                <button
                  class="panel-link-button"
                  type="button"
                  :disabled="isSaving"
                  @click="startSubcategoryEdit(subcategory)"
                >
                  Изм.
                </button>
                <button
                  class="panel-link-button"
                  type="button"
                  :disabled="isSaving"
                  @click="removeSubcategory(subcategory)"
                >
                  Удалить
                </button>
              </div>
            </div>
          </li>
        </ul>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFinanceStore } from '@/stores/finance'
import type { Category, Subcategory } from '@/types'
import { formatOperationsCount } from '@/utils/formatters'
import { readOptionalMonthQuery } from '@/utils/routeQuery'

const store = useFinanceStore()
const route = useRoute()
const router = useRouter()
const selectedType = ref(1)
const isSaving = ref(false)
const message = ref('')
const newCategoryName = ref('')
const newCategoryIcon = ref('')
const newSubcategoryNames = ref<Record<string, string>>({})
const editingCategoryId = ref<string | null>(null)
const editingCategory = ref({ name: '', icon: '', type: 1 })
const editingSubcategoryId = ref<string | null>(null)
const editingSubcategoryName = ref('')
const newCategoryId = ref<string | null>(null)

const returnMonth = computed(() => readOptionalMonthQuery(route.query.month))

const visibleCategories = computed(() =>
  store.categories
    .filter(category => category.type === selectedType.value && !category.isDeleted)
    .slice()
    .sort(
      (first, second) =>
        first.position - second.position || first.name.localeCompare(second.name),
    ),
)

const categoryOperationCounts = computed(() => {
  const counts = new Map<string, number>()

  store.operations.forEach(operation => {
    if (!operation.isDeleted && operation.categoryID) {
      counts.set(operation.categoryID, (counts.get(operation.categoryID) || 0) + 1)
    }
  })

  return counts
})

const subcategoriesByCategory = computed(() => {
  const groups = new Map<string, Subcategory[]>()

  store.subcategories
    .filter(subcategory => !subcategory.isDeleted)
    .forEach(subcategory => {
      const group = groups.get(subcategory.categoryID) || []
      group.push(subcategory)
      groups.set(subcategory.categoryID, group)
    })

  groups.forEach(group => {
    group.sort(
      (first, second) =>
        first.position - second.position || first.name.localeCompare(second.name),
    )
  })

  return groups
})

function categoryOperationsCount(categoryId: string) {
  return categoryOperationCounts.value.get(categoryId) || 0
}

function categoryHasOperations(categoryId: string) {
  return categoryOperationsCount(categoryId) > 0
}

function categorySubcategories(categoryId: string) {
  return subcategoriesByCategory.value.get(categoryId) || []
}

function goHome() {
  router.push({
    name: 'dashboard',
    query: returnMonth.value ? { month: returnMonth.value } : {},
  })
}

function resetTransientState() {
  editingCategoryId.value = null
  editingSubcategoryId.value = null
  newCategoryId.value = null
  message.value = ''
}

async function runSave(action: () => Promise<unknown>) {
  if (isSaving.value) {
    return
  }

  isSaving.value = true
  message.value = ''

  try {
    await action()
  } catch (error) {
    message.value = error instanceof Error ? error.message : `${error}`
  } finally {
    isSaving.value = false
  }
}

function getTopCategoryPosition(type: number) {
  const positions = store.categories
    .filter(category => category.type === type)
    .map(category => category.position)

  return positions.length ? Math.min(...positions) - 1 : 0
}

function getNextSubcategoryPosition(categoryId: string) {
  return (
    store.subcategories
      .filter(subcategory => subcategory.categoryID === categoryId)
      .reduce((max, subcategory) => Math.max(max, subcategory.position), -1) + 1
  )
}

async function createCategory() {
  const name = newCategoryName.value.trim()

  if (!name) {
    message.value = 'Введите название категории.'
    return
  }

  await runSave(async () => {
    const category = await store.addCategory({
      name,
      icon: newCategoryIcon.value.trim(),
      isActive: true,
      position: getTopCategoryPosition(selectedType.value),
      type: selectedType.value,
      budgetSum: 0,
      budgetPeriod: 2,
      budgetStartDay: new Date().toISOString(),
      accountID: store.accounts[0]?.id || '',
    })

    newCategoryId.value = category.id
    newCategoryName.value = ''
    newCategoryIcon.value = ''
  })
}

function clearNewCategoryAnimation(category: Category) {
  if (newCategoryId.value === category.id) {
    newCategoryId.value = null
  }
}

function startCategoryEdit(category: Category) {
  editingCategoryId.value = category.id
  editingCategory.value = {
    name: category.name,
    icon: category.icon,
    type: category.type,
  }
  editingSubcategoryId.value = null
  message.value = ''
}

function cancelCategoryEdit() {
  editingCategoryId.value = null
}

async function saveCategoryEdit(category: Category) {
  const name = editingCategory.value.name.trim()

  if (!name) {
    message.value = 'Введите название категории.'
    return
  }

  if (editingCategory.value.type !== category.type && categoryHasOperations(category.id)) {
    message.value = 'Нельзя изменить тип: к категории привязаны операции.'
    return
  }

  await runSave(async () => {
    await store.updateCategory(category.id, {
      name,
      icon: editingCategory.value.icon.trim(),
      type: editingCategory.value.type,
    })
    editingCategoryId.value = null
  })
}

async function setCategoryActive(category: Category, event: Event) {
  const target = event.target as HTMLInputElement
  await runSave(() => store.updateCategory(category.id, { isActive: target.checked }))
}

async function removeCategory(category: Category) {
  const name = category.name || 'Без названия'

  if (
    !window.confirm(
      `Удалить категорию «${name}»? Она и её подкатегории исчезнут из выбора, старые операции сохранят названия.`,
    )
  ) {
    return
  }

  await runSave(() => store.deleteCategory(category.id))
}

async function createSubcategory(category: Category) {
  const name = (newSubcategoryNames.value[category.id] || '').trim()

  if (!name) {
    message.value = 'Введите название подкатегории.'
    return
  }

  await runSave(async () => {
    await store.addSubcategory({
      name,
      isActive: true,
      position: getNextSubcategoryPosition(category.id),
      categoryID: category.id,
    })

    newSubcategoryNames.value[category.id] = ''
  })
}

function startSubcategoryEdit(subcategory: Subcategory) {
  editingSubcategoryId.value = subcategory.id
  editingSubcategoryName.value = subcategory.name
  editingCategoryId.value = null
  message.value = ''
}

function cancelSubcategoryEdit() {
  editingSubcategoryId.value = null
}

async function saveSubcategoryEdit(subcategory: Subcategory) {
  const name = editingSubcategoryName.value.trim()

  if (!name) {
    message.value = 'Введите название подкатегории.'
    return
  }

  await runSave(async () => {
    await store.updateSubcategory(subcategory.id, { name })
    editingSubcategoryId.value = null
  })
}

async function setSubcategoryActive(subcategory: Subcategory, event: Event) {
  const target = event.target as HTMLInputElement
  await runSave(() => store.updateSubcategory(subcategory.id, { isActive: target.checked }))
}

async function removeSubcategory(subcategory: Subcategory) {
  const name = subcategory.name || 'Без названия'

  if (
    !window.confirm(
      `Удалить подкатегорию «${name}»? Она исчезнет из выбора, старые операции сохранят название.`,
    )
  ) {
    return
  }

  await runSave(() => store.deleteSubcategory(subcategory.id))
}
</script>
