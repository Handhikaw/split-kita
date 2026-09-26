<script lang="ts">
  import { fly } from 'svelte/transition'
  import { formatMoney } from '$lib/money'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { Check, Lock } from 'lucide-svelte'
  import type { Balance } from '$lib/types'

  interface Props {
    balance: Balance
    currency?: string
    onMarkPaid: (id: number) => void
  }

  let { balance: b, currency = 'IDR', onMarkPaid }: Props = $props()
</script>

<div
  class="sk-card flex items-center gap-3 p-3.5 mb-2.5 transition-all duration-300"
  class:opacity-45={b.status === 'settled'}
  in:fly={{ y: 8, duration: 240 }}
>
  <!-- Overlapping avatars -->
  <div class="flex flex-shrink-0">
    <div
      class="w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-sk-surface"
      style="background:{b.fromGrad}"
    >
      {b.from[0]}
    </div>
    <div
      class="w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-sk-surface -ml-2.5"
      style="background:{b.toGrad}"
    >
      {b.to[0]}
    </div>
  </div>

  <!-- Info -->
  <div class="flex-1 min-w-0">
    <div class="text-[13px]">
      <strong>{b.from}</strong>
      <span class="text-[11px] font-bold text-red-400 mx-1">→ owes →</span>
      <strong>{b.to}</strong>
    </div>
    <div class="text-sm font-bold font-mono text-[#ff6a8e] mt-0.5" class:line-through={b.status === 'settled'}>
      {formatMoney(b.amount, currency)}
    </div>
  </div>

  <!-- Action -->
  {#if b.status === 'free'}
    <button
      disabled
      class="text-[11px] font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 border border-sk bg-sk-surface2 text-sk-text3 cursor-not-allowed flex items-center gap-1"
    >
      Lunas <Icon icon={Lock} size={12} />
    </button>
  {:else if b.status === 'active'}
    <button
      type="button"
      onclick={() => onMarkPaid(b.id)}
      class="text-[11px] font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 border border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all duration-200 flex items-center gap-1"
    >
      <Icon icon={Check} size={12} strokeWidth={2.5} /> Lunas
    </button>
  {:else}
    <button
      disabled
      class="text-[11px] font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 border border-sk text-sk-text3 cursor-default"
    >
      Terbayar
    </button>
  {/if}
</div>
