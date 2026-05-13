# 中间件模式

Middleware 位于 `defineMcpHandler` 上——**没有单独的 `defineMcpMiddleware`** 函数。其签名为：

```typescript
type McpMiddleware = (
  event: H3Event,
  next: () => Promise<Response>
) => Promise<Response | void> | Response | void
```

如果你没有调用 `next()`，它会在你的 middleware 返回后自动调用。如果你需要检查/修改响应或测量耗时，请显式调用它。

## 将 middleware 放在哪里

| 文件 | 作用 |
| --- | --- |
| `server/mcp/index.ts` | 覆盖默认的 `/mcp` 处理器——middleware 会对默认路由的每个请求运行。 |
| `server/mcp/handlers/<name>/index.ts` | 文件夹处理器——middleware 只会对 `/mcp/<name>` 运行。`handlers/<name>/{tools,resources,prompts}/` 中的 tools/resources/prompts 会自动挂载。 |

## 软认证（推荐）

::callout{icon="i-lucide-triangle-alert" color="warning"}
**不要** 在 MCP middleware 中 `throw createError({ statusCode: 401 })`——大多数客户端会把 MCP 路由上的 `401` 解释为“此服务器需要 OAuth”，并开始发现流程。相反，请在成功时设置 context，并让每个工具的 `enabled` 守卫隐藏受保护的工具，或者在需要强制拒绝时返回 `403`。
::

```typescript [server/mcp/index.ts]
export default defineMcpHandler({
  middleware: async (event) => {
    const apiKey = getHeader(event, 'authorization')?.replace('Bearer ', '')
    if (!apiKey) return

    const user = await verifyApiKey(apiKey).catch(() => null)
    if (user) event.context.user = user
    // 不要抛出异常——未认证请求仍然可以看到公共工具
  },
})
```

```typescript [server/mcp/tools/list-todos.ts]
import { z } from 'zod'

export default defineMcpTool({
  description: '列出当前用户的待办事项',
  enabled: event => Boolean(event.context.user), // 未认证时隐藏
  handler: async () => {
    const event = useEvent()
    return listTodos(event.context.user.id)
  },
})
```

对于一个**应该**展示给 LLM 但无法运行的工具，请返回友好的消息，而不是抛出异常：

```typescript
handler: async () => {
  const event = useEvent()
  if (!event.context.user) return '请先登录，然后重新运行此工具。'
  return listTodos(event.context.user.id)
}
```

## Better Auth API Keys

与 [`better-auth`](https://www.better-auth.com) 的 API-key 插件使用相同模式：

```typescript [server/mcp/index.ts]
import { auth } from '~/lib/auth'

export default defineMcpHandler({
  middleware: async (event) => {
    const headers = getRequestHeaders(event)
    const session = await auth.api.getSession({ headers: new Headers(headers as Record<string, string>) })
    if (session) {
      event.context.user = session.user
      event.context.session = session.session
    }
  },
})
```

`useMcpLogger()` 会自动使用 `event.context.user` 和 `event.context.session` 中的 `user.id` / `user.email` / `session.id` 为每条宽事件打标签。

## 日志 Middleware（使用 `next()` 进行计时）

使用 `extractToolNames` 从 JSON-RPC body 中捕获调用了哪些工具：

```typescript
import { extractToolNames } from '@nuxtjs/mcp-toolkit/server'

export default defineMcpHandler({
  middleware: async (event, next) => {
    const requestId = crypto.randomUUID()
    event.context.requestId = requestId

    const start = performance.now()
    const response = await next()
    const tools = await extractToolNames(event)

    console.log(`[mcp] ${requestId} ${tools.join(',') || 'rpc'} took ${(performance.now() - start).toFixed(1)}ms`)
    return response
  },
})
```

对于每次 MCP 请求都生成结构化宽事件，建议使用 [`useMcpLogger()`](https://mcp-toolkit.nuxt.dev/advanced/logging)——它会自动标记 `mcp.tool`、`mcp.session_id`、`mcp.request_id`、`service` 等。

## 强制拒绝（仅管理员处理器）

当 middleware **必须**拒绝时（例如一个永远不应公开的内部管理员端点），返回 `403`——不要返回 `401`：

```typescript [server/mcp/handlers/admin/index.ts]
export default defineMcpHandler({
  description: '管理员工具——仅允许 IP 白名单访问。',
  middleware: async (event) => {
    const ip = getRequestIP(event, { xForwardedFor: true })
    if (!ALLOWED_IPS.includes(ip)) {
      throw createError({ statusCode: 403, message: '禁止访问' })
    }
  },
})
```

## 限流

可依赖 [`nitro-rate-limit`](https://github.com/atinux/nitro-rate-limit)，或使用 `useStorage` 驱动实现按用户计数器——把工作放到 middleware 之外，这样其他工具的缓存仍能正常工作：

```typescript
const counters = new Map<string, { count: number, resetAt: number }>()

export default defineMcpHandler({
  middleware: async (event) => {
    const userId = event.context.user?.id ?? getRequestIP(event)
    const now = Date.now()
    const window = 60_000
    const limit = 100

    const bucket = counters.get(userId) ?? { count: 0, resetAt: now + window }
    if (now > bucket.resetAt) {
      bucket.count = 0
      bucket.resetAt = now + window
    }
    bucket.count++
    counters.set(userId, bucket)

    if (bucket.count > limit) {
      throw createError({ statusCode: 429, message: '超过速率限制' })
    }
  },
})
```

## CORS

跨域浏览器客户端由 `mcp.security.allowedOrigins` 进行限制。请在 `nuxt.config.ts` 中配置，而不是通过 middleware：

```typescript [nuxt.config.ts]
export default defineNuxtConfig({
  mcp: {
    security: {
      allowedOrigins: ['https://app.example.com'], // 或使用 '*' 以禁用 Origin 检查（请谨慎使用）
    },
  },
})
```

## 组合多个关注点

Middleware 只有一个函数，但你可以组合辅助函数：

```typescript
async function withAuth(event: H3Event) {
  const apiKey = getHeader(event, 'authorization')?.replace('Bearer ', '')
  if (!apiKey) return
  const user = await verifyApiKey(apiKey).catch(() => null)
  if (user) event.context.user = user
}

async function withRequestId(event: H3Event) {
  event.context.requestId = crypto.randomUUID()
}

export default defineMcpHandler({
  middleware: async (event, next) => {
    await withAuth(event)
    await withRequestId(event)
    return next()
  },
})
```

## 另请参阅

- [Middleware 文档](https://mcp-toolkit.nuxt.dev/advanced/middleware)
- [认证示例](https://mcp-toolkit.nuxt.dev/examples/authentication)
- [日志](https://mcp-toolkit.nuxt.dev/advanced/logging) — `useMcpLogger()` 和 evlog
