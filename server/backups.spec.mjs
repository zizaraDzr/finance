import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, readdir, readFile, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { backupBeforeWrite, backupFileName, parseBackupLimit, pruneBackups } from './backups.mjs'

const LIVE_FILE = 'finance-data.json'
const temporaryDirectories = []

async function createDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'finance-backups-'))
  temporaryDirectories.push(directory)
  return directory
}

async function writeLiveFile(directory, content = '{"data":{}}') {
  const filePath = path.join(directory, LIVE_FILE)
  await writeFile(filePath, content, 'utf8')
  return filePath
}

async function listFiles(directory) {
  return readdir(directory)
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('backups', () => {
  it('builds a human-readable local file name', () => {
    expect(backupFileName(new Date(2026, 9, 29, 19, 35, 10, 998))).toBe(
      'finance-data.backup.2026-10-29T19-35-10-998.json',
    )
  })

  it('keeps a copy of the previous file next to the live one', async () => {
    const directory = await createDirectory()
    const livePath = await writeLiveFile(directory, '{"data":{"sum":1}}')
    const now = new Date(2026, 9, 29, 19, 35, 10, 998)

    const backupPath = await backupBeforeWrite(livePath, { now })

    expect(backupPath).toBe(path.join(directory, backupFileName(now)))
    expect(await readFile(backupPath, 'utf8')).toBe('{"data":{"sum":1}}')
    expect(await readFile(livePath, 'utf8')).toBe('{"data":{"sum":1}}')
  })

  it('does nothing when there is no live file yet', async () => {
    const directory = await createDirectory()

    const backupPath = await backupBeforeWrite(path.join(directory, LIVE_FILE))

    expect(backupPath).toBeNull()
    expect(await listFiles(directory)).toEqual([])
  })

  it('removes the oldest copies and never touches the live file', async () => {
    const directory = await createDirectory()
    await writeLiveFile(directory, '{"data":{}}')

    const oldest = new Date(2026, 9, 29, 10, 0, 0)
    const middle = new Date(2026, 9, 29, 11, 0, 0)
    const newest = new Date(2026, 9, 29, 12, 0, 0)

    for (const [date, content] of [
      [oldest, 'old'],
      [middle, 'middle'],
      [newest, 'new'],
    ]) {
      const filePath = path.join(directory, backupFileName(date))
      await writeFile(filePath, content, 'utf8')
      await utimes(filePath, date, date)
    }

    const removed = await pruneBackups(directory, 2)

    expect(removed).toEqual([backupFileName(oldest)])

    const files = await listFiles(directory)
    expect(files).toHaveLength(3)
    expect(files).toContain(LIVE_FILE)
    expect(files).toContain(backupFileName(middle))
    expect(files).toContain(backupFileName(newest))
  })

  it('keeps no more copies than the limit while writing', async () => {
    const directory = await createDirectory()
    const livePath = await writeLiveFile(directory)

    await backupBeforeWrite(livePath, { limit: 1, now: new Date(2026, 9, 29, 10, 0, 0) })
    await backupBeforeWrite(livePath, { limit: 1, now: new Date(2026, 9, 29, 11, 0, 0) })

    const backups = (await listFiles(directory)).filter((name) => name !== LIVE_FILE)
    expect(backups).toHaveLength(1)
  })

  it('parses the backup limit from configuration', () => {
    expect(parseBackupLimit('3')).toBe(3)
    expect(parseBackupLimit(undefined)).toBe(10)
    expect(parseBackupLimit('0')).toBe(10)
    expect(parseBackupLimit('много')).toBe(10)
  })
})
