import { z } from 'zod'
import { sessionNotes } from '../../utils/session-notes'

export default defineMcpTool({
  name: 'add_note',
  title: 'Add Note',
  description: 'Add a note to the current session notepad. Notes persist across tool calls within the same MCP session.',
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
  },
  inputSchema: {
    note: z.string().describe('The note content to add'),
  },
  handler: async ({ note }) => {
    const sessionId = getHeader(useEvent(), 'mcp-session-id')
    if (!sessionId) {
      return errorResult('No active session. Enable sessions in your MCP config.')
    }

    const notes = sessionNotes.get(sessionId) ?? []
    notes.push({ text: note, createdAt: new Date().toISOString() })
    sessionNotes.set(sessionId, notes)

    return textResult(`Note added (${notes.length} total in this session).`)
  },
})
