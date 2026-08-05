---
"nitro-mcp-toolkit": minor
---

工具、资源和提示处理器现在直接接收请求的 `H3Event`，而不是单独的上下文对象，所有 MCP 特定内容都附加在 `event.context.mcp` 上——与 h3-mcp 以事件为首的结构保持一致。这是一项破坏性变更：`context.mcp.raw` 移至 `context.mcp.mcpReq`，任何读取旧上下文对象的代码都需要改为从 `event.context.mcp` 中读取。

此外，`createMcpHandler` 现在支持声明式 `auth` 门控（Bearer/API-key 令牌、自定义 `validate` 回调、OAuth 受保护资源元数据），并将其可 JSON 序列化的子集——静态令牌列表——作为 `mcp()` 的 `auth` 选项。
