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
registerSW({ immediate: true })
