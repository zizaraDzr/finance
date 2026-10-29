import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// autoUpdate: service worker обновляется и активируется сам (skipWaiting +
// clientsClaim в сгенерированном sw.js), поэтому кнопки «Обновить» больше нет.
// Но сам по себе новый SW не перезагружает уже открытую страницу: iOS держит
// установленное PWA в памяти, навигации не происходит, и страница остаётся на
// старом build. Поэтому перезагружаемся, когда новый SW забирает управление.
const hadController = Boolean(navigator.serviceWorker?.controller)

navigator.serviceWorker?.addEventListener('controllerchange', () => {
  // Посреди заполнения операции не перезагружаем — потеряется форма.
  const isEditingOperation = location.pathname === '/add' || location.pathname.startsWith('/edit')

  if (hadController && !isEditingOperation) {
    location.reload()
  }
})

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) {
      return
    }

    const checkForUpdate = () => {
      // Офлайн/недоступный сервер — не повод падать, проверим в следующий раз.
      registration.update().catch(() => {})
    }

    // iOS не перезагружает PWA при возврате из фона, поэтому проверяем обновление сами.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate()
      }
    })

    setInterval(checkForUpdate, 60 * 60 * 1000)
  },
})
