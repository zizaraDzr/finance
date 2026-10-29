// Минимальный WebDAV-клиент для Яндекс Диска.
//
// Node fetch с этим сервером нестабилен (ECONNRESET на PUT), поэтому ходим
// через https.request и держим соединение живым (Connection: keep-alive).
import https from 'node:https'

const DEFAULT_TIMEOUT_MS = 90_000

export function createWebdavRequest({ url, user, password, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const base = new URL(url)
  const auth = `${user}:${password}`

  return function request(method, path, { body = Buffer.alloc(0), headers = {} } = {}) {
    const payload = Buffer.isBuffer(body) ? body : Buffer.from(body)

    return new Promise((resolve, reject) => {
      const httpRequest = https.request(
        {
          protocol: base.protocol,
          hostname: base.hostname,
          port: base.port || 443,
          path: joinPath(base.pathname, path),
          method,
          auth,
          headers: {
            'Content-Length': payload.length,
            Connection: 'keep-alive',
            ...headers,
          },
          timeout: timeoutMs,
        },
        (response) => {
          const chunks = []

          response.on('data', (chunk) => chunks.push(chunk))
          response.on('error', reject)
          response.on('end', () =>
            resolve({
              status: response.statusCode,
              body: Buffer.concat(chunks).toString('utf8'),
            }),
          )
        },
      )

      httpRequest.on('timeout', () => {
        httpRequest.destroy(new Error(`WebDAV timeout: ${method} ${path}`))
      })
      httpRequest.on('error', reject)
      httpRequest.end(payload)
    })
  }
}

export async function ensureCollection(request, directory) {
  const response = await request('MKCOL', withSlash(directory))

  // 201 — создали, 405 — уже существует.
  if (response.status !== 201 && response.status !== 405) {
    throw new Error(`WebDAV MKCOL ${directory}: HTTP ${response.status}`)
  }
}

export async function uploadFile(request, path, body) {
  const response = await request('PUT', path, {
    body,
    headers: { 'Content-Type': 'application/json' },
  })

  if (response.status !== 201 && response.status !== 204) {
    throw new Error(`WebDAV PUT ${path}: HTTP ${response.status}`)
  }
}

export async function listFiles(request, directory) {
  const response = await request('PROPFIND', withSlash(directory), {
    headers: { Depth: '1' },
  })

  if (response.status !== 207) {
    throw new Error(`WebDAV PROPFIND ${directory}: HTTP ${response.status}`)
  }

  return parseHrefs(response.body)
}

export async function removeFile(request, path) {
  const response = await request('DELETE', path)

  // 404 — файла уже нет, для ротации это успех.
  if (response.status !== 200 && response.status !== 204 && response.status !== 404) {
    throw new Error(`WebDAV DELETE ${path}: HTTP ${response.status}`)
  }
}

export function parseHrefs(xml) {
  return [...xml.matchAll(/<[^>]*href[^>]*>([^<]+)</gi)]
    .map((match) => decodeHref(match[1]))
    .filter((href) => !href.endsWith('/'))
    .map((href) => href.split('/').pop() || '')
    .filter(Boolean)
}

function decodeHref(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function withSlash(path) {
  return `${path.replace(/\/+$/, '')}/`
}

function joinPath(basePath, path) {
  const segments = `${basePath || ''}/${path}`.split('/').filter(Boolean).map(encodeURIComponent)
  const trailingSlash = path.endsWith('/') ? '/' : ''

  return `/${segments.join('/')}${trailingSlash}`
}
