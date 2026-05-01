---
"@nuxtjs/mcp-toolkit": minor
---

将 `listMcpTools`、`listMcpResources`、`listMcpPrompts` 和 `listMcpDefinitions` 辅助函数添加到你的服务器路由中，以读取工具包已发现的工具、资源和提示词——而无需重复它们的名称和描述。

### 用法

```ts
// server/routes/.well-known/mcp/server-card.json.get.ts
import { listMcpDefinitions } from '@nuxtjs/mcp-toolkit/server'

export default defineEventHandler(async (event) => {
  const { tools, resources, prompts } = await listMcpDefinitions({ event })
  return {
    name: '我的 MCP 服务器',
    tools: tools.map(t => ({ name: t.name, description: t.description })),
    resources: resources.map(r => ({ name: r.name, uri: r.uri, description: r.description })),
    prompts: prompts.map(p => ({ name: p.name, description: p.description })),
  }
})
```

每个辅助函数都会返回适合 JSON 的摘要（`name`、`title`、`description`、`group`、`tags`——资源还会包含 `uri`）。通过文件名自动生成的名称已经被解析，因此你得到的结果与 MCP 客户端在 `tools/list` 中看到的内容完全一致。

### 过滤

每个辅助函数都接受一个 `ListMcpDefinitionsOptions` 对象——筛选条件按 AND 语义组合：

- `event` — 使用请求上下文对每个定义应用 `enabled()` 守卫。
- `group`（`string | string[]`）— 仅包含属于这些组之一的定义（OR 匹配）。
- `tags`（`string | string[]`）— 仅包含至少具有其中一个标签的定义（OR 匹配）。

```ts
const adminDestructive = await listMcpTools({
  event,
  group: 'admin',
  tags: 'destructive',
})
```

这些新的辅助函数也会在服务端自动导入（当启用 `autoImports` 时），因此你可以直接使用它们而无需手动导入。
