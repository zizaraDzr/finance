// import { createServer } from 'node:http'
import { createServer } from 'node:https'  // меняем http на https
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { createReadStream, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { backupBeforeWrite, parseBackupLimit } from './backups.mjs'
import { readCloudBackupConfig, uploadSnapshot } from './cloudBackup.mjs'
import { createWebdavRequest } from './webdav.mjs'

const rootDir = process.cwd()
loadEnvFile(path.join(rootDir, '.env'))
loadEnvFile(path.join(rootDir, '.env.local'))
const tlsKeyPath = path.resolve(rootDir, process.env.TLS_KEY_PATH || 'selfsigned.key')
const tlsCertPath = path.resolve(rootDir, process.env.TLS_CERT_PATH || 'selfsigned.crt')
const options = {
  key: readTlsFile(tlsKeyPath, 'TLS_KEY_PATH'),
  cert: readTlsFile(tlsCertPath, 'TLS_CERT_PATH'),
}

const port = Number(4173)
const syncToken = process.env.SYNC_TOKEN || ''
const distDir = path.join(rootDir, 'dist')
const defaultDataFile = path.join(rootDir, 'default.json')
const financeDataFile = process.env.FINANCE_DATA_FILE
  ? path.resolve(rootDir, process.env.FINANCE_DATA_FILE)
  : path.join(rootDir, 'data', 'finance-data.json')
const backupLimit = parseBackupLimit(process.env.BACKUP_LIMIT)
const cloudConfig = readCloudBackupConfig(process.env)
const cloudRequest = cloudConfig.enabled ? createWebdavRequest(cloudConfig) : null
let cloudQueue = Promise.resolve()

const server = createServer(options, async (request, response) => {
  const startedAt = Date.now()

  // Без лога непонятно, что именно запрашивает телефон и что получает в ответ.
  response.on('finish', () => {
    const contentType = response.getHeader('content-type') || 'no Content-Type'
    const client = request.socket.remoteAddress || 'unknown'
    console.log(
      `${new Date().toISOString()} ${client} ${request.method} ${request.url} -> ${response.statusCode} (${contentType}, ${Date.now() - startedAt}ms)`,
    )
  })

  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

    if (url.pathname === '/api/finance-data') {
      await handleFinanceDataRequest(request, response)
      return
    }

    await serveStaticFile(url.pathname, response)
  } catch (error) {
    console.error(error)
    sendJson(response, 500, { error: 'Internal server error' })
  }
})

server.listen(port, () => {
  console.log(`Budget server is running at https://localhost:${port}`)
  console.log(`Finance data file: ${financeDataFile}`)
  console.log(`Backups: keep the last ${backupLimit} copies`)

  console.log(
    cloudConfig.enabled
      ? `Cloud backup: ${cloudConfig.directory} (keep the last ${cloudConfig.limit})`
      : 'Cloud backup: disabled (YANDEX_WEBDAV_USER / YANDEX_WEBDAV_PASSWORD are empty)',
  )

  if (!syncToken) {
    console.warn('SYNC_TOKEN is empty. Set it in .env before using the sync endpoint.')
  }
})

async function handleFinanceDataRequest(request, response) {
  if (!isAuthorized(request)) {
    sendJson(response, 401, { error: 'Unauthorized' })
    return
  }

  if (request.method === 'GET') {
    sendJson(response, 200, await readFinanceSnapshot())
    return
  }

  if (request.method === 'PUT') {
    const snapshot = normalizeSnapshot(JSON.parse(await readRequestBody(request)), new Date().toISOString())
    const currentSnapshot = await readFinanceSnapshot()

    if (new Date(currentSnapshot.updatedAt).getTime() > new Date(snapshot.updatedAt).getTime()) {
      sendJson(response, 409, currentSnapshot)
      return
    }

    await writeFinanceSnapshot(snapshot)
    sendJson(response, 200, snapshot)
    return
  }

  sendJson(response, 405, { error: 'Method not allowed' })
}

async function readFinanceSnapshot() {
  const liveSnapshot = await readJsonSnapshot(financeDataFile)

  if (liveSnapshot) {
    return liveSnapshot
  }

  const defaultSnapshot = await readJsonSnapshot(defaultDataFile)

  if (defaultSnapshot) {
    return defaultSnapshot
  }

  return {
    data: {},
    updatedAt: new Date(0).toISOString(),
  }
}

async function readJsonSnapshot(filePath) {
  try {
    const [fileContent, fileStats] = await Promise.all([readFile(filePath, 'utf8'), stat(filePath)])
    return normalizeSnapshot(JSON.parse(fileContent), fileStats.mtime.toISOString())
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

function normalizeSnapshot(value, fallbackUpdatedAt) {
  if (value && typeof value === 'object' && 'data' in value && 'updatedAt' in value) {
    return {
      data: value.data || {},
      updatedAt: String(value.updatedAt || fallbackUpdatedAt),
    }
  }

  return {
    data: value || {},
    updatedAt: fallbackUpdatedAt,
  }
}

async function writeFinanceSnapshot(snapshot) {
  const directory = path.dirname(financeDataFile)
  const tempFile = path.join(directory, `.finance-data.${process.pid}.${Date.now()}.tmp`)
  const body = `${JSON.stringify(snapshot, null, 2)}\n`

  await mkdir(directory, { recursive: true })
  // Копия до записи: если бэкап не удался, старые данные остаются нетронутыми.
  const backupPath = await backupBeforeWrite(financeDataFile, { limit: backupLimit })

  if (backupPath) {
    console.log(`Backup: ${path.basename(backupPath)}`)
  }

  await writeFile(tempFile, body, 'utf8')
  await rename(tempFile, financeDataFile)

  queueCloudBackup()
}

function queueCloudBackup() {
  if (!cloudRequest) {
    return
  }

  // Выгрузки идут по одной: Яндекс отвечает нестабильно, параллель только мешает.
  cloudQueue = cloudQueue
    .then(() => uploadSnapshot(financeDataFile, cloudConfig, { request: cloudRequest }))
    .then(name => {
      console.log(`Cloud: uploaded ${name}`)
    })
    .catch(error => {
      console.error(`Cloud: failed: ${error.message}`)
    })
}

function isAuthorized(request) {
  if (!syncToken) {
    return true
  }

  return request.headers.authorization === `Bearer ${syncToken}`
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''

    request.on('data', chunk => {
      body += chunk

      if (body.length > 25 * 1024 * 1024) {
        request.destroy(new Error('Request body is too large.'))
      }
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

async function serveStaticFile(requestPath, response) {
  const filePath = getStaticFilePath(requestPath)
  const fileStats = await stat(filePath).catch(() => null)

  if (fileStats && fileStats.isFile()) {
    response.writeHead(200, {
      'Content-Type': getContentType(filePath),
    })
    createReadStream(filePath).pipe(response)
    return
  }

  // Путь с расширением (.js, .css, .png) — это ассет, а не маршрут SPA.
  // Для него надо честно отдавать 404: иначе браузер получает index.html
  // вместо скрипта и страница молча остаётся белой без внятной ошибки.
  if (isAssetRequest(requestPath)) {
    sendJson(response, 404, { error: 'Not found' })
    return
  }

  const indexFile = path.join(distDir, 'index.html')
  const indexStats = await stat(indexFile).catch(() => null)

  if (!indexStats || !indexStats.isFile()) {
    sendJson(response, 404, { error: 'Сборка не найдена. Сначала выполните npm run build.' })
    return
  }

  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  })
  createReadStream(indexFile).pipe(response)
}

function isAssetRequest(requestPath) {
  const pathWithoutQuery = requestPath.split('?')[0] || ''
  return path.extname(pathWithoutQuery) !== ''
}

function getStaticFilePath(requestPath) {
  const normalizedPath = decodeURIComponent(requestPath.split('?')[0] || '/')
  const relativePath = normalizedPath === '/' ? 'index.html' : normalizedPath.replace(/^[/\\]+/, '')
  const filePath = path.join(distDir, relativePath)

  if (!filePath.startsWith(distDir)) {
    return path.join(distDir, 'index.html')
  }

  return filePath
}

function getContentType(filePath) {
  const extension = path.extname(filePath)

  if (extension === '.html') {
    return 'text/html; charset=utf-8'
  }

  if (extension === '.js') {
    return 'text/javascript; charset=utf-8'
  }

  if (extension === '.css') {
    return 'text/css; charset=utf-8'
  }

  if (extension === '.json') {
    return 'application/json; charset=utf-8'
  }

  if (extension === '.webmanifest') {
    return 'application/manifest+json; charset=utf-8'
  }

  if (extension === '.png') {
    return 'image/png'
  }

  if (extension === '.svg') {
    return 'image/svg+xml'
  }

  if (extension === '.ico') {
    return 'image/x-icon'
  }

  return 'application/octet-stream'
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

function readTlsFile(filePath, envName) {
  try {
    return readFileSync(filePath)
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      console.error(`TLS file not found: ${filePath}`)
      console.error('Сгенерируйте локальный сертификат командой: pnpm certs')
      console.error(`Либо укажите свой путь в переменной ${envName}.`)
      process.exit(1)
    }

    throw error
  }
}

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8')

    content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .forEach(line => {
        const [key, ...valueParts] = line.split('=')
        const value = valueParts.join('=').replace(/^['"]|['"]$/g, '')

        if (key && !(key in process.env)) {
          process.env[key] = value
        }
      })
  } catch {
    // Env file is optional.
  }
}
