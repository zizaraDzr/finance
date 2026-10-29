// Выгрузка свежего снимка данных на Яндекс Диск по WebDAV.
//
// Локальные копии остаются на диске компьютера, облако — дополнительная
// страховка. Яндекс отвечает нестабильно (500/ECONNRESET), поэтому загрузка
// повторяется, а в облаке хранятся последние N копий.
import { readFile } from 'node:fs/promises'
import { backupFileName, parseBackupLimit } from './backups.mjs'
import { ensureCollection, listFiles, removeFile, uploadFile } from './webdav.mjs'

const DEFAULT_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 5_000
const SNAPSHOT_PREFIX = 'finance-data.'

export function readCloudBackupConfig(env = process.env) {
  const user = env.YANDEX_WEBDAV_USER || ''
  const password = env.YANDEX_WEBDAV_PASSWORD || ''
  const directory = (env.YANDEX_BACKUP_PATH || 'Documents/finance_backup').replace(/^\/+|\/+$/g, '')

  return {
    url: env.YANDEX_WEBDAV_URL || 'https://webdav.yandex.ru',
    user,
    password,
    directory,
    limit: parseBackupLimit(env.YANDEX_BACKUP_LIMIT),
    enabled: Boolean(user && password),
  }
}

export async function uploadSnapshot(
  filePath,
  config,
  {
    request,
    now = new Date(),
    attempts = DEFAULT_ATTEMPTS,
    delayMs = DEFAULT_RETRY_DELAY_MS,
    sleep = defaultSleep,
  } = {},
) {
  if (!config.enabled) {
    return null
  }

  const body = await readFile(filePath)
  const name = backupFileName(now)
  const target = `${config.directory}/${name}`

  await retry(
    async () => {
      await ensureCollection(request, config.directory)
      await uploadFile(request, target, body)
    },
    { attempts, delayMs, sleep },
  )

  await pruneCloud(request, config.directory, config.limit)

  return name
}

export async function pruneCloud(request, directory, limit) {
  const names = (await listFiles(request, directory)).filter(isSnapshotName).sort()
  const excess = names.length - limit

  if (excess <= 0) {
    return []
  }

  const removed = names.slice(0, excess)

  // Удаление по WebDAV необратимо (корзины нет), поэтому по одному и только
  // по именам снимков.
  for (const name of removed) {
    await removeFile(request, `${directory}/${name}`)
  }

  return removed
}

function isSnapshotName(name) {
  return name.startsWith(SNAPSHOT_PREFIX) && name.endsWith('.json')
}

async function retry(action, { attempts, delayMs, sleep }) {
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action()
    } catch (error) {
      lastError = error

      if (attempt < attempts) {
        await sleep(delayMs * attempt)
      }
    }
  }

  throw lastError
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
