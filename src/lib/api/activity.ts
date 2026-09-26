import { apiFetch } from '$lib/api/client'
import { formatMoney, parseBackendAmount } from '$lib/money'
import { formatActivityTime } from '$lib/time'
import type { Activity } from '$lib/types'

// ── DTO backend ──

export interface ActivityDto {
  id: number
  actor_name: string
  action_type: string
  target_name: string | null
  /** String minor-int. Null = aksi tanpa nominal. */
  amount: string | null
  created_at: string
}

/** Log aktivitas publik (model share-link, tanpa auth). */
export function getActivities(publicId: string, limit = 20, resource: 'group-bill' | 'split-bills' = 'group-bill') {
  return apiFetch<ActivityDto[]>(
    `/api/${resource}/${encodeURIComponent(publicId)}/activities?limit=${limit}`
  )
}

// ── Mapper ke tipe ActivityList ──

interface ActionStyle {
  color: string
  /** Fungsi (aktor, target, nominal?) -> segmen selang-seling bold/normal. */
  text: (actor: string, target: string, amount: string) => string[]
}

const STYLES: Record<string, ActionStyle> = {
  CREATE_GROUP_BILL: {
    color: 'bg-pink-400',
    text: (a, t) => (t ? [a, ' membuat grup ', t] : [a, ' membuat grup'])
  },
  CREATE_SPLIT_BILL: {
    color: 'bg-pink-400',
    text: (a, t) => (t ? [a, ' membuat split bill ', t] : [a, ' membuat split bill'])
  },
  CREATE_EXPENSE: {
    color: 'bg-violet-400',
    text: (a, t, m) => (m ? [a, ' menambahkan ', t, ` ${m}`] : [a, ' menambahkan ', t])
  },
  UPDATE_EXPENSE: {
    color: 'bg-sky-400',
    text: (a, t, m) => (m ? [a, ' mengubah ', t, ` ${m}`] : [a, ' mengubah ', t])
  },
  DELETE_EXPENSE: {
    color: 'bg-red-400',
    text: (a, t) => [a, ' menghapus ', t]
  },
  CREATE_EXPENSE_ITEM: {
    color: 'bg-teal-400',
    text: (a, t, m) => (m ? [a, ' menambahkan item ', t, ` ${m}`] : [a, ' menambahkan item ', t])
  },
  UPDATE_EXPENSE_ITEM_NAME: {
    color: 'bg-yellow-400',
    text: (a, t) => [a, ' mengubah item ', t]
  },
  UPDATE_EXPENSE_ITEM_PRICE: {
    color: 'bg-yellow-400',
    text: (a, t, m) => (m ? [a, ' mengubah harga ', t, ` jadi ${m}`] : [a, ' mengubah item ', t])
  },
  UPDATE_EXPENSE_ITEM_QTY: {
    color: 'bg-yellow-400',
    text: (a, t) => [a, ' mengubah jumlah ', t]
  },
  DELETE_EXPENSE_ITEM: {
    color: 'bg-red-400',
    text: (a, t) => [a, ' menghapus item ', t]
  },
  UPSERT_PARTICIPANT: {
    color: 'bg-green-400',
    text: (a, t) => [a, ' menambahkan ', t]
  },
  DELETE_PARTICIPANT: {
    color: 'bg-orange-400',
    text: (a, t) => [a, ' menghapus ', t]
  }
}

const FALLBACK: ActionStyle = {
  color: 'bg-slate-400',
  text: (a, t) => (t ? [a, ' beraktivitas ', t] : [a, ' beraktivitas'])
}

/**
 * Aksi BE baru yang belum dipetakan jatuh ke FALLBACK (abu-abu) —
 * UI tidak pernah pecah karena tipe asing.
 */
export function mapActivityItem(item: ActivityDto, currency: string): Activity {
  const style = STYLES[item.action_type] ?? FALLBACK
  const target = item.target_name ?? ''
  const amount =
    item.amount != null ? formatMoney(parseBackendAmount(item.amount, currency), currency) : ''
  return {
    id: item.id,
    color: style.color,
    segments: style.text(item.actor_name, target, amount),
    time: formatActivityTime(item.created_at)
  }
}
