/**
 * h3 v1 / v2 compatibility helpers.
 *
 * pnpm may resolve the module's `h3` peer dependency to v2 while
 * Nitro still bundles h3 v1 internally. This creates a version
 * mismatch: event objects are created by h3 v1 but the module's
 * code may be bundled against h3 v2. Key differences:
 *
 * - h3 v2 does NOT export `toWebRequest` (event.req IS a Request)
 * - h3 v1 `event.req.headers` is a plain object (no `.get()`)
 * - h3 v2 `event.req.headers` is a `Headers` instance
 *
 * All helpers below work transparently with both versions.
 */
import type { H3Event } from 'h3'
import {
  getMethod,
  getRequestHeaders,
  getRequestURL,
  getRequestWebStream,
} from 'h3'

export function getHeader(event: H3Event, name: string): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const headers = (event as any).req?.headers
  if (typeof headers?.get === 'function') {
    return (headers as Headers).get(name) ?? undefined
  }
  const key = name.toLowerCase()
  const val = (headers as Record<string, string | string[] | undefined>)?.[key]
  return Array.isArray(val) ? val[0] : val
}

/**
 * Convert an H3Event to a Web `Request`.
 *
 * Fast paths for both h3 versions, then a manual construction
 * fallback using h3 helpers that exist in both v1 and v2.
 */
export function toWebRequest(event: H3Event): Request {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = event as any

  if (e.req instanceof Request) return e.req
  if (e.web?.request instanceof Request) return e.web.request
  // srvx Request may not pass instanceof across realms
  if (e.req && typeof e.req.clone === 'function') return e.req as Request

  // Construct manually — getRequestURL / getMethod / getRequestHeaders /
  // getRequestWebStream all exist in both h3 v1 (>=1.15) and v2.
  const url = getRequestURL(event)
  const method = getMethod(event)
  const rawHeaders = getRequestHeaders(event)
  const headers = new Headers()
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (value !== undefined) headers.set(key, String(value))
  }
  const hasBody = method !== 'GET' && method !== 'HEAD'
  const body = hasBody ? (getRequestWebStream(event) ?? null) : null
  return new Request(url.href, {
    method,
    headers,
    body,
    ...(body ? { duplex: 'half' } : {}),
  } as RequestInit)
}
