/**
 * Global Svelte 5 runes-based stores
 * Usage: import { theme, toast } from '$lib/stores.svelte'
 */

// ─── Theme ───────────────────────────────────────────────
export const theme = (() => {
  let dark = $state(true)

  function toggle() {
    dark = !dark
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', dark)
      document.documentElement.classList.toggle('light', !dark)
    }
  }

  function init() {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem('sk-theme')
    dark = stored ? stored === 'dark' : true
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.classList.toggle('light', !dark)
  }

  return {
    get isDark() { return dark },
    toggle,
    init,
  }
})()

// ─── Toast ───────────────────────────────────────────────
export const toastStore = (() => {
  let message = $state('')
  let visible = $state(false)
  let timer: ReturnType<typeof setTimeout>

  function show(msg: string, duration = 2600) {
    message = msg
    visible = true
    clearTimeout(timer)
    timer = setTimeout(() => { visible = false }, duration)
  }

  return {
    get message() { return message },
    get visible() { return visible },
    show,
  }
})()

// ─── Gradient presets ────────────────────────────────────
export const GRADIENTS = [
  'linear-gradient(135deg,#7c6aff,#ff6a8e)',
  'linear-gradient(135deg,#6affd4,#4ade80)',
  'linear-gradient(135deg,#fbbf24,#f87171)',
  'linear-gradient(135deg,#38bdf8,#6366f1)',
  'linear-gradient(135deg,#fb7185,#c084fc)',
  'linear-gradient(135deg,#34d399,#0ea5e9)',
  'linear-gradient(135deg,#a78bfa,#60a5fa)',
  'linear-gradient(135deg,#f97316,#eab308)',
] as const

// ─── Utils ───────────────────────────────────────────────
import { formatMoney } from '$lib/money'

/**
 * @deprecated Pakai formatMoney(n, currency) dari $lib/money.
 * Dipertahankan agar halaman split (Fase 3) tidak pecah.
 */
export function formatRp(n: number): string {
  return formatMoney(n, 'IDR')
}

export function initials(name: string): string {
  return name.trim() ? name.trim()[0].toUpperCase() : '?'
}
