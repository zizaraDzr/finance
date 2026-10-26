/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SYNC_TOKEN?: string
}

// default.json попадает в .gitignore (личные данные), поэтому в чистом клоне
// и в CI файла нет. Объявление типизирует импорт из App.vue без самого файла;
// когда файл на месте, TypeScript берёт его собственную типизацию.
declare module '*.json' {
  const value: import('./src/storage/financeDb').FinanceData
  export default value
}
