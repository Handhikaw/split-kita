/**
 * Uang di app ini: STRING di tepi, INTEGER di dalam.
 *
 * - Backend kirim/terima string integer minor-unit ("100000" IDR = Rp100.000,
 *   "1000" USD = $10.00). TIDAK PERNAH float untuk uang.
 * - Input user ("1.500.000" / "10.50") diparse ke minor int.
 * - Tampil selalu via formatMoney(minor, currency).
 */

interface CurrencyMeta {
  /** Jumlah digit minor (sen): IDR 0, USD 2. */
  decimals: number
  /** Locale untuk grouping + simbol. */
  locale: string
  symbol: string
}

const KNOWN: Record<string, CurrencyMeta> = {
  IDR: { decimals: 0, locale: 'id-ID', symbol: 'Rp' },
  USD: { decimals: 2, locale: 'en-US', symbol: '$' },
  SGD: { decimals: 2, locale: 'en-SG', symbol: 'S$' },
  MYR: { decimals: 2, locale: 'ms-MY', symbol: 'RM' },
  EUR: { decimals: 2, locale: 'de-DE', symbol: '€' },
  GBP: { decimals: 2, locale: 'en-GB', symbol: '£' },
  JPY: { decimals: 0, locale: 'ja-JP', symbol: '¥' }
}

export function currencyMeta(code: string): CurrencyMeta {
  const hit = KNOWN[code?.toUpperCase()]
  if (hit) return hit
  // Currency asing: default 2 desimal, prefix kode ("THB 1,500.00").
  return { decimals: 2, locale: 'en-US', symbol: code ? `${code.toUpperCase()} ` : '' }
}

/**
 * Backend -> minor int. Kontrak: string integer ("100000").
 * Defensif: kalau ada titik/koma, anggap major-decimal lalu konversi.
 */
export function parseBackendAmount(v: string | number | null | undefined, currency = 'IDR'): number {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : 0
  const raw = (v ?? '').trim()
  if (!raw) return 0
  if (!/[.,]/.test(raw)) {
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : 0
  }
  const { decimals } = currencyMeta(currency)
  const major = parseFloat(raw.replace(/[^0-9.,-]/g, '').replace(/,/g, ''))
  if (!Number.isFinite(major)) return 0
  return Math.round(major * 10 ** decimals)
}

/**
 * Ketikan user -> minor int. Kosong/invalid -> null (beda "belum isi" vs 0).
 * Aturan: yang diketik = major unit ("1050" + USD = $1,050.00).
 */
export function parseUserInput(raw: string, currency: string): number | null {
  const { decimals } = currencyMeta(currency)
  const clean = raw.trim()
  if (!clean) return null

  // 0 desimal (IDR/JPY): semua titik/koma = grouping -> buang semua.
  if (decimals === 0) {
    const digits = clean.replace(/\D/g, '')
    if (!digits) return null
    const n = parseInt(digits, 10)
    return Number.isFinite(n) ? n : null
  }

  // Ada desimal: pemisah TERAKHIR = desimal, sisanya grouping.
  const parts = clean.split(/[.,]/)
  let majorStr: string
  let fracStr = ''
  if (parts.length === 1) {
    majorStr = parts[0].replace(/\D/g, '')
  } else {
    fracStr = parts.pop()!.replace(/\D/g, '')
    majorStr = parts.join('').replace(/\D/g, '')
  }
  if (!majorStr && !fracStr) return null

  const major = majorStr ? parseInt(majorStr, 10) : 0
  if (!Number.isFinite(major)) return null

  const frac = parseInt((fracStr + '00').slice(0, decimals), 10) || 0
  return major * 10 ** decimals + frac
}

/** Minor int -> teks tampil ("Rp1.500.000", "$1,500.00"). */
export function formatMoney(minor: number | null | undefined, currency = 'IDR'): string {
  const { decimals, locale, symbol } = currencyMeta(currency)
  const value = (minor ?? 0) / 10 ** decimals
  const grouped = value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
  return `${symbol}${grouped}`
}

/** Minor int -> string backend ("1500000", "1050"). */
export function toBackendAmount(minor: number): string {
  return String(Math.round(minor))
}

/** Bentuk minor int dari major (mis. dollar -> sen). Untuk kalkulasi. */
export function toMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** currencyMeta(currency).decimals)
}
