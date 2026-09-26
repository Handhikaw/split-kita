<script lang="ts">
  import Icon from '$lib/components/ui/Icon.svelte'
  import { ChevronDown, ChevronUp } from 'lucide-svelte'
  import type { Activity } from '$lib/types'

  interface Props {
    activities: Activity[]
    /** Bisa dikontrol dari luar; default terbuka. */
    open?: boolean
  }

  let { activities, open = $bindable(true) }: Props = $props()
</script>

<div class="px-5 mb-7 animate-fade-up animate-fade-up-4">
  <div class="flex items-center justify-between mb-3.5">
    <span class="sk-section-title">Log Aktivitas</span>
    <button
      type="button"
      onclick={() => (open = !open)}
      class="flex items-center gap-1 text-[11px] font-semibold text-sk-text2 hover:text-[#7c6aff] transition-colors"
      aria-expanded={open}
      aria-label={open ? 'Sembunyikan log' : 'Tampilkan log'}
    >
      {open ? 'Sembunyikan' : 'Tampilkan'}
      <Icon icon={open ? ChevronUp : ChevronDown} size={13} />
    </button>
  </div>

  {#if open}
    <div class="sk-card px-4 py-1">
    {#each activities as act, i (act.id)}
      <div class="flex gap-3 py-3" class:border-b={i < activities.length - 1} class:border-sk-surface2={i < activities.length - 1}>
        <!-- Timeline -->
        <div class="flex flex-col items-center flex-shrink-0 pt-1">
          <div class="w-2 h-2 rounded-full flex-shrink-0 {act.color}"></div>
          {#if i < activities.length - 1}
            <div class="w-px flex-1 bg-sk-border mt-1 min-h-[20px]"></div>
          {/if}
        </div>
        <!-- Text -->
        <div class="flex-1">
          <p class="text-[13px] text-sk-text2 leading-snug">
            {#each act.segments as seg, si}
              {#if si % 2 === 0}
                <strong class="text-sk-text font-semibold">{seg}</strong>
              {:else}
                {seg}
              {/if}
            {/each}
          </p>
          <p class="text-[11px] font-mono text-sk-text3 mt-0.5">{act.time}</p>
        </div>
      </div>
    {/each}
    </div>
  {/if}
</div>
