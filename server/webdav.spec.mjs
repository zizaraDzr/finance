import { describe, expect, it } from 'vitest'
import { ensureCollection, listFiles, parseHrefs, removeFile, uploadFile } from './webdav.mjs'

function createRequest(handler) {
  const calls = []
  const request = async (method, path, options = {}) => {
    calls.push({ method, path, options })
    return handler(method, path, options)
  }
  request.calls = calls
  return request
}

describe('webdav', () => {
  it('creates a collection and accepts an existing one', async () => {
    const request = createRequest(() => ({ status: 405, body: '' }))

    await ensureCollection(request, 'Documents/finance_backup')

    expect(request.calls[0].method).toBe('MKCOL')
    expect(request.calls[0].path).toBe('Documents/finance_backup/')
  })

  it('fails when a collection cannot be created', async () => {
    const request = createRequest(() => ({ status: 500, body: '' }))

    await expect(ensureCollection(request, 'Documents/finance_backup')).rejects.toThrow('HTTP 500')
  })

  it('uploads the body as JSON', async () => {
    const request = createRequest(() => ({ status: 201, body: '' }))
    const body = Buffer.from('{"data":{}}')

    await uploadFile(request, 'Documents/finance_backup/snapshot.json', body)

    expect(request.calls[0].method).toBe('PUT')
    expect(request.calls[0].options.body).toBe(body)
    expect(request.calls[0].options.headers['Content-Type']).toBe('application/json')
  })

  it('fails when an upload is rejected', async () => {
    const request = createRequest(() => ({ status: 507, body: '' }))

    await expect(uploadFile(request, 'a.json', Buffer.from('{}'))).rejects.toThrow('HTTP 507')
  })

  it('lists names from a PROPFIND answer', async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <d:multistatus xmlns:d="DAV:">
        <d:response><d:href>/Documents/finance_backup/</d:href></d:response>
        <d:response><d:href>/Documents/finance_backup/finance-data.backup.2026-10-29T20-30-00-000.json</d:href></d:response>
        <d:response><d:href>/Documents/finance_backup/%D0%A4%D0%B8%D0%BD.json</d:href></d:response>
      </d:multistatus>`
    const request = createRequest(() => ({ status: 207, body: xml }))

    const names = await listFiles(request, 'Documents/finance_backup')

    expect(names).toEqual(['finance-data.backup.2026-10-29T20-30-00-000.json', 'Фин.json'])
    expect(request.calls[0].options.headers.Depth).toBe('1')
  })

  it('fails when PROPFIND is rejected', async () => {
    const request = createRequest(() => ({ status: 401, body: '' }))

    await expect(listFiles(request, 'Documents/finance_backup')).rejects.toThrow('HTTP 401')
  })

  it('treats a missing file on DELETE as already removed', async () => {
    const request = createRequest(() => ({ status: 404, body: '' }))

    await expect(removeFile(request, 'Documents/finance_backup/gone.json')).resolves.toBeUndefined()
  })

  it('decodes and cleans up hrefs', () => {
    const xml =
      '<d:href>/Documents/finance_backup/</d:href><d:href>/Documents/finance_backup/a%20b.json</d:href>'

    expect(parseHrefs(xml)).toEqual(['a b.json'])
  })
})
