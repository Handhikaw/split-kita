<script lang="ts">
  import { page } from '$app/state'
  import GroupHeader from '$lib/components/group/GroupHeader.svelte'
  import SummaryCard from '$lib/components/group/SummaryCard.svelte'
  import ExpenseCard from '$lib/components/group/ExpenseCard.svelte'
  import BalanceCard from '$lib/components/group/BalanceCard.svelte'
  import ActivityList from '$lib/components/group/ActivityList.svelte'
  import ExpenseModal, { type ExpenseDraft } from '$lib/components/group/ExpenseModal.svelte'
  import ParticipantModal from '$lib/components/group/ParticipantModal.svelte'
  import ClaimModal from '$lib/components/group/ClaimModal.svelte'
  import SplitShareModal from '$lib/components/split/SplitShareModal.svelte'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { wheelX, dragX, fadeX } from '$lib/actions'
  import { Plus, Sparkles, TriangleAlert, RotateCw, UserRoundPlus, Share2, Users } from 'lucide-svelte'
  import { toastStore } from '$lib/stores.svelte'
  import { formatMoney } from '$lib/money'
  import { ApiError, toUserMessage } from '$lib/api/client'
  import {
    createExpenseApi,
    createExpenseItemApi,
    deleteExpenseApi,
    deleteExpenseItemApi,
    deleteParticipantApi,
    findCategoryId,
    getExpenseCategories,
    getGroupBill,
    joinGroupBill,
    mapGroupBill,
    recordPaymentApi,
    updateExpenseApi,
    updateExpenseItemApi,
    upsertParticipantApi,
    type ExpenseCategoryDto,
    type GroupBillView
  } from '$lib/api/group'
  import {
    clearClaim,
    getClaimedParticipant,
    getUserId,
    setClaimedParticipant
  } from '$lib/identity'
  import { getActivities, mapActivityItem } from '$lib/api/activity'
  import { DEFAULT_CATEGORY_NAMES } from '$lib/types'
  import type { Activity, Expense } from '$lib/types'

  const publicId = $derived(page.params.id ?? '')

  // ── Server state ──
  let bill = $state<GroupBillView | null>(null)
  let categoryList = $state<ExpenseCategoryDto[]>([])
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
      // Bill + kategori + aktivitas paralel. Aktivitas boleh gagal
      // (endpoint baru) tanpa menggagalkan halaman.
      const [billDto, cats, acts] = await Promise.all([
        getGroupBill(publicId),
        getExpenseCategories(getUserId()).catch(() => [] as ExpenseCategoryDto[]),
        getActivities(publicId).catch(() => [])
      ])
      bill = mapGroupBill(billDto)
      categoryList = cats
      activities = acts.map((a) => mapActivityItem(a, billDto.currency))
      if (announce) {
        loadError = ''
        activeTab = 'Semua'
      }
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
  let activeTab = $state('Semua')
  // Tab filter mengikuti list backend; fallback lokal kalau fetch gagal.
  const TABS = $derived(['Semua', ...(categoryList.length > 0 ? categoryList.map((c) => c.name) : DEFAULT_CATEGORY_NAMES)])

  // Status lunas lokal (mark-paid ditunda: belum ada fitur backend).
  let settledIds = $state<Set<number>>(new Set())

  let showExpenseModal = $state(false)
  let showParticipantModal = $state(false)
  let showClaimModal = $state(false)
  let showShareModal = $state(false)
  let claimDismissed = $state(false)

  const expenses = $derived(bill?.expenses ?? [])
  const participants = $derived(bill?.participants ?? [])
  const totalAmount = $derived(bill?.totalAmount ?? 0)
  const perPerson = $derived(participants.length > 0 ? Math.round(totalAmount / participants.length) : 0)
  const balances = $derived(
    (bill?.balances ?? []).map((b) => (settledIds.has(b.id) ? { ...b, status: 'settled' as const } : b))
  )
  const filteredExpenses = $derived(
    activeTab === 'Semua' ? expenses : expenses.filter((e) => e.category === activeTab)
  )
  const claimedId = $derived(getClaimedParticipant(publicId))
  const claimedName = $derived(participants.find((p) => p.id === claimedId)?.name)

  // Auto-buka claim: hanya kalau ada peserta + belum klaim + belum di-dismiss.
  $effect(() => {
    if (!loading && bill && participants.length > 0 && claimedId == null && !claimDismissed) {
      showClaimModal = true
    }
  })

  function toggleExpand(id: number) {
    if (!bill) return
    bill = { ...bill, expenses: bill.expenses.map((e) => (e.id === id ? { ...e, expanded: !e.expanded } : e)) }
  }

  // Item detail dirender kondisional ({#if expanded}) sehingga CSS print
  // tidak bisa memunculkannya -> expand semua saat dialog cetak dibuka,
  // kembalikan setelahnya.
  let expandedBeforePrint: number[] = []
  function handleBeforePrint() {
    if (!bill) return
    expandedBeforePrint = bill.expenses.filter((e) => e.expanded).map((e) => e.id)
    bill = { ...bill, expenses: bill.expenses.map((e) => ({ ...e, expanded: true })) }
  }
  function handleAfterPrint() {
    if (!bill) return
    const keep = new Set(expandedBeforePrint)
    bill = { ...bill, expenses: bill.expenses.map((e) => ({ ...e, expanded: keep.has(e.id) })) }
    expandedBeforePrint = []
  }

  $effect(() => {
    if (typeof window === 'undefined') return
    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  })

  function markPaid(id: number) {
    settledIds = new Set(settledIds).add(id)
    toastStore.show('✓ Utang ditandai lunas')
    // Ditunda (user): belum ada fitur backend untuk payment di group.
  }

  const claimedOrUndefined = () => claimedId ?? undefined

  // ── Mutasi: expense ──
  let editingExpense = $state<Expense | null>(null)

  function openEdit(id: number) {
    const target = expenses.find((e) => e.id === id)
    if (!target) return
    editingExpense = target
    showExpenseModal = true
  }

  function closeExpenseModal() {
    editingExpense = null
    showExpenseModal = false
  }

  function participantIdByName(name: string): number | undefined {
    return participants.find((p) => p.name === name)?.id
  }

  /** Target peserta expense dari draft (dipakai create + edit). */
  function resolveTargetIds(draft: ExpenseDraft): number[] {
    const allIds = participants.map((p) => p.id)
    if (draft.isDetail) {
      const union = [...new Set(draft.items.flatMap((i) => i.assignees))]
      return union.length > 0 ? union : allIds
    }
    const picked = draft.splitAll
      ? allIds
      : draft.assigned
          .map((name) => participantIdByName(name))
          .filter((id): id is number => id != null)
    return picked.length > 0 ? picked : allIds
  }

  /**
   * Catat ulang pembayaran setelah simpan: payer jadi kreditur.
   * Upsert per (expense, payer) jadi aman dipanggil ulang.
   * oldPayerName diisi saat payer berganti (pindah baris payment, bukan nambah).
   */
  async function recordPayerPayment(
    expenseId: number,
    payerName: string,
    fallbackAmount: number,
    oldPayerName?: string
  ) {
    const payerId = participantIdByName(payerName)
    if (payerId == null) {
      toastStore.show('✓ Tersimpan, tapi pembayar tak dikenal — pembayaran tak tercatat')
      return
    }
    try {
      const serverExp = (bill?.expenses ?? []).find((e) => e.id === expenseId)
      const total = serverExp ? serverExp.amount : fallbackAmount
      const oldId = oldPayerName ? participantIdByName(oldPayerName) : undefined
      await recordPaymentApi(publicId, {
        expense_id: expenseId,
        participant_id: payerId,
        ...(oldId != null && oldId !== payerId ? { old_participant_id: oldId } : {}),
        amount: total
      })
      await load(false)
    } catch {
      toastStore.show('✓ Tersimpan, tapi pencatatan pembayaran gagal')
    }
  }

  function sameIdList(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false
    const sorted = [...b].sort((x, y) => x - y)
    return [...a].sort((x, y) => x - y).every((v, i) => v === sorted[i])
  }
  async function submitExpense(draft: ExpenseDraft) {
    // created_by backend = peserta yang login (hasil claim), untuk log activity.
    const actorId = getClaimedParticipant(publicId)
    if (actorId == null) {
      toastStore.show('Klaim dulu sebagai peserta biar tercatat di log')
      showClaimModal = true
      return
    }

    const allIds = participants.map((p) => p.id)
    const ids = resolveTargetIds(draft)

    try {
      const category = findCategoryId(categoryList, draft.category)
      let expenseIdForPayment = NaN
      const created = await createExpenseApi(
        {
          public_id: publicId,
          title: draft.name,
          type: draft.isDetail ? 'DETAIL' : 'SIMPLE',
          // Contoh kontrak DETAIL tidak kirim amount (dihitung dari items).
          ...(draft.isDetail ? {} : { amount: draft.amount }),
          ...(category != null ? { category } : {}),
          created_by: actorId,
          participants: ids
        },
        claimedOrUndefined()
      )

      if (draft.isDetail && draft.items.length > 0) {
        // Response create bawa id expense -> pakai langsung. Fallback:
        // cari expense terbaru berjudul sama kalau id tidak ada.
        let expenseId = created.id
        if (!Number.isFinite(expenseId)) {
          await load(false)
          const fresh = (bill?.expenses ?? [])
            .filter((e) => e.name === draft.name)
            .sort((a, b) => b.id - a.id)[0]
          expenseId = fresh?.id ?? NaN
        }
        expenseIdForPayment = expenseId
        if (Number.isFinite(expenseId)) {
          for (const item of draft.items) {
            // Item tanpa assign = ikut semua (konsisten perilaku backend []).
            const itemIds = item.assignees.length > 0 ? item.assignees : allIds
            await createExpenseItemApi(
              publicId,
              expenseId,
              { name: item.name, price: item.price, quantity: item.quantity, participants: itemIds },
              claimedOrUndefined()
            )
          }
          expenseIdForPayment = expenseId
        }
        await load(false)
      } else {
        await load(false)
        expenseIdForPayment = created.id
      }

      // Auto-catat pembayaran: payer expense jadi kreditur -> settlements muncul.
      // Upsert per (expense, payer) jadi aman dipanggil ulang.
      if (Number.isFinite(expenseIdForPayment)) {
        await recordPayerPayment(expenseIdForPayment, draft.payer, draft.amount)
      }

      showExpenseModal = false
      toastStore.show('✓ Pengeluaran ditambahkan')
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  // ── Mutasi: ubah expense ──
  async function submitEdit(target: Expense, draft: ExpenseDraft) {
    const actorId = getClaimedParticipant(publicId)
    if (actorId == null) {
      toastStore.show('Klaim dulu sebagai peserta biar tercatat di log')
      showClaimModal = true
      return
    }

    const allIds = participants.map((p) => p.id)
    const ids = resolveTargetIds(draft)

    try {
      const category = findCategoryId(categoryList, draft.category)
      const payerId = participantIdByName(draft.payer)
      await updateExpenseApi(
        publicId,
        target.id,
        {
          title: draft.name,
          // DETAIL: amount diabaikan BE (resync dari items).
          ...(draft.isDetail ? {} : { amount: draft.amount }),
          ...(category != null ? { category } : {}),
          ...(payerId != null ? { created_by: payerId } : {}),
          participants: ids
        },
        claimedOrUndefined()
      )

      if (draft.isDetail) {
        const origById = new Map(
          target.items.filter((i) => i.id != null).map((i) => [i.id as number, i])
        )
        const seen = new Set<number>()
        for (const item of draft.items) {
          const itemIds = item.assignees.length > 0 ? item.assignees : allIds
          if (item.id != null && origById.has(item.id)) {
            seen.add(item.id)
            const orig = origById.get(item.id)!
            if (
              orig.name !== item.name ||
              orig.price !== item.price ||
              orig.quantity !== item.quantity ||
              !sameIdList(orig.assignees, itemIds)
            ) {
              await updateExpenseItemApi(
                publicId,
                target.id,
                item.id,
                { name: item.name, price: item.price, quantity: item.quantity, participants: itemIds },
                claimedOrUndefined()
              )
            }
          } else {
            await createExpenseItemApi(
              publicId,
              target.id,
              { name: item.name, price: item.price, quantity: item.quantity, participants: itemIds },
              claimedOrUndefined()
            )
          }
        }
        for (const orig of target.items) {
          if (orig.id != null && !seen.has(orig.id)) {
            await deleteExpenseItemApi(publicId, target.id, orig.id, claimedOrUndefined())
          }
        }
      }

      await load(false)
      await recordPayerPayment(target.id, draft.payer, draft.amount, target.payer)

      editingExpense = null
      showExpenseModal = false
      toastStore.show('✓ Perubahan disimpan')
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  async function handleDeleteExpense(id: number) {
    try {
      await deleteExpenseApi(publicId, id, claimedOrUndefined())
      editingExpense = null
      showExpenseModal = false
      await load(false)
      toastStore.show('✓ Pengeluaran dihapus')
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  function handleModalSubmit(draft: ExpenseDraft) {
    if (editingExpense) void submitEdit(editingExpense, draft)
    else void submitExpense(draft)
  }

  // ── Mutasi: peserta (via Kelola Anggota — aktor = member yang login) ──
  async function handleAddParticipant(name: string) {
    try {
      await upsertParticipantApi(
        publicId,
        { name, is_owner: false },
        claimedOrUndefined()
      )
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
      if (claimedId === id) clearClaim(publicId)
      await load(false)
      if (p) toastStore.show(`${p.name} dihapus`)
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  // ── Claim flow ──
  function handleClaim(id: number) {
    setClaimedParticipant(publicId, id)
    showClaimModal = false
    const p = participants.find((p) => p.id === id)
    toastStore.show(`✓ Kamu masuk sebagai ${p?.name ?? ''}`)
  }

  async function handleJoinClaim(name: string) {
    const clean = name.trim()
    if (!clean) return
    // Nama sudah ada -> klaim yang existing, jangan duplikat.
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
      showClaimModal = false
      toastStore.show(`✓ Kamu gabung sebagai ${clean}`)
    } catch (e) {
      toastStore.show(toUserMessage(e))
    }
  }

  // (tidak ada lagi state dummy — activities diisi dari endpoint)
</script>

<svelte:head>
  <title>SplitKita — {bill?.name ?? 'Group Bill'}</title>
</svelte:head>

<div class="min-h-dvh pb-28">
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
        <span>Bill ini berstatus {bill.status}. Halaman khusus expired menyusul.</span>
      </div>
    {/if}

    <GroupHeader
      {participants}
      activeId={activeParticipantId}
      onSelect={(id) => (activeParticipantId = id)}
      onAddClick={() => (showParticipantModal = true)}
      title={bill.name}
      titleIcon={Users}
      code={publicId.toUpperCase()}
      itemCount={expenses.length}
    />

    {#if claimedId == null}
      <div class="mx-5 mb-4 px-3.5 py-2.5 rounded-sk-sm border border-dashed border-[rgba(124,106,255,0.30)] flex items-center gap-2.5 no-print">
        <Icon icon={UserRoundPlus} size={15} class="text-[#7c6aff] flex-shrink-0" />
        <span class="flex-1 text-xs text-sk-text2">Kamu belum terdaftar di bill ini.</span>
        <button
          type="button"
          onclick={() => (showClaimModal = true)}
          class="text-xs font-bold text-[#7c6aff] flex-shrink-0"
        >
          Klaim / Gabung
        </button>
      </div>
    {:else if claimedName}
      <div class="mx-5 mb-4 text-[11px] text-sk-text3 no-print">
        Masuk sebagai <strong class="text-sk-text2">{claimedName}</strong>
      </div>
    {/if}

    <SummaryCard
      totalAmount={totalAmount}
      expenseCount={expenses.length}
      perPerson={perPerson}
      currency={bill.currency}
    />

    <!-- ── EXPENSES ── -->
    <div class="px-5 mb-7 animate-fade-up animate-fade-up-2">
      <div class="flex items-center justify-between mb-3.5">
        <span class="sk-section-title">Pengeluaran</span>
        <button
          type="button"
          onclick={() => (showExpenseModal = true)}
          class="w-7 h-7 rounded-lg bg-[#7c6aff] hover:bg-[rgba(124,106,255,0.85)] text-white flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-[0_2px_8px_rgba(124,106,255,0.35)]"
          aria-label="Tambah pengeluaran"
        >
          <Icon icon={Plus} size={16} strokeWidth={2.5} />
        </button>
      </div>

      <!-- ── CATEGORY FILTER: scroll horizontal (touch native, mouse via wheelX + dragX) -->
      <div
        class="flex gap-1.5 overflow-x-auto scrollbar-none touch-pan-x drag-scroll mb-4"
        use:wheelX
        use:dragX
        use:fadeX
      >
        {#each TABS as tab}
          <button
            type="button"
            onclick={() => (activeTab = tab)}
            class="flex-shrink-0 px-3.5 py-1.5 rounded-sk-pill text-xs font-semibold border transition-all duration-200"
            class:bg-[#7c6aff]={activeTab === tab}
            class:border-[#7c6aff]={activeTab === tab}
            class:text-white={activeTab === tab}
            class:shadow-[0_2px_8px_rgba(124,106,255,0.3)]={activeTab === tab}
            class:border-sk={activeTab !== tab}
            class:text-sk-text2={activeTab !== tab}
            class:bg-sk-surface={activeTab !== tab}
          >
            {tab}
          </button>
        {/each}
      </div>

      {#if filteredExpenses.length === 0}
        <p class="text-xs text-sk-text3 text-center py-6">Belum ada pengeluaran.</p>
      {:else}
        {#each filteredExpenses as expense (expense.id)}
          <ExpenseCard
            {expense}
            memberCount={expense.splitCount ?? participants.length}
            currency={bill.currency}
            onToggle={toggleExpand}
            onEdit={openEdit}
          />
        {/each}
      {/if}
    </div>

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
          <BalanceCard balance={b} currency={bill.currency} onMarkPaid={markPaid} />
        {/each}
      {/if}

      <div
        class="p-3.5 rounded-sk border border-dashed border-[rgba(124,106,255,0.30)] flex items-center justify-between gap-4 mt-1"
        style="background:linear-gradient(90deg,rgba(124,106,255,0.08),rgba(255,106,142,0.06))"
      >
        <div>
          <div class="text-xs font-semibold mb-0.5">Unlock Mark as Paid</div>
          <div class="text-[11px] text-sk-text2">Upgrade ke Pro untuk semua fitur</div>
        </div>
        <a
          href="/upgrade"
          class="px-3.5 py-2 rounded-lg text-xs font-bold text-white flex-shrink-0 no-underline transition-all duration-200 hover:-translate-y-0.5 flex items-center gap-1"
          style="background:linear-gradient(135deg,#7c6aff,#ff6a8e);box-shadow:0 4px 12px rgba(124,106,255,0.3)"
        >
          <Icon icon={Sparkles} size={13} /> Pro
        </a>
      </div>
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

<!-- ── FIXED BOTTOM BAR (ala split: total + bagikan; aksi, tidak ikut cetak) ── -->
{#if !loading && bill}
  <div
    class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-40 border-t border-sk backdrop-blur-xl px-5 pt-3.5 pb-7 bg-sk-bg/93 no-print"
  >
    <div class="flex items-center gap-3">
      <div class="flex-1">
        <div class="text-[10px] font-mono text-sk-text2 mb-0.5">Total Pengeluaran</div>
        <div class="text-xl font-extrabold font-mono text-[#7c6aff]">
          {formatMoney(totalAmount, bill.currency)}
        </div>
      </div>
      <button type="button" onclick={() => (showShareModal = true)} class="sk-btn-primary px-5 py-3 gap-2">
        <Icon icon={Share2} size={15} strokeWidth={2} />
        Bagikan
      </button>
    </div>
  </div>
{/if}

{#if showExpenseModal && bill}
  <ExpenseModal
    {participants}
    categories={TABS.slice(1)}
    currency={bill.currency}
    defaultPayer={claimedName}
    editing={editingExpense}
    onClose={closeExpenseModal}
    onSubmit={handleModalSubmit}
    onDelete={handleDeleteExpense}
  />
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
    itemCount={expenses.length}
    unitLabel="transaksi"
    memberCount={participants.length}
    total={totalAmount}
    currency={bill.currency}
    shareUrl={typeof window !== 'undefined' ? window.location.href : ''}
    onClose={() => (showShareModal = false)}
  />
{/if}
