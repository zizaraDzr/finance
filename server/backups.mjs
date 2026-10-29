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
  // Местное время: имя читает человек, поэтому в UTC не переводим.
  // Двоеточия и точки в имени файла ломают Windows — разделители дефисы.
  const day = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-')
  const time = [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join('-')

  return `${BACKUP_PREFIX}${day}T${time}-${pad(date.getMilliseconds(), 3)}.json`
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
  const names = (await readdir(directory)).filter(isBackupFile)
  const backups = await Promise.all(
    names.map(async (name) => ({
      name,
      modifiedAt: (await stat(path.join(directory, name))).mtimeMs,
    })),
  )
  const excess = backups.length - limit

  if (excess <= 0) {
    return []
  }

  // Порядок задаёт файловая система, а не имя: местное время при переводе
  // часов может идти не по порядку.
  const removed = backups
    .sort((left, right) => left.modifiedAt - right.modifiedAt)
    .slice(0, excess)
    .map((backup) => backup.name)

  await Promise.all(removed.map((name) => unlink(path.join(directory, name))))

  return removed
}

function pad(value, length = 2) {
  return String(value).padStart(length, '0')
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
