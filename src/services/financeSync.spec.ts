import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fetchServerFinanceSnapshot, syncFinanceData } from '@/services/financeSync'
import { useFinanceStore } from '@/stores/finance'
import type { FinanceData, FinanceSnapshot } from '@/storage/financeDb'
import { writeFinanceSnapshot } from '@/storage/financeDb'
import { createAccount, createCategory } from '@/test/fixtures'

vi.mock('@/storage/financeDb', () => ({
  readFinanceSnapshot: vi.fn(),
  writeFinanceSnapshot: vi.fn(),
}))

const writeSnapshot = vi.mocked(writeFinanceSnapshot)
const fetchMock = vi.fn()

function financeData(): FinanceData {
  return {
    Account: [createAccount()],
    Category: [createCategory({ id: 'cat-food' })],
    Operation: [],
    Subcategory: [],
    Target: [],
  }
}

function snapshot(updatedAt: string): FinanceSnapshot {
  return { data: financeData(), updatedAt }
}

function createStore(updatedAt: string) {
  setActivePinia(createPinia())
  const store = useFinanceStore()
  store.loadData(financeData())
  store.lastUpdatedAt = updatedAt

  return store
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  writeSnapshot.mockReset()
  writeSnapshot.mockResolvedValue('key')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('fetchServerFinanceSnapshot', () => {
  it('throws when the server rejects the read', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }))

    await expect(fetchServerFinanceSnapshot()).rejects.toThrow(
      'Не удалось получить данные с сервера.',
    )
  })

  it('authorizes the request when a sync token is configured', async () => {
    vi.stubEnv('VITE_SYNC_TOKEN', 'secret')
    fetchMock.mockResolvedValueOnce(jsonResponse(snapshot('2026-10-01T10:00:00.000Z')))

    await fetchServerFinanceSnapshot()

    expect(fetchMock).toHaveBeenCalledWith('/api/finance-data', {
      headers: { Authorization: 'Bearer secret' },
    })
  })

  it('sends no authorization header without a token', async () => {
    vi.stubEnv('VITE_SYNC_TOKEN', '')
    fetchMock.mockResolvedValueOnce(jsonResponse(snapshot('2026-10-01T10:00:00.000Z')))

    await fetchServerFinanceSnapshot()

    expect(fetchMock).toHaveBeenCalledWith('/api/finance-data', { headers: {} })
  })
})

describe('syncFinanceData', () => {
  it('keeps both sides untouched when the timestamps match', async () => {
    const store = createStore('2026-10-01T10:00:00.000Z')
    const local = store.exportSnapshot()
    const saveSpy = vi.spyOn(store, 'saveSnapshotToIndexedDB')
    fetchMock.mockResolvedValueOnce(jsonResponse(local))

    const result = await syncFinanceData(store)

    expect(result.status).toBe('same')
    expect(result.snapshot).toEqual(local)
    expect(saveSpy).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('downloads a newer server snapshot', async () => {
    const store = createStore('2026-10-01T10:00:00.000Z')
    const server = snapshot('2026-10-02T10:00:00.000Z')
    const saveSpy = vi.spyOn(store, 'saveSnapshotToIndexedDB')
    fetchMock.mockResolvedValueOnce(jsonResponse(server))

    const result = await syncFinanceData(store)

    expect(result.status).toBe('downloaded')
    expect(result.snapshot).toEqual(server)
    expect(saveSpy).toHaveBeenCalledWith(server)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('uploads a newer local snapshot and reports it', async () => {
    const store = createStore('2026-10-03T10:00:00.000Z')
    const local = snapshot('2026-10-03T10:00:00.000Z')
    fetchMock
      .mockResolvedValueOnce(jsonResponse(snapshot('2026-10-02T10:00:00.000Z')))
      .mockResolvedValueOnce(jsonResponse(local))

    const result = await syncFinanceData(store)

    expect(result.status).toBe('uploaded')
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/finance-data',
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('adopts the winner of an upload conflict', async () => {
    const store = createStore('2026-10-03T10:00:00.000Z')
    const winner = snapshot('2026-10-04T10:00:00.000Z')
    const saveSpy = vi.spyOn(store, 'saveSnapshotToIndexedDB')
    fetchMock
      .mockResolvedValueOnce(jsonResponse(snapshot('2026-10-02T10:00:00.000Z')))
      .mockResolvedValueOnce(jsonResponse(winner, 409))

    const result = await syncFinanceData(store)

    expect(result.status).toBe('downloaded')
    expect(result.snapshot).toEqual(winner)
    expect(saveSpy).toHaveBeenCalledWith(winner)
  })

  it('throws when the upload is rejected', async () => {
    const store = createStore('2026-10-03T10:00:00.000Z')
    fetchMock
      .mockResolvedValueOnce(jsonResponse(snapshot('2026-10-02T10:00:00.000Z')))
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))

    await expect(syncFinanceData(store)).rejects.toThrow(
      'Не удалось сохранить данные на сервере.',
    )
  })
})
