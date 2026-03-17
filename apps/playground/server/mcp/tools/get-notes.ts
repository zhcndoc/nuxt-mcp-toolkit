import { sessionNotes } from '../../utils/session-notes'

export default defineMcpTool({
  name: 'get_notes',
  title: 'Get Notes',
  description: 'Retrieve all notes stored in the current session notepad.',
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
  },
  handler: async () => {
    const sessionId = getHeader(useEvent(), 'mcp-session-id')
    if (!sessionId) {
      return errorResult('No active session. Enable sessions in your MCP config.')
    }

    const notes = sessionNotes.get(sessionId) ?? []

    if (notes.length === 0) {
      return textResult('No notes in this session yet. Use the add_note tool to create one.')
    }

    return jsonResult(notes)
  },
})
