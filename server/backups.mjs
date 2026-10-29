// Копия предыдущей версии данных перед перезаписью: JSON на сервере —
// единственный бэкап, поэтому старую версию сохраняем рядом с рабочей.
import { copyFile, readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'

export const DEFAULT_BACKUP_LIMIT = 10

const BACKUP_PREFIX = 'finance-data.backup.'

export function parseBackupLimit(value) {
  const limit = Number(value)

  return Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_BACKUP_LIMIT
}

export function backupFileName(date) {
  // Двоеточия и точки в имени файла ломают Windows, поэтому меняем их на дефисы.
  // Формат фиксированной ширины: лексикографическая сортировка = хронологическая.
  const stamp = date.toISOString().replace(/[:.]/g, '-')

  return `${BACKUP_PREFIX}${stamp}.json`
}

export async function backupBeforeWrite(
  filePath,
  { limit = DEFAULT_BACKUP_LIMIT, now = new Date() } = {},
) {
  if (limit <= 0 || !(await fileExists(filePath))) {
    return null
  }

  const directory = path.dirname(filePath)
  const backupPath = path.join(directory, backupFileName(now))

  await copyFile(filePath, backupPath)
  await pruneBackups(directory, limit)

  return backupPath
}

export async function pruneBackups(directory, limit) {
  const backups = (await readdir(directory)).filter(isBackupFile).sort()
  const excess = backups.length - limit

  if (excess <= 0) {
    return []
  }

  // Имена сортируются по времени, поэтому лишние — всегда самые старые.
  const removed = backups.slice(0, excess)

  await Promise.all(removed.map((name) => unlink(path.join(directory, name))))

  return removed
}

function isBackupFile(name) {
  return name.startsWith(BACKUP_PREFIX) && name.endsWith('.json')
}

async function fileExists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
}
