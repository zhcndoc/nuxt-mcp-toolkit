export default defineNuxtConfig({
  modules: ['@nuxtjs/mcp-toolkit'],

  compatibilityDate: 'latest',

  mcp: {
    name: 'MCP Starter',
    description: 'Minimal MCP server to fork and extend in server/mcp/.',
    instructions: 'Start with the ping tool and starter-info resource. Add tools under server/mcp/tools/, resources under server/mcp/resources/, prompts under server/mcp/prompts/.',
  },
})
