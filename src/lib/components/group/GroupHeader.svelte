<script lang="ts">
  import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte'
  import Avatar from '$lib/components/ui/Avatar.svelte'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { wheelX, dragX, fadeX } from '$lib/actions'
  import { ArrowLeft, Share2, Plus, Sparkles, Palmtree } from 'lucide-svelte'
  import type { Participant } from '$lib/types'

  interface Props {
    participants: Participant[]
    activeId: number
    onSelect: (id: number) => void
    onAddClick: () => void
    title?: string
    code?: string
    /** Ikon judul. Default Palmtree (group). */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    titleIcon?: any
    /** Baris meta kustom ("3 item · 2 orang · Rp...").
     *  Default: "{code} · {n} anggota · aktif". */
    meta?: string
    /** Handler tombol Bagikan. Absent = tombol nonaktif (perilaku lama). */
    onShare?: () => void
  }

  let {
    participants,
    activeId,
    onSelect,
    onAddClick,
    title = 'Liburan Bali 2025',
    code = '',
    titleIcon = Palmtree,
    meta,
    onShare
  }: Props = $props()
</script>

<header class="sticky top-0 z-40 px-5 pt-5 pb-0 backdrop-blur-xl bg-sk-bg/88">
  <!-- Top row -->
  <div class="flex items-center justify-between mb-5">
    <a
      href="/"
      class="w-9 h-9 flex items-center justify-center rounded-sk-sm border border-sk bg-sk-surface text-sk-text2 text-base hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all duration-200 no-underline"
      aria-label="Kembali"
    >
      <Icon icon={ArrowLeft} size={18} />
    </a>

    <div class="flex items-center gap-2">
      <ThemeToggle />
      <span class="sk-tag sk-tag-violet text-[10px] font-bold tracking-wider uppercase"
        ><Icon icon={Sparkles} size={12} /> PRO</span
      >
      <button
        type="button"
        onclick={onShare}
        disabled={!onShare}
        class="flex items-center gap-1.5 px-3.5 py-2 rounded-sk-sm text-[13px] font-semibold border border-[#7c6aff] bg-[rgba(124,106,255,0.10)] text-[#7c6aff] hover:bg-[rgba(124,106,255,0.20)] transition-all duration-200 disabled:opacity-60"
      >
        <Icon icon={Share2} size={15} /> Bagikan
      </button>
    </div>
  </div>

  <!-- Group info -->
  <div class="text-[22px] font-bold tracking-tight mb-0.5 flex items-center gap-2">
    <Icon icon={titleIcon} size={22} /> {title}
  </div>
  <div class="text-xs font-mono tracking-wide text-sk-text2 mb-4">
    {#if meta}{meta}{:else}{#if code}{code} · {/if}{participants.length} anggota · aktif{/if}
  </div>

  <!-- Participant: scroll horizontal (touch native, mouse via wheelX + dragX, fade via fadeX) -->
  <div
    class="flex items-center gap-2 overflow-x-auto scrollbar-none touch-pan-x drag-scroll pb-4 pt-1 pr-1 pl-1"
    use:wheelX
    use:dragX
    use:fadeX
  >
    {#each participants as p (p.id)}
      <button type="button" onclick={() => onSelect(p.id)} class="flex flex-col items-center gap-1.5 flex-shrink-0">
        <Avatar name={p.name} grad={p.grad} size="lg" active={activeId === p.id} />
        <span class="text-[10px] font-medium text-sk-text2">
          {p.name.length > 5 ? p.name.slice(0, 5) + '…' : p.name}
        </span>
      </button>
    {/each}


    <button type="button" onclick={onAddClick} class="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div
          class="w-11 h-11 rounded-full shrink-0 border-2 border-dashed border-sk-border flex items-center justify-center text-sk-text3 hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all duration-200"
          title="Tambah anggota"
          aria-label="Tambah anggota"
        >
          <Icon icon={Plus} size={20} />
        </div>
        <span class="text-[10px] font-medium text-sk-text2">
          Add
        </span>
      </button>

  </div>
</header>
