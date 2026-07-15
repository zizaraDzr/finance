// import { createServer } from 'node:http'
import { createServer } from 'node:https'  // меняем http на https
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { createReadStream, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const rootDir = process.cwd()
loadEnvFile(path.join(rootDir, '.env'))
loadEnvFile(path.join(rootDir, '.env.local'))
const options = {
  key: readFileSync('selfsigned.key'),
  cert: readFileSync('selfsigned.crt')
}

const port = Number(process.env.PORT || 4173)
const syncToken = process.env.SYNC_TOKEN || ''
const distDir = path.join(rootDir, 'dist')
const defaultDataFile = path.join(rootDir, 'default.json')
const financeDataFile = process.env.FINANCE_DATA_FILE
  ? path.resolve(rootDir, process.env.FINANCE_DATA_FILE)
  : path.join(rootDir, 'data', 'finance-data.json')

const server = createServer(options, async (request, response) => {
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
  console.log(`Budget server is running at http://localhost:${port}`)
  console.log(`Finance data file: ${financeDataFile}`)

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
  await writeFile(tempFile, body, 'utf8')
  await rename(tempFile, financeDataFile)
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

  if (!fileStats || !fileStats.isFile()) {
    createReadStream(path.join(distDir, 'index.html'))
      .on('error', () => sendJson(response, 404, { error: 'Not found' }))
      .pipe(response)
    return
  }

  response.writeHead(200, {
    'Content-Type': getContentType(filePath),
  })
  createReadStream(filePath).pipe(response)
}

function getStaticFilePath(requestPath) {
  const normalizedPath = decodeURIComponent(requestPath.split('?')[0] || '/')
  const safePath = path.normalize(normalizedPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(distDir, safePath === '/' ? 'index.html' : safePath)

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

  if (extension === '.json' || extension === '.webmanifest') {
    return 'application/json; charset=utf-8'
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
