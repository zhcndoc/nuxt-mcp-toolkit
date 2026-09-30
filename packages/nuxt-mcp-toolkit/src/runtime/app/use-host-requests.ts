import type { ContentBlock, EmbeddedResource, ResourceLink } from '@modelcontextprotocol/sdk/types.js'
import { createRequestError, hasHostWindow, useHostBridge, type DisplayMode, type HostCapabilities } from './host-bridge'

const DISPLAY_MODE_TIMEOUT_MS = 10_000
// The host asks the user to confirm a download before it answers.
const DOWNLOAD_TIMEOUT_MS = 120_000
const METHOD_NOT_FOUND = -32601
const INVALID_PARAMS = -32602
// The host fetches linked files, so an iframe must not hand it `file:` or `javascript:`.
const ALLOWED_LINK_SCHEMES = new Set(['http:', 'https:'])

function assertFetchableLinks(contents: DownloadFileContent[]): void {
  for (const item of contents) {
    if (item.type !== 'resource_link') continue
    const protocol = URL.canParse(item.uri) ? new URL(item.uri).protocol : undefined
    if (!protocol || !ALLOWED_LINK_SCHEMES.has(protocol)) {
      throw createRequestError(`useMcpApp: cannot download ${JSON.stringify(item.uri)}, linked files must use http or https.`, { code: INVALID_PARAMS })
    }
  }
}

/** A file for `downloadFile` — the host derives the suggested filename from the last URI segment. */
export type DownloadFileContent = EmbeddedResource | ResourceLink

export interface UseHostRequestsReturn {
  /**
   * Ask the host for a display mode and resolve with the mode it set — or with the
   * current mode, without asking, when the host does not offer the requested one.
   */
  requestDisplayMode: (mode: DisplayMode) => Promise<DisplayMode>
  /** Replace the context this view contributes to the model's next turn. */
  updateModelContext: (params: { content?: ContentBlock[], structuredContent?: Record<string, unknown> }) => Promise<void>
  downloadFile: (contents: DownloadFileContent[]) => Promise<void>
}

/**
 * View → host requests beyond messages, links and tool calls. Internal building
 * block behind {@link useMcpApp}.
 * @internal
 */
export function useHostRequests(): UseHostRequestsReturn {
  const bridge = useHostBridge()

  const ensureReady = async (method: string, capability?: keyof HostCapabilities): Promise<void> => {
    await bridge.whenReady()
    if (!hasHostWindow()) {
      throw createRequestError(`useMcpApp: cannot send "${method}", there is no host window.`)
    }
    if (!bridge.initialized.value) {
      throw createRequestError(`useMcpApp: cannot send "${method}", the ui/initialize handshake did not complete.`)
    }
    if (capability && !bridge.hostCapabilities.value?.[capability]) {
      throw createRequestError(`useMcpApp: the host does not support "${method}".`, { code: METHOD_NOT_FOUND })
    }
  }

  const requestDisplayMode = async (mode: DisplayMode): Promise<DisplayMode> => {
    if (!bridge.openai?.requestDisplayMode) await ensureReady('ui/request-display-mode')
    const context = bridge.hostContext.value
    const currentMode = context?.displayMode ?? 'inline'
    if (context?.availableDisplayModes && !context.availableDisplayModes.includes(mode)) return currentMode

    const result = bridge.openai?.requestDisplayMode
      ? await bridge.openai.requestDisplayMode({ mode })
      : await bridge.request<{ mode?: DisplayMode } | null>('ui/request-display-mode', { mode }, DISPLAY_MODE_TIMEOUT_MS)
    const grantedMode = result?.mode ?? currentMode
    bridge.hostContext.value = { ...bridge.hostContext.value, displayMode: grantedMode }
    return grantedMode
  }

  const updateModelContext: UseHostRequestsReturn['updateModelContext'] = async (params) => {
    await ensureReady('ui/update-model-context', 'updateModelContext')
    // Claude has rejected params without `content`.
    await bridge.request('ui/update-model-context', { ...params, content: params.content ?? [] })
  }

  const downloadFile = async (contents: DownloadFileContent[]): Promise<void> => {
    assertFetchableLinks(contents)
    await ensureReady('ui/download-file', 'downloadFile')
    const result = await bridge.request<{ isError?: boolean } | null>('ui/download-file', { contents }, DOWNLOAD_TIMEOUT_MS)
    if (result?.isError) {
      throw createRequestError('useMcpApp: the download was cancelled or denied.', { cancelled: true })
    }
  }

  return { requestDisplayMode, updateModelContext, downloadFile }
}
