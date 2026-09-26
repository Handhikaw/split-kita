import { apiFetch } from '$lib/api/client'
import { parseBackendAmount } from '$lib/money'
import { GRADIENTS } from '$lib/stores.svelte'
import type { Balance, Participant } from '$lib/types'

// ── DTO backend (mirip group; split = 1 expense + adjustments) ──

interface SplitItemParticipantDto {
  participant_id: number
  name: string
  share_amount: string
}

interface SplitItemDto {
  id: number
  name: string
  price: string
  quantity: number
  subtotal: string
  participants: SplitItemParticipantDto[] | null
}

interface SplitParticipantDto {
  participant_id: number
  name: string
  total_paid: string
  total_owed: string
  net_balance: string
}

interface SettlementDto {
  from: { id: number; name: string }
  to: { id: number; name: string }
  amount: string
}

export interface SplitBillDto {
  id: number
  expense_id: number
  status: string
  name: string
  currency: string
  total_amount: string
  tax: string
  service_charge: string
  discount: string
  payer_id: number
  items: SplitItemDto[] | null
  participants: SplitParticipantDto[] | null
  settlements: SettlementDto[] | null
}

// ── Endpoint ──

export interface CreateSplitBillInput {
  title: string
  currency: string
  creator_name?: string
}

export interface CreateSplitBillResult {
  public_id: string
  owner_participant_id: number
}

export function createSplitBill(input: CreateSplitBillInput) {
  return apiFetch<CreateSplitBillResult>('/api/split-bills', {
    method: 'POST',
    body: input,
    auth: true
  })
}

/** GET split-bill publik (link share, tanpa auth). */
export function getSplitBill(publicId: string) {
  return apiFetch<SplitBillDto>(`/api/split-bills/${encodeURIComponent(publicId)}`)
}

// ── View (domain frontend) ──

export interface SplitItem {
  id: number
  name: string
  /** Minor-int. */
  price: number
  quantity: number
  /** Minor-int (subtotal server). */
  subtotal: number
  assignees: number[]
  /** Share server per peserta (exact, untuk breakdown). */
  shares: Record<number, number>
}

export interface SplitBillView {
  id: number
  expenseId: number
  name: string
  currency: string
  status: string
  /** Minor-int (server truth = items + tax + charge - discount). */
  totalAmount: number
  tax: number
  serviceCharge: number
  discount: number
  items: SplitItem[]
  participants: Participant[]
  balances: Balance[]
  /** Total utang per peserta (server, termasuk pajak proporsional). */
  owedById: Record<number, number>
  /** Payer terdeteksi (total_paid > 0 pertama). Null = belum ada yang bayar. */
  paidById: number | null
}

function gradFor(index: number): string {
  return GRADIENTS[index % GRADIENTS.length]
}

/**
 * Catatan mapping:
 * - payer_id response tidak pernah diisi BE -> payer dibaca dari
 *   payments (total_paid > 0) dan dikelola FE via PUT /api/payment.
 * - grad deterministik by index (backend tidak kirim warna).
 */
export function mapSplitBill(dto: SplitBillDto): SplitBillView {
  const cur = dto.currency
  // Postgres tidak menjamin urutan baris tanpa ORDER BY -> sort by id
  // agar chips/strip peserta tidak lompat-lompat tiap refetch.
  const sortedParts = [...(dto.participants ?? [])].sort((a, b) => a.participant_id - b.participant_id)
  // Warna deterministik per id (tidak geser saat anggota tambah/hapus).
  const gradById = new Map(sortedParts.map((p) => [p.participant_id, gradFor(p.participant_id)]))
  const participants: Participant[] = sortedParts.map((p) => ({
    id: p.participant_id,
    name: p.name,
    grad: gradById.get(p.participant_id) ?? gradFor(p.participant_id)
  }))

  const items: SplitItem[] = [...(dto.items ?? [])]
    .sort((a, b) => a.id - b.id)
    .map((it) => {
    const shares: Record<number, number> = {}
    for (const s of it.participants ?? []) {
      shares[s.participant_id] = parseBackendAmount(s.share_amount, cur)
    }
    return {
      id: it.id,
      name: it.name,
      price: parseBackendAmount(it.price, cur),
      quantity: Number.isFinite(it.quantity) && it.quantity > 0 ? Math.floor(it.quantity) : 1,
      subtotal: parseBackendAmount(it.subtotal, cur),
      assignees: (it.participants ?? []).map((s) => s.participant_id),
      shares
    }
  })

  const balances: Balance[] = (dto.settlements ?? []).map((s, i) => ({
    id: i + 1,
    from: s.from.name,
    fromGrad: gradById.get(s.from.id) ?? gradFor(i),
    to: s.to.name,
    toGrad: gradById.get(s.to.id) ?? gradFor(i + 1),
    amount: parseBackendAmount(s.amount, cur),
    status: 'active' as const
  }))

  const paid = (dto.participants ?? []).find((p) => parseBackendAmount(p.total_paid, cur) > 0)
  const owedById: Record<number, number> = {}
  for (const p of dto.participants ?? []) {
    owedById[p.participant_id] = parseBackendAmount(p.total_owed, cur)
  }

  return {
    id: dto.id,
    expenseId: dto.expense_id,
    name: dto.name,
    currency: cur,
    status: dto.status,
    totalAmount: parseBackendAmount(dto.total_amount, cur),
    tax: parseBackendAmount(dto.tax, cur),
    serviceCharge: parseBackendAmount(dto.service_charge, cur),
    discount: parseBackendAmount(dto.discount, cur),
    items,
    participants,
    balances,
    owedById,
    paidById: paid?.participant_id ?? null
  }
}
