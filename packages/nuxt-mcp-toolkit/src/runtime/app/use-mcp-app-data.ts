import { getCurrentScope, onScopeDispose, ref, type Ref } from 'vue'
import { useHostBridge, type HostCapabilities, type HostContext } from './host-bridge'

export interface UseMcpAppDataReturn<T> {
  /** First payload the view receives — never updated after. */
  initialData: Ref<T | null>
  /** Latest payload, refreshed via host `tool-result` pushes. */
  data: Ref<T | null>
  /** One-way latch: `true` until the first payload arrives or the tool call fails, `false` forever after. */
  loading: Ref<boolean>
  /** Last error from the host, the transport, or a malformed payload. */
  error: Ref<Error | null>
  /** Negotiated host context. `null` until the handshake completes, then kept current by `host-context-changed`. */
  hostContext: Ref<HostContext | null>
  /** Capabilities the host announced in the handshake. `null` until it completes. */
  hostCapabilities: Ref<HostCapabilities | null>
}

/**
 * Reactive bridge to the host's structured payload. Internal building block
 * behind {@link useMcpApp}; exported for tests only.
 * @internal
 */
export function useMcpAppData<T = unknown>(): UseMcpAppDataReturn<T> {
  const bridge = useHostBridge()

  const initialData = ref<T | null>(null) as Ref<T | null>
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(true)

  const setData = (next: unknown): void => {
    if (next === null || next === undefined) return
    if (initialData.value === null) initialData.value = next as T
    data.value = next as T
    loading.value = false
  }

  if (bridge.initialData !== undefined) setData(bridge.initialData)

  const unsubscribe = bridge.onToolResult((outcome) => {
    if ('data' in outcome) setData(outcome.data)
    else loading.value = false
  })
  if (getCurrentScope()) onScopeDispose(unsubscribe)

  return {
    initialData,
    data,
    loading,
    error: bridge.error,
    hostContext: bridge.hostContext,
    hostCapabilities: bridge.hostCapabilities,
  }
}
