---
"@nuxtjs/mcp-toolkit": minor
---

新增多处理器组织：现在每个自动发现的工具、资源或提示都可以归属于一个命名处理器，而无需手动筛选。一个文件夹约定，一种基于函数的逃生通道。

### 文件夹约定（归属方式）

将定义放到 `server/mcp/handlers/<name>/{tools,resources,prompts}/` 下，它就会自动附加到命名处理器 `<name>`（挂载在 `/mcp/<name>`）。处理器 `index.ts` 是必需的，即使只有一行也不例外——它负责注册路由：

```
server/mcp/handlers/admin/
├── index.ts              # export default defineMcpHandler({ middleware: requireAdmin })
├── tools/delete-user.ts  # → /mcp/admin (auto)
└── prompts/help.ts       # → /mcp/admin (auto)
```

### `getMcp*` 原始辅助函数（逃生通道）

对于跨切面场景——“所有标记了 X 的工具”、“所有孤立项”、“除了这个组之外的所有内容”——传入一个会调用新原始辅助函数之一的函数。它们返回完整的定义对象（包含处理器和 Zod 模式），正是 `defineMcpHandler` 所期望的内容：

```ts
import { defineMcpHandler, getMcpTools } from '@nuxtjs/mcp-toolkit/server'

export default defineMcpHandler({
  tools: event => getMcpTools({ event, tags: ['searchable'] }),
})
```

`getMcpTools`、`getMcpResources` 和 `getMcpPrompts` 接受与 `listMcp*` 相同的选项。

### 默认处理器策略

新的 `mcp.defaultHandlerStrategy` 配置（默认值为 `'orphans'`）控制当存在命名处理器时，哪些定义会落到 `/mcp`。使用 `'orphans'` 时，每个定义只会出现在一个位置。设置为 `'all'` 可保留多处理器之前的行为。

### `listMcp*` 过滤器 + 汇总 `handler`

列表辅助函数新增两个选项：

- `handler`（`string | string[]`）—— 仅保留归属于这些命名处理器之一的定义。
- `orphansOnly`（`boolean`）—— 仅保留孤立定义。

每个汇总现在都会暴露一个 `handler?: string` 字段，表示归属的处理器名称（孤立项则为 undefined）。

### 向后兼容

如果你不使用新的约定，则是 100% 追加式变化——没有 `server/mcp/handlers/` 的应用不会看到行为变化。顶层处理器文件（`server/mcp/<name>.ts`）会保持其特性前的行为：当省略 `tools` 时，会暴露完整工具池（因此代码模式风格的封装器仍可在不做任何改动的情况下继续工作）。现有的 `tools: [...]` 和 `tools: ev => ...` 模式也同样继续可用。

```ts
// 之前 — 手动筛选
export default defineMcpHandler({
  name: 'apps',
  tools: allTools.filter(t => t._meta?.group === 'apps'),
})

// 之后 — 文件夹约定（移动到 server/mcp/handlers/apps/，移除筛选）
export default defineMcpHandler({
  description: 'Apps 处理器',
})
```

完整指南请参见 [`/handlers/organization`](https://mcp-toolkit.nuxt.dev/handlers/organization)。
