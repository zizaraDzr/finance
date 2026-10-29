import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'
import { setServiceWorkerRegistration } from '@/services/appUpdate'
import './assets/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// autoUpdate: service worker обновляется и активируется сам (skipWaiting +
// clientsClaim в сгенерированном sw.js), поэтому кнопки «Обновить» нет.
// Проверку новой версии запускает кнопка «Синхронизация» — см. appUpdate.ts.
registerSW({
  immediate: true,
  onRegisteredSW: (_swUrl, registration) => setServiceWorkerRegistration(registration),
})
