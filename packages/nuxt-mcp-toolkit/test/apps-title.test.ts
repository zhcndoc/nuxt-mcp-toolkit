import { describe, it, expect } from 'vitest'
import { defineMcpApp, _createAppTool } from '../src/runtime/server/mcp/definitions/apps'
import { enrichNameTitle } from '../src/runtime/server/mcp/definitions/utils'

const ctx = { name: 'create-final-icon', html: '<!DOCTYPE html><html><head></head><body></body></html>' }

/** Name and title as registration resolves them. */
function resolveNameTitle(tool: ReturnType<typeof _createAppTool>) {
  return enrichNameTitle({
    name: tool.name,
    title: tool.title,
    _meta: { ...tool._meta, filename: `${ctx.name}.tool.mjs` },
    type: 'tool',
  })
}

describe('MCP App — tool title', () => {
  it('derives the title from the SFC name, not the generated `.tool.mjs` file', () => {
    expect(resolveNameTitle(_createAppTool(defineMcpApp(), ctx))).toEqual({
      name: 'create-final-icon',
      title: 'Create Final Icon',
    })
  })

  it('keeps an explicit title', () => {
    expect(resolveNameTitle(_createAppTool(defineMcpApp({ title: 'Final icon' }), ctx)).title).toBe('Final icon')
  })

  it('titles an app with an explicit name from its filename, like a tool file', () => {
    const toolFile = enrichNameTitle({ name: 'icon', _meta: { filename: 'create-final-icon.ts' }, type: 'tool' })
    const app = resolveNameTitle(_createAppTool(defineMcpApp({ name: 'icon' }), ctx))

    expect(app).toEqual({ name: 'icon', title: 'Create Final Icon' })
    expect(app).toEqual(toolFile)
  })
})
