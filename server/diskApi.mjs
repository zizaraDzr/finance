// Клиент REST API Яндекс Диска.
//
// Токен приложения уходит только на cloud-api.yandex.net. Ссылка на загрузку
// уже подписана, поэтому на uploader-хост заголовок Authorization не отправляем.
import https from 'node:https'

const DEFAULT_BASE_URL = 'https://cloud-api.yandex.net/v1/disk'
const DEFAULT_TIMEOUT_MS = 90_000

export function createDiskClient({
  token,
  baseUrl = DEFAULT_BASE_URL,
  request = createHttpsRequest(),
}) {
  const api = (method, path, options = {}) =>
    request(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `OAuth ${token}`, ...options.headers },
      body: options.body,
    })

  return { api, request }
}

export function createHttpsRequest(timeoutMs = DEFAULT_TIMEOUT_MS) {
  return function httpsRequest(url, { method = 'GET', headers = {}, body = '' } = {}) {
    const target = new URL(url)
    const payload = Buffer.isBuffer(body) ? body : Buffer.from(body)

    return new Promise((resolve, reject) => {
      const request = https.request(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port || 443,
          path: `${target.pathname}${target.search}`,
          method,
          headers: { 'Content-Length': payload.length, ...headers },
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

      request.on('timeout', () =>
        request.destroy(new Error(`Yandex Disk timeout: ${method} ${url}`)),
      )
      request.on('error', reject)
      request.end(payload)
    })
  }
}

export async function ensureFolder(client, folder) {
  const response = await client.api(
    'PUT',
    `/resources?path=${encodeURIComponent(diskPath(folder))}`,
  )

  // 201 — создали, 409 — уже существует.
  if (response.status !== 201 && response.status !== 409) {
    throw new Error(`Yandex Disk folder ${folder}: HTTP ${response.status} ${errorText(response)}`)
  }
}

export async function createUploadLink(client, path) {
  const diskFilePath = diskPath(path)
  const response = await client.api(
    'GET',
    `/resources/upload?path=${encodeURIComponent(diskFilePath)}&overwrite=true`,
  )

  if (response.status !== 200) {
    throw new Error(
      `Yandex Disk upload link ${path}: HTTP ${response.status} ${errorText(response)}`,
    )
  }

  const { href } = JSON.parse(response.body)

  if (!href) {
    throw new Error(`Yandex Disk upload link ${path}: no href in response`)
  }

  return href
}

export async function uploadContent(client, href, body) {
  // Подписанная ссылка, токен здесь не нужен (и может помешать).
  const response = await client.request(href, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  })

  if (![200, 201, 202, 204].includes(response.status)) {
    throw new Error(`Yandex Disk upload: HTTP ${response.status} ${errorText(response)}`)
  }
}

export async function listFiles(client, folder) {
  const diskFolder = diskPath(folder)
  const response = await client.api(
    'GET',
    `/resources?path=${encodeURIComponent(diskFolder)}&limit=200&sort=created&order=asc`,
  )

  if (response.status !== 200) {
    throw new Error(`Yandex Disk list ${folder}: HTTP ${response.status} ${errorText(response)}`)
  }

  const items = JSON.parse(response.body)?._embedded?.items ?? []

  return items.map((item) => item.name).filter(Boolean)
}

export async function removeFile(client, path) {
  const response = await client.api(
    'DELETE',
    `/resources?path=${encodeURIComponent(diskPath(path))}&permanently=true`,
  )

  // 404 — файла уже нет, для ротации это успех.
  if (![200, 202, 204, 404].includes(response.status)) {
    throw new Error(`Yandex Disk delete ${path}: HTTP ${response.status} ${errorText(response)}`)
  }
}

function diskPath(path) {
  return `disk:/${path.replace(/^\/+/, '')}`
}

function errorText(response) {
  try {
    const parsed = JSON.parse(response.body)
    return parsed.message || parsed.description || ''
  } catch {
    return ''
  }
}
