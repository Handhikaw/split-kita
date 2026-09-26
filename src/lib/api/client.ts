import { API_BASE_URL, API_DISPLAY_TARGET } from '$lib/api/config'
import { clearAuth, ensureAuth } from '$lib/identity'

/**
 * Wrapper fetch untuk backend SplitKita.
 *
 * Konvensi backend:
 * - Envelope response: { code, message, data } -> fungsi ini me-return `data`.
 * - Auth koleksi: header `X-API-Key: <access_token>` (didapat dari auth anonymous).
 * - Mutasi terotorisasi: header `X-Participant-ID: <claimed participant id>`.
 */

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface Envelope<T> {
  code: string
  message: string
  data: T
}

interface FetchOptions {
  method?: string
  body?: unknown
  /** Lampirkan X-API-Key (pastikan ada via auth anonymous). */
  auth?: boolean
  /** Id peserta hasil claim untuk bill ini (header X-Participant-ID). */
  participantId?: number
}

async function doFetch<T>(path: string, opts: FetchOptions): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (opts.auth) {
    const token = await ensureAuth()
    if (token) headers['X-API-Key'] = token
  }
  if (opts.participantId != null) headers['X-Participant-ID'] = String(opts.participantId)

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  })

  if (!res.ok) {
    throw new ApiError(res.status, `Request gagal (${res.status})`)
  }

  // Beberapa endpoint (join, delete) me-return body kosong.
  const text = await res.text()
  if (!text) return undefined as T

  const json = JSON.parse(text) as Envelope<T> | T
  // Toleran: kalau bukan envelope {data}, pakai body apa adanya.
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return (json as Envelope<T>).data
  }
  return json as T
}

/**
 * Sekali retry setelah re-auth kalau server menolak token (401).
 * Error jaringan (fetch throw) dibiarkan naik ke pemanggil.
 */
export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  try {
    return await doFetch<T>(path, opts)
  } catch (e) {
    if (opts.auth && e instanceof ApiError && e.status === 401) {
      clearAuth()
      const token = await ensureAuth(true)
      if (token) return doFetch<T>(path, opts)
    }
    throw e
  }
}

export function toUserMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status >= 500) return 'Server error. Coba lagi nanti.'
    return e.message
  }
  if (e instanceof TypeError) {
    // fetch gagal total: backend mati, atau proxy tidak nyambung.
    return 'Tidak bisa menghubungi server (' + API_DISPLAY_TARGET + '). Pastikan backend jalan.'
  }
  return 'Terjadi kesalahan. Coba lagi.'
}
