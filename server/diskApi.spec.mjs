import { describe, expect, it } from 'vitest'
import { createUploadLink, ensureFolder, listFiles, removeFile, uploadContent } from './diskApi.mjs'

function createClient({ api, request }) {
  const calls = { api: [], request: [] }
  const client = {
    api: async (method, path, options = {}) => {
      calls.api.push({ method, path, options })
      return api(method, path, options)
    },
    request: async (url, options = {}) => {
      calls.request.push({ url, options })
      return request(url, options)
    },
  }
  client.calls = calls
  return client
}

function decode(path) {
  return decodeURIComponent(path)
}

describe('yandex disk api', () => {
  it('creates a folder and accepts an existing one', async () => {
    for (const status of [201, 409]) {
      const client = createClient({ api: () => ({ status, body: '' }) })

      await ensureFolder(client, 'Documents/finance_backup')

      expect(client.calls.api[0].method).toBe('PUT')
      expect(decode(client.calls.api[0].path)).toBe(
        '/resources?path=disk:/Documents/finance_backup',
      )
    }
  })

  it('fails when a folder cannot be created', async () => {
    const client = createClient({
      api: () => ({ status: 403, body: '{"message":"Forbidden"}' }),
    })

    await expect(ensureFolder(client, 'Documents/finance_backup')).rejects.toThrow(
      'HTTP 403 Forbidden',
    )
  })

  it('returns a signed upload link', async () => {
    const client = createClient({
      api: () => ({
        status: 200,
        body: '{"href":"https://uploader.example/1","method":"PUT"}',
      }),
    })

    const href = await createUploadLink(client, 'Documents/finance_backup/a.json')

    expect(href).toBe('https://uploader.example/1')
    expect(decode(client.calls.api[0].path)).toContain('path=disk:/Documents/finance_backup/a.json')
    expect(client.calls.api[0].path).toContain('overwrite=true')
  })

  it('fails when an upload link is rejected', async () => {
    const client = createClient({
      api: () => ({ status: 401, body: '{"message":"Unauthorized"}' }),
    })

    await expect(createUploadLink(client, 'a.json')).rejects.toThrow('HTTP 401 Unauthorized')
  })

  it('uploads the body to the signed link without the oauth token', async () => {
    const client = createClient({ request: () => ({ status: 201, body: '' }) })
    const body = Buffer.from('{"data":{}}')

    await uploadContent(client, 'https://uploader.example/1', body)

    const call = client.calls.request[0]
    expect(call.url).toBe('https://uploader.example/1')
    expect(call.options.body).toBe(body)
    expect(call.options.headers.Authorization).toBeUndefined()
  })

  it('fails when the upload is rejected', async () => {
    const client = createClient({
      request: () => ({ status: 507, body: '{"message":"No space"}' }),
    })

    await expect(
      uploadContent(client, 'https://uploader.example/1', Buffer.from('{}')),
    ).rejects.toThrow('HTTP 507 No space')
  })

  it('lists file names', async () => {
    const client = createClient({
      api: () => ({
        status: 200,
        body: JSON.stringify({ _embedded: { items: [{ name: 'a.json' }, { name: 'b.json' }] } }),
      }),
    })

    expect(await listFiles(client, 'Documents/finance_backup')).toEqual(['a.json', 'b.json'])
  })

  it('treats a missing file on delete as already removed', async () => {
    const client = createClient({ api: () => ({ status: 404, body: '' }) })

    await expect(removeFile(client, 'Documents/finance_backup/gone.json')).resolves.toBeUndefined()
    expect(client.calls.api[0].path).toContain('permanently=true')
  })

  it('fails when delete is rejected', async () => {
    const client = createClient({ api: () => ({ status: 500, body: '' }) })

    await expect(removeFile(client, 'a.json')).rejects.toThrow('HTTP 500')
  })
})
