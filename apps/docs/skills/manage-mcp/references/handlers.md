# 处理器 — 多端点组织

`defineMcpHandler` 定义一个自定义 MCP 端点，它拥有自己的中间件、工具/资源/提示集合以及元数据。可将其用于：

- 覆盖默认的 `/mcp` 路由（`server/mcp/index.ts`）。
- 在 `/mcp/<name>` 挂载额外端点（`server/mcp/handlers/<name>/index.ts`）。
- 按请求过滤暴露的定义（例如 `tools: event => getMcpTools({ event, tags: ['public'] })`）。

## 文件夹约定（推荐）

在 `server/mcp/handlers/<name>/` 下放置一个处理器文件夹，工具包会自动将其中的每个工具、资源和提示附加到该处理器上——无需手动过滤，也无需 `tools: [...]` 数组。

```
server/mcp/
├── tools/                            # → /mcp（默认处理器）
├── resources/
├── prompts/
└── handlers/
    ├── admin/
    │   ├── index.ts                  # defineMcpHandler({ middleware: requireAdmin })
    │   ├── tools/
    │   │   └── delete-user.ts        # → /mcp/admin（自动）
    │   └── prompts/
    │       └── help.ts               # → /mcp/admin（自动）
    └── apps/
        ├── index.ts                  # defineMcpHandler({ description: '交互式小部件' })
        └── tools/                    # → /mcp/apps（自动）
```

```typescript [server/mcp/handlers/admin/index.ts]
export default defineMcpHandler({
  description: '管理员工具 — IP 白名单内的破坏性操作。',
  instructions: '在运行任何破坏性操作之前，始终先与操作者确认。',
  middleware: async (event) => {
    const apiKey = getHeader(event, 'authorization')?.replace('Bearer ', '')
    const user = apiKey ? await verifyAdmin(apiKey).catch(() => null) : null
    if (user) event.context.user = user
    // 软认证：工具使用 `enabled: e => Boolean(e.context.user)` 来隐藏自身
  },
  // tools / resources / prompts omitted → 自动从 handlers/admin/{tools,resources,prompts}/ 附加
})
```

处理器的 `name` 会从文件夹（`admin`）中推断，并且会**覆盖**你在 `index.ts` 中设置的任何值。

::callout{icon="i-lucide-lightbulb" color="primary"}
即使只是一个单行文件，也需要 `index.ts`：`export default defineMcpHandler({})`。它会注册 `/mcp/<name>` 路由，并且是你添加 `middleware`、`description`、`experimental_codeMode` 等配置的地方。
::

## 默认处理器策略

默认的 `/mcp` 路由遵循 `nuxt.config.ts` 中的 `mcp.defaultHandlerStrategy`：

| 值 | 行为 |
| --- | --- |
| `'orphans'`（默认） | 只包含**未附加**到任何命名处理器的定义。每个定义只会存在于一个位置。当不存在文件夹处理器时，每个定义都是孤儿，因此会回退为“暴露全部”——零成本向后兼容。 |
| `'all'` | 每个已发现的定义（大杂烩路由）。当你希望在专门路由之上再提供一个默认路由时，这很有用。 |

```typescript [nuxt.config.ts]
export default defineNuxtConfig({
  mcp: {
    defaultHandlerStrategy: 'orphans', // 默认
  },
})
```

## 函数形式（逃生舱）

对于跨领域的场景——“所有标记为 X 的工具”、“所有孤儿”、“除 admin 之外的全部”——传入一个调用 `getMcp*` 帮助器之一的函数：

```typescript [server/mcp/handlers/searchable/index.ts]
import { defineMcpHandler, getMcpTools } from '@nuxtjs/mcp-toolkit/server'

export default defineMcpHandler({
  // 任何标记为 'searchable' 的工具，无论位于哪个文件夹
  tools: event => getMcpTools({ event, tags: ['searchable'] }),
})
```

`getMcpTools`、`getMcpResources`、`getMcpPrompts` 返回**原始**定义（保留处理器和 Zod schema）——这正是 `defineMcpHandler` 所期望的。

## 所有 `defineMcpHandler` 选项

```typescript
defineMcpHandler({
  name?: string                   // 非文件夹处理器时必填；否则自动从文件夹推导
  version?: string                // 默认值为 mcp.version
  description?: string            // 客户端显示的 serverInfo 描述
  instructions?: string           // 面向 LLM 的系统提示指导
  icons?: McpIcon[]               // 客户端 UI 中的服务器图标
  route?: string                  // 自定义挂载路径（默认 /mcp/<name>）
  browserRedirect?: string        // 浏览器 GET 请求重定向到哪里
  middleware?: McpMiddleware      // 请求时认证/日志记录等
  tools?: ToolDef[] | ((event) => ToolDef[] | Promise<ToolDef[]>)
  resources?: ResourceDef[] | ((event) => …)
  prompts?: PromptDef[] | ((event) => …)
  experimental_codeMode?: boolean | CodeModeOptions
})
```

如果省略 `description` / `instructions` / `icons`，它们会回退到 `nuxt.config.ts` 中的 `mcp.*`，因此只有当某个端点拥有自己的标识时，你才需要为其单独设置这些项。

## 解析规则

工具包会根据文件位置使用一条确定性规则来决定每个定义出现在哪里：

| 处理器配置文件 | `tools \| resources \| prompts: undefined` 的默认值 |
| --- | --- |
| `server/mcp/index.ts` | 遵循 `defaultHandlerStrategy` |
| `server/mcp/handlers/<name>/index.ts` | 归属于 `<name>` 的定义 |
| `server/mcp/<name>.ts`（顶层） | 每个已发现的定义（向后兼容） |
| 数组 | 原样使用 |
| 函数 `(event) => T[]` | 每次请求时调用 |

## 列出定义（`listMcp*` / `getMcp*`）

以程序化方式读取你发现到的目录——适用于 [server cards](https://modelcontextprotocol.io/specification/2025-11-25/basic/server-cards)、管理仪表盘、站点地图，或反馈到自定义处理器中。

| 帮助器 | 返回值 |
| --- | --- |
| `listMcpTools(options?)` | `McpToolSummary[]`（适合 JSON：`name`、`title`、`description`、`group`、`tags`、`handler`） |
| `listMcpResources(options?)` | `McpResourceSummary[]`（包含 `uri`） |
| `listMcpPrompts(options?)` | `McpPromptSummary[]` |
| `listMcpDefinitions(options?)` | `{ tools, resources, prompts }` |
| `getMcpTools(options?)` | `McpToolDefinitionListItem[]`（原始数据，包含 handlers + Zod） |
| `getMcpResources(options?)` | `McpResourceDefinition[]`（原始） |
| `getMcpPrompts(options?)` | `McpPromptDefinition[]`（原始） |

过滤器（按 AND 语义组合）：

| 选项 | 类型 | 描述 |
| --- | --- | --- |
| `event` | `H3Event` | 使用请求上下文对每个定义应用 `enabled()` 守卫 |
| `group` | `string \| string[]` | 与某个组进行 OR 匹配 |
| `tags` | `string \| string[]` | 与某个标签进行 OR 匹配 |
| `handler` | `string \| string[]` | 附加到这些命名处理器之一的定义 |
| `orphansOnly` | `boolean` | 仅孤儿定义（与 `handler` 互斥） |

### 公共目录（server card）

```typescript [server/routes/.well-known/mcp/server-card.json.get.ts]
import { listMcpDefinitions } from '@nuxtjs/mcp-toolkit/server'

export default defineEventHandler(async (event) => {
  const { tools, resources, prompts } = await listMcpDefinitions({ event })
  return {
    name: '我的 MCP 服务器',
    description: '由我的 Nuxt 应用暴露的工具、资源和提示。',
    tools: tools.map(t => ({ name: t.name, description: t.description })),
    resources: resources.map(r => ({ name: r.name, uri: r.uri })),
    prompts: prompts.map(p => ({ name: p.name, description: p.description })),
  }
})
```

### 缓存的 server card

```typescript [server/routes/.well-known/mcp/server-card.json.get.ts]
import { listMcpDefinitions } from '@nuxtjs/mcp-toolkit/server'

export default defineCachedEventHandler(async (event) => {
  const definitions = await listMcpDefinitions({ event })
  return { name: '我的 MCP 服务器', ...definitions }
}, { maxAge: 60 * 60, swr: true })
```

::callout{icon="i-lucide-triangle-alert" color="warning"}
如果你传入 `event` 以便使用依赖于每次请求上下文（认证、请求头等）的 `enabled()` 守卫，请跳过缓存包装器——否则缓存会将第一次请求的响应固定住。
::

### 过滤示例

```typescript
const adminTools = await listMcpTools({ group: 'admin' })
const publicOrDocs = await listMcpTools({ tags: ['public', 'docs'] })
const adminCatalog = await listMcpTools({ handler: 'admin' })
const orphans = await listMcpTools({ orphansOnly: true })

// 组合：标记为 'destructive' 且对当前请求可见的 admin 工具
const adminDestructive = await listMcpTools({ event, handler: 'admin', tags: 'destructive' })
```

## 迁移提示

1. **从小处开始。** 一次迁移一个处理器到 `handlers/<name>/` 中。现有的 `tools: [...]` 和 `tools: ev => [...]` 可以原样继续工作。
2. **移除手动过滤。** 如果你之前在做 `tools: allTools.filter(t => t._meta?.group === 'apps')`，就把这些工具移动到 `handlers/apps/tools/`，让系统自动归属它们。
3. **包装一切的处理器。** 位于 `server/mcp/<name>.ts` 的顶层处理器（例如代码模式包装器）会保持当前行为——默认使用完整池。若要过滤，请传入函数：`tools: ev => getMcpTools({ event: ev, ... })`。
4. **强制旧行为。** 设置 `mcp.defaultHandlerStrategy: 'all'`，即使采用了文件夹处理器，也让 `/mcp` 继续暴露全部内容。

## 另请参阅

- [处理器概览](https://mcp-toolkit.nuxt.dev/handlers/overview)
- [默认与自定义处理器](https://mcp-toolkit.nuxt.dev/handlers/default-and-custom)
- [多处理器组织](https://mcp-toolkit.nuxt.dev/handlers/organization)
- [结构与选项](https://mcp-toolkit.nuxt.dev/handlers/structure-and-options)
- [列出定义](https://mcp-toolkit.nuxt.dev/advanced/listing-definitions)
