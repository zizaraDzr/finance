<template>
  <div class="app-frame">
    <div
      class="pull-refresh"
      :class="{ 'pull-refresh--visible': distance > 0, 'pull-refresh--ready': isPullReady }"
      :style="{ '--pull': `${distance}px` }"
      aria-hidden="true"
    >
      {{ isPullReady ? 'Отпустите, чтобы обновить' : 'Потяните вниз' }}
    </div>

    <aside class="shell-sidebar">
      <RouterLink class="brand" :to="{ name: 'dashboard', query: monthQuery }">
        <span class="brand__mark" aria-hidden="true">₽</span>
        <span class="brand__text">
          <strong>Бюджет</strong>
          <small>личные финансы</small>
        </span>
      </RouterLink>

      <nav class="shell-nav" aria-label="Разделы">
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          class="shell-nav__item"
          :class="{ 'shell-nav__item--active': item.active }"
          :aria-current="item.active ? 'page' : undefined"
        >
          <AppIcon :name="item.icon" :size="19" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="shell-sidebar__foot">
        <button class="theme-card" type="button" @click="toggleTheme">
          <span class="theme-card__icon">
            <AppIcon :name="theme === 'dark' ? 'moon' : 'sun'" :size="18" />
          </span>
          <span class="theme-card__text">
            <strong>{{ theme === 'dark' ? 'Тёмная тема' : 'Светлая тема' }}</strong>
            <small>Нажмите, чтобы сменить</small>
          </span>
        </button>

        <div class="shell-sidebar__meta">
          <AppVersion />
          <span class="shell-sidebar__status">
            <i class="status-dot" aria-hidden="true"></i>
            Офлайн-данные
          </span>
        </div>
      </div>
    </aside>

    <div class="shell-main">
      <header class="shell-topbar">
        <RouterLink class="brand brand--compact" :to="{ name: 'dashboard', query: monthQuery }">
          <span class="brand__mark" aria-hidden="true">₽</span>
          <span class="brand__text"><strong>Бюджет</strong></span>
        </RouterLink>

        <div class="shell-topbar__actions">
          <AppVersion />
          <button class="icon-button" type="button" :aria-label="themeLabel" @click="toggleTheme">
            <AppIcon :name="theme === 'dark' ? 'moon' : 'sun'" :size="19" />
          </button>
        </div>
      </header>

      <main id="main" class="app-shell">
        <div v-if="!isReady" class="app-loading" role="status" aria-live="polite">
          <span class="app-loading__mark" aria-hidden="true">₽</span>
          <p>Открываем ваш бюджет…</p>
        </div>

        <RouterView v-else />
      </main>
    </div>

    <nav class="shell-tabbar" aria-label="Разделы">
      <RouterLink
        v-for="item in navItems.slice(0, 2)"
        :key="item.label"
        :to="item.to"
        class="shell-tabbar__item"
        :class="{ 'shell-tabbar__item--active': item.active }"
      >
        <AppIcon :name="item.icon" :size="21" />
        <span>{{ item.label }}</span>
      </RouterLink>

      <RouterLink
        class="shell-tabbar__fab"
        :to="{ name: 'operation-add', query: { ...monthQuery, from: 'shell' } }"
        aria-label="Добавить операцию"
      >
        <AppIcon name="plus" :size="24" />
      </RouterLink>

      <RouterLink
        v-for="item in navItems.slice(2)"
        :key="item.label"
        :to="item.to"
        class="shell-tabbar__item"
        :class="{ 'shell-tabbar__item--active': item.active }"
      >
        <AppIcon :name="item.icon" :size="21" />
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import defaultSnapshotJson from '../default.json'
import AppIcon from '@/components/AppIcon.vue'
import AppVersion from '@/components/AppVersion.vue'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { useTheme } from '@/composables/useTheme'
import { fetchServerFinanceSnapshot } from '@/services/financeSync'
import type { FinanceData } from '@/storage/financeDb'
import { useFinanceStore } from '@/stores/finance'
import { readOptionalMonthQuery } from '@/utils/routeQuery'

const { distance, isReady: isPullReady } = usePullToRefresh({
  canRefresh: () => !location.pathname.startsWith('/add') && !location.pathname.startsWith('/edit'),
})

const store = useFinanceStore()
const route = useRoute()
const { theme, toggleTheme } = useTheme()
const isReady = ref(false)

const monthQuery = computed(() => {
  const month = readOptionalMonthQuery(route.query.month)
  return month ? { month } : {}
})

const themeLabel = computed(() => (theme.value === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'))

const navItems = computed(() => {
  const analyticsActive = route.name === 'expense-analytics' || route.name === 'category-analytics'

  return [
    {
      label: 'Обзор',
      icon: 'grid',
      to: { name: 'dashboard', query: monthQuery.value },
      active: route.name === 'dashboard',
    },
    {
      label: 'Операции',
      icon: 'list',
      to: { name: 'operations', query: monthQuery.value },
      active: route.name === 'operations',
    },
    {
      label: 'Аналитика',
      icon: 'chart',
      to: { name: 'expense-analytics', query: monthQuery.value },
      active: analyticsActive,
    },
    {
      label: 'Категории',
      icon: 'tag',
      to: { name: 'categories', query: monthQuery.value },
      active: route.name === 'categories',
    },
  ]
})

onMounted(async () => {
  const hasStoredData = await store.loadFromIndexedDB()

  if (!hasStoredData) {
    const serverSnapshot = await loadServerSnapshot()

    if (serverSnapshot) {
      await store.saveSnapshotToIndexedDB(serverSnapshot)
    } else {
      store.loadData(toFinanceData(defaultSnapshotJson))
      await store.saveToIndexedDB()
    }
  }

  isReady.value = true
})

// default.json встречается в двух видах: «голые» данные (FinanceData) и снапшот
// с обёрткой { data, updatedAt } (как его отдаёт сервер и сохраняет экспорт).
// Приводим оба варианта к FinanceData, иначе данные молча теряются.
function toFinanceData(value: unknown): FinanceData {
  const candidate = value as { data?: FinanceData } | null

  if (candidate && typeof candidate === 'object' && candidate.data) {
    return candidate.data
  }

  return (value ?? {}) as FinanceData
}

async function loadServerSnapshot() {
  try {
    return await fetchServerFinanceSnapshot()
  } catch {
    return null
  }
}
</script>
