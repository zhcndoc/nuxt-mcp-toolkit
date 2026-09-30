import { afterEach, describe, it, expect } from 'vitest'
import {
  defineMcpApp,
  buildAppResourceUri,
  assertSafeAppName,
  _createAppTool,
  _createAppResource,
  MCP_APP_MIME_TYPE,
} from '../src/runtime/server/mcp/definitions/apps'

const ctx = { name: 'demo', html: '<!DOCTYPE html><html><head></head><body></body></html>' }

const callTool = (tool: ReturnType<typeof _createAppTool>, args: unknown) =>
  tool.handler(args as Record<string, unknown>, {} as never)

const readView = async (app: Parameters<typeof _createAppResource>[0]) => {
  const read = await _createAppResource(app, ctx).handler(new URL('ui://mcp-app/demo'), {} as never, {} as never)
  return read.contents?.[0] as { mimeType?: string, text?: string, _meta?: Record<string, unknown> } | undefined
}

describe('MCP App — name validation', () => {
  it('rejects unsafe app names everywhere they could leak into a URI or filename', () => {
    expect(() => assertSafeAppName('color-picker')).not.toThrow()
    expect(() => assertSafeAppName('../etc/passwd')).toThrow(TypeError)
    expect(() => assertSafeAppName('Has Space')).toThrow(TypeError)
    expect(() => buildAppResourceUri('../escape')).toThrow(TypeError)
    expect(buildAppResourceUri('demo')).toBe('ui://mcp-app/demo')

    const app = defineMcpApp()
    expect(() => _createAppTool(app, { name: '../bad' })).toThrow(TypeError)
  })
})

describe('MCP App — security', () => {
  it('emits a CSP, honors declared resource/connect domains, and rejects unsafe ones', async () => {
    const safe = defineMcpApp({
      csp: { resourceDomains: ['https://cdn.example.com'], connectDomains: ['https://api.example.com'] },
    })
    const safeHtml = (await readView(safe))?.text
    expect(safeHtml).toMatch(/<meta http-equiv="Content-Security-Policy"/)
    expect(safeHtml).toContain(`default-src 'none'`)
    expect(safeHtml).toContain('https://cdn.example.com')
    expect(safeHtml).toContain('https://api.example.com')

    const unsafe = defineMcpApp({ csp: { resourceDomains: ['javascript:alert(1)'] } })
    expect(() => _createAppResource(unsafe, ctx)).toThrow(/CSP domain/)
  })
})

describe('MCP App — tool result', () => {
  it('keeps the view HTML out of the tool result content', async () => {
    const app = defineMcpApp({
      handler: () => ({ structuredContent: { ok: true }, content: [{ type: 'text', text: 'done' }] }),
    })
    const result = await callTool(_createAppTool(app, ctx), {}) as { content: unknown[] }
    expect(result.content).toEqual([{ type: 'text', text: 'done' }])
  })
})

describe('MCP App — spec metadata', () => {
  const originalEnv = process.env.NUXT_PUBLIC_APP_URL

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.NUXT_PUBLIC_APP_URL
    else process.env.NUXT_PUBLIC_APP_URL = originalEnv
  })

  it('serves the spec MIME and exposes ui.resourceUri + ui.csp on tool and resource _meta', async () => {
    expect(MCP_APP_MIME_TYPE).toBe('text/html;profile=mcp-app')

    const app = defineMcpApp({ csp: { resourceDomains: ['https://images.example.com'] } })
    const tool = _createAppTool(app, ctx)
    const toolResult = await callTool(tool, {}) as { _meta?: Record<string, unknown> }

    const toolUi = toolResult._meta?.ui as Record<string, unknown> | undefined
    expect(toolUi?.resourceUri).toBe('ui://mcp-app/demo')
    expect(toolUi?.csp).toMatchObject({ resourceDomains: ['https://images.example.com'] })

    const c = await readView(app)
    expect(c?.mimeType).toBe(MCP_APP_MIME_TYPE)
    expect(c?.text).toMatch(/Content-Security-Policy/)
    const resourceUi = c?._meta?.ui as Record<string, unknown> | undefined
    expect(resourceUi?.resourceUri).toBe('ui://mcp-app/demo')
    expect(resourceUi?.csp).toMatchObject({ resourceDomains: ['https://images.example.com'] })
  })

  it('auto-detects ui.domain and lets app metadata override it', async () => {
    process.env.NUXT_PUBLIC_APP_URL = 'demo.example.com'
    const detected = _createAppTool(defineMcpApp(), ctx)
    const detectedResult = await callTool(detected, {}) as { _meta?: Record<string, unknown> }
    expect((detectedResult._meta?.ui as Record<string, unknown>).domain).toBe('https://demo.example.com')

    const overridden = _createAppTool(defineMcpApp({
      _meta: { ui: { domain: 'https://custom.example.com' } },
    }), ctx)
    const overriddenResult = await callTool(overridden, {}) as { _meta?: Record<string, unknown> }
    expect((overriddenResult._meta?.ui as Record<string, unknown>).domain).toBe('https://custom.example.com')
  })
})

describe('MCP App — ChatGPT compat metadata', () => {
  // ChatGPT today gates widget rendering on `openai/*` keys instead of the
  // spec's `_meta.ui.*`. If these regress, the iframe stops showing up
  // entirely in ChatGPT — that's invisible to spec-pure tests, so we lock
  // them down explicitly. Drop this suite the day ChatGPT honors `_meta.ui`.
  it('mirrors ui.resourceUri + csp into openai/* keys on tool and resource _meta', async () => {
    const app = defineMcpApp({
      csp: { resourceDomains: ['https://cdn.example.com'], connectDomains: ['https://api.example.com'] },
    })

    const toolResult = await callTool(_createAppTool(app, ctx), {}) as { _meta?: Record<string, unknown> }
    expect(toolResult._meta?.['openai/outputTemplate']).toBe('ui://mcp-app/demo')
    expect(toolResult._meta?.['openai/widgetAccessible']).toBe(true)
    expect(toolResult._meta?.['openai/widgetCSP']).toEqual({
      resource_domains: ['https://cdn.example.com'],
      connect_domains: ['https://api.example.com'],
    })

    const meta = (await readView(app))?._meta
    expect(meta?.['openai/outputTemplate']).toBe('ui://mcp-app/demo')
    expect(meta?.['openai/widgetAccessible']).toBe(true)
  })
})
