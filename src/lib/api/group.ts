import { apiFetch } from '$lib/api/client'
import { parseBackendAmount, toBackendAmount } from '$lib/money'
import { GRADIENTS } from '$lib/stores.svelte'
import type { Balance, Expense, Participant } from '$lib/types'

// ── DTO mentah backend (amount berupa string, field bisa null) ──

interface ExpenseParticipantDto {
  participant_id: number
  share_amount: string
}

interface ExpenseItemDto {
  id: number
  name: string
  price: string
  quantity: number
  subtotal: string
  participants: { participant_id: number; name: string; share_amount: string }[] | null
}

interface GroupExpenseDto {
  id: number
  title: string
  amount: string
  tax: string
  discount: string
  charge: string
  category: string | null
  created_by: string | null
  created_at: string
  participants: ExpenseParticipantDto[] | null
  items: ExpenseItemDto[] | null
}

interface GroupParticipantDto {
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

export interface GroupBillDto {
  id: number
  status: string
  name: string
  currency: string
  total_amount: string
  expense: GroupExpenseDto[] | null
  participants: GroupParticipantDto[] | null
  settlements: SettlementDto[] | null
}

// ── Endpoint ──

export interface CreateGroupBillInput {
  title: string
  currency: string
  created_by?: number
  /** Nama pembuat — dipakai BE (baru maupun lama) untuk menamai owner. */
  creator_name?: string
}

export interface CreateGroupBillResult {
  public_id: string
  title: string
  status: string
  expired_at: string | null
  /** Ada di BE lama (auto-insert owner), 0/absent di BE baru. */
  owner_participant_id?: number
}

export function createGroupBill(input: CreateGroupBillInput) {
  return apiFetch<CreateGroupBillResult>('/api/group-bills', {
    method: 'POST',
    body: input,
    auth: true
  })
}

/** GET group-bill tidak butuh auth (link publik bisa dibuka siapa saja). */
export function getGroupBill(publicId: string) {
  return apiFetch<GroupBillDto>(`/api/group-bill/${encodeURIComponent(publicId)}`)
}

// ── Join / klaim peserta ──

/**
 * Tambah peserta baru ke bill.
 * Path pakai /api/split-bills/... (terverifikasi melawan backend lokal:
 * endpoint join split menerima public_id group bill; varian
 * /api/group-bill/:id/join dan /api/group-bills/:id/join me-return 404).
 * Response join kosong/tanpa data -> refetch detail untuk dapat id baru.
 */
export function joinGroupBill(publicId: string, name: string) {
  return apiFetch<unknown>(`/api/split-bills/${encodeURIComponent(publicId)}/join`, {
    method: 'POST',
    body: { name },
    auth: true
  })
}

export function deleteParticipantApi(publicId: string, participantId: number, claimedId?: number) {
  return apiFetch<unknown>(`/api/participant/${encodeURIComponent(publicId)}/${participantId}`, {
    method: 'DELETE',
    auth: true,
    participantId: claimedId
  })
}

// ── Payment (catat siapa membayar) ──

export interface RecordPaymentInput {
  expense_id: number
  participant_id: number
  /** Minor-int. Diserialkan jadi string sesuai kontrak backend. */
  amount: number
}

/**
 * Mencatat pembayar expense. Upsert per (expense, payer): aman dipanggil
 * ulang (mis. total berubah) — tidak bikin baris ganda.
 * JANGAN dipakai untuk "tandai lunas" per settlement: settlement tidak
 * terikat expense, pinjam expense_id asal akan menimpa payment payer
 * expense itu (upsert collision).
 */
export function recordPaymentApi(publicId: string, input: RecordPaymentInput) {
  const { amount, ...rest } = input
  return apiFetch<unknown>(`/api/payment/${encodeURIComponent(publicId)}`, {
    method: 'PUT',
    body: { ...rest, amount: toBackendAmount(amount) },
    auth: true
  })
}

export interface UpsertParticipantInput {
  name: string
  /** Wajib dikirim — BE dereference pointer ini (omit = 500). */
  is_owner: boolean
  user_id?: number
}

export interface UpsertParticipantResult {
  id: number
  name: string
}

/**
 * Tambah/ubah peserta dari Kelola Anggota (aktor = member yang login).
 * Beda dengan join (pendatang via link): upsert me-return id + catat
 * activity UPSERT_PARTICIPANT atas nama actor.
 */
export function upsertParticipantApi(
  publicId: string,
  input: UpsertParticipantInput,
  claimedId?: number
) {
  return apiFetch<UpsertParticipantResult>(`/api/participant/${encodeURIComponent(publicId)}`, {
    method: 'PUT',
    body: input,
    auth: true,
    participantId: claimedId
  })
}

// ── Expense: update & hapus ──

export interface UpdateExpenseInput {
  title?: string
  /** Minor-int, diserialkan jadi string. SIMPLE saja (DETAIL diabaikan BE). */
  amount?: number
  /** Minor-int nominal (bukan persen), diserialkan jadi string. */
  tax?: number
  discount?: number
  charge?: number
  category?: number
  /** Id peserta (payer baru). Divalidasi peserta bill oleh BE. */
  created_by?: number
  participants?: number[]
}

/** Field uang di kontrak BE selalu string — serialkan terpusat di sini
 *  agar pemanggil tidak perlu ingat (penyebab bug 400 discount number). */
const EXPENSE_MONEY_KEYS = ['amount', 'tax', 'discount', 'charge'] as const

export function updateExpenseApi(
  publicId: string,
  expenseId: number,
  input: UpdateExpenseInput,
  claimedId?: number
) {
  const body: Record<string, unknown> = { ...input }
  for (const k of EXPENSE_MONEY_KEYS) {
    if (typeof body[k] === 'number') body[k] = toBackendAmount(body[k] as number)
  }
  return apiFetch<unknown>(`/api/expense/${encodeURIComponent(publicId)}/${expenseId}`, {
    method: 'PATCH',
    body,
    auth: true,
    participantId: claimedId
  })
}

export function deleteExpenseApi(publicId: string, expenseId: number, claimedId?: number) {
  return apiFetch<unknown>(`/api/expense/${encodeURIComponent(publicId)}/${expenseId}`, {
    method: 'DELETE',
    auth: true,
    participantId: claimedId
  })
}

export interface UpdateExpenseItemInput {
  name?: string
  /** Minor-int, diserialkan jadi string. */
  price?: number
  quantity?: number
  /** Nil = tidak ganti (jangan kirim key); [] = kosongkan. */
  participants?: number[]
}

export function updateExpenseItemApi(
  publicId: string,
  expenseId: number,
  itemId: number,
  input: UpdateExpenseItemInput,
  claimedId?: number
) {
  const { price, ...rest } = input
  return apiFetch<unknown>(
    `/api/expense/${encodeURIComponent(publicId)}/${expenseId}/item/${itemId}`,
    {
      method: 'PATCH',
      body: price != null ? { ...rest, price: toBackendAmount(price) } : rest,
      auth: true,
      participantId: claimedId
    }
  )
}

export function deleteExpenseItemApi(
  publicId: string,
  expenseId: number,
  itemId: number,
  claimedId?: number
) {
  return apiFetch<unknown>(
    `/api/expense/${encodeURIComponent(publicId)}/${expenseId}/item/${itemId}`,
    { method: 'DELETE', auth: true, participantId: claimedId }
  )
}

export interface CreateExpenseInput {
  public_id: string
  title: string
  type: 'SIMPLE' | 'DETAIL'
  /** Minor-int (rupiah/sen). Diserialkan jadi string sesuai kontrak backend. */
  amount?: number
  category?: number
  /** Id peserta yang login (hasil claim) — dipakai backend untuk log activity. */
  created_by?: number
  participants: number[]
}

export interface CreateExpenseResult {
  id: number
  title: string
  type: string
  amount: string
  category: number
  created_by: number
  participants: unknown[]
}

export function createExpenseApi(input: CreateExpenseInput, claimedId?: number) {
  const { amount, ...rest } = input
  return apiFetch<CreateExpenseResult>('/api/expense', {
    method: 'POST',
    // Kontrak: semua amount dikirim sebagai string minor-int.
    body: amount != null ? { ...rest, amount: toBackendAmount(amount) } : rest,
    auth: true,
    participantId: claimedId
  })
}

export interface CreateExpenseItemInput {
  /** Minor-int. Diserialkan jadi string sesuai kontrak backend. */
  name: string
  price: number
  quantity: number
  participants: number[]
}

export function createExpenseItemApi(
  publicId: string,
  expenseId: number,
  input: CreateExpenseItemInput,
  claimedId?: number
) {
  // Contoh kontrak kirim price sebagai string ("5000") -> ikuti persis.
  return apiFetch<unknown>(`/api/expense/${encodeURIComponent(publicId)}/${expenseId}/item`, {
    method: 'POST',
    body: { ...input, price: String(input.price) },
    auth: true,
    participantId: claimedId
  })
}

// ── Kategori (id integer backend vs nama frontend) ──

export interface ExpenseCategoryDto {
  id: number
  name: string
  /** Backend juga kirim icon/color_code/is_default — belum dipakai (custom nanti). */
  is_default?: boolean
}

/**
 * List kategori backend, diparsing toleran karena contoh response
 * tidak ada di collection. Gagal -> [] (category diomit saat create).
 */
export async function getExpenseCategories(userId?: number | null): Promise<ExpenseCategoryDto[]> {
  try {
    const q = userId != null ? `?user_id=${userId}` : ''
    const data = await apiFetch<unknown>(`/api/expense/category${q}`, { auth: true })
    const arr = Array.isArray(data) ? data : (data as { categories?: unknown })?.categories
    if (!Array.isArray(arr)) return []
    return arr
      .map((it) => {
        const o = it as Record<string, unknown>
        return {
          id: Number(o.id),
          name: String(o.name ?? ''),
          is_default: typeof o.is_default === 'boolean' ? o.is_default : undefined
        }
      })
      .filter((c) => c.name && Number.isFinite(c.id))
  } catch {
    return []
  }
}

/** Cari id kategori backend dari nama, memakai list yang sudah di-fetch
 *  (tidak ada request tambahan — untuk submit yang list-nya sudah di-load). */
export function findCategoryId(list: ExpenseCategoryDto[], name: string): number | undefined {
  const lower = name.toLowerCase()
  const hit =
    list.find((c) => c.name.toLowerCase() === lower) ??
    list.find((c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase()))
  return hit?.id
}

/** Cari id kategori backend dari nama (fetch list dulu — untuk pemakaian sekali). */
export async function resolveCategoryId(
  name: string,
  userId?: number | null
): Promise<number | undefined> {
  return findCategoryId(await getExpenseCategories(userId), name)
}

// ── Mapper DTO -> domain frontend ──
// Semua amount backend = string minor-int -> parseBackendAmount (tanpa float).

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function mapCategory(c: string | null): string {
  const name = (c ?? '').trim()
  return name ? name : 'Lainnya'
}

function gradFor(index: number): string {
  return GRADIENTS[index % GRADIENTS.length]
}

export interface GroupBillView {
  id: number
  name: string
  currency: string
  status: string
  totalAmount: number
  participants: Participant[]
  expenses: Expense[]
  balances: Balance[]
}

/**
 * Catatan mapping (hasil diskusi kontrak):
 * - grad peserta: backend tidak kirim warna -> assign deterministik by index.
 * - Expense.payer: backend kirim nama (created_by), bukan id.
 * - Expense.splitCount: jumlah peserta expense tsb; []/null = belum di-set
 *   -> bagi ke semua anggota (konfirmasi backend).
 * - Balance.status: backend tidak kirim -> semua 'active'; yang sudah
 *   dibayar ditandai lokal (mark-paid ditunda, belum ada fitur backend).
 * - Item DETAIL: quantity + assignee ids disimpan apa adanya (nama bersih).
 */
export function mapGroupBill(dto: GroupBillDto): GroupBillView {
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

  // Urutan stabil (DB tanpa ORDER BY): expenses + items by id.
  const expenses: Expense[] = [...(dto.expense ?? [])]
    .sort((a, b) => a.id - b.id)
    .map((e) => {
      const items = [...(e.items ?? [])]
        .sort((a, b) => a.id - b.id)
        .map((it) => ({
          id: it.id,
          name: it.name,
          price: parseBackendAmount(it.price, dto.currency),
          quantity: Number.isFinite(it.quantity) && it.quantity > 0 ? Math.floor(it.quantity) : 1,
          assignees: (it.participants ?? []).map((p) => p.participant_id)
        }))
      const splitIds = e.participants ?? []
      return {
        id: e.id,
        name: e.title,
        amount: parseBackendAmount(e.amount, dto.currency),
        payer: e.created_by || '?',
        category: mapCategory(e.category),
        date: formatDate(e.created_at),
        isDetail: items.length > 0,
        items,
        expanded: false,
        splitCount: splitIds.length > 0 ? splitIds.length : participants.length,
        splitIds: splitIds.map((p) => p.participant_id)
      }
    })

  const balances: Balance[] = (dto.settlements ?? []).map((s, i) => ({
    id: i + 1,
    from: s.from.name,
    fromGrad: gradById.get(s.from.id) ?? gradFor(i),
    to: s.to.name,
    toGrad: gradById.get(s.to.id) ?? gradFor(i + 1),
    amount: parseBackendAmount(s.amount, dto.currency),
    status: 'active' as const
  }))

  return {
    id: dto.id,
    name: dto.name,
    currency: dto.currency,
    status: dto.status,
    totalAmount: parseBackendAmount(dto.total_amount, dto.currency),
    participants,
    expenses,
    balances
  }
}
