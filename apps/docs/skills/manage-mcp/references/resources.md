# 资源示例

`defineMcpResource` 暴露可通过 URI 访问的只读数据。工具包会自动发现 `server/mcp/resources/` 下的任何文件。有两种形式：

- **文件简写** — 设置 `file: '…'`，工具包会自动生成 URI、MIME 类型和处理器。
- **标准 / 模板** — 设置 `uri`（字符串或 `ResourceTemplate`）以及 `handler`。

## 文件简写（零处理器）

```typescript [server/mcp/resources/readme.ts]
export default defineMcpResource({
  description: '项目 README 文件',
  file: 'README.md', // URI 自动生成，如 file:///…/README.md
})
```

MIME 类型会根据扩展名推断（`.md` → `text/markdown`，`.json` → `application/json`，等等）。如有需要，可通过 `metadata.mimeType` 覆盖。

## 静态资源（自定义 URI + 处理器）

```typescript [server/mcp/resources/config.ts]
export default defineMcpResource({
  description: '应用配置',
  uri: 'config:///app',
  metadata: { mimeType: 'application/json' },
  handler: async (uri) => ({
    contents: [{
      uri: uri.toString(),
      mimeType: 'application/json',
      text: JSON.stringify({
        environment: process.env.NODE_ENV,
        apiUrl: process.env.API_URL,
        features: { darkMode: true, analytics: false },
      }, null, 2),
    }],
  }),
})
```

## 数据库资源（带缓存）

```typescript [server/mcp/resources/users.ts]
import { useDrizzle } from '~/server/utils/drizzle'
import { users as usersTable } from '~/server/db/schema'

export default defineMcpResource({
  description: '最近用户列表',
  uri: 'db:///users',
  metadata: { mimeType: 'application/json' },
  cache: '1m',
  handler: async (uri) => {
    const users = await useDrizzle().select().from(usersTable).limit(100)
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(users, null, 2),
      }],
    }
  },
})
```

## 模板资源（URI 变量）

对于带占位符的 URI 模式，请从 SDK 传入 `ResourceTemplate`：

```typescript [server/mcp/resources/user.ts]
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'

export default defineMcpResource({
  description: '按 ID 获取用户',
  uri: new ResourceTemplate('user:///{id}', { list: undefined }),
  metadata: { mimeType: 'application/json' },
  handler: async (uri, { id }) => {
    const user = await getUser(String(id))
    if (!user) {
      throw createError({ statusCode: 404, message: `User ${id} not found` })
    }
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(user, null, 2),
      }],
    }
  },
})
```

第二个处理器参数是解析后的 URI 变量（`{ id }`）。对于集合，在模板上设置 `list: () => ({ resources: [...] })` 以声明可枚举项。

## 带注解的资源

`metadata.annotations` 允许客户端优先显示并筛选内容：

```typescript
export default defineMcpResource({
  description: '项目 README',
  file: 'README.md',
  metadata: {
    mimeType: 'text/markdown',
    annotations: {
      audience: ['user', 'assistant'], // 谁应该看到它
      priority: 0.8,                    // 0-1，帮助客户端选择
      lastModified: new Date().toISOString(),
    },
  },
})
```

`metadata` 下的其他内容会在列表响应中作为 `_meta` 转发——便于自定义 UI 字段。

## 条件可见性（`enabled`）

按请求隐藏资源——在中间件之后运行，因此 `event.context` 可用：

```typescript [server/mcp/resources/private-keys.ts]
export default defineMcpResource({
  description: '当前用户的私有 API 密钥',
  uri: 'config:///keys',
  enabled: event => Boolean(event.context.user?.isAdmin),
  metadata: { mimeType: 'application/json' },
  handler: async (uri) => {
    const event = useEvent()
    const keys = await listKeys(event.context.user.id)
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'application/json',
        text: JSON.stringify(keys),
      }],
    }
  },
})
```

## 分组与标签

会从子文件夹自动推断——`server/mcp/resources/admin/keys.ts` → `group: 'admin'`。也可以显式覆盖：

```typescript
export default defineMcpResource({
  group: 'admin',
  tags: ['secret'],
  description: '敏感资源',
  // ...
})
```

`listMcpResources({ group: 'admin' })` 和 `getMcpResources({ tags: ['secret'] })` 会据此过滤。

## 二进制内容

对于二进制载荷，返回 `blob`（base64）而不是 `text`：

```typescript [server/mcp/resources/logo.ts]
import { readFile } from 'node:fs/promises'

export default defineMcpResource({
  description: '项目徽标',
  uri: 'asset:///logo',
  metadata: { mimeType: 'image/png' },
  handler: async (uri) => {
    const buffer = await readFile('public/logo.png')
    return {
      contents: [{
        uri: uri.toString(),
        mimeType: 'image/png',
        blob: buffer.toString('base64'),
      }],
    }
  },
})
```

## 另请参见

- [资源文档](https://mcp-toolkit.nuxt.dev/resources/overview)
- [静态资源与结构](https://mcp-toolkit.nuxt.dev/resources/static-and-structure)
- [模板与处理器](https://mcp-toolkit.nuxt.dev/resources/templates-and-handlers)
- [元数据、内容与错误](https://mcp-toolkit.nuxt.dev/resources/content-metadata-errors)
