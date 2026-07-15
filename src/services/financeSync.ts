import type { FinanceSnapshot } from '@/storage/financeDb'
import type { useFinanceStore } from '@/stores/finance'

type FinanceStore = ReturnType<typeof useFinanceStore>

type SyncResult =
  | {
      status: 'uploaded'
      snapshot: FinanceSnapshot
    }
  | {
      status: 'downloaded'
      snapshot: FinanceSnapshot
    }
  | {
      status: 'same'
      snapshot: FinanceSnapshot
    }

const syncEndpoint = '/api/finance-data'

export async function fetchServerFinanceSnapshot() {
  const headers: HeadersInit = {}
  const syncToken = getSyncHeaders().Authorization

  if (syncToken) {
    headers.Authorization = syncToken
  }
  const response = await fetch(syncEndpoint, { headers })

  if (!response.ok) {
    throw new Error('Не удалось получить данные с сервера.')
  }

  return response.json() as Promise<FinanceSnapshot>
}

export async function syncFinanceData(store: FinanceStore): Promise<SyncResult> {
  const localSnapshot = store.exportSnapshot()
  const serverSnapshot = await fetchServerFinanceSnapshot()
  const localTime = new Date(localSnapshot.updatedAt).getTime()
  const serverTime = new Date(serverSnapshot.updatedAt).getTime()

  if (localTime > serverTime) {
    const snapshot = await uploadFinanceSnapshot(localSnapshot)

    if (new Date(snapshot.updatedAt).getTime() > localTime) {
      await store.saveSnapshotToIndexedDB(snapshot)
      return {
        status: 'downloaded',
        snapshot,
      }
    }

    return {
      status: 'uploaded',
      snapshot,
    }
  }

  if (serverTime > localTime) {
    await store.saveSnapshotToIndexedDB(serverSnapshot)
    return {
      status: 'downloaded',
      snapshot: serverSnapshot,
    }
  }

  return {
    status: 'same',
    snapshot: localSnapshot,
  }
}

async function uploadFinanceSnapshot(snapshot: FinanceSnapshot) {
  const headers: HeadersInit = {}
  const syncToken = getSyncHeaders().Authorization

  if (syncToken) {
    headers.Authorization = syncToken
  }
  const response = await fetch(syncEndpoint, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(snapshot),
  })

  if (response.status === 409) {
    return response.json() as Promise<FinanceSnapshot>
  }

  if (!response.ok) {
    throw new Error('Не удалось сохранить данные на сервере.')
  }

  return response.json() as Promise<FinanceSnapshot>
}

function getSyncHeaders() {
  const token = import.meta.env.VITE_SYNC_TOKEN

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {}
}
