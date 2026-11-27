<template>
  <section class="categories-page" :aria-busy="isSaving">
    <header class="page-head">
      <div class="page-head__text">
        <p class="eyebrow">Настройки</p>
        <h1>Категории</h1>
        <p class="page-lead">Расходы и доходы, по которым вы ведёте учёт.</p>
      </div>

      <div class="page-head__actions">
        <fieldset class="segmented categories-type-switch">
          <legend class="visually-hidden">Тип категорий</legend>
          <label class="segmented__option" :class="{ 'segmented__option--active': selectedType === 1 }">
            <input v-model="selectedType" type="radio" :value="1" @change="resetTransientState" />
            <span>Расходы</span>
          </label>
          <label class="segmented__option" :class="{ 'segmented__option--active': selectedType === 0 }">
            <input v-model="selectedType" type="radio" :value="0" @change="resetTransientState" />
            <span>Доходы</span>
          </label>
        </fieldset>
      </div>
    </header>

    <form class="category-create card" @submit.prevent="createCategory">
      <label class="field category-create__icon">
        <span class="field-label">Иконка</span>
        <input v-model="newCategoryIcon" type="text" placeholder="🎨" maxlength="16" />
      </label>

      <label class="field">
        <span class="field-label">Новая категория</span>
        <input v-model="newCategoryName" type="text" placeholder="Название" />
      </label>

      <button class="button button--primary category-create__submit" type="submit" :disabled="isSaving">
        <AppIcon name="plus" :size="17" />
        <span>Добавить</span>
      </button>
    </form>

    <p v-if="message" class="form-error">{{ message }}</p>

    <section class="category-manager card" aria-label="Список категорий">
      <p v-if="visibleCategories.length === 0" class="empty-state">
        Категорий этого типа пока нет. Добавьте первую — это займёт пару секунд.
      </p>

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
              class="category-input category-edit__input category-edit__input--name"
              type="text"
              placeholder="Название"
              aria-label="Название категории"
            />
            <input
              v-model="editingCategory.icon"
              class="category-input category-edit__input category-edit__input--icon"
              type="text"
              placeholder="🎨"
              maxlength="16"
              aria-label="Иконка категории"
            />
          </div>

          <div class="category-edit__type">
            <span>Тип</span>
            <button
              class="chip"
              :class="{ 'chip--active': editingCategory.type === 1 }"
              type="button"
              :disabled="isSaving || categoryHasOperations(category.id)"
              @click="editingCategory.type = 1"
            >
              Расход
            </button>
            <button
              class="chip"
              :class="{ 'chip--active': editingCategory.type === 0 }"
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
            <button class="button button--primary button--small" type="submit" :disabled="isSaving">
              Сохранить
            </button>
            <button class="button button--quiet button--small" type="button" :disabled="isSaving" @click="cancelCategoryEdit">
              Отмена
            </button>
          </div>
        </form>

        <div v-else class="category-manager__row">
          <div class="category-manager__title">
            <span class="category-manager__icon" aria-hidden="true">{{ category.icon || '•' }}</span>

            <span class="category-manager__title-text">
              <strong>{{ category.name || 'Без названия' }}</strong>
              <span class="category-manager__meta">
                {{ formatOperationsCount(categoryOperationsCount(category.id)) }}
              </span>
            </span>

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

            <button class="button button--quiet button--small" type="button" :disabled="isSaving" @click="startCategoryEdit(category)">
              Изм.
            </button>
            <button class="button button--quiet button--small button--danger" type="button" :disabled="isSaving" @click="removeCategory(category)">
              Удалить
            </button>
          </div>
        </div>

        <ul v-if="categorySubcategories(category.id).length" class="subcategory-manager">
          <li
            v-for="subcategory in categorySubcategories(category.id)"
            :key="subcategory.id"
            class="subcategory-manager__item"
            :class="{ 'subcategory-manager__item--inactive': !subcategory.isActive }"
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
                <button class="button button--primary button--small" type="submit" :disabled="isSaving">
                  Сохранить
                </button>
                <button class="button button--quiet button--small" type="button" :disabled="isSaving" @click="cancelSubcategoryEdit">
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
                <label class="category-manager__toggle category-manager__toggle--compact" :title="subcategory.isActive ? 'Скрыть из выбора' : 'Вернуть в выбор'">
                  <input
                    type="checkbox"
                    :checked="subcategory.isActive"
                    :disabled="isSaving"
                    :aria-label="`Активна: ${subcategory.name}`"
                    @change="setSubcategoryActive(subcategory, $event)"
                  />
                </label>

                <button
                  class="icon-button icon-button--small"
                  type="button"
                  :disabled="isSaving"
                  :aria-label="`Изменить ${subcategory.name}`"
                  @click="startSubcategoryEdit(subcategory)"
                >
                  <AppIcon name="pencil" :size="14" />
                </button>
                <button
                  class="icon-button icon-button--small icon-button--danger"
                  type="button"
                  :disabled="isSaving"
                  :aria-label="`Удалить ${subcategory.name}`"
                  @click="removeSubcategory(subcategory)"
                >
                  <AppIcon name="trash" :size="14" />
                </button>
              </div>
            </div>
          </li>
        </ul>

        <form class="subcategory-create" @submit.prevent="createSubcategory(category)">
          <input
            v-model="newSubcategoryNames[category.id]"
            class="category-input"
            type="text"
            :placeholder="categorySubcategories(category.id).length ? 'Ещё подкатегория' : 'Подкатегория'"
          />
          <button class="icon-button icon-button--small" type="submit" :disabled="isSaving" aria-label="Добавить подкатегорию">
            <AppIcon name="plus" :size="15" />
          </button>
        </form>
      </article>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { useFinanceStore } from '@/stores/finance'
import type { Category, Subcategory } from '@/types'
import {
  compareByPositionThenName,
  countOperationsByCategory,
  getNextSubcategoryPosition,
  getTopCategoryPosition,
  groupSubcategoriesByCategory,
} from '@/utils/categories'
import { formatOperationsCount } from '@/utils/formatters'

const store = useFinanceStore()
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

const visibleCategories = computed(() =>
  store.categories
    .filter(category => category.type === selectedType.value && !category.isDeleted)
    .sort(compareByPositionThenName),
)

const categoryOperationCounts = computed(() => countOperationsByCategory(store.operations))

const subcategoriesByCategory = computed(() => groupSubcategoriesByCategory(store.subcategories))

function categoryOperationsCount(categoryId: string) {
  return categoryOperationCounts.value.get(categoryId) || 0
}

function categoryHasOperations(categoryId: string) {
  return categoryOperationsCount(categoryId) > 0
}

function categorySubcategories(categoryId: string) {
  return subcategoriesByCategory.value.get(categoryId) || []
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
      position: getTopCategoryPosition(store.categories, selectedType.value),
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
      position: getNextSubcategoryPosition(store.subcategories, category.id),
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
