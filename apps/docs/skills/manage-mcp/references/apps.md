# MCP Apps — 交互式 UI 小部件

`defineMcpApp` 让你能够编写 Vue 单文件组件，并将它们作为由你的 MCP 工具处理器提供支持的交互式 iframe，发布到兼容 MCP Apps 的宿主（ChatGPT、Cursor）。自 v0.15 起可用。

该宏会在构建时提取，SFC 会被打包成一个单独的 HTML 文件，而处理器在服务端运行，因此其 `structuredContent` 会在首次渲染时**内联到 iframe 的 HTML 中**——无需额外往返请求。

## 文件约定

MCP Apps 位于 **`app/mcp/`**（不是 `server/mcp/`）。它们位于客户端侧，因为它们编写的是 Vue 组件，但你声明的 `handler` 会在服务端运行。

```bash
app/
└── mcp/
    ├── color-picker.vue          # → tool: color-picker，挂载于 /mcp/apps
    ├── finder/
    │   └── stay-finder.vue       # → tool: stay-finder，挂载于 /mcp/finder
    └── checkout/
        └── stay-checkout.vue     # → tool: stay-checkout，挂载于 /mcp/checkout
```

`app/mcp/` 下的第一个子目录会成为**命名处理器归属**。直接放在 `app/mcp/` 下的 SFC 会归入隐式的 `apps` 处理器。可通过 `attachTo` 按应用覆盖。

可通过 `nuxt.config.ts` 中的 `mcp.appsDir` 覆盖目录。MCP Apps 管线仅在该目录存在时运行——未使用时可被完全 tree-shakable。

## 快速开始

```vue [app/mcp/color-picker.vue]
<script setup lang="ts">
import { z } from 'zod'

interface PalettePayload {
  base: string
  swatches: { name: string, hex: string }[]
}

defineMcpApp({
  description: '选择一种颜色并预览一个 5 色调色板。',
  inputSchema: {
    base: z.string().describe('十六进制颜色，例如 #2563eb'),
  },
  handler: async ({ base }): Promise<{ structuredContent: PalettePayload }> => ({
    structuredContent: await $fetch<PalettePayload>('/api/palette', { query: { base } }),
  }),
})

const { data, loading, sendPrompt } = useMcpApp<PalettePayload>()
</script>

<template>
  <main class="picker">
    <p v-if="loading">正在混合颜色…</p>
    <ul v-else-if="data" class="swatches">
      <li v-for="s in data.swatches" :key="s.hex">
        <button
          type="button"
          :style="{ background: s.hex }"
          @click="sendPrompt(`将 ${s.name}（${s.hex}）用作主色。`)"
        >
          {{ s.name }}
        </button>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.picker { padding: 16px; font-family: system-ui, sans-serif; }
.swatches { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 0; list-style: none; }
.swatches button { width: 100%; aspect-ratio: 1; border-radius: 8px; border: 0; cursor: pointer; }
</style>
```

该工具包会：

1. **注册一个 MCP 工具**，名为 `color-picker`（自动从文件名推导）。
2. 生成一个位于 `ui://mcp-app/color-picker` 的 **UI 资源**（MIME 为 `text/html;profile=mcp-app`）。
3. 将 SFC + 资源打包成一个单独的 HTML 文件。
4. **将 `structuredContent` 内联到 iframe 中**，使其以完整数据启动。

## `defineMcpApp` 选项

```typescript
defineMcpApp({
  name?: string                     // 覆盖自动推导的名称
  title?: string                    // 覆盖自动推导的标题
  description?: string              // 帮助 LLM 选择此应用
  inputSchema?: ZodRawShape         // 在服务端验证工具输入
  handler?: (args, extra) => Result // 服务端；默认值为 (args) => ({ structuredContent: args })
  csp?: McpAppCsp | false           // 收紧或禁用 iframe CSP
  attachTo?: string                 // 要挂载到的命名 MCP 处理器（默认：'apps' 或子目录）
  group?: string                    // 顶层组标签（默认：与 attachTo 相同）
  tags?: string[]                   // 传递给生成工具的顶层标签
  _meta?: Record<string, unknown>   // 额外的 _meta，向宿主公开
})
```

如果省略 `handler`，工具包默认使用 `(args) => ({ structuredContent: args })`——这对只回显输入、无状态的应用很有用。

**`attachTo`、`group` 和 `tags` 必须是字符串字面量**（`'finder'`、`['a', 'b']`）。工具包会在构建时静态读取它们，以路由生成的工具和资源。动态表达式（`attachTo: someVar`）会以清晰的错误导致构建失败。

### 将应用路由到专用处理器

```vue [app/mcp/finder/stay-finder.vue]
<script setup lang="ts">
defineMcpApp({
  attachTo: 'finder',     // 显式覆盖（这里子目录默认值也会是 'finder'）
  group: 'stays',
  tags: ['searchable'],
  // ...
})
</script>
```

然后添加处理器索引文件：

```ts [server/mcp/handlers/finder/index.ts]
import { defineMcpHandler } from '@nuxtjs/mcp-toolkit/server'

export default defineMcpHandler({})
```

现在该应用只会出现在 `/mcp/finder` 上（在 `defaultHandlerStrategy: 'orphans'` 下）。还可以通过 `getMcpTools({ handler: 'finder' })`、`getMcpTools({ tags: ['searchable'] })` 等进一步过滤。

## `useMcpApp<T>()` 桥接

会自动导入到每个 MCP App SFC 中。返回 iframe ↔ 宿主桥接对象：

```typescript
const {
  data,         // Ref<T | null>            — 从 structuredContent 水合，并由 callTool 刷新
  loading,      // Ref<boolean>             — 在首次载荷到达前为 true
  error,        // Ref<Error | null>        — 桥接 / 传输 / 载荷错误
  pending,      // Ref<boolean>             — 在 callTool() 执行期间为 true
  hostContext,  // Ref<HostContext | null>  — 主题、显示模式、语言环境，…
  callTool,     // (name, params?) => Promise<T | null>
  sendPrompt,   // (prompt: string) => void
  openLink,     // (url: string) => void
} = useMcpApp<MyPayload>()
```

### 适配宿主主题与布局

```vue
<script setup lang="ts">
const { hostContext } = useMcpApp()
const isDark = computed(() => hostContext.value?.theme === 'dark')
const isFullscreen = computed(() => hostContext.value?.displayMode === 'fullscreen')
</script>

<template>
  <main :data-theme="isDark ? 'dark' : 'light'" :data-mode="isFullscreen ? 'fullscreen' : 'inline'">
    <!-- …… -->
  </main>
</template>
```

`hostContext` 在首次渲染时为 `null`，并在握手后填充（约 50ms）。

### `sendPrompt(prompt)` — 后续跟进

将消息推送到聊天中，就像用户自己输入的一样——支持应用到应用的工作流：

```vue
<button @click="sendPrompt(`将 ${swatch.name} 用作品牌颜色。`)">
  使用此颜色
</button>
```

### `callTool(name, params)` — 原地刷新

从 iframe 重新调用任意 MCP 工具；结果会自动替换 `data`：

```vue
<script setup lang="ts">
const { data, pending, callTool } = useMcpApp<PalettePayload>()
async function refresh(base: string) {
  await callTool('color-picker', { base })
}
</script>
```

### `openLink(url)`

受沙箱限制的 iframe 无法打开窗口。`openLink` 会请求宿主在新标签页中打开 URL：

```vue
<button @click="openLink('https://example.com/learn-more')">
  了解更多
</button>
```

## CSP（内容安全策略）

默认情况下，每个应用 HTML 都会附带严格的 CSP。可允许额外来源白名单：

```typescript
defineMcpApp({
  csp: {
    resourceDomains: ['https://images.example.com'], // <img>、<style>、字体
    connectDomains: ['https://api.example.com'],     // fetch / XHR / WebSocket
  },
  // ...
})
```

CSP 来源会在构建时进行验证（仅限 `http(s)://` / `ws(s)://`，且不包含路径/查询/引号字符），并镜像到 `_meta.ui.csp` 和 `_meta['openai/widgetCSP']`，供自行强制执行 CSP 的宿主使用。

将 `csp: false` 可选择退出（不推荐）。

## 在服务端与 UI 之间共享类型

将共享类型放在 Nuxt 的 `shared/types/` 目录中——它们会在 SFC 和你的 API 端点中被全局自动导入，无需 `import`：

```typescript [shared/types/palette.ts]
export interface Swatch { name: string, hex: string }
export interface PalettePayload { base: string, swatches: Swatch[] }
```

```typescript [server/api/palette.get.ts]
export default defineEventHandler(async (event): Promise<PalettePayload> => {
  const { base } = getQuery(event)
  return { base: String(base), swatches: buildPalette(String(base)) }
})
```

```vue [app/mcp/color-picker.vue]
<script setup lang="ts">
defineMcpApp({
  inputSchema: { base: z.string() },
  handler: async ({ base }): Promise<{ structuredContent: PalettePayload }> => ({
    structuredContent: await $fetch('/api/palette', { query: { base } }),
  }),
})

const { data } = useMcpApp<PalettePayload>()
</script>
```

仅类型引用会被 esbuild 从浏览器包中剥离——运行时 iframe 内无需解析任何内容。

## 测试与发布

### 本地开发

运行 `pnpm dev`，并将 Cursor / Claude / ChatGPT 连接到 `http://localhost:3000/mcp`（或你的自定义路由）。DevTools MCP Inspector 也会内联预览每个应用。

### 生产环境

生产宿主中应用需要 **HTTPS**。部署你的 Nuxt 应用，将客户端指向生产 MCP URL——其余部分会自动完成。

## 另请参见

- [应用概览](https://mcp-toolkit.nuxt.dev/apps/overview)
- [编写与 defineMcpApp](https://mcp-toolkit.nuxt.dev/apps/authoring)
- [useMcpApp() 桥接](https://mcp-toolkit.nuxt.dev/apps/use-mcp-app)
- [CSP 与构建管线](https://mcp-toolkit.nuxt.dev/apps/csp-and-wiring)
- [测试与发布](https://mcp-toolkit.nuxt.dev/apps/testing-publishing)
- [模式与限制](https://mcp-toolkit.nuxt.dev/apps/patterns-reference)
