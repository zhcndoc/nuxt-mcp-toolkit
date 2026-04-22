# 工具示例

用于创建 MCP 工具的详细示例。

## BMI 计算器

```typescript
import { z } from 'zod'

export default defineMcpTool({
  description: '计算身体质量指数',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    height: z.number().describe('身高（米）'),
    weight: z.number().describe('体重（千克）'),
  },
  inputExamples: [
    { height: 1.75, weight: 70 },
  ],
  outputSchema: {
    bmi: z.number(),
    category: z.string(),
    healthy: z.boolean(),
  },
  handler: async ({ height, weight }) => {
    const bmi = weight / (height * height)
    const category = bmi < 18.5 ? 'underweight'
      : bmi < 25 ? 'normal'
      : bmi < 30 ? 'overweight'
      : 'obese'

    return {
      content: [{
        type: 'text',
        text: `BMI: ${bmi.toFixed(2)} (${category})`,
      }],
      structuredContent: {
        bmi: parseFloat(bmi.toFixed(2)),
        category,
        healthy: bmi >= 18.5 && bmi < 25,
      },
    }
  },
})
```

## 天气 API 集成

```typescript
import { z } from 'zod'

export default defineMcpTool({
  description: '获取某个城市的天气数据',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: true,
  },
  inputSchema: {
    city: z.string().describe('城市名称'),
    units: z.enum(['metric', 'imperial']).default('metric').describe('温度单位'),
  },
  cache: '10m',
  handler: async ({ city, units }) => {
    const apiKey = process.env.WEATHER_API_KEY
    const response = await $fetch('https://api.weather.com/v1/current', {
      query: { city, units, apikey: apiKey },
    })

    return {
      content: [{
        type: 'text',
        text: `Weather in ${city}: ${response.temperature}°${units === 'metric' ? 'C' : 'F'}, ${response.description}`,
      }],
    }
  },
})
```

## 数据库操作

```typescript
import { z } from 'zod'

export default defineMcpTool({
  description: '创建一个新的待办事项',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    title: z.string().describe('待办事项标题'),
    completed: z.boolean().default(false).describe('完成状态'),
  },
  inputExamples: [
    { title: 'Buy groceries' },
    { title: 'Deploy v2', completed: false },
  ],
  handler: async ({ title, completed }) => {
    const todo = await useDrizzle()
      .insert(todos)
      .values({ title, completed })
      .returning()

    return {
      content: [{
        type: 'text',
        text: `Created todo: ${todo[0].title}`,
      }],
    }
  },
})
```

## 交互式工具（引导式询问）

在请求处理中途向用户询问缺失的细节，并根据 Zod 形状验证响应。

```typescript
import { z } from 'zod'

export default defineMcpTool({
  description: '在询问频道后创建发布',
  inputSchema: {
    name: z.string().describe('发布名称'),
  },
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

    if (result.action !== 'accept') {
      return `发布已取消（${result.action}）。`
    }

    return `已在 ${result.content.channel} 上创建 "${name}"（notify=${result.content.notify}）。`
  },
})
```

## 可观测性（日志器）

将 `notifications/message` 流式传输给客户端，并为每个请求捕获一个结构化的宽事件。

```typescript
import { z } from 'zod'

export default defineMcpTool({
  description: '为支付方式扣款',
  inputSchema: {
    userId: z.string(),
    amount: z.number().int().positive(),
  },
  annotations: { destructiveHint: true, idempotentHint: false },
  handler: async ({ userId, amount }) => {
    const log = useMcpLogger('billing')

    log.set({ user: { id: userId }, billing: { amount } })
    await log.notify.info({ msg: '开始扣款', amount })

    try {
      const receipt = await chargeCard(userId, amount)
      log.event('charge_completed', { receiptId: receipt.id })
      await log.notify.info({ msg: '扣款成功', receiptId: receipt.id })
      return `已扣款 ${amount}。收据：${receipt.id}`
    }
    catch (err) {
      log.evlog.error('扣款失败', err)
      await log.notify.error({ msg: '扣款失败', error: String(err) })
      throw err
    }
  },
})
```

## 文件操作

```typescript
import { z } from 'zod'
import { readFile } from 'node:fs/promises'

export default defineMcpTool({
  description: '读取文件内容',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    openWorldHint: false,
  },
  inputSchema: {
    path: z.string().describe('相对于项目根目录的文件路径'),
  },
  handler: async ({ path }) => {
    try {
      const content = await readFile(path, 'utf-8')
      return {
        content: [{
          type: 'text',
          text: content,
        }],
      }
    }
    catch (error) {
      return {
        content: [{
          type: 'text',
          text: `读取文件时出错：${error.message}`,
        }],
        isError: true,
      }
    }
  },
})
```
