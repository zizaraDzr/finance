import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { backupFileName } from './backups.mjs'
import { pruneCloud, readCloudBackupConfig, uploadSnapshot } from './cloudBackup.mjs'

const DIRECTORY = 'Documents/finance_backup'
const UPLOAD_HREF = 'https://uploader.example/1'
const temporaryDirectories = []

function createClient({ api, request = () => ({ status: 201, body: '' }) }) {
  const calls = { api: [], request: [] }
  const client = {
    api: async (method, apiPath, options = {}) => {
      calls.api.push({ method, path: apiPath, options })
      return api(method, apiPath, options)
    },
    request: async (url, options = {}) => {
      calls.request.push({ url, options })
      return request(url, options)
    },
  }
  client.calls = calls
  return client
}

function itemsBody(names) {
  return JSON.stringify({ _embedded: { items: names.map((name) => ({ name })) } })
}

function createConfig(overrides = {}) {
  return {
    ...readCloudBackupConfig({
      YANDEX_OAUTH_TOKEN: 'oauth-token',
      YANDEX_BACKUP_PATH: DIRECTORY,
    }),
    ...overrides,
  }
}

async function writeSnapshotFile(content = '{"data":{}}') {
  const directory = await mkdtemp(path.join(tmpdir(), 'finance-cloud-'))
  temporaryDirectories.push(directory)
  const filePath = path.join(directory, 'finance-data.json')
  await writeFile(filePath, content, 'utf8')
  return { filePath, content }
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('cloud backup config', () => {
  it('is disabled without a token', () => {
    expect(readCloudBackupConfig({})).toMatchObject({
      enabled: false,
      directory: DIRECTORY,
      limit: 10,
    })
  })

  it('reads the token, path and limit from the environment', () => {
    expect(
      readCloudBackupConfig({
        YANDEX_OAUTH_TOKEN: 'oauth-token',
        YANDEX_BACKUP_PATH: '/Documents/other/',
        YANDEX_BACKUP_LIMIT: '3',
      }),
    ).toMatchObject({ enabled: true, directory: 'Documents/other', limit: 3 })
  })
})

describe('cloud backup upload', () => {
  it('uploads the snapshot and keeps the newest copies', async () => {
    const { filePath, content } = await writeSnapshotFile('{"data":{"sum":1}}')
    const now = new Date(2026, 9, 29, 20, 30, 0, 0)
    const name = backupFileName(now)
    const oldNames = Array.from(
      { length: 12 },
      (_, index) =>
        `finance-data.backup.2026-10-28T10-00-00-${String(index).padStart(3, '0')}.json`,
    )

    const client = createClient({
      api: (method, apiPath) => {
        if (method === 'PUT') return { status: 409, body: '' }
        if (apiPath.startsWith('/resources/upload')) {
          return { status: 200, body: JSON.stringify({ href: UPLOAD_HREF, method: 'PUT' }) }
        }
        if (method === 'GET') return { status: 200, body: itemsBody([...oldNames, name]) }
        if (method === 'DELETE') return { status: 204, body: '' }

        throw new Error(`unexpected ${method} ${apiPath}`)
      },
    })

    const uploaded = await uploadSnapshot(filePath, createConfig(), { client, now })

    expect(uploaded).toBe(name)
    expect(client.calls.request[0].url).toBe(UPLOAD_HREF)
    expect(client.calls.request[0].options.body.toString()).toBe(content)

    const deleted = client.calls.api
      .filter((call) => call.method === 'DELETE')
      .map((call) => decodeURIComponent(call.path))
    expect(deleted).toEqual(oldNames.slice(0, 3).map((oldName) => expect.stringContaining(oldName)))
  })

  it('retries a failed upload', async () => {
    const { filePath } = await writeSnapshotFile()
    const now = new Date(2026, 9, 29, 20, 30, 0, 0)
    const name = backupFileName(now)
    let attempts = 0

    const client = createClient({
      api: (method, apiPath) => {
        if (method === 'PUT') return { status: 409, body: '' }
        if (apiPath.startsWith('/resources/upload')) {
          return { status: 200, body: JSON.stringify({ href: UPLOAD_HREF }) }
        }
        if (method === 'GET') return { status: 200, body: itemsBody([name]) }
        if (method === 'DELETE') return { status: 204, body: '' }

        throw new Error(`unexpected ${method} ${apiPath}`)
      },
      request: () => {
        attempts += 1
        return attempts === 1 ? { status: 500, body: '' } : { status: 201, body: '' }
      },
    })
    const sleep = vi.fn(async () => {})

    await expect(uploadSnapshot(filePath, createConfig(), { client, now, sleep })).resolves.toBe(
      name,
    )

    expect(attempts).toBe(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('gives up after all attempts', async () => {
    const { filePath } = await writeSnapshotFile()
    const client = createClient({
      api: (method, apiPath) => {
        if (method === 'PUT') return { status: 409, body: '' }
        if (apiPath.startsWith('/resources/upload')) {
          return { status: 200, body: JSON.stringify({ href: UPLOAD_HREF }) }
        }

        throw new Error(`unexpected ${method} ${apiPath}`)
      },
      request: () => ({ status: 500, body: '' }),
    })
    const sleep = vi.fn(async () => {})

    await expect(uploadSnapshot(filePath, createConfig(), { client, sleep })).rejects.toThrow(
      'HTTP 500',
    )

    expect(client.calls.request).toHaveLength(3)
    expect(
      client.calls.api.some((call) => call.method === 'GET' && call.path.startsWith('/resources?')),
    ).toBe(false)
  })

  it('does nothing when disabled', async () => {
    const { filePath } = await writeSnapshotFile()
    const client = createClient({
      api: () => {
        throw new Error('must not be called')
      },
    })

    await expect(
      uploadSnapshot(filePath, createConfig({ enabled: false }), { client }),
    ).resolves.toBeNull()

    expect(client.calls.api).toHaveLength(0)
    expect(client.calls.request).toHaveLength(0)
  })
})

describe('cloud backup pruning', () => {
  it('removes only snapshot files beyond the limit', async () => {
    const names = [
      'notes.txt',
      'finance-data.backup.2026-10-29T10-00-00-000.json',
      'finance-data.backup.2026-10-29T11-00-00-000.json',
      'finance-data.backup.2026-10-29T12-00-00-000.json',
    ]
    const client = createClient({
      api: (method, apiPath) => {
        if (method === 'GET') return { status: 200, body: itemsBody(names) }
        if (method === 'DELETE') return { status: 204, body: '' }

        throw new Error(`unexpected ${method} ${apiPath}`)
      },
    })

    const removed = await pruneCloud(client, DIRECTORY, 1)

    expect(removed).toEqual([
      'finance-data.backup.2026-10-29T10-00-00-000.json',
      'finance-data.backup.2026-10-29T11-00-00-000.json',
    ])
    expect(
      client.calls.api.some((call) => call.method === 'DELETE' && call.path.includes('notes.txt')),
    ).toBe(false)
  })
})
