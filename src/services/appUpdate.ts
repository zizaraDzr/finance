// Обновление приложения по явной команде. Автоматическая проверка только
// подменяет service worker, а открытая страница (особенно PWA на iOS, которая
// живёт в памяти) остаётся на старом build. Поэтому новую версию просим при
// нажатии «Синхронизация» и перезагружаемся, только если она правда пришла.
const UPDATE_TIMEOUT_MS = 10_000

let registration: ServiceWorkerRegistration | undefined

export function setServiceWorkerRegistration(value?: ServiceWorkerRegistration) {
  registration = value
}

export async function requestAppUpdate(): Promise<boolean> {
  if (!registration || !navigator.serviceWorker) {
    return false
  }

  let updateFound = false
  const handleUpdateFound = () => {
    updateFound = true
  }

  // Новый worker активируется сам (skipWaiting + clientsClaim), поэтому ждём
  // именно смену контроллера: только после неё reload отдаст новый build.
  const controllerChanged = new Promise<boolean>((resolve) => {
    navigator.serviceWorker.addEventListener('controllerchange', () => resolve(true), {
      once: true,
    })
    window.setTimeout(() => resolve(false), UPDATE_TIMEOUT_MS)
  })

  registration.addEventListener('updatefound', handleUpdateFound)

  try {
    await registration.update()
  } catch {
    return false
  } finally {
    registration.removeEventListener('updatefound', handleUpdateFound)
  }

  return updateFound && (await controllerChanged)
}
