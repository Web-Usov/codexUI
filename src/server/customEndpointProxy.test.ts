import { describe, expect, it } from 'vitest'
import { createServer, type IncomingHttpHeaders } from 'node:http'
import { handleCustomEndpointProxyRequest } from './customEndpointProxy'

function listen(server: ReturnType<typeof createServer>): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        resolve(address.port)
      } else {
        reject(new Error('test server did not bind to a TCP port'))
      }
    })
  })
}

function close(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
}

async function captureUpstreamHeaders(clientHeaders: Record<string, string>): Promise<IncomingHttpHeaders> {
  let captured: IncomingHttpHeaders = {}
  const upstream = createServer((req, res) => {
    captured = req.headers
    req.resume()
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        id: 'chatcmpl-test',
        created: 123,
        choices: [{ message: { role: 'assistant', content: 'ok' } }],
      }))
    })
  })
  const upstreamPort = await listen(upstream)
  const proxy = createServer((req, res) => {
    handleCustomEndpointProxyRequest(req, res, {
      baseUrl: `http://127.0.0.1:${upstreamPort}/v1/`,
      bearerToken: 'test-token',
      wireApi: 'chat',
    })
  })
  const proxyPort = await listen(proxy)

  try {
    const response = await fetch(`http://127.0.0.1:${proxyPort}/v1/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...clientHeaders },
      body: JSON.stringify({
        model: 'claude-opus-5-5',
        input: [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hi' }] }],
      }),
    })
    expect(response.status).toBe(200)
    return captured
  } finally {
    await close(proxy)
    await close(upstream)
  }
}

describe('custom endpoint proxy session headers', () => {
  it('forwards the Codex thread id as the upstream session key', async () => {
    const headers = await captureUpstreamHeaders({
      'thread-id': '01a19231-df2e-7f23-811f-d27e553368ee',
      'session-id': '01a19231-df2e-7f23-811f-d27e553368ee',
    })

    expect(headers['x-opencode-claude-session']).toBe('01a19231-df2e-7f23-811f-d27e553368ee')
    expect(headers['session-id']).toBe('01a19231-df2e-7f23-811f-d27e553368ee')
    expect(headers.authorization).toBe('Bearer test-token')
  })

  it('keeps parallel threads on distinct session keys', async () => {
    const first = await captureUpstreamHeaders({ 'thread-id': 'thread-a' })
    const second = await captureUpstreamHeaders({ 'thread-id': 'thread-b' })

    expect(first['x-opencode-claude-session']).toBe('thread-a')
    expect(second['x-opencode-claude-session']).toBe('thread-b')
  })

  it('falls back to session-id and ignores malformed ids', async () => {
    const fallback = await captureUpstreamHeaders({ 'session-id': 'session-only' })
    const malformed = await captureUpstreamHeaders({ 'thread-id': 'bad id/with spaces' })

    expect(fallback['x-opencode-claude-session']).toBe('session-only')
    expect(malformed['x-opencode-claude-session']).toBeUndefined()
    expect(malformed['session-id']).toBeUndefined()
  })
})
