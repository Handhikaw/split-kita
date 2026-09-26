<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte'
  import MoneyInput from '$lib/components/ui/MoneyInput.svelte'
  import { Trash2 } from 'lucide-svelte'
  import { formatMoney } from '$lib/money'
  import { toastStore } from '$lib/stores.svelte'
  import type { SplitItem } from '$lib/api/split'
  import type { Participant } from '$lib/types'

  interface Props {
    item: SplitItem
    participants: Participant[]
    currency?: string
    /** Patch penuh (nama/qty/harga) — dipanggil saat blur bila berubah. */
    onCommit: (id: number, patch: { name: string; price: number; quantity: number }) => void
    onDelete: (id: number) => void
    onToggleAssignee: (id: number, pid: number) => void
    onAssignAll: (id: number) => void
  }

  let { item, participants, currency = 'IDR', onCommit, onDelete, onToggleAssignee, onAssignAll }: Props =
    $props()

  // Draft lokal + resync dari server saat tidak diedit (pola MoneyInput).
  let editing = $state(false)
  let name = $state(item.name)
  let qty = $state(item.quantity)
  let price = $state<number | null>(item.price)

  $effect(() => {
    if (!editing) {
      name = item.name
      qty = item.quantity
      price = item.price
    }
  })

  const subtotal = $derived((price ?? 0) * Math.max(1, qty || 1))

  function commit() {
    editing = false
    const next = {
      name,
      price: price ?? 0,
      quantity: Math.max(1, Math.floor(qty || 1))
    }
    if (next.name !== item.name || next.price !== item.price || next.quantity !== item.quantity) {
      onCommit(item.id, next)
    }
  }
</script>

<div class="sk-card p-3.5 mb-2.5">
  <!-- Row 1: nama + hapus -->
  <div class="flex gap-2 items-center mb-2.5" onfocusin={() => (editing = true)} onfocusout={commit}>
    <input
      type="text"
      bind:value={name}
      placeholder="Nama item..."
      class="sk-input flex-1 text-sm"
      aria-label="Nama item"
    />
    <button
      type="button"
      onclick={() => onDelete(item.id)}
      class="w-8 h-8 rounded-lg border border-sk flex items-center justify-center text-sk-text3 hover:text-red-400 hover:border-red-400 hover:bg-red-500/10 transition-all flex-shrink-0"
      aria-label="Hapus item"
    >
      <Icon icon={Trash2} size={13} strokeWidth={1.75} />
    </button>
  </div>

  <!-- Row 2: qty × harga = subtotal -->
  <div
    class="flex items-center gap-2"
    onfocusin={() => (editing = true)}
    onfocusout={commit}
    role="group"
    aria-label="Jumlah dan harga"
  >
    <input
      type="number"
      bind:value={qty}
      min={1}
      class="w-14 flex-shrink-0 bg-sk-surface2 border border-sk rounded-sk-sm px-2 py-2 outline-none text-sm font-bold font-mono text-sk-text text-center"
      aria-label="Jumlah"
    />
    <span class="text-sk-text3 text-sm flex-shrink-0">×</span>
    <MoneyInput bind:value={price} {currency} placeholder="0" label="Harga item" class="flex-1 text-sm" />
    <span class="text-sk-text3 text-sm flex-shrink-0">=</span>
    <span class="text-sm font-bold font-mono text-[#7c6aff] flex-shrink-0">
      {formatMoney(subtotal, currency)}
    </span>
  </div>

  <!-- Row 3: assignee chips -->
  <div class="flex items-center gap-1.5 flex-wrap mt-2.5">
    {#if item.assignees.length === 0}
      <span class="text-[10px] font-bold px-2 py-1 rounded-sk-pill border border-dashed border-yellow-500/50 text-yellow-500">
        Belum dibagi — pilih peserta
      </span>
    {/if}
    <button
      type="button"
      onclick={() => onAssignAll(item.id)}
      class="text-[10px] font-bold px-2 py-1 rounded-sk-pill border border-sk text-sk-text3 bg-sk-surface2 hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all duration-150"
    >
      Semua
    </button>
    {#each participants as p (p.id)}
      {@const assigned = item.assignees.includes(p.id)}
      <button
        type="button"
        onclick={() => {
          if (assigned && item.assignees.length === 1) {
            toastStore.show('Minimal 1 peserta harus dipilih')
            return
          }
          onToggleAssignee(item.id, p.id)
        }}
        class="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-sk-pill border transition-all duration-150"
        class:border-[#7c6aff]={assigned}
        class:bg-[rgba(124,106,255,0.12)]={assigned}
        class:text-[#7c6aff]={assigned}
        class:border-sk={!assigned}
        class:bg-sk-surface2={!assigned}
        class:text-sk-text3={!assigned}
      >
        <span class="w-3 h-3 rounded-full flex-shrink-0" style="background:{p.grad}"></span>
        {p.name.length > 5 ? p.name.slice(0, 5) + '…' : p.name}
      </button>
    {/each}
  </div>
</div>
