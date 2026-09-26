// ─── Domain types ─────────────────────────────────────────
import { BedDouble, Car, Compass, Fuel, Package, ShoppingBag, Ticket, UtensilsCrossed } from 'lucide-svelte'

export type BillType = 'split' | 'group' | 'goal'

export type Currency = 'IDR' | 'USD' | 'SGD' | 'MYR' | 'EUR' | 'GBP' | 'JPY' | 'OTHER'

export interface Participant {
  id: number
  name: string
  grad: string   // CSS gradient string
}

/** Nama kategori yang dikenal frontend (punya icon+warna di CATEGORY_META).
 *  Backend bisa mengirim nama lain (kategori custom) — field category di
 *  bawah bertipe string agar tidak pecah. Tampilan selalu via categoryMeta(). */
export type ExpenseCategory =
  | 'Transportasi'
  | 'Makanan'
  | 'Akomodasi'
  | 'Aktivitas'
  | 'Belanja'
  | 'BBM'
  | 'Tiket'
  | 'Lainnya'

export interface ExpenseItem {
  /** Id server. Absent untuk baris baru yang belum disimpan. */
  id?: number
  name: string
  /** Minor-int (rupiah/sen). */
  price: number
  quantity: number
  /** Id peserta yang ikut item ini. */
  assignees: number[]
}

export interface Expense {
  id: number
  name: string
  amount: number
  payer: string
  /** Nama kategori apa adanya dari backend (bisa custom). */
  category: string
  date: string
  isDetail: boolean
  items: ExpenseItem[]
  expanded: boolean
  /** Jumlah peserta expense ini (dari backend). Undefined = semua anggota. */
  splitCount?: number
  /** Id peserta expense ini (dari backend). Kosong = semua anggota. */
  splitIds?: number[]
}

export type BalanceStatus = 'free' | 'active' | 'settled'

export interface Balance {
  id: number
  from: string
  fromGrad: string
  to: string
  toGrad: string
  amount: number
  status: BalanceStatus
}

export interface Activity {
  id: number
  color: string        // Tailwind bg class e.g. 'bg-teal-400'
  segments: string[]   // alternating: bold, normal, bold, normal…
  time: string
}

// ─── Category metadata ────────────────────────────────────

export interface CategoryMeta {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any // komponen icon Lucide (bukan emoji) — dirender via <Icon icon={meta.icon} />
  bgClass: string // e.g. 'bg-violet-500/10'
  textClass: string // e.g. 'text-violet-400'
}

export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  Transportasi: { icon: Car, bgClass: 'bg-violet-500/10', textClass: 'text-violet-400' },
  Makanan: { icon: UtensilsCrossed, bgClass: 'bg-yellow-500/10', textClass: 'text-yellow-400' },
  Akomodasi: { icon: BedDouble, bgClass: 'bg-teal-500/10', textClass: 'text-teal-400' },
  Aktivitas: { icon: Compass, bgClass: 'bg-sky-500/10', textClass: 'text-sky-400' },
  Belanja: { icon: ShoppingBag, bgClass: 'bg-pink-500/10', textClass: 'text-pink-400' },
  BBM: { icon: Fuel, bgClass: 'bg-green-500/10', textClass: 'text-green-400' },
  Tiket: { icon: Ticket, bgClass: 'bg-orange-500/10', textClass: 'text-orange-400' },
  Lainnya: { icon: Package, bgClass: 'bg-slate-500/10', textClass: 'text-slate-400' }
}

/**
 * Daftar nama kategori bawaan (fallback kalau list backend gagal diambil).
 * Sumber utama = GET /api/expense/category; list ini cuma cadangan.
 */
export const DEFAULT_CATEGORY_NAMES = Object.keys(CATEGORY_META)

/**
 * Metadata tampilan untuk NAMA kategori apa pun.
 * Nama yang tidak dikenal (termasuk kategori custom backend nanti)
 * jatuh ke gaya 'Lainnya' — UI tidak pernah rusak karena data baru.
 */
export function categoryMeta(name: string): CategoryMeta {
  if (name && name in CATEGORY_META) return CATEGORY_META[name as ExpenseCategory]
  return CATEGORY_META['Lainnya']
}
