---
seo:
  ogImage: /og.jpg
  title: 将您的应用暴露给任意大语言模型
  description: 为您的 Nuxt 应用添加模型上下文协议（MCP）服务器。以类似 Nitro 的开发体验，将您的功能连接到 AI 客户端。
---

::landing-hero
---
command: npx skills add https://mcp-toolkit.nuxt.dev
installCommand: npx nuxt module add mcp-toolkit
linkLabel: 开始使用
linkTo: /getting-started/installation
---
#title
将您的应用暴露给任意 AI

#description
为您的 Nuxt 应用添加模型上下文协议（MCP）服务器。以类似 Nitro 的开发体验，将您的功能连接到 AI 客户端。
::

::landing-features
#title
让您的应用对 AI 开放

#description
使用模型上下文协议来标准化 LLM 与您的 Nuxt 应用的交互方式。

#features
:landing-feature-item{description="使用熟悉的模式，如 defineMcpTool 和 defineMcpResource。感觉就像在编写 API 路由。" icon="i-lucide-code-2" title="类似 Nitro 的 API" to="/tools/overview"}

:landing-feature-item{description="自动发现工具、资源和提示词。只需在 server/mcp 目录中创建文件即可。" icon="i-lucide-sparkles" title="零配置" to="/getting-started/installation"}

:landing-feature-item{description="使用 Zod 模式定义工具并支持完整的 TypeScript 类型推断。无需再猜测参数类型。" icon="i-lucide-shield-check" title="类型安全工具" to="/advanced/typescript"}

:landing-feature-item{description="基于官方 MCP SDK 构建，确保与 Claude、Cursor、ChatGPT 等所有 MCP 客户端兼容。" icon="i-lucide-check-circle-2" title="标准兼容" to="/getting-started/connection"}

:landing-feature-item{description="将交互式 UI 组件交付给 AI 主机。在 app/mcp/ 中编写 Vue SFC——由支持 MCP Apps 的主机构建、沙箱化并以内联方式渲染。" icon="i-lucide-app-window" title="MCP Apps" to="/apps/overview"}

:landing-feature-item{description="让 LLM 编写 JavaScript，在安全的 V8 沙箱中协调工具。最多可将 token 开销减少 82%。" icon="i-lucide-terminal" title="代码模式" to="/advanced/code-mode"}

:landing-feature-item{description="拦截请求以添加身份验证、日志记录和速率限制。从您的工具中访问事件上下文。" icon="i-lucide-shield" title="中间件" to="/advanced/middleware"}

:landing-feature-item{description="使用 Nitro 缓存工具和资源响应。只需在任何定义中添加 cache: '1h'。 " icon="i-lucide-zap" title="内置缓存" to="/tools/errors-caching"}

:landing-feature-item{description="使用 useMcpSession() 在工具调用之间持久化状态。构建多步骤工作流并跟踪对话。" icon="i-lucide-save" title="会话" to="/advanced/sessions"}

:landing-feature-item{description="通过启用守卫为不同用户显示不同的工具。基于身份验证、角色或上下文控制可见性。" icon="i-lucide-toggle-right" title="动态定义" to="/advanced/dynamic-definitions"}

:landing-feature-item{description="提供 InstallButton 组件、SVG 徽章和深度链接，让用户能够立即将您的 MCP 服务器添加到他们的 IDE 中。" icon="i-lucide-download" title="一键安装" to="/getting-started/connection"}

:landing-feature-item{description="创建具有各自工具、资源和配置的独立 MCP 端点。按域或版本进行组织。" icon="i-lucide-server" title="多个处理器" to="/handlers/overview"}

:landing-feature-item{description="使用 AI SDK 和 Evalite 验证 LLM 是否调用了正确的工具。在问题进入生产环境前捕获回归。" icon="i-lucide-flask-conical" title="评估测试" to="/advanced/evals"}

:landing-feature-item{description="借助 Agent Skills 规范，让 AI 助手帮助您构建、审查和排查 MCP 服务器问题。" icon="i-lucide-wand-2" title="智能体技能" to="/getting-started/agent-skills"}

:landing-feature-item{description="使用标签将工具、资源和提示词组织成分组。可从子目录自动推断，也可显式设置。" icon="i-lucide-tags" title="分组与标签" to="/tools/groups-organization#groups-and-tags"}

:landing-feature-item{description="使用内置检查器实时调试您的 MCP 服务器。查看工具、资源、提示词、连接和日志。" icon="i-lucide-bug" title="集成开发工具" to="/getting-started/inspector"}

  :::landing-feature-cta
  ---
  icon: i-lucide-arrow-right
  label: 开始使用
  to: /getting-started/installation
  ---
  #title
  立即开始构建
  :::
::

::landing-code
#title
只需编写代码

#description
使用标准的 TypeScript 文件定义工具、资源和提示词。无需复杂的配置或样板代码。

#tools
```ts
// server/mcp/tools/weather.ts
import { z } from 'zod'

export default defineMcpTool({
  description: '获取某个地点的当前天气',
  inputSchema: {
    city: z.string().describe('城市名称'),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius')
  },
  annotations: { readOnlyHint: true },
  cache: '1h',
  handler: async ({ city, unit }) => {
    const data = await fetchWeather(city)
    return { temperature: data.temp, unit, city }
  }
})
```

#resources
```ts
// server/mcp/resources/readme.ts
export default defineMcpResource({
  file: 'README.md',
  description: '项目文档',
  annotations: {
    audience: ['user', 'assistant'],
    lastModified: new Date().toISOString(),
  }
})
```

#prompts
```ts
// server/mcp/prompts/summarize.ts
import { z } from 'zod'

export default defineMcpPrompt({
  description: '总结一段文本',
  inputSchema: {
    text: z.string().describe('待总结文本'),
    format: z.enum(['bullet-points', 'paragraph']).default('paragraph')
  },
  handler: async ({ text, format }) =>
    `将此文本总结为 ${format}:\n\n${text}`
})
```
::

::landing-dev-tools
---
darkImage: /mcp-devtools-dark.png
imageAlt: Nuxt MCP 开发工具
lightImage: /mcp-devtools-light.png
---
#title
内置检查器

#description
实时调试您的 MCP 服务器。查看已注册的工具、资源和提示词，并监控客户端连接和请求日志。
::

::landing-cta
---
links:
  - label: 开始使用
    to: /getting-started/installation
    icon: i-lucide-arrow-right
    trailing: true
    color: neutral
    size: xl
  - label: 在 GitHub 上 Star
    to: https://github.com/nuxt-modules/mcp-toolkit
    icon: i-lucide-github
    trailing: true
    color: neutral
    variant: ghost
    size: xl
---
#title
准备好构建您的第一个 MCP 服务器了吗？

#description
通过我们全面的指南和示例，在几分钟内快速上手。
::
