import { defineMcpTool } from '../../../../../../src/runtime/server/types'
import { z } from 'zod'
import { sessionStore } from '../../utils/session-store'

export default defineMcpTool({
  name: 'store_value',
  description: 'Stores a key-value pair in the session-scoped store',
  inputSchema: {
    key: z.string(),
    value: z.string(),
  },
  handler: async ({ key, value }) => {
    sessionStore.set(key, value)
    return {
      content: [{ type: 'text', text: `Stored: ${key}=${value}` }],
    }
  },
})
