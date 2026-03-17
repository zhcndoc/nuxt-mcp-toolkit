import { defineMcpTool } from '../../../../../../src/runtime/server/types'
import { z } from 'zod'
import { sessionStore } from '../../utils/session-store'

export default defineMcpTool({
  name: 'get_value',
  description: 'Retrieves a value by key from the session-scoped store',
  inputSchema: {
    key: z.string(),
  },
  handler: async ({ key }) => {
    const value = sessionStore.get(key)
    return {
      content: [{ type: 'text', text: value ?? 'NOT_FOUND' }],
    }
  },
})
