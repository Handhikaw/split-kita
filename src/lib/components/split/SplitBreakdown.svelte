<script lang="ts">
  import { fly, slide } from 'svelte/transition'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { ChevronDown, ChevronUp } from 'lucide-svelte'
  import { formatMoney } from '$lib/money'
  import type { SplitItem } from '$lib/api/split'
  import type { Participant } from '$lib/types'

  interface Props {
    items: SplitItem[]
    participants: Participant[]
    /** Total utang per peserta (server, sudah termasuk pajak proporsional). */
    owedById: Record<number, number>
    currency?: string
  }

  let { items, participants, owedById, currency = 'IDR' }: Props = $props()

  let open = $state(true)

  interface PersonLine {
    participant: Participant
    lines: { name: string; qty: number; share: number }[]
    itemSubtotal: number
    total: number
  }

  const persons = $derived<PersonLine[]>(
    participants.map((p) => {
      const lines = items
        .filter((it) => it.assignees.includes(p.id))
        .map((it) => ({
          name: it.name || 'Item tanpa nama',
          qty: it.quantity,
          share: it.shares[p.id] ?? 0
        }))
      return {
        participant: p,
        lines,
        itemSubtotal: lines.reduce((s, l) => s + l.share, 0),
        total: owedById[p.id] ?? 0
      }
    })
  )
</script>

<div class="px-5 mt-6 mb-4">
  <button type="button" onclick={() => (open = !open)} class="w-full flex items-center justify-between mb-3 group">
    <span class="sk-section-title group-hover:text-sk-text transition-colors duration-200">Per Orang</span>
    <Icon
      icon={open ? ChevronUp : ChevronDown}
      size={14}
      strokeWidth={2}
      class="text-sk-text2"
    />
  </button>

  {#if open}
    <div class="flex flex-col gap-2.5">
      {#each persons as pt (pt.participant.id)}
        <div class="sk-card px-4 py-3" in:fly={{ y: 8, duration: 200 }}>
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style="background:{pt.participant.grad}"
            >
              {pt.participant.name[0]}
            </div>

            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold">{pt.participant.name}</div>
              <div class="text-[11px] text-sk-text2 font-mono mt-0.5">
                Item: {formatMoney(pt.itemSubtotal, currency)}
              </div>
            </div>

            <div class="text-base font-extrabold font-mono text-[#7c6aff] flex-shrink-0">
              {formatMoney(pt.total, currency)}
            </div>
          </div>

          {#if pt.lines.length > 0}
            <div class="mt-3 pt-3 border-t border-sk flex flex-col gap-1.5" transition:slide={{ duration: 200 }}>
              {#each pt.lines as line}
                <div class="flex justify-between text-[11px]">
                  <span class="text-sk-text2 truncate mr-2">
                    {line.name}
                    <span class="text-sk-text3">×{line.qty}</span>
                  </span>
                  <span class="font-mono font-semibold flex-shrink-0">
                    {formatMoney(line.share, currency)}
                  </span>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
