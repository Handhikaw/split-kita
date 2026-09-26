import { API_BASE_URL } from '$lib/api/config'

/**
 * Identitas anonymous per-device + klaim peserta per-bill.
 *
 * Model sharing app ini (tanpa akun):
 * - Tiap device punya UUID anonymous (`sk-anon-id`), didaftarkan sekali via
 *   POST /api/auth/anonymous -> { access_token, user_id }.
 * - Tiap bill yang dibuka bisa "diklaim" sebagai salah satu peserta
 *   (`sk-claim-<public_id>` = participant_id). Id ini dikirim sebagai
 *   header X-Participant-ID di endpoint mutasi.
 *
 * File .ts biasa (bukan .svelte.ts) karena tidak butuh reactivity —
 * cukup localStorage + fungsi murni.
 */

const ANON_KEY = 'sk-anon-id'
const TOKEN_KEY = 'sk-access-token'
const UID_KEY = 'sk-user-id'

const claimKey = (publicId: string) => `sk-claim-${publicId}`

function storage(): Storage | null {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null
  try {
    return localStorage
  } catch {
    return null
  }
}

export function getAnonymousId(): string {
  const store = storage()
  if (!store) return ''
  let id = store.getItem(ANON_KEY)
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `anon-${Date.now()}`
    store.setItem(ANON_KEY, id)
  }
  return id
}

export function getAccessToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null
}

export function getUserId(): number | null {
  const raw = storage()?.getItem(UID_KEY)
  const n = raw == null ? NaN : parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

export function clearAuth(): void {
  storage()?.removeItem(TOKEN_KEY)
  storage()?.removeItem(UID_KEY)
}

interface AnonData {
  access_token: string
  user_id: number
  role: string
}

/**
 * Pastikan ada access token. Return token, atau null kalau backend
 * tidak bisa dihubungi (offline / CORS / 5xx). Tidak pernah throw —
 * pemanggil yang memutuskan (GET public boleh tanpa token).
 */
export async function ensureAuth(retry = false): Promise<string | null> {
  const store = storage()
  if (!store) return null

  if (!retry) {
    const existing = store.getItem(TOKEN_KEY)
    if (existing) return existing
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/anonymous`, {
      method: 'POST',
      headers: { 'X-Anonymous-Id': getAnonymousId() }
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: AnonData } & Partial<AnonData>
    const data: Partial<AnonData> = json.data ?? json
    if (!data.access_token) return null
    store.setItem(TOKEN_KEY, data.access_token)
    if (data.user_id != null) store.setItem(UID_KEY, String(data.user_id))
    return data.access_token
  } catch {
    return null
  }
}

// ── Klaim peserta per-bill ──────────────────────────────────

export function getClaimedParticipant(publicId: string): number | null {
  const raw = storage()?.getItem(claimKey(publicId))
  const n = raw == null ? NaN : parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

export function setClaimedParticipant(publicId: string, participantId: number): void {
  storage()?.setItem(claimKey(publicId), String(participantId))
}

export function clearClaim(publicId: string): void {
  storage()?.removeItem(claimKey(publicId))
}
