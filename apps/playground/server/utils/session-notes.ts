interface Note {
  text: string
  createdAt: string
}

export const sessionNotes = new Map<string, Note[]>()
