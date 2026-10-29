// Выгрузка свежего снимка данных на Яндекс Диск по REST API.
//
// Локальные копии остаются на диске компьютера, облако — дополнительная
// страховка. Сеть и API нестабильны, поэтому загрузка повторяется, а в облаке
// хранятся последние N копий.
import { readFile } from 'node:fs/promises'
import { backupFileName, parseBackupLimit } from './backups.mjs'
import { createUploadLink, ensureFolder, listFiles, removeFile, uploadContent } from './diskApi.mjs'

const DEFAULT_ATTEMPTS = 3
const DEFAULT_RETRY_DELAY_MS = 5_000
const SNAPSHOT_PREFIX = 'finance-data.'

export function readCloudBackupConfig(env = process.env) {
  const token = env.YANDEX_OAUTH_TOKEN || ''
  const directory = (env.YANDEX_BACKUP_PATH || 'Documents/finance_backup').replace(/^\/+|\/+$/g, '')

  return {
    token,
    directory,
    limit: parseBackupLimit(env.YANDEX_BACKUP_LIMIT),
    enabled: Boolean(token),
  }
}

export async function uploadSnapshot(
  filePath,
  config,
  {
    client,
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
      await ensureFolder(client, config.directory)
      const href = await createUploadLink(client, target)
      await uploadContent(client, href, body)
    },
    { attempts, delayMs, sleep },
  )

  await pruneCloud(client, config.directory, config.limit)

  return name
}

export async function pruneCloud(client, directory, limit) {
  const names = (await listFiles(client, directory)).filter(isSnapshotName).sort()
  const excess = names.length - limit

  if (excess <= 0) {
    return []
  }

  const removed = names.slice(0, excess)

  // Удаление необратимо, поэтому по одному и только по именам снимков.
  for (const name of removed) {
    await removeFile(client, `${directory}/${name}`)
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
