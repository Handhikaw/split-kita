<script lang="ts">
  import { page } from '$app/state'
  import GroupHeader from '$lib/components/group/GroupHeader.svelte'
  import BalanceCard from '$lib/components/group/BalanceCard.svelte'
  import ActivityList from '$lib/components/group/ActivityList.svelte'
  import ParticipantModal from '$lib/components/group/ParticipantModal.svelte'
  import ClaimModal from '$lib/components/group/ClaimModal.svelte'
  import SplitItemCard from '$lib/components/split/SplitItemCard.svelte'
  import SplitAdjustments, { type AdjustmentField } from '$lib/components/split/SplitAdjustments.svelte'
  import SplitSummary from '$lib/components/split/SplitSummary.svelte'
  import SplitBreakdown from '$lib/components/split/SplitBreakdown.svelte'
  import SplitShareModal from '$lib/components/split/SplitShareModal.svelte'
  import SplitOcrModal from '$lib/components/split/SplitOcrModal.svelte'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { Plus, TriangleAlert, RotateCw, UserRoundPlus, ReceiptText, ScanLine, ChevronDown, Share2 } from 'lucide-svelte'
  import { toastStore } from '$lib/stores.svelte'
  import { formatMoney } from '$lib/money'
  import { ApiError, toUserMessage } from '$lib/api/client'
  import { getSplitBill, mapSplitBill, type SplitBillView } from '$lib/api/split'
  import {
    createExpenseItemApi,
    updateExpenseItemApi,
    deleteExpenseItemApi,
    updateExpenseApi,
    joinGroupBill,
    upsertParticipantApi,
    deleteParticipantApi,
    recordPaymentApi
  } from '$lib/api/group'
  import {
    clearClaim,
    getClaimedParticipant,
    setClaimedParticipant
  } from '$lib/identity'
  import { getActivities, mapActivityItem } from '$lib/api/activity'
  import type { Activity } from '$lib/types'

  const publicId = $derived(page.params.id ?? '')

  // ── Server state ──
  let bill = $state<SplitBillView | null>(null)
  let activities = $state<Activity[]>([])
  let loading = $state(true)
  let loadError = $state('')

  async function load(announce = true) {
    if (!publicId) return
    if (announce) {
      loading = true
      loadError = ''
    }
    try {
      const [dto, acts] = await Promise.all([
        getSplitBill(publicId),
        getActivities(publicId, 20, 'split-bills').catch(() => [])
      ])
      bill = mapSplitBill(dto)
      activities = acts.map((a) => mapActivityItem(a, dto.currency))
      if (announce) loadError = ''
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 404 ? 'Bill tidak ditemukan.' : toUserMessage(e)
      if (announce) {
        loadError = msg
        bill = null
      } else {
        toastStore.show(msg)
      }
    } finally {
      if (announce) loading = false
    }
  }

  $effect(() => {
    void publicId
    claimDismissed = false
    void load()
  })

  // ── Local UI state ──
  let activeParticipantId = $state(0)
  let showShareModal = $state(false)
  let showOcrModal = $state(false)
  let showParticipantModal = $state(false)
  let showClaimModal = $state(false)
  let claimDismissed = $state(false)
  // Reaktivitas klaim: localStorage tidak reaktif -> version counter.
  let identityRev = $state(0)
  let settledIds = $state<Set<number>>(new Set())
  // Payer se-level bill (asumsi split = 1 payer).
  let payerId = $state<number | null>(null)

  const items = $derived(bill?.items ?? [])
  const participants = $derived(bill?.participants ?? [])
  const currency = $derived(bill?.currency ?? 'IDR')
  const totalAmount = $derived(bill?.totalAmount ?? 0)
  const subtotal = $derived(totalAmount - (bill?.tax ?? 0) - (bill?.serviceCharge ?? 0) + (bill?.discount ?? 0))
  const balances = $derived(
    (bill?.balances ?? []).map((b) => (settledIds.has(b.id) ? { ...b, status: 'settled' as const } : b))
  )
  const owedById = $derived(bill?.owedById ?? {})
  const claimedId = $derived.by(() => {
    void identityRev
    return getClaimedParticipant(publicId)
  })
  const claimedName = $derived(participants.find((p) => p.id === claimedId)?.name)

  // Default payer: yang sudah tercatat membayar -> pengklaim.
  $effect(() => {
    if (payerId == null && bill) {
      payerId = bill.paidById ?? claimedId
    }
  })

  // Auto-buka claim: ada peserta + belum klaim + belum di-dismiss.
  $effect(() => {
    if (!loading && bill && participants.length > 0 && claimedId == null && !claimDismissed) {
      showClaimModal = true
    }
  })

  const claimedOrUndefined = () => claimedId ?? undefined
  const allIds = () => participants.map((p) => p.id)

  /** Catat ulang payer setelah total berubah (upsert, aman dipanggil ulang). */
  async function syncPayment(oldId?: number | null) {
    if (!bill || payerId == null) return
    try {
      await recordPaymentApi(publicId, {
        expense_id: bill.expenseId,
        participant_id: payerId,
        ...(oldId != null && oldId !== payerId ? { old_participant_id: oldId } : {}),
        amount: bill.totalAmount
      })
      await load(false)
    } catch {
      toastStore.show('✓ Tersimpan, tapi pencatatan pembayaran gagal')
    }
  }

  async function refreshAfterTotalChange() {
    await load(false)
    await syncPayment()
  }

  // ── Mutasi: item (default BELUM assign — user pilih sadar;
  //  "Semua" tersedia per baris untuk kasus borongan) ──
  async function addItem() {
    try {
      await createExpenseItemApi(
        publicId,
        (bill as SplitBillView).expenseId,
        { name: 'Item baru', price: 0, quantity: 1, participants: [] },
        claimedOrUndefined()
      )
      await refreshAfterTotalChange()
      toastStore.show('✓ Item ditambahkan — isi nama, harga, dan pilih peserta')
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  async function commitItem(id: number, patch: { name: string; price: number; quantity: number }) {
    if (!bill) return
    try {
      await updateExpenseItemApi(publicId, bill.expenseId, id, patch, claimedOrUndefined())
      await refreshAfterTotalChange()
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  async function toggleAssignee(id: number, pid: number) {
    if (!bill) return
    const item = items.find((i) => i.id === id)
    if (!item) return
    const has = item.assignees.includes(pid)
    if (has && item.assignees.length === 1) {
      toastStore.show('Minimal 1 peserta harus dipilih')
      return
    }
    try {
      await updateExpenseItemApi(
        publicId,
        bill.expenseId,
        id,
        { participants: has ? item.assignees.filter((x) => x !== pid) : [...item.assignees, pid] },
        claimedOrUndefined()
      )
      await load(false)
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  async function assignAllItem(id: number) {
    if (!bill) return
    try {
      await updateExpenseItemApi(
        publicId,
        bill.expenseId,
        id,
        { participants: allIds() },
        claimedOrUndefined()
      )
      await load(false)
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  async function deleteItem(id: number) {
    if (!bill) return
    try {
      await deleteExpenseItemApi(publicId, bill.expenseId, id, claimedOrUndefined())
      await refreshAfterTotalChange()
      toastStore.show('Item dihapus')
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  // ── Mutasi: adjustments (nominal, bukan persen) ──
  async function commitAdjustment(field: AdjustmentField, value: number | null) {
    if (!bill) return
    const key = field === 'discount' ? 'discount' : field === 'tax' ? 'tax' : 'charge'
    try {
      await updateExpenseApi(publicId, bill.expenseId, { [key]: value ?? 0 }, claimedOrUndefined())
      await refreshAfterTotalChange()
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  // ── Mutasi: payer (asumsi split = 1 payer) ──
  async function changePayer(nextId: number) {
    const old = payerId
    payerId = nextId
    await syncPayment(old)
  }

  // ── Mutasi: peserta ──
  async function handleAddParticipant(name: string) {
    try {
      await upsertParticipantApi(publicId, { name, is_owner: false }, claimedOrUndefined())
      await load(false)
      toastStore.show(`✓ ${name} ditambahkan`)
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  async function handleRemoveParticipant(id: number) {
    const p = participants.find((p) => p.id === id)
    try {
      await deleteParticipantApi(publicId, id, claimedOrUndefined())
      if (claimedId === id) {
        clearClaim(publicId)
        identityRev++
      }
      if (payerId === id) payerId = null
      await load(false)
      if (p) toastStore.show(`${p.name} dihapus`)
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  function markPaid(id: number) {
    settledIds = new Set(settledIds).add(id)
    toastStore.show('✓ Utang ditandai lunas')
    // Ditunda: belum ada fitur tandai-lunas per settlement di backend.
  }

  // ── Claim flow ──
  function handleClaim(id: number) {
    setClaimedParticipant(publicId, id)
    identityRev++
    showClaimModal = false
    const p = participants.find((p) => p.id === id)
    toastStore.show(`✓ Kamu masuk sebagai ${p?.name ?? ''}`)
  }

  async function handleJoinClaim(name: string) {
    const clean = name.trim()
    if (!clean) return
    const existing = participants.find((p) => p.name.toLowerCase() === clean.toLowerCase())
    if (existing) {
      handleClaim(existing.id)
      return
    }
    try {
      await joinGroupBill(publicId, clean)
      await load(false)
      const fresh = (bill?.participants ?? []).find((p) => p.name === clean)
      if (fresh) setClaimedParticipant(publicId, fresh.id)
      identityRev++
      showClaimModal = false
      toastStore.show(`✓ Kamu gabung sebagai ${clean}`)
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }


  // ── OCR (simulasi): hasil -> POST per item (belum assign, user pilih) ──
  async function applyOcr(detected: { name: string; price: number; qty: number }[]) {
    if (!bill) return
    try {
      for (const it of detected) {
        await createExpenseItemApi(
          publicId,
          (bill as SplitBillView).expenseId,
          { name: it.name, price: it.price, quantity: it.qty, participants: [] },
          claimedOrUndefined()
        )
      }
      showOcrModal = false
      await refreshAfterTotalChange()
      toastStore.show(`✓ ${detected.length} item dari struk ditambahkan`)
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  const shareUrl = $derived(typeof window !== 'undefined' ? window.location.href : '')
</script>

<svelte:head>
  <title>SplitKita — {bill?.name ?? 'Split Bill'}</title>
</svelte:head>

<div class="relative z-10 min-h-dvh pb-32">
  {#if loading}
    <div class="px-5 pt-24 flex flex-col items-center gap-3 text-sk-text2">
      <Icon icon={RotateCw} size={22} class="animate-spin" />
      <p class="text-sm">Memuat tagihan…</p>
    </div>
  {:else if loadError || !bill}
    <div class="px-5 pt-24 flex flex-col items-center gap-3 text-center">
      <Icon icon={TriangleAlert} size={28} class="text-[#fbbf24]" />
      <p class="text-sm font-semibold">{loadError || 'Bill tidak ditemukan.'}</p>
      <p class="text-xs text-sk-text2">Pastikan link benar dan backend jalan.</p>
      <button type="button" onclick={() => load()} class="sk-btn-ghost px-5 py-2.5 text-sm">Coba lagi</button>
      <a href="/" class="text-xs text-sk-text2">← Kembali ke beranda</a>
    </div>
  {:else}
    {#if bill.status !== 'ACTIVE'}
      <div
        class="mx-5 mt-5 px-3.5 py-2.5 rounded-sk-sm bg-yellow-500/6 border border-yellow-500/20 text-xs text-sk-text2 flex items-center gap-2"
      >
        <Icon icon={TriangleAlert} size={14} class="flex-shrink-0" />
        <span>Bill ini berstatus {bill.status}.</span>
      </div>
    {/if}

    <GroupHeader
      participants={participants}
      activeId={activeParticipantId}
      onSelect={(id) => (activeParticipantId = id)}
      onAddClick={() => (showParticipantModal = true)}
      title={bill.name}
      titleIcon={ReceiptText}
      meta="{items.length} item · {participants.length} orang · {formatMoney(totalAmount, currency)}"
      onShare={() => (showShareModal = true)}
    />

    {#if claimedId == null}
      <div class="mx-5 mb-4 px-3.5 py-2.5 rounded-sk-sm border border-dashed border-[rgba(124,106,255,0.30)] flex items-center gap-2.5">
        <Icon icon={UserRoundPlus} size={15} class="text-[#7c6aff] flex-shrink-0" />
        <span class="flex-1 text-xs text-sk-text2">Kamu belum terdaftar di bill ini.</span>
        <button type="button" onclick={() => (showClaimModal = true)} class="text-xs font-bold text-[#7c6aff] flex-shrink-0">
          Klaim / Gabung
        </button>
      </div>
    {:else if claimedName}
      <div class="mx-5 mb-4 text-[11px] text-sk-text3">
        Masuk sebagai <strong class="text-sk-text2">{claimedName}</strong>
      </div>
    {/if}

    <!-- ── OCR BANNER (simulasi) ── -->
    <div class="px-5 pt-5 animate-fade-up animate-fade-up-1">
      <button
        type="button"
        onclick={() => (showOcrModal = true)}
        class="w-full flex items-center gap-3 px-4 py-3 rounded-sk border-[1.5px] border-dashed transition-all duration-200 text-left hover:border-[#7c6aff] hover:bg-[rgba(124,106,255,0.06)]"
        style="border-color:rgba(124,106,255,0.35);background:rgba(124,106,255,0.04)"
      >
        <div class="w-9 h-9 rounded-sk-sm flex items-center justify-center flex-shrink-0" style="background:rgba(124,106,255,0.15)">
          <Icon icon={ScanLine} size={18} class="text-[#7c6aff]" />
        </div>
        <div class="flex-1">
          <div class="text-sm font-semibold text-[#7c6aff]">Scan struk / OCR</div>
          <div class="text-[11px] text-sk-text2 mt-0.5">Foto struk, item otomatis terdeteksi</div>
        </div>
        <Icon icon={ChevronDown} size={14} class="text-sk-text3 flex-shrink-0" />
      </button>
    </div>

    <!-- ── ITEMS ── -->
    <div class="px-5 mt-6 animate-fade-up animate-fade-up-2">
      <div class="flex items-center justify-between mb-3.5">
        <span class="sk-section-title">Item Struk</span>
        <span class="text-[11px] text-sk-text2">{items.length} item</span>
      </div>

      {#if items.length === 0}
        <p class="text-xs text-sk-text3 text-center py-6">Belum ada item. Tambah manual atau scan struk.</p>
      {:else}
        {#each items as item (item.id)}
          <SplitItemCard
            {item}
            {participants}
            {currency}
            onCommit={commitItem}
            onDelete={deleteItem}
            onToggleAssignee={toggleAssignee}
            onAssignAll={assignAllItem}
          />
        {/each}
      {/if}

      <button
        type="button"
        onclick={addItem}
        class="w-full py-2.5 border-[1.5px] border-dashed border-sk rounded-sk-sm text-xs font-semibold text-sk-text2 hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all duration-200 flex items-center justify-center gap-1.5 mt-1"
      >
        <Icon icon={Plus} size={14} /> Tambah Item
      </button>
    </div>

    <!-- ── PAYER ── -->
    <div class="px-5 mt-6 animate-fade-up animate-fade-up-3">
      <span class="sk-section-title block mb-3">Dibayar Oleh</span>
      <div class="sk-card p-4 flex items-center gap-3">
        <div class="flex-1">
          <label class="sk-label" for="splitPayer">Pembayar (1 orang)</label>
          <select
            id="splitPayer"
            value={payerId ?? ''}
            onchange={(e) => {
              const next = parseInt((e.target as HTMLSelectElement).value, 10)
              if (Number.isFinite(next)) void changePayer(next)
            }}
            class="sk-input text-sm appearance-none"
          >
            <option value="" disabled>Pilih pembayar…</option>
            {#each participants as p}
              <option value={p.id}>{p.name}</option>
            {/each}
          </select>
          <p class="text-[11px] text-sk-text3 mt-1">Akan tercatat sebagai pembayar.</p>
        </div>
      </div>
    </div>

    <SplitAdjustments
      discount={bill.discount}
      tax={bill.tax}
      serviceCharge={bill.serviceCharge}
      {currency}
      onCommit={commitAdjustment}
    />

    <SplitSummary
      {subtotal}
      discount={bill.discount}
      tax={bill.tax}
      serviceCharge={bill.serviceCharge}
      total={totalAmount}
      {currency}
    />

    <SplitBreakdown {items} {participants} {owedById} {currency} />

    <!-- ── BALANCES ── -->
    <div class="px-5 mb-7 animate-fade-up animate-fade-up-3">
      <div class="flex items-center justify-between mb-3.5">
        <span class="sk-section-title">Saldo & Utang</span>
        <span class="text-[11px] text-sk-text2">disederhanakan</span>
      </div>

      {#if balances.length === 0}
        <p class="text-xs text-sk-text3 text-center py-6">Tidak ada utang. Semua beres.</p>
      {:else}
        {#each balances as b (b.id)}
          <BalanceCard balance={b} currency={currency} onMarkPaid={markPaid} />
        {/each}
      {/if}
    </div>

    {#if activities.length > 0}
      <ActivityList {activities} />
    {:else}
      <div class="px-5 mb-7 animate-fade-up animate-fade-up-4">
        <div class="sk-section-title mb-3.5">Log Aktivitas</div>
        <p class="text-xs text-sk-text3 text-center py-4">Belum ada aktivitas.</p>
      </div>
    {/if}
  {/if}
</div>

<!-- ── FIXED BOTTOM BAR ── -->
{#if !loading && bill}
  <div
    class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-40 border-t border-sk backdrop-blur-xl px-5 pt-3.5 pb-7 bg-sk-bg/93"
  >
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <div class="text-[10px] font-mono text-sk-text2 mb-0.5">Grand Total</div>
        <div class="text-xl font-extrabold font-mono text-[#7c6aff]">{formatMoney(totalAmount, currency)}</div>
      </div>
      <button type="button" onclick={() => (showShareModal = true)} class="sk-btn-primary px-5 py-3 gap-2">
        <Icon icon={Share2} size={15} strokeWidth={2} />
        Selesai & Bagikan
      </button>
    </div>
  </div>
{/if}

{#if showParticipantModal && bill}
  <ParticipantModal
    {participants}
    onClose={() => (showParticipantModal = false)}
    onAdd={(name) => handleAddParticipant(name)}
    onRemove={handleRemoveParticipant}
    onDone={() => {
      showParticipantModal = false
      toastStore.show('✓ Anggota tersimpan')
    }}
  />
{/if}

{#if showClaimModal && bill}
  <ClaimModal
    {participants}
    onClaim={handleClaim}
    onJoin={handleJoinClaim}
    onClose={() => {
      claimDismissed = true
      showClaimModal = false
    }}
  />
{/if}

{#if showShareModal && bill}
  <SplitShareModal
    title={bill.name}
    itemCount={items.length}
    memberCount={participants.length}
    total={totalAmount}
    {currency}
    {shareUrl}
    onClose={() => (showShareModal = false)}
  />
{/if}

{#if showOcrModal && bill}
  <SplitOcrModal {currency} onApply={applyOcr} onClose={() => (showOcrModal = false)} />
{/if}
