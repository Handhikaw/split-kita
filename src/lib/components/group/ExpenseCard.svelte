<script lang="ts">
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import { formatMoney } from '$lib/money'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { Check, ChevronDown, ChevronUp, Pencil } from 'lucide-svelte'
  import { categoryMeta } from '$lib/types'
  import type { Expense } from '$lib/types'

  interface Props {
    expense: Expense
    memberCount: number
    currency?: string
    onToggle: (id: number) => void
    onEdit: (id: number) => void
  }

  let { expense, memberCount, currency = 'IDR', onToggle, onEdit }: Props = $props()

  const meta = $derived(categoryMeta(expense.category))
</script>

<div class="sk-card sk-card-hover p-4 mb-2.5 cursor-pointer" in:fly={{ y: 10, duration: 260, easing: cubicOut }}>
  <!-- Header row -->
  <div class="flex items-start justify-between mb-2.5">
    <div class="flex items-center gap-2.5">
      <!-- <div class="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0 {meta.bgClass} {meta.textClass}">
        <Icon icon={meta.icon} size={19} />
      </div> -->
      <div>
        <div class="text-[15px] font-semibold mb-0.5 flex items-center gap-1.5">
          {expense.name}
          {#if expense.isDetail}
            <span class="sk-tag sk-tag-green"><Icon icon={Check} size={10} strokeWidth={3} /> detail</span>
          {/if}
        </div>
        <div class="text-xs text-sk-text2">
          dibayar oleh <strong class="text-[#7c6aff]">{expense.payer}</strong>
        </div>
      </div>
    </div>
    <div class="text-right flex items-start gap-1.5">
      <div>
        <div class="text-[15px] font-bold font-mono">{formatMoney(expense.amount, currency)}</div>
        <div class="text-[11px] font-mono text-sk-text2">{expense.date}</div>
      </div>
      <button
        type="button"
        onclick={(e) => {
          e.stopPropagation()
          onEdit(expense.id)
        }}
        class="w-7 h-7 rounded-lg border border-sk flex items-center justify-center text-sk-text3 hover:text-[#7c6aff] hover:border-[#7c6aff] transition-all flex-shrink-0"
        aria-label="Ubah {expense.name}"
        title="Ubah"
      >
        <Icon icon={Pencil} size={13} />
      </button>
    </div>
  </div>

  <!-- Footer row -->
  <div class="flex items-center justify-between">
    <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-sk-pill {meta.bgClass} {meta.textClass} inline-flex items-center gap-1">
      <Icon icon={meta.icon} size={12} /> {expense.category}
    </span>

    {#if expense.isDetail}
      <button
        type="button"
        onclick={() => onToggle(expense.id)}
        class="text-[11px] font-semibold text-[#7c6aff] px-2.5 py-1 rounded-sk-pill border border-[rgba(124,106,255,0.25)] bg-[rgba(124,106,255,0.08)] hover:bg-[rgba(124,106,255,0.15)] transition-all duration-200 inline-flex items-center gap-1"
      >
        <Icon icon={expense.expanded ? ChevronUp : ChevronDown} size={12} />
        {expense.expanded ? 'Sembunyikan' : 'Lihat item'}
      </button>
    {:else}
      <span class="text-xs text-sk-text2">dibagi {memberCount} orang</span>
    {/if}
  </div>

  <!-- Expandable detail items -->
  {#if expense.isDetail && expense.expanded}
    <div class="mt-3 pt-3 border-t border-sk" in:fly={{ y: -6, duration: 220, easing: cubicOut }}>
      {#each expense.items as item, i}
        <div
          class="flex justify-between items-center py-1.5"
          class:border-b={i < expense.items.length - 1}
          class:border-sk-surface2={i < expense.items.length - 1}
        >
          <span class="text-xs text-sk-text2">
            {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}
          </span>
          <span class="text-xs font-semibold font-mono">
            {formatMoney(item.price * Math.max(1, item.quantity || 1), currency)}
          </span>
        </div>
      {/each}
      <div class="flex justify-between pt-2 mt-1 border-t border-dashed border-sk">
        <span class="text-xs font-semibold">Total</span>
        <span class="text-xs font-bold font-mono text-[#7c6aff]">{formatMoney(expense.amount, currency)}</span>
      </div>
    </div>
  {/if}
</div>
