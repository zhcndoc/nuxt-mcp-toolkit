# 会话 — 持久化状态

默认情况下，MCP 服务器是**无状态**的——每个请求都会获得一个新的服务器实例。启用会话后，可以在多个工具调用之间保持状态，支持 SSE 流式传输，并启用询问式交互。

## 设置

```typescript [nuxt.config.ts]
export default defineNuxtConfig({
  modules: ['@nuxtjs/mcp-toolkit'],
  mcp: {
    sessions: true,
  },
  nitro: {
    experimental: { asyncContext: true }, // useMcpSession() 需要
  },
})
```

配置超时和容量：

```typescript [nuxt.config.ts]
export default defineNuxtConfig({
  mcp: {
    sessions: {
      enabled: true,
      maxDuration: 60 * 60 * 1000, // 1 小时（默认：30 分钟）
      maxSessions: 1000,           // 在此之前新的会话会返回 503
    },
  },
})
```

当会话开启时，服务器会在 `initialize` 时分配一个 `Mcp-Session-Id` 响应头，客户端会在之后的每个请求中将其带回。

## `useMcpSession<T>()`

自动导入到每个服务端文件中。返回一个由 [unstorage](https://unstorage.unjs.io) 支持的、带类型的键值存储。这个组合式函数本身是**同步**的——只有存储方法是异步的。

```typescript [server/mcp/tools/counter.ts]
import { z } from 'zod'

interface CounterSession {
  counter: number
}

export default defineMcpTool({
  description: '递增每个会话的计数器',
  handler: async () => {
    const session = useMcpSession<CounterSession>()
    const count = (await session.get('counter')) ?? 0
    await session.set('counter', count + 1)
    return `计数器：${count + 1}`
  },
})
```

TypeScript 会强制：

- `session.get('counter')` 返回 `Promise<number | null>`
- `session.set('counter', 'wrong')` 会产生编译错误
- `session.get('unknown_key')` 会产生编译错误

### 无类型存储

```typescript
const session = useMcpSession()
await session.set('key', { any: 'value' })
const data = await session.get('key')
```

### API

| 方法 | 说明 |
| --- | --- |
| `get(key)` | 获取一个值（缺失时返回 `null`） |
| `set(key, value)` | 存储一个值 |
| `remove(key)` | 删除一个键 |
| `has(key)` | 检查某个键是否存在 |
| `keys()` | 列出会话中的所有键 |
| `clear()` | 删除会话中的所有数据 |
| `storage` | 访问底层的 unstorage 实例 |

除 `storage` 外，所有方法都是异步的。

## 常见模式

### 记事本（在多次工具调用之间累积数据）

```typescript [server/mcp/tools/add-note.ts]
import { z } from 'zod'

interface NotesSession {
  notes: { text: string, createdAt: string }[]
}

export default defineMcpTool({
  description: '向会话记事本中添加一条笔记',
  inputSchema: { note: z.string().describe('笔记内容') },
  handler: async ({ note }) => {
    const session = useMcpSession<NotesSession>()
    const notes = (await session.get('notes')) ?? []
    notes.push({ text: note, createdAt: new Date().toISOString() })
    await session.set('notes', notes)
    return `已添加笔记（共 ${notes.length} 条）。`
  },
})
```

```typescript [server/mcp/tools/get-notes.ts]
interface NotesSession {
  notes: { text: string, createdAt: string }[]
}

export default defineMcpTool({
  description: '从会话记事本中检索所有笔记',
  handler: async () => {
    const session = useMcpSession<NotesSession>()
    const notes = (await session.get('notes')) ?? []
    if (notes.length === 0) return '目前还没有笔记。'
    return notes
  },
})
```

### 多步骤向导

```typescript [server/mcp/tools/wizard.ts]
import { z } from 'zod'

interface WizardSession {
  step: number
  answers: Record<string, string>
}

export default defineMcpTool({
  description: '引导用户完成设置向导',
  inputSchema: {
    answer: z.string().optional().describe('上一问题的答案'),
  },
  handler: async ({ answer }) => {
    const session = useMcpSession<WizardSession>()
    const state = (await session.get('step')) ?? 0
    const answers = (await session.get('answers')) ?? {}

    const questions = ['你的名字是什么？', '选择一个框架？', '添加测试吗？']
    if (state > 0 && answer) {
      answers[questions[state - 1]] = answer
      await session.set('answers', answers)
    }
    if (state >= questions.length) {
      await session.clear()
      return `完成！答案：${JSON.stringify(answers, null, 2)}`
    }

    await session.set('step', state + 1)
    return questions[state]
  },
})
```

### 每会话速率限制

```typescript
interface RateLimitSession {
  calls: { ts: number }[]
}

export default defineMcpTool({
  description: '受速率限制的操作',
  handler: async () => {
    const session = useMcpSession<RateLimitSession>()
    const now = Date.now()
    const window = 60_000
    const limit = 10

    const calls = ((await session.get('calls')) ?? []).filter(c => now - c.ts < window)
    if (calls.length >= limit) {
      throw createError({ statusCode: 429, message: '放慢一点（每分钟 10 次请求限制）。' })
    }
    calls.push({ ts: now })
    await session.set('calls', calls)

    return 'OK'
  },
})
```

## 存储后端

会话使用 Nitro 的存储层。默认会自动注册两个内存驱动：

```typescript
nitroOptions.storage['mcp:sessions'] = { driver: 'memory' }
nitroOptions.storage['mcp:sessions-meta'] = { driver: 'memory' }
```

在生产环境中，请使用持久化驱动覆盖它们（Redis、Cloudflare KV、文件系统）：

```typescript [nuxt.config.ts]
export default defineNuxtConfig({
  mcp: { sessions: true },
  nitro: {
    storage: {
      'mcp:sessions': {
        driver: 'redis',
        url: process.env.REDIS_URL,
      },
      'mcp:sessions-meta': {
        driver: 'redis',
        url: process.env.REDIS_URL,
      },
    },
  },
})
```

## 使会话失效

当认证状态发生变化时（例如令牌被撤销），在中间件中使用 `invalidateMcpSession()`——这会强制客户端重新初始化：

```typescript [server/mcp/index.ts]
import { invalidateMcpSession } from '@nuxtjs/mcp-toolkit/server'

export default defineMcpHandler({
  middleware: async (event) => {
    const apiKey = getHeader(event, 'authorization')?.replace('Bearer ', '')
    const user = apiKey ? await verifyApiKey(apiKey).catch(() => null) : null

    if (event.context.user && !user) {
      // 用户之前已登录，但他们的令牌现在无效了
      invalidateMcpSession()
    }
    if (user) event.context.user = user
  },
})
```

## 另请参阅

- [会话文档](https://mcp-toolkit.nuxt.dev/advanced/sessions)
- [配置](https://mcp-toolkit.nuxt.dev/getting-started/configuration) — `mcp.sessions` 选项
- [日志](https://mcp-toolkit.nuxt.dev/advanced/logging) — 每个宽事件都会自动添加标签 `mcp.session_id`
