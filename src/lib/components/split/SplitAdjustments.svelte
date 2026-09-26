<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte'
  import MoneyInput from '$lib/components/ui/MoneyInput.svelte'
  import { Percent, ReceiptText, UtensilsCrossed } from 'lucide-svelte'

  export type AdjustmentField = 'discount' | 'tax' | 'serviceCharge'

  interface Props {
    discount: number
    tax: number
    serviceCharge: number
    currency?: string
    /** Dipanggil saat blur bila nilai berubah (minor-int, null = kosongkan). */
    onCommit: (field: AdjustmentField, value: number | null) => void
  }

  let { discount, tax, serviceCharge, currency = 'IDR', onCommit }: Props = $props()

  // Draft lokal + resync server saat tidak diedit (pola MoneyInput).
  let editing = $state(false)
  let dVal = $state<number | null>(discount)
  let tVal = $state<number | null>(tax)
  let sVal = $state<number | null>(serviceCharge)

  $effect(() => {
    if (!editing) {
      dVal = discount
      tVal = tax
      sVal = serviceCharge
    }
  })

  const ROWS: { field: AdjustmentField; label: string; icon: typeof Percent }[] = [
    { field: 'discount', label: 'Diskon', icon: Percent },
    { field: 'tax', label: 'Pajak / PPN', icon: ReceiptText },
    { field: 'serviceCharge', label: 'Service Charge', icon: UtensilsCrossed }
  ]

  function valOf(field: AdjustmentField): number | null {
    return field === 'discount' ? dVal : field === 'tax' ? tVal : sVal
  }

  function serverOf(field: AdjustmentField): number {
    return field === 'discount' ? discount : field === 'tax' ? tax : serviceCharge
  }

  function commit(field: AdjustmentField) {
    editing = false
    if (valOf(field) !== serverOf(field)) onCommit(field, valOf(field))
  }
</script>

<div class="px-5 mt-6 animate-fade-up animate-fade-up-4">
  <span class="sk-section-title block mb-3">Penyesuaian</span>

  <div class="sk-card divide-y divide-[var(--sk-border)]">
    {#each ROWS as row}
      <div class="flex items-center gap-3 px-4 py-3">
        <Icon icon={row.icon} size={14} strokeWidth={1.75} class="text-sk-text2 flex-shrink-0" />
        <span class="text-sm font-semibold flex-1">{row.label}</span>
        <div
          class="flex-1 max-w-[150px]"
          onfocusin={() => (editing = true)}
          onfocusout={() => commit(row.field)}
        >
          {#if row.field === 'discount'}
            <MoneyInput bind:value={dVal} {currency} placeholder="0" label={row.label} class="text-sm text-right" />
          {:else if row.field === 'tax'}
            <MoneyInput bind:value={tVal} {currency} placeholder="0" label={row.label} class="text-sm text-right" />
          {:else}
            <MoneyInput bind:value={sVal} {currency} placeholder="0" label={row.label} class="text-sm text-right" />
          {/if}
        </div>
      </div>
    {/each}
  </div>
  <p class="text-[11px] text-sk-text3 mt-2">Nominal langsung (bukan persen). Total dihitung server.</p>
</div>
