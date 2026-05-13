---
"@nuxtjs/mcp-toolkit": minor
---

将路由 MCP 应用指向任意命名处理器——无需手动过滤。直到现在，每个 `defineMcpApp` SFC 都会被硬性归属到隐式的 `apps` 处理器，因此多个 `app/mcp/*.vue` 文件只能一起暴露在 `/mcp/apps` 上。现在有了两种新机制（与模块其余部分保持一致），你可以将应用拆分到不同的处理器中。

### 子文件夹约定

`app/mcp/` 下的第一级子目录会成为命名处理器的归属——思路与工具、资源和提示的 `server/mcp/handlers/<name>/` 类似：

```bash
app/mcp/
├── color-picker.vue          # → /mcp/apps   （默认）
├── finder/
│   └── stay-finder.vue       # → /mcp/finder
└── checkout/
    └── stay-checkout.vue     # → /mcp/checkout
```

将每个子文件夹与其处理器索引文件配对即可（写成一行也可以）：

```ts [server/mcp/handlers/finder/index.ts]
import { defineMcpHandler } from '@nuxtjs/mcp-toolkit/server'

export default defineMcpHandler({})
```

在 `defaultHandlerStrategy: 'orphans'`（默认值）下，每个应用只会出现在一个路由上。

### 显式 `attachTo` / `group` / `tags` 覆盖

`defineMcpApp` 上新增的三个字段允许 SFC 脱离文件夹约定，或者添加可过滤的元数据。它们会覆盖任何子文件夹默认值：

```vue [app/mcp/stay-finder.vue]
<script setup lang="ts">
defineMcpApp({
  attachTo: 'finder',          // 覆盖 → /mcp/finder
  group: 'stays',              // getMcpTools({ group }) 的顶层过滤条件
  tags: ['searchable', 'demo'],// getMcpTools({ tags }) 的顶层过滤条件
  // ...
})
</script>
```

生成的工具和资源都会携带 `_meta.handler = 'finder'`、顶层 `group` 和 `tags`，因此 `getMcpTools({ handler: 'finder' })` / `getMcpTools({ tags: ['searchable'] })` 的过滤方式与普通工具一致。

### 构建时校验

`attachTo`、`group` 和 `tags` 必须是**字符串字面量**（例如 `'finder'`、`['a', 'b']`）。工具包会在构建时从 `defineMcpApp` 宏中静态读取它们，因此在开发、构建和部署之间路由决策是确定性的。动态表达式（`attachTo: someVar`）会使构建失败，并给出清晰的错误信息。

### 向后兼容

100% 仅追加——没有子文件夹或显式覆盖的应用会保留之前的行为（归属到 `apps`，并显示在 `/mcp/apps` 上）。此前在 [MCP Apps internals](https://mcp-toolkit.nuxt.dev/advanced/mcp-apps-internals#multiple-handlers) 中记录的“在 `defineMcpHandler` 内部手动过滤”的变通方案现在不再需要。

参见 [Apps · Authoring → 将应用路由到特定处理器](https://mcp-toolkit.nuxt.dev/apps/authoring#routing-apps-to-a-specific-handler)。
