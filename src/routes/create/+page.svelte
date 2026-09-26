<script lang="ts">
  import { goto } from '$app/navigation'
  import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { ArrowLeft, Check, LoaderCircle, ReceiptText, Target, Users } from 'lucide-svelte'
  import Avatar from '$lib/components/ui/Avatar.svelte'
  import GradientPicker from '$lib/components/ui/GradientPicker.svelte'
  import { toastStore, formatRp, GRADIENTS } from '$lib/stores.svelte'
  import { ApiError, toUserMessage } from '$lib/api/client'
  import { createGroupBill, getGroupBill, joinGroupBill } from '$lib/api/group'
  import { createSplitBill } from '$lib/api/split'
  import { ensureAuth, setClaimedParticipant } from '$lib/identity'
  import type { BillType, Currency } from '$lib/types'

  // ── State ──────────────────────────────────────────────
  let billType      = $state<BillType>('split')
  let title         = $state('')
  let dateStart     = $state(new Date().toISOString().split('T')[0])
  let dateEnd       = $state('')
  let currency      = $state<Currency>('IDR')
  let customCurrency= $state('')
  let creatorName   = $state('')
  let creatorGrad   = $state(GRADIENTS[0])
  let submitting    = $state(false)

  // ── Derived ────────────────────────────────────────────
  const canSubmit = $derived(title.trim().length > 0 && creatorName.trim().length > 0)
  const charCount = $derived(title.length)

  const CURRENCIES: { code: Currency; flag: string; label: string }[] = [
    { code: 'IDR', flag: '🇮🇩', label: 'Rupiah' },
    { code: 'USD', flag: '🇺🇸', label: 'Dollar' },
    { code: 'SGD', flag: '🇸🇬', label: 'S. Dollar' },
    { code: 'MYR', flag: '🇲🇾', label: 'Ringgit' },
    { code: 'EUR', flag: '🇪🇺', label: 'Euro' },
    { code: 'GBP', flag: '🇬🇧', label: 'Pound' },
    { code: 'JPY', flag: '🇯🇵', label: 'Yen' },
    { code: 'OTHER', flag: '🌐', label: 'Custom' },
  ]

  const TYPE_META = {
    split: {
      icon: ReceiptText, label: 'Split Bill',
      desc: 'Untuk satu tagihan, satu momen. Bayar bareng di restoran, scan struk, bagi otomatis.',
      placeholder: 'cth. Makan Siang Bareng',
      btnGrad: 'linear-gradient(135deg,#7c6aff,#a855f7)',
      btnShadow: '0 4px 16px rgba(124,106,255,0.35)',
    },
    group: {
      icon: Users, label: 'Group Bill',
      desc: 'Banyak transaksi dalam satu grup. Liburan, nongkrong rutin, semua tercatat.',
      placeholder: 'cth. Liburan Bali Juli 2025',
      btnGrad: 'linear-gradient(135deg,#00b89f,#6affd4)',
      btnShadow: '0 4px 16px rgba(106,255,212,0.25)',
    },
    goal: {
      icon: Target, label: 'Patungan',
      desc: 'Kumpulkan dana bersama untuk satu tujuan. Kado, sumbangan, atau apapun.',
      placeholder: 'cth. Kado Perpisahan Pak Rudi',
      btnGrad: 'linear-gradient(135deg,#e8527a,#ff6a8e)',
      btnShadow: '0 4px 16px rgba(255,106,142,0.30)',
    },
  } as const

  // ── Handlers ───────────────────────────────────────────
  async function handleSubmit() {
    if (!canSubmit || submitting) return
    submitting = true

    try {
      const effectiveCurrency = currency === 'OTHER' ? customCurrency.trim() || 'IDR' : currency
      const creator = creatorName.trim()

      if (billType === 'group') {
        await ensureAuth()
        const res = await createGroupBill({
          title: title.trim(),
          currency: effectiveCurrency,
          creator_name: creator
        })

        // BE baru tidak auto-insert owner -> daftarkan creator sebagai peserta.
        // BE lama me-return owner_participant_id -> klaim langsung.
        // Join gagal (offline/ditolak) bukan fatal: bill sudah jadi,
        // ClaimModal di halaman group jadi jalan keluar.
        if (res.owner_participant_id) {
          setClaimedParticipant(res.public_id, res.owner_participant_id)
        } else {
          try {
            await joinGroupBill(res.public_id, creator)
            const detail = await getGroupBill(res.public_id)
            const me = (detail.participants ?? []).find((p) => p.name === creator)
            if (me) setClaimedParticipant(res.public_id, me.participant_id)
          } catch {
            // ditangani ClaimModal saat halaman dibuka
          }
        }

        toastStore.show(`✓ Group Bill "${title.trim()}" dibuat!`)
        submitting = false
        goto(`/group/${res.public_id}`)
        return
      }

      // TODO: endpoint patungan belum ada.
      if (billType === 'split') {
        await ensureAuth()
        const res = await createSplitBill({
          title: title.trim(),
          currency: effectiveCurrency,
          creator_name: creator
        })

        // Split auto-insert owner (BE) -> klaim langsung. Fallback join
        // bila response tidak bawa id (tahan dua versi, pola group).
        if (res.owner_participant_id) {
          setClaimedParticipant(res.public_id, res.owner_participant_id)
        } else {
          try {
            await joinGroupBill(res.public_id, creator)
            const detail = await getGroupBill(res.public_id)
            const me = (detail.participants ?? []).find((p) => p.name === creator)
            if (me) setClaimedParticipant(res.public_id, me.participant_id)
          } catch {
            // ditangani ClaimModal saat halaman dibuka
          }
        }

        toastStore.show(`✓ Split Bill "${title.trim()}" dibuat!`)
        submitting = false
        goto(`/split/${res.public_id}`)
        return
      }

      await new Promise((r) => setTimeout(r, 900))
      toastStore.show(`✓ ${TYPE_META[billType].label} "${title.trim()}" dibuat!`)
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 404 ? 'Endpoint tidak ditemukan.' : toUserMessage(e)
      toastStore.show(msg)
    } finally {
      submitting = false
    }
  }
</script>

<svelte:head>
  <title>SplitKita — Buat Baru</title>
</svelte:head>

<div class="min-h-dvh pb-28">

  <!-- Header -->
  <header class="px-5 pt-12 pb-0 flex items-center justify-between">
    <a href="/"
      class="w-9 h-9 flex items-center justify-center rounded-sk-sm
             border border-sk bg-sk-surface text-sk-text2 text-base
             hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all duration-200
             no-underline"
      aria-label="Kembali">
      <Icon icon={ArrowLeft} size={18} />
    </a>
    <div class="text-[17px] font-extrabold tracking-tight">
      Split<span class="text-[#7c6aff]">Kita</span>
    </div>
    <ThemeToggle />
  </header>

  <!-- Hero text -->
  <div class="px-5 pt-6 pb-6 animate-fade-up animate-fade-up-1">
    <div class="flex items-center gap-2 mb-2">
      <div class="w-1.5 h-1.5 rounded-full bg-[#6affd4] animate-pulse"></div>
      <span class="text-[11px] font-bold font-mono text-[#7c6aff] uppercase tracking-[2px]">Buat Baru</span>
    </div>
    <h1 class="text-3xl font-extrabold tracking-tight leading-tight mb-2">
      Mulai dari<br>mana dulu?
    </h1>
    <p class="text-sm text-sk-text2 leading-relaxed">Pilih tipe, isi detail, langsung bagikan.</p>
  </div>

  <div class="px-5 flex flex-col gap-6 animate-fade-up animate-fade-up-2">

    <!-- ── 1. TYPE SELECTOR ── -->
    <div>
      <div class="grid grid-cols-3 gap-2.5 mb-3" role="radiogroup" aria-label="Tipe tagihan">
        {#each (['split','group','goal'] as BillType[]) as type}
          {@const meta = TYPE_META[type]}
          <button
            type="button"
            onclick={() => billType = type}
            class="relative flex flex-col items-center gap-2 py-4 px-2 rounded-sk
                   border-2 cursor-pointer transition-all duration-200 overflow-hidden
                   bg-sk-surface hover:-translate-y-0.5"
            class:border-[#7c6aff]={billType === type && type === 'split'}
            class:border-[#6affd4]={billType === type && type === 'group'}
            class:border-[#ff6a8e]={billType === type && type === 'goal'}
            class:border-sk={billType !== type}
            class:-translate-y-0.5={billType === type}
            aria-checked={billType === type}
            role="radio"
          >
            <!-- Active glow bg -->
            {#if billType === type}
              <div class="absolute inset-0 opacity-100 transition-opacity pointer-events-none"
                style={
                  type === 'split' ? 'background:linear-gradient(135deg,rgba(124,106,255,0.12),transparent)' :
                  type === 'group' ? 'background:linear-gradient(135deg,rgba(106,255,212,0.10),transparent)' :
                  'background:linear-gradient(135deg,rgba(255,106,142,0.10),transparent)'
                }
              ></div>
            {/if}

            <!-- Check mark -->
            {#if billType === type}
              <div class="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center
                          text-white"
                style={
                  type === 'split' ? 'background:#7c6aff' :
                  type === 'group' ? 'background:#6affd4;color:#0f0f13' :
                  'background:#ff6a8e'
                }
              ><Icon icon={Check} size={11} strokeWidth={3} /></div>
            {/if}

            <span class="relative z-10 text-[#7c6aff]"><Icon icon={meta.icon} size={26} /></span>
            <span class="text-xs font-bold relative z-10"
              class:text-sk-text={billType === type}
              class:text-sk-text2={billType !== type}
            >{meta.label}</span>
          </button>
        {/each}
      </div>

      <!-- Type description -->
      <div class="px-3.5 py-2.5 rounded-sk-sm text-xs text-sk-text2 leading-relaxed
                  border border-sk bg-sk-surface2 min-h-[44px] transition-all duration-250">
        {TYPE_META[billType].desc}
      </div>
    </div>

    <!-- ── 2. TITLE + DATE ── -->
    <div class="flex flex-col gap-3.5">
      <div class="flex items-center gap-2 text-xs font-semibold text-sk-text3 uppercase tracking-widest font-mono
                  before:flex-1 before:h-px before:bg-sk-border after:flex-1 after:h-px after:bg-sk-border">
        Detail Utama
      </div>

      <!-- Title -->
      <div>
        <label for="billTitle" class="sk-label">
          Judul <span class="text-[#ff6a8e] text-sm leading-none">*</span>
        </label>
        <input
          id="billTitle"
          type="text"
          bind:value={title}
          placeholder={TYPE_META[billType].placeholder}
          maxlength={40}
          autocomplete="off"
          class="sk-input text-base font-bold"
        />
        <div class="flex justify-between mt-1.5">
          <span class="text-[11px] text-sk-text3">Nama yang mudah dikenali anggota</span>
          <span class="text-[11px] font-mono transition-colors"
            class:text-[#fbbf24]={charCount > 35}
            class:text-[#f87171]={charCount >= 40}
            class:text-sk-text3={charCount <= 35}
          >{charCount}/40</span>
        </div>
      </div>

      <!-- Date row -->
      <div class="flex gap-2">
        <div class="flex-1">
          <label for="dateStart" class="sk-label">Tanggal</label>
          <input id="dateStart" type="date" bind:value={dateStart} class="sk-input text-sm" />
        </div>
        {#if billType === 'group'}
          <div class="flex-1">
            <label for="dateEnd" class="sk-label">Sampai</label>
            <input id="dateEnd" type="date" bind:value={dateEnd} class="sk-input text-sm" />
          </div>
        {/if}
      </div>
    </div>

    <!-- ── 3. CURRENCY ── -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2 text-xs font-semibold text-sk-text3 uppercase tracking-widest font-mono
                  before:flex-1 before:h-px before:bg-sk-border after:flex-1 after:h-px after:bg-sk-border">
        Mata Uang
      </div>

      <div class="grid grid-cols-4 gap-2">
        {#each CURRENCIES as cur}
          <button
            type="button"
            onclick={() => currency = cur.code}
            class="flex flex-col items-center gap-1 py-2.5 px-1.5 rounded-sk-sm
                   border-[1.5px] cursor-pointer transition-all duration-200 bg-sk-surface2"
            class:border-[#7c6aff]={currency === cur.code}
            class:bg-[rgba(124,106,255,0.10)]={currency === cur.code}
            class:border-sk={currency !== cur.code}
          >
            <span class="text-lg leading-none">{cur.flag}</span>
            <span class="text-[11px] font-bold font-mono transition-colors"
              class:text-[#7c6aff]={currency === cur.code}
              class:text-sk-text2={currency !== cur.code}
            >{cur.code === 'OTHER' ? 'Lain' : cur.code}</span>
            <span class="text-[9px] text-sk-text3 leading-none">{cur.label}</span>
          </button>
        {/each}
      </div>

      {#if currency === 'OTHER'}
        <div class="flex items-center gap-2">
          <span class="text-xs text-sk-text3 flex-shrink-0">Kode:</span>
          <input
            type="text"
            bind:value={customCurrency}
            placeholder="cth. THB, AUD, KRW..."
            maxlength={5}
            class="sk-input text-sm font-mono font-bold flex-1"
            oninput={(e) => { customCurrency = (e.target as HTMLInputElement).value.toUpperCase() }}
          />
        </div>
      {/if}
    </div>

    <!-- ── 4. CREATOR ── -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2 text-xs font-semibold text-sk-text3 uppercase tracking-widest font-mono
                  before:flex-1 before:h-px before:bg-sk-border after:flex-1 after:h-px after:bg-sk-border">
        Pembuat Tagihan
      </div>

      <div class="flex items-end gap-3">
        <!-- Live avatar preview -->
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center
                 text-lg font-bold text-white flex-shrink-0 mb-px border-2 border-sk-border"
          style="background:{creatorGrad}"
        >
          {creatorName.trim() ? creatorName.trim()[0].toUpperCase() : '?'}
        </div>
        <div class="flex-1">
          <label for="creatorName" class="sk-label">
            Nama kamu <span class="text-[#ff6a8e] text-sm leading-none">*</span>
          </label>
          <input
            id="creatorName"
            type="text"
            bind:value={creatorName}
            placeholder="Nama atau nickname..."
            maxlength={20}
            autocomplete="name"
            class="sk-input text-sm"
          />
        </div>
      </div>

      <div>
        <label class="sk-label">Warna avatar</label>
        <GradientPicker bind:value={creatorGrad} />
      </div>
    </div>

    <!-- ── 5. LIVE PREVIEW ── -->
    <div>
      <div class="flex items-center gap-2 text-xs font-semibold text-sk-text3 uppercase tracking-widest font-mono
                  before:flex-1 before:h-px before:bg-sk-border after:flex-1 after:h-px after:bg-sk-border mb-3">
        Preview
      </div>

      <div class="sk-card p-4 flex items-center gap-3">
        <!-- Type icon -->
        <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={
            billType === 'split' ? 'background:rgba(124,106,255,0.12);color:#7c6aff' :
            billType === 'group' ? 'background:rgba(106,255,212,0.12);color:#6affd4' :
            'background:rgba(255,106,142,0.12);color:#ff6a8e'
          }
        >
          <Icon icon={TYPE_META[billType].icon} size={22} />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="font-bold text-[15px] truncate mb-1 transition-colors"
            class:text-sk-text={title}
            class:text-sk-text3={!title}
          >
            {title || 'Belum ada judul...'}
          </div>
          <div class="flex gap-1.5 flex-wrap">
            <span class="sk-tag sk-tag-violet">{TYPE_META[billType].label}</span>
            <span class="sk-tag sk-tag-teal">{currency === 'OTHER' ? (customCurrency || 'CUSTOM') : currency}</span>
            {#if dateStart}
              <span class="sk-tag sk-tag-yellow">
                {new Date(dateStart).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}
              </span>
            {/if}
          </div>
        </div>

        <!-- Creator avatar -->
        <div class="w-9 h-9 rounded-full flex items-center justify-center
                    text-sm font-bold text-white flex-shrink-0 border-2 border-sk-surface2"
             style="background:{creatorGrad}">
          {creatorName.trim() ? creatorName.trim()[0].toUpperCase() : '?'}
        </div>
      </div>
    </div>

  </div><!-- end form body -->
</div>

<!-- ── FIXED SUBMIT BAR ── -->
<div class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[420px] z-50
            border-t border-sk backdrop-blur-xl px-5 pt-3.5 pb-7
            bg-sk-bg/93">
  <div class="flex gap-2.5">
    <a href="/"
      class="w-12 h-12 rounded-sk-sm border border-sk bg-sk-surface2
             flex items-center justify-center text-sk-text2
             hover:border-sk-text2 hover:text-sk-text transition-all no-underline flex-shrink-0"
      aria-label="Kembali">
      <Icon icon={ArrowLeft} size={20} />
    </a>
    <button
      type="button"
      onclick={handleSubmit}
      disabled={!canSubmit || submitting}
      class="flex-1 h-12 rounded-sk-sm text-sm font-bold text-white
             flex items-center justify-center gap-2
             transition-all duration-250 disabled:opacity-35 disabled:cursor-not-allowed"
      style="background:{TYPE_META[billType].btnGrad}; box-shadow:{canSubmit ? TYPE_META[billType].btnShadow : 'none'}"
    >
      {#if submitting}
        <Icon icon={LoaderCircle} size={16} class="animate-spin" />
        Membuat...
      {:else}
        <Icon icon={TYPE_META[billType].icon} size={16} /> Buat {TYPE_META[billType].label}
      {/if}
    </button>
  </div>
</div>
