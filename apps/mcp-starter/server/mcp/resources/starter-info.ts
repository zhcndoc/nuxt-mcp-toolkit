import { defineMcpResource } from '@nuxtjs/mcp-toolkit/server'

export default defineMcpResource({
  name: 'starter-info',
  title: 'Starter layout',
  uri: 'starter://info',
  description: 'Where to add tools, resources, and prompts in this template.',
  handler: async (uri: URL) => {
    const text = [
      'Nuxt MCP Toolkit minimal starter.',
      '',
      '- Tools:     server/mcp/tools/*.ts   → defineMcpTool from @nuxtjs/mcp-toolkit/server',
      '- Resources: server/mcp/resources/*.ts → defineMcpResource',
      '- Prompts:   server/mcp/prompts/*.ts  → defineMcpPrompt',
      '',
      'Docs: https://mcp-toolkit.nuxt.dev',
    ].join('\n')

    return {
      contents: [{ uri: uri.toString(), text }],
    }
  },
})
