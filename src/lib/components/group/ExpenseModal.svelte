<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { formatMoney } from '$lib/money'
  import { toastStore } from '$lib/stores.svelte'
  import Icon from '$lib/components/ui/Icon.svelte'
  import MoneyInput from '$lib/components/ui/MoneyInput.svelte'
  import { X, Plus, Check, ClipboardList, ReceiptText, Trash2 } from 'lucide-svelte'
  import { categoryMeta, DEFAULT_CATEGORY_NAMES } from '$lib/types'
  import type { Expense, ExpenseItem, Participant } from '$lib/types'

  export interface ExpenseDraft {
    /** Semua amount dalam minor-int (rupiah / sen). */
    name: string
    amount: number
    payer: string
    /** Nama kategori apa adanya (bisa dari server, bisa custom nanti). */
    category: string
    date: string // yyyy-mm-dd
    isDetail: boolean
    items: ExpenseItem[]
    /** false = hanya sebagian anggota (lihat assigned). */
    splitAll: boolean
    /** Nama peserta yang ikut (diabaikan kalau splitAll true). */
    assigned: string[]
  }

  interface Props {
    participants: Participant[]
    /** Nama kategori dari server (urutan server). Default = list lokal. */
    categories?: string[]
    /** Kode currency bill (IDR/USD/...) untuk format input. */
    currency?: string
    /** Nama pembayar default (si pengklik tambah expense). */
    defaultPayer?: string
    /** Mode edit: prefill + kunci tipe + tombol hapus. Null = tambah baru. */
    editing?: Expense | null
    onClose: () => void
    onSubmit: (draft: ExpenseDraft) => void
    onDelete?: (id: number) => void
  }

  let {
    participants,
    categories = DEFAULT_CATEGORY_NAMES,
    currency = 'IDR',
    defaultPayer,
    editing = null,
    onClose,
    onSubmit,
    onDelete
  }: Props = $props()

  const isEditing = $derived(editing != null)

  // Snapshot sekali saat mount (modal remount tiap dibuka via {#if},
  // jadi editing dijamin tidak berubah selama hidup komponen).
  function snapshot() {
    const e = editing
    const splitIds = e?.splitIds ?? []
    const narrowed = !!e && splitIds.length > 0 && splitIds.length < participants.length
    return {
      mode: (e?.isDetail ? 'detail' : 'simple') as 'simple' | 'detail',
      name: e?.name ?? '',
      amount: e && !e.isDetail ? e.amount : null,
      category: e?.category ?? '',
      payer: e?.payer ?? '',
      splitAll: !narrowed,
      assigned: Object.fromEntries(
        participants.map((p) => [p.name, !narrowed || splitIds.includes(p.id)])
      ) as Record<string, boolean>,
      rows:
        e?.isDetail && e.items.length > 0
          ? e.items.map((it) => ({
              id: it.id,
              name: it.name,
              price: it.price as number | null,
              qty: it.quantity,
              assignees: [...(it.assignees ?? [])]
            }))
          : [{ name: '', price: null, qty: 1, assignees: [] as number[] }]
    }
  }

  const snap = snapshot()

  let expMode = $state(snap.mode)
  let expName = $state(snap.name)
  /** Minor-int (null = belum diisi). */
  let expAmount = $state<number | null>(snap.amount)
  // Jangan init dari props langsung (cuma baca nilai awal) — sinkronkan via $effect di bawah.
  let expCategory = $state(snap.category)
  let expPayer = $state(snap.payer)
  let expDate = $state(new Date().toISOString().split('T')[0])
  let expSplitAll = $state(snap.splitAll)
  let expAssigned = $state<Record<string, boolean>>(snap.assigned)

  interface DetailRow {
    /** Id server. Absent untuk baris baru. */
    id?: number
    name: string
    /** Minor-int (null = belum diisi). */
    price: number | null
    qty: number
    /** Id peserta item ini. Default KOSONG (user pilih sadar);
     *  saat submit yang kosong diisi semua anggota. */
    assignees: number[]
  }

  let detailItems = $state<DetailRow[]>(snap.rows)

  // Kalau daftar participant berubah (tambah/hapus), sinkronkan payer & assigned.
  // Ini ganti pola lama `useState(participants[0]?.name)` yang cuma baca nilai awal.
  // Prioritas payer: pilihan user (masih valid) > si pengklik > peserta pertama.
  $effect(() => {
    const hasParticipant = (n: string) => participants.some((p) => p.name === n)
    if (!expPayer || !hasParticipant(expPayer)) {
      if (defaultPayer && hasParticipant(defaultPayer)) expPayer = defaultPayer
      else if (participants.length > 0) expPayer = participants[0].name
    }
    for (const p of participants) {
      if (!(p.name in expAssigned)) expAssigned[p.name] = true
    }
    if (!categories.includes(expCategory) && categories.length > 0) {
      expCategory = categories[0]
    }
    // Baris item: prune id yang sudah tidak ada. Kosong = belum pilih
    // (sengaja TIDAK diisi otomatis — user assign sadar per item).
    // Tulis hanya kalau berubah agar $effect konvergen (tidak loop).
    const valid = new Set(participants.map((p) => p.id))
    for (const row of detailItems) {
      const kept = row.assignees.filter((id) => valid.has(id))
      if (kept.length !== row.assignees.length) row.assignees = kept
    }
  })

  const detailTotal = $derived(detailItems.reduce((s, i) => s + (i.price ?? 0) * Math.max(1, i.qty || 1), 0))

  function addDetailItem() {
    detailItems = [...detailItems, { name: '', price: null, qty: 1, assignees: [] }]
  }

  function removeDetailItem(i: number) {
    detailItems = detailItems.filter((_, idx) => idx !== i)
  }

  function toggleItemAssignee(rowIdx: number, pId: number) {
    const row = detailItems[rowIdx]
    if (!row) return
    const has = row.assignees.includes(pId)
    if (has && row.assignees.length === 1) {
      toastStore.show('Minimal 1 peserta harus dipilih')
      return
    }
    row.assignees = has ? row.assignees.filter((id) => id !== pId) : [...row.assignees, pId]
  }

  function assignAllRow(rowIdx: number) {
    const row = detailItems[rowIdx]
    if (row) row.assignees = participants.map((p) => p.id)
  }

  function handleSubmit() {
    if (!expName.trim()) return
    const amount = expMode === 'detail' ? detailTotal : (expAmount ?? 0)
    onSubmit({
      name: expName.trim(),
      amount,
      payer: expPayer,
      category: expCategory,
      date: expDate,
      isDetail: expMode === 'detail',
      items:
        expMode === 'detail'
          ? detailItems
              .filter((i) => i.name)
              .map((i) => ({
                // id diteruskan kalau baris berasal dari server (untuk diff).
                ...(i.id != null ? { id: i.id } : {}),
                name: i.name,
                price: i.price ?? 0,
                quantity: Math.max(1, Math.floor(i.qty || 1)),
                // Kosong = belum assign; page mengisi semua anggota.
                assignees: i.assignees
              }))
          : [],
      splitAll: expSplitAll,
      assigned: Object.keys(expAssigned).filter((n) => expAssigned[n])
    })
  }

  // Hapus two-tap (hanya mode edit): ketuk 1 = konfirmasi, ketuk 2 = jalan.
  let confirmDelete = $state(false)
  let confirmTimer: ReturnType<typeof setTimeout> | undefined

  function handleDeleteClick() {
    if (!editing || !onDelete) return
    if (!confirmDelete) {
      confirmDelete = true
      clearTimeout(confirmTimer)
      confirmTimer = setTimeout(() => (confirmDelete = false), 3000)
      return
    }
    clearTimeout(confirmTimer)
    confirmDelete = false
    onDelete(editing.id)
  }
</script>

<div
  class="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-md"
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose()
  }}
  transition:fade={{ duration: 200 }}
  role="presentation"
>
  <div
    class="w-full max-w-[420px] rounded-t-3xl max-h-[90vh] overflow-y-auto"
    style="background:var(--sk-surface);border:1px solid var(--sk-border)"
    in:fly={{ y: 100, duration: 320, easing: cubicOut }}
    out:fly={{ y: 100, duration: 240 }}
  >
    <div class="w-9 h-1 rounded-full mx-auto mt-3 bg-sk-border"></div>

    <!-- Header -->
    <div class="flex items-center justify-between px-5 pt-4 mb-4">
      <h2 class="text-[17px] font-bold tracking-tight">{isEditing ? 'Ubah Pengeluaran' : 'Tambah Pengeluaran'}</h2>
      <button
        type="button"
        onclick={onClose}
        class="w-8 h-8 rounded-full flex items-center justify-center border border-sk bg-sk-surface2 text-sk-text2 hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all"
        aria-label="Tutup"
      >
        <Icon icon={X} size={15} />
      </button>
    </div>

    <div class="px-5 pb-4 flex flex-col gap-3.5">
      {#if isEditing}
        <!-- Tipe dikunci mengikuti BE (PATCH tanpa field type). -->
        <div
          class="flex items-center gap-1.5 py-2.5 rounded-sk-sm text-xs font-semibold border border-sk bg-sk-surface2 text-sk-text2 justify-center"
        >
          <Icon icon={expMode === 'detail' ? ReceiptText : ClipboardList} size={14} />
          {expMode === 'detail' ? 'Detail Item' : 'Sederhana'} · tipe tidak bisa diganti
        </div>
      {:else}
        <!-- Mode toggle -->
        <div class="flex gap-2">
          {#each [{ mode: 'simple', label: 'Sederhana', icon: ClipboardList }, { mode: 'detail', label: 'Detail Item', icon: ReceiptText }] as { mode, label, icon }}
            <button
              type="button"
              onclick={() => (expMode = mode as 'simple' | 'detail')}
              class="flex-1 py-2.5 rounded-sk-sm text-xs font-semibold transition-all duration-200 border flex items-center justify-center gap-1.5"
              class:border-[#7c6aff]={expMode === mode}
              class:bg-[rgba(124,106,255,0.10)]={expMode === mode}
              class:text-[#7c6aff]={expMode === mode}
              class:border-sk={expMode !== mode}
              class:text-sk-text2={expMode !== mode}
              class:bg-sk-surface2={expMode !== mode}
            >
              <Icon icon={icon} size={14} /> {label}
            </button>
          {/each}
        </div>
      {/if}

      <!-- Name -->
      <div>
        <label class="sk-label" for="expName">Nama Pengeluaran</label>
        <input id="expName" type="text" bind:value={expName} placeholder="cth. Makan Siang..." class="sk-input" />
      </div>

      <!-- Amount (simple) -->
      {#if expMode === 'simple'}
        <div>
          <label class="sk-label" for="expAmount">Total Nominal</label>
          <MoneyInput id="expAmount" bind:value={expAmount} {currency} placeholder="0" class="text-lg font-bold" />
        </div>
      {/if}

      <!-- Category grid (server-driven; nama asing dapat icon fallback) -->
      <div>
        <span class="sk-label" id="expCategoryLabel">Kategori</span>
        <div class="grid grid-cols-3 gap-2" role="group" aria-labelledby="expCategoryLabel">
          {#each categories as cat}
            {@const meta = categoryMeta(cat)}
            <button
              type="button"
              onclick={() => (expCategory = cat)}
              class="flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-sk-sm border-[1.5px] transition-all duration-200"
              class:border-[#7c6aff]={expCategory === cat}
              class:bg-[rgba(124,106,255,0.12)]={expCategory === cat}
              class:border-sk={expCategory !== cat}
              class:bg-sk-surface2={expCategory !== cat}
            >
              <span
                class={expCategory === cat ? 'text-[#7c6aff]' : 'text-sk-text2'}
              >
                <Icon icon={meta.icon} size={22} />
              </span>
              <span
                class="text-[9px] font-semibold transition-colors"
                class:text-[#7c6aff]={expCategory === cat}
                class:text-sk-text2={expCategory !== cat}
              >
                {cat.length > 7 ? cat.slice(0, 6) + '…' : cat}
              </span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Payer + Date -->
      <div class="flex gap-2">
        <div class="flex-1">
          <label class="sk-label" for="expPayer">Dibayar oleh</label>
          <select id="expPayer" bind:value={expPayer} class="sk-input text-sm appearance-none">
            {#each participants as p}
              <option value={p.name}>{p.name}</option>
            {/each}
          </select>
          <p class="text-[11px] text-sk-text3 mt-1">Akan tercatat sebagai pembayar.</p>
        </div>
        <div class="flex-1">
          <label class="sk-label" for="expDate">Tanggal</label>
          <input id="expDate" type="date" bind:value={expDate} class="sk-input text-sm" />
        </div>
      </div>

      <!-- Detail items -->
      {#if expMode === 'detail'}
        <div>
          <span class="sk-label">Item Pengeluaran</span>
          {#each detailItems as item, i}
            {@const itemTotal = (item.price ?? 0) * Math.max(1, item.qty || 1)}
            <div class="rounded-sk-sm border border-sk bg-sk-surface2 p-3 mb-2.5">
              <!-- Row 1: nama + hapus -->
              <div class="flex gap-2 items-center mb-2.5">
                <input
                  type="text"
                  bind:value={item.name}
                  placeholder="Nama item..."
                  class="sk-input flex-1 text-sm"
                  aria-label="Nama item"
                />
                <button
                  type="button"
                  onclick={() => removeDetailItem(i)}
                  class="w-8 h-8 rounded-lg border border-sk flex items-center justify-center text-red-400 hover:bg-red-500/10 hover:border-red-400 transition-all flex-shrink-0"
                  aria-label="Hapus item"
                >
                  <Icon icon={X} size={13} />
                </button>
              </div>

              <!-- Row 2: qty × harga = subtotal -->
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  bind:value={item.qty}
                  min={1}
                  class="w-12 flex-shrink-0 bg-sk-surface border border-sk rounded-sk-sm px-2 py-2 outline-none text-sm font-bold font-mono text-sk-text text-center"
                  aria-label="Jumlah"
                />
                <span class="text-sk-text3 text-sm flex-shrink-0">×</span>
                <MoneyInput
                  bind:value={item.price}
                  {currency}
                  placeholder="0"
                  label="Harga item"
                  class="flex-1 text-sm"
                />
                <span class="text-sk-text3 text-sm flex-shrink-0">=</span>
                <span class="text-sm font-bold font-mono text-[#7c6aff] flex-shrink-0">
                  {formatMoney(itemTotal, currency)}
                </span>
              </div>

              <!-- Row 3: bagi item ke siapa (pola split page) -->
              <div class="flex items-center gap-1.5 flex-wrap mt-2.5">
                <button
                  type="button"
                  onclick={() => assignAllRow(i)}
                  class="text-[10px] font-bold px-2 py-1 rounded-sk-pill border border-sk text-sk-text3 bg-sk-surface hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all duration-150"
                >
                  Semua
                </button>
                {#each participants as p (p.id)}
                  {@const assigned = item.assignees.includes(p.id)}
                  <button
                    type="button"
                    onclick={() => toggleItemAssignee(i, p.id)}
                    class="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-sk-pill border transition-all duration-150"
                    class:border-[#7c6aff]={assigned}
                    class:bg-[rgba(124,106,255,0.12)]={assigned}
                    class:text-[#7c6aff]={assigned}
                    class:border-sk={!assigned}
                    class:bg-sk-surface={!assigned}
                    class:text-sk-text3={!assigned}
                  >
                    <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:{p.grad}"></span>
                    {p.name.length > 5 ? p.name.slice(0, 5) + '…' : p.name}
                  </button>
                {/each}
              </div>
            </div>
          {/each}
          <button
            type="button"
            onclick={addDetailItem}
            class="w-full py-2.5 border-[1.5px] border-dashed border-sk rounded-sk-sm text-xs font-semibold text-sk-text2 hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all duration-200 flex items-center justify-center gap-1.5"
          >
            <Icon icon={Plus} size={14} /> Tambah Item
          </button>
          {#if detailTotal > 0}
            <div
              class="mt-2.5 px-3.5 py-2.5 rounded-sk-sm bg-[rgba(124,106,255,0.06)] border border-[rgba(124,106,255,0.15)] flex justify-between items-center"
            >
              <span class="text-xs text-sk-text2">Total dari item</span>
              <span class="text-sm font-bold font-mono text-[#7c6aff]">{formatMoney(detailTotal, currency)}</span>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Split expense-level: hanya mode simple.
           Mode detail assign per item (Row 3 tiap kartu), bukan per expense. -->
      {#if expMode === 'simple'}
        <div>
          <span class="sk-label">Dibagi ke</span>
          <div class="flex bg-sk-surface2 border border-sk rounded-sk-sm p-1 gap-1">
            {#each [['true', 'Semua Anggota'], ['false', 'Pilih Anggota']] as [val, label]}
              <button
                type="button"
                onclick={() => (expSplitAll = val === 'true')}
                class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                class:bg-[#7c6aff]={expSplitAll === (val === 'true')}
                class:text-white={expSplitAll === (val === 'true')}
                class:text-sk-text2={expSplitAll !== (val === 'true')}
              >
                {label}
              </button>
            {/each}
          </div>
        </div>

        {#if !expSplitAll}
          <div class="flex flex-col gap-2" in:fly={{ y: -6, duration: 200 }}>
            {#each participants as p (p.id)}
              <button
                type="button"
                onclick={() => (expAssigned[p.name] = !expAssigned[p.name])}
                class="flex items-center gap-3 p-2.5 rounded-sk-sm border-[1.5px] transition-all duration-200"
                class:border-[#7c6aff]={expAssigned[p.name]}
                class:bg-[rgba(124,106,255,0.08)]={expAssigned[p.name]}
                class:border-sk={!expAssigned[p.name]}
                class:bg-sk-surface2={!expAssigned[p.name]}
              >
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style="background:{p.grad}"
                >
                  {p.name[0]}
                </div>
                <span class="flex-1 text-sm font-semibold text-left">{p.name}</span>
                <div
                  class="w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all"
                  class:bg-[#7c6aff]={expAssigned[p.name]}
                  class:border-[#7c6aff]={expAssigned[p.name]}
                  class:text-white={expAssigned[p.name]}
                  class:border-sk={!expAssigned[p.name]}
                >
                  {#if expAssigned[p.name]}<Icon icon={Check} size={12} strokeWidth={3} />{/if}
                </div>
              </button>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Footer -->
    <div class="px-5 pt-4 pb-8 border-t border-sk flex gap-2.5">
      {#if isEditing && onDelete}
        <button
          type="button"
          onclick={handleDeleteClick}
          class="py-3 px-3.5 rounded-sk-sm font-bold text-sm transition-all duration-200 flex-shrink-0 border-[1.5px] {confirmDelete
            ? 'border-red-400 bg-red-500/10 text-red-400'
            : 'border-sk text-sk-text3'}"
          aria-label="Hapus pengeluaran"
        >
          <Icon icon={Trash2} size={16} />
        </button>
        {#if confirmDelete}
          <span class="self-center text-[11px] font-semibold text-red-400 flex-shrink-0">Ketuk lagi<br />untuk hapus</span>
        {/if}
      {:else}
        <button type="button" onclick={onClose} class="sk-btn-ghost flex-1 py-3">Batal</button>
      {/if}
      <button type="button" onclick={handleSubmit} class="sk-btn-primary flex-[2] py-3"
        ><Icon icon={Check} size={16} strokeWidth={2.5} /> {isEditing ? 'Simpan Perubahan' : 'Simpan Pengeluaran'}</button
      >
    </div>
  </div>
</div>
