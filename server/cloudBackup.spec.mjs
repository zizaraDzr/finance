import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { backupFileName } from './backups.mjs'
import { pruneCloud, readCloudBackupConfig, uploadSnapshot } from './cloudBackup.mjs'

const DIRECTORY = 'Documents/finance_backup'
const temporaryDirectories = []

function createRequest(handler) {
  const calls = []
  const request = async (method, path, options = {}) => {
    calls.push({ method, path, options })
    return handler(method, path, options)
  }
  request.calls = calls
  return request
}

function propfindXml(names) {
  const responses = names
    .map((name) => `<d:response><d:href>/${DIRECTORY}/${name}</d:href></d:response>`)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?><d:multistatus xmlns:d="DAV:">${responses}</d:multistatus>`
}

function createConfig(overrides = {}) {
  return {
    ...readCloudBackupConfig({
      YANDEX_WEBDAV_USER: 'user@yandex.ru',
      YANDEX_WEBDAV_PASSWORD: 'app-password',
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
  it('is disabled without credentials', () => {
    expect(readCloudBackupConfig({})).toMatchObject({
      enabled: false,
      url: 'https://webdav.yandex.ru',
      directory: DIRECTORY,
      limit: 10,
    })
  })

  it('reads credentials, path and limit from the environment', () => {
    expect(
      readCloudBackupConfig({
        YANDEX_WEBDAV_USER: 'user@yandex.ru',
        YANDEX_WEBDAV_PASSWORD: 'app-password',
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

    const request = createRequest((method) => {
      if (method === 'MKCOL') return { status: 405, body: '' }
      if (method === 'PUT') return { status: 201, body: '' }
      if (method === 'PROPFIND') return { status: 207, body: propfindXml([...oldNames, name]) }
      if (method === 'DELETE') return { status: 204, body: '' }

      throw new Error(`unexpected ${method}`)
    })

    const uploaded = await uploadSnapshot(filePath, createConfig(), { request, now })

    expect(uploaded).toBe(name)

    const put = request.calls.find((call) => call.method === 'PUT')
    expect(put.path).toBe(`${DIRECTORY}/${name}`)
    expect(put.options.body.toString()).toBe(content)

    const deleted = request.calls
      .filter((call) => call.method === 'DELETE')
      .map((call) => call.path)
    expect(deleted).toEqual(oldNames.slice(0, 3).map((oldName) => `${DIRECTORY}/${oldName}`))
  })

  it('retries a failed upload', async () => {
    const { filePath } = await writeSnapshotFile()
    const now = new Date(2026, 9, 29, 20, 30, 0, 0)
    const name = backupFileName(now)
    let attempts = 0

    const request = createRequest((method) => {
      if (method === 'MKCOL') return { status: 405, body: '' }
      if (method === 'PUT') {
        attempts += 1
        return attempts === 1 ? { status: 500, body: '' } : { status: 201, body: '' }
      }
      if (method === 'PROPFIND') return { status: 207, body: propfindXml([name]) }
      if (method === 'DELETE') return { status: 204, body: '' }

      throw new Error(`unexpected ${method}`)
    })
    const sleep = vi.fn(async () => {})

    await expect(uploadSnapshot(filePath, createConfig(), { request, now, sleep })).resolves.toBe(
      name,
    )

    expect(attempts).toBe(2)
    expect(sleep).toHaveBeenCalledTimes(1)
  })

  it('gives up after all attempts', async () => {
    const { filePath } = await writeSnapshotFile()
    const request = createRequest((method) => {
      if (method === 'MKCOL') return { status: 405, body: '' }
      if (method === 'PUT') return { status: 500, body: '' }

      throw new Error(`unexpected ${method}`)
    })
    const sleep = vi.fn(async () => {})

    await expect(uploadSnapshot(filePath, createConfig(), { request, sleep })).rejects.toThrow(
      'HTTP 500',
    )

    expect(request.calls.filter((call) => call.method === 'PUT')).toHaveLength(3)
    expect(request.calls.some((call) => call.method === 'PROPFIND')).toBe(false)
  })

  it('does nothing when disabled', async () => {
    const { filePath } = await writeSnapshotFile()
    const request = createRequest(() => {
      throw new Error('must not be called')
    })

    await expect(
      uploadSnapshot(filePath, createConfig({ enabled: false }), { request }),
    ).resolves.toBeNull()

    expect(request.calls).toHaveLength(0)
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
    const request = createRequest((method) => {
      if (method === 'PROPFIND') return { status: 207, body: propfindXml(names) }
      if (method === 'DELETE') return { status: 204, body: '' }

      throw new Error(`unexpected ${method}`)
    })

    const removed = await pruneCloud(request, DIRECTORY, 1)

    expect(removed).toEqual([
      'finance-data.backup.2026-10-29T10-00-00-000.json',
      'finance-data.backup.2026-10-29T11-00-00-000.json',
    ])
    expect(request.calls.some((call) => call.path.endsWith('notes.txt'))).toBe(false)
  })
})
