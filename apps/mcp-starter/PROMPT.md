I'm using the Nuxt MCP starter from `nuxt-modules/mcp-toolkit` (`apps/mcp-starter`).

Scaffolded it with:

- `npx giget@latest gh:nuxt-modules/mcp-toolkit/apps/mcp-starter my-app`

Then `pnpm install` and `pnpm dev`.

Docs: https://mcp-toolkit.nuxt.dev

Tools, resources, and prompts go under `server/mcp/`. Use `defineMcpTool`, `defineMcpResource`, and `defineMcpPrompt` from `@nuxtjs/mcp-toolkit/server`, with Zod for schemas — same style as the existing files.

Once my project is open in the editor, ask me what I want this MCP server to do, then help me implement it.
