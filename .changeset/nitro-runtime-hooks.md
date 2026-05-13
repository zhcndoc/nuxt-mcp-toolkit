---
"@nuxtjs/mcp-toolkit": 次要
---

为 MCP 请求生命周期公开两个 Nitro 运行时钩子。可在 `server/plugins/*.ts` 插件中订阅，以注入自定义逻辑，而无需接管 `defineMcpHandler`——抛出异常的监听器会通过 consola 记录，且请求会继续执行。

```
defineMcpHandler middleware → mcp:config:resolved → createMcpServer → mcp:server:created → transport
```

### `mcp:config:resolved`

在每个请求中，于动态 `tools` / `resources` / `prompts` 解析器以及 `enabled(event)` 守卫运行之后、**构建每个请求的 `McpServer` 之前** 触发。就地修改 `ctx.config`，即可仅为当前请求添加、移除或转换定义。

```ts [server/plugins/mcp-filter.ts]
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('mcp:config:resolved', ({ config, event }) => {
    if (!event.context.user) {
      config.tools = config.tools.filter(t => !t.tags?.includes('admin'))
    }
  })
})
```

### `mcp:server:created`

在每个请求中，于所有 tool / resource / prompt 完成注册之后、**服务器连接到传输层之前** 触发。接收 SDK 的 `McpServer` 实例——可调用 `server.registerTool(...)` 进行后期添加定义，或使用 `getSdkServer(server)` 获取底层 `Server` 并通过 `setRequestHandler(...)` 实现自定义 JSON-RPC 方法。

```ts [server/plugins/mcp-whoami.ts]
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('mcp:server:created', ({ server, event }) => {
    server.registerTool(
      'whoami',
      { description: '返回当前用户 ID' },
      async () => ({
        content: [{ type: 'text', text: String(event.context.userId ?? 'anonymous') }],
      }),
    )
  })
})
```

### 公共 API 新增内容

- `McpResolvedConfig` — 已解析的、每请求服务器配置的类型。
- `getSdkServer(server)` — 从 `McpServer` 获取底层 SDK `Server` 实例。

二者均从 `@nuxtjs/mcp-toolkit/server` 导出。参见 [Hooks · Runtime hooks](https://mcp-toolkit.nuxt.dev/advanced/hooks#runtime-hooks)。
