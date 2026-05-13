# 工具示例

适用于 `defineMcpTool` 的现代、可直接复制粘贴的示例。所有示例都使用**直接返回**（工具包会自动将字符串、数字、布尔值、对象和数组包装成正确的 MCP 结构）以及在失败时使用 **`throw createError({ statusCode, message })`**。

## BMI 计算器（类型化结构化输出）

```typescript [server/mcp/tools/bmi-calculator.ts]
import { z } from 'zod'

export default defineMcpTool({
  description: '计算身体质量指数',
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: {
    height: z.number().positive().describe('身高，单位为米'),
    weight: z.number().positive().describe('体重，单位为千克'),
  },
  inputExamples: [{ height: 1.75, weight: 70 }],
  outputSchema: {
    bmi: z.number(),
    category: z.string(),
    healthy: z.boolean(),
  },
  handler: async ({ height, weight }) => {
    const bmi = +(weight / (height * height)).toFixed(2)
    const category = bmi < 18.5 ? '体重过轻' : bmi < 25 ? '正常' : bmi < 30 ? '超重' : '肥胖'
    return {
      structuredContent: { bmi, category, healthy: bmi >= 18.5 && bmi < 25 },
    }
  },
})
```

当只设置了 `structuredContent` 时，工具包会自动生成一个文本回退内容（`JSON.stringify(structuredContent)`），因此旧版客户端仍然能看到可读内容。

## 外部 API（第三方获取 + 缓存）

```typescript [server/mcp/tools/weather.ts]
import { z } from 'zod'

export default defineMcpTool({
  description: '获取某个城市的当前天气',
  annotations: { readOnlyHint: true, openWorldHint: true },
  cache: '10m',
  inputSchema: {
    city: z.string().min(1).describe('城市名称'),
    units: z.enum(['metric', 'imperial']).default('metric').describe('温度单位'),
  },
  handler: async ({ city, units }) => {
    const apiKey = process.env.WEATHER_API_KEY
    if (!apiKey) throw createError({ statusCode: 500, message: '缺少 WEATHER_API_KEY' })

    const data = await $fetch<{ temperature: number, description: string }>('https://api.weather.com/v1/current', {
      query: { city, units, apikey: apiKey },
    })

    return `Weather in ${city}: ${data.temperature}°${units === 'metric' ? 'C' : 'F'}, ${data.description}`
  },
})
```

`cache: '10m'` 会根据输入参数进行键控。可以传入完整的 Nitro 缓存选项对象来配置 `swr`、自定义 `getKey` 等。（[Nitro 缓存 →](https://nitro.build/guide/cache#options)）

这里 `swr` 默认是 `false`（Nitro 默认是 `true`）。当 `swr: true` 时，处理函数会在响应发送后刷新，因此请求作用域的日志/追踪可能会丢失——只有在你接受这一点时才启用。

## 数据库变更（数据库 + 软认证 + 可观测性）

```typescript [server/mcp/tools/create-todo.ts]
import { z } from 'zod'
import { useDrizzle } from '~/server/utils/drizzle'
import { todos } from '~/server/db/schema'

export default defineMcpTool({
  description: '为当前用户创建一个新的待办事项',
  annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
  enabled: event => Boolean(event.context.user), // 未认证时隐藏
  inputSchema: {
    title: z.string().min(1).describe('待办事项标题'),
    completed: z.boolean().default(false).describe('完成状态'),
  },
  inputExamples: [
    { title: '买杂货' },
    { title: '部署 v2', completed: false },
  ],
  handler: async ({ title, completed }) => {
    const event = useEvent()
    const log = useMcpLogger('todos')

    const [todo] = await useDrizzle()
      .insert(todos)
      .values({ title, completed, userId: event.context.user.id })
      .returning()

    log.event('todo_created', { todoId: todo.id })
    return todo // 普通对象 — 由工具包自动转为字符串
  },
})
```

## 文件操作（优雅错误处理）

```typescript [server/mcp/tools/read-file.ts]
import { z } from 'zod'
import { readFile, access } from 'node:fs/promises'

export default defineMcpTool({
  description: '读取项目文件的内容',
  annotations: { readOnlyHint: true, openWorldHint: false },
  inputSchema: {
    path: z.string().describe('相对于项目根目录的路径'),
  },
  handler: async ({ path }) => {
    try {
      await access(path)
    }
    catch {
      throw createError({ statusCode: 404, message: `未找到文件：${path}` })
    }
    return await readFile(path, 'utf-8')
  },
})
```

## 图片工具（`imageResult`）

```typescript [server/mcp/tools/screenshot.ts]
import { z } from 'zod'

export default defineMcpTool({
  description: '捕获某个 URL 的截图',
  annotations: { readOnlyHint: true, openWorldHint: true },
  inputSchema: { url: z.string().url().describe('要捕获的页面') },
  handler: async ({ url }) => {
    const buffer = await captureUrl(url) // 你的截图工具
    return imageResult(buffer.toString('base64'), 'image/png')
  },
})
```

## 音频工具（`audioResult`）

```typescript [server/mcp/tools/synthesize-speech.ts]
import { z } from 'zod'

export default defineMcpTool({
  description: '从文本合成语音',
  inputSchema: {
    text: z.string().min(1),
    voice: z.enum(['alloy', 'nova', 'shimmer']).default('alloy'),
  },
  handler: async ({ text, voice }) => {
    const audio = await synthesize({ text, voice })
    return audioResult(audio.toString('base64'), 'audio/mp3')
  },
})
```

## 交互式工具（引导式询问）

在请求进行到一半时向用户询问缺失的细节：

```typescript [server/mcp/tools/create-release.ts]
import { z } from 'zod'

export default defineMcpTool({
  description: '在询问频道后创建发布版本',
  inputSchema: { name: z.string().describe('发布名称') },
  handler: async ({ name }) => {
    const elicit = useMcpElicitation()
    if (!elicit.supports('form')) {
      return `请使用支持引导式询问的客户端，然后重新运行 "${name}".`
    }

    const result = await elicit.form({
      message: `为 "${name}" 选择一个发布频道`,
      schema: {
        channel: z.enum(['stable', 'beta', 'canary']).describe('发布频道'),
        notify: z.boolean().default(true).describe('通知订阅者'),
      },
    })

    if (result.action !== 'accept') return `Release cancelled (${result.action}).`
    return `Created "${name}" on ${result.content.channel} (notify=${result.content.notify}).`
  },
})
```

需要 `nitro.experimental.asyncContext: true`。

## 可观测性（`useMcpLogger`）

向客户端流式发送 `notifications/message`，并为该请求捕获一个结构化的宽事件：

```typescript [server/mcp/tools/charge-card.ts]
import { z } from 'zod'

export default defineMcpTool({
  description: '扣款',
  annotations: { destructiveHint: true, idempotentHint: false },
  inputSchema: {
    userId: z.string(),
    amount: z.number().int().positive(),
  },
  handler: async ({ userId, amount }) => {
    const log = useMcpLogger('billing')

    log.set({ billing: { amount } })
    await log.notify.info({ msg: '开始扣款', amount })

    try {
      const receipt = await chargeCard(userId, amount)
      log.event('charge_completed', { receiptId: receipt.id })
      await log.notify.info({ msg: '扣款成功', receiptId: receipt.id })
      return `已扣款 ${amount}。收据：${receipt.id}`
    }
    catch (err) {
      log.evlog.error('扣款失败', err as Error)
      await log.notify.error({ msg: '扣款失败', error: String(err) })
      throw err // 重新抛出 → 返回为 `isError`
    }
  },
})
```

宽事件会自动添加标签 `mcp.tool: 'charge-card'`、`mcp.session_id`、`mcp.request_id`、`service: '<env.service>/mcp'`，以及（当中间件设置了这些值时）`user.id` / `session.id`。

## 带会话状态的工具

```typescript [server/mcp/tools/remember.ts]
import { z } from 'zod'

export default defineMcpTool({
  description: '为本次会话记住一个事实',
  inputSchema: {
    key: z.string().describe('事实键'),
    value: z.string().describe('事实值'),
  },
  handler: async ({ key, value }) => {
    const session = useMcpSession<{ facts: Record<string, string> }>()
    const facts = (await session.get('facts')) ?? {}
    facts[key] = value
    await session.set('facts', facts)
    return `已记住 ${Object.keys(facts).length} 条事实。`
  },
})
```

需要在 `nuxt.config.ts` 中启用 `mcp.sessions: true`。

## 另请参阅

- [工具文档](https://mcp-toolkit.nuxt.dev/tools/overview)
- [Schema、handler 与返回值](https://mcp-toolkit.nuxt.dev/tools/schema-handler)
- [注解与输入示例](https://mcp-toolkit.nuxt.dev/tools/annotations)
- [错误与响应缓存](https://mcp-toolkit.nuxt.dev/tools/errors-caching)
- [分组、文件与动态注册](https://mcp-toolkit.nuxt.dev/tools/groups-organization)
