import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleUnifiedResponsesProxyRequest } from './unifiedResponsesProxy.js'

const SESSION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u

function joinEndpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/u, '')}${path}`
}

function readHeader(req: IncomingMessage, name: string): string {
  const value = req.headers[name]
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? ''
}

// Codex sends its stable thread id with every turn. Session-aware upstreams
// (opencode-claude) otherwise key a chat by its first user message, which is
// the same AGENTS.md preamble for every thread of a project, so parallel
// threads supersede each other's running turns.
export function resolveCodexSessionHeaders(req: IncomingMessage): Record<string, string> {
  const sessionId = [readHeader(req, 'thread-id'), readHeader(req, 'session-id')]
    .find((value) => SESSION_ID_PATTERN.test(value))
  if (!sessionId) return {}
  return {
    'session-id': sessionId,
    'x-opencode-claude-session': sessionId,
  }
}

export function handleCustomEndpointProxyRequest(
  req: IncomingMessage,
  res: ServerResponse,
  options: {
    baseUrl: string
    bearerToken: string
    wireApi: 'responses' | 'chat'
    requestOverrides?: Record<string, unknown>
  },
): void {
  const sessionHeaders = resolveCodexSessionHeaders(req)
  handleUnifiedResponsesProxyRequest(req, res, {
    bearerToken: options.bearerToken,
    wireApi: options.wireApi,
    responsesEndpoint: joinEndpoint(options.baseUrl, '/responses'),
    chatCompletionsEndpoint: joinEndpoint(options.baseUrl, '/chat/completions'),
    missingKeyMessage: 'Missing custom endpoint API key',
    allowToolFallbackToResponses: false,
    requestOverrides: options.requestOverrides,
    upstreamHeaders: () => sessionHeaders,
  })
}
