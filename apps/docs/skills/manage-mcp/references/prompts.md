# 提示示例

`defineMcpPrompt` 暴露可复用的消息模板，LLM（或用户）可以调用它们。它们会从 `server/mcp/prompts/` 自动发现。

处理器可以返回完整的 `GetPromptResult`，也可以返回一个**普通字符串**——字符串会被包装成一条用户消息（使用 `role: 'assistant'` 可将其包装为助手消息）。

## 简单字符串提示

```typescript [server/mcp/prompts/code-review.ts]
export default defineMcpPrompt({
  description: '代码审查助手 — 简洁、可执行的反馈',
  handler: async () => '你是一名资深审查员。请简洁且给出可执行的建议。',
})
```

## 带参数的提示

```typescript [server/mcp/prompts/review.ts]
import { z } from 'zod'

export default defineMcpPrompt({
  description: '生成一份聚焦的代码审查',
  inputSchema: {
    language: z.string().describe('编程语言'),
    focus: z.array(z.enum(['performance', 'security', 'maintainability', 'tests']))
      .describe('需要关注的领域'),
  },
  handler: async ({ language, focus }) =>
    `审查我的 ${language} 代码。关注以下方面：${focus.join(', ')}。请提供带有示例的具体建议。`,
})
```

## 使用 `completable()` 的参数自动补全

`completable` 会用一个动态建议源包装 Zod 字段。支持 `prompts/complete` 的客户端（Cursor、Claude Desktop）会在输入界面中显示这些建议：

```typescript [server/mcp/prompts/open-issue.ts]
import { z } from 'zod'

export default defineMcpPrompt({
  description: '为项目创建一个 issue',
  inputSchema: {
    project: completable(z.string(), async (value) => {
      const projects = await listProjects()
      return projects
        .filter(p => p.toLowerCase().startsWith(value.toLowerCase()))
        .slice(0, 5)
    }).describe('项目名称'),
    severity: z.enum(['low', 'medium', 'high', 'critical']).describe('严重程度'),
  },
  handler: async ({ project, severity }) =>
    `为项目 "${project}" 创建一个 ${severity} 级别的 issue。请包含复现步骤和验收标准。`,
})
```

## 文档生成器

```typescript [server/mcp/prompts/api-docs.ts]
import { z } from 'zod'

export default defineMcpPrompt({
  description: '生成 API 文档',
  inputSchema: {
    apiType: z.enum(['REST', 'GraphQL', 'gRPC']).describe('API 类型'),
    includeExamples: z.boolean().default(true).describe('包含代码示例'),
  },
  handler: async ({ apiType, includeExamples }) => `为这个 ${apiType} API 生成文档。
${includeExamples ? '包含实用的代码示例。' : ''}

格式：
- 概览
- 端点 / 操作
- 请求 / 响应模式
- 错误处理
${includeExamples ? '- 使用示例' : ''}`,
})
```

## 多消息提示（完整 `GetPromptResult`）

当你需要不止一条消息时——例如，一个结构化的 user → assistant 脚手架——请返回完整结构：

```typescript [server/mcp/prompts/debug.ts]
import { z } from 'zod'

export default defineMcpPrompt({
  description: '结构化调试会话',
  inputSchema: {
    issue: z.string().describe('问题描述'),
    environment: z.enum(['development', 'staging', 'production']).describe('环境'),
  },
  handler: async ({ issue, environment }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `我正在调试 ${environment} 中的一个问题：\n\n${issue}\n\n请帮助我识别根本原因，建议调试步骤，并推荐修复方案。${
            environment === 'production' ? ' 优先考虑快速见效的方案以尽量减少停机时间。' : ''
          }`,
        },
      },
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: '我将系统地分析这个问题。让我先把这些症状映射到可能的原因：',
        },
      },
    ],
  }),
})
```

::callout{icon="i-lucide-info" color="info"}
MCP 规范只允许 `'user'` 和 `'assistant'` 角色。请将系统指令放在用户消息文本中。
::

## 字符串返回的默认角色

```typescript [server/mcp/prompts/persona.ts]
export default defineMcpPrompt({
  description: '助手角色',
  role: 'assistant', // 字符串返回会被包装为助手消息
  handler: async () => '我是一个资深后端工程师。来问我关于分布式系统的问题吧。',
})
```

## 条件可见性（`enabled`）

```typescript [server/mcp/prompts/admin-help.ts]
export default defineMcpPrompt({
  description: '管理员操作手册',
  enabled: event => Boolean(event.context.user?.isAdmin),
  handler: async () => '你正在查看管理员操作手册。请精确并引用准确的 CLI 命令。',
})
```

## 分组与标签

会从子文件夹自动推断——`server/mcp/prompts/onboarding/welcome.ts` → `group: 'onboarding'`。也可以显式覆盖：

```typescript
export default defineMcpPrompt({
  group: 'onboarding',
  tags: ['public', 'first-run'],
  description: '欢迎消息',
  handler: async () => '欢迎！以下是你可以做的事情…',
})
```

## 另请参阅

- [提示文档](https://mcp-toolkit.nuxt.dev/prompts/overview)
- [编写与结构](https://mcp-toolkit.nuxt.dev/prompts/authoring)
- [输入、处理器与消息](https://mcp-toolkit.nuxt.dev/prompts/input-handler-messages)
- [模式与高级用法](https://mcp-toolkit.nuxt.dev/prompts/patterns-advanced)
