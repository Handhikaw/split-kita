import { env } from '$env/dynamic/public'

/**
 * Base URL backend API.
 *
 * Default: string kosong = URL relatif (same-origin). Saat `npm run dev`
 * request /api/* diteruskan Vite proxy ke backend (lihat vite.config.ts),
 * jadi browser tidak kena CORS.
 *
 * Isi PUBLIC_API_BASE_URL dengan URL absolut (mis. https://api.contoh.id)
 * kalau frontend di-deploy terpisah dari backend tanpa reverse proxy.
 */
export const API_BASE_URL = env.PUBLIC_API_BASE_URL ?? ''

export const API_DISPLAY_TARGET = API_BASE_URL || 'proxy dev-server → backend lokal'
