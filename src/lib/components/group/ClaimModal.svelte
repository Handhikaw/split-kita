<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { UserRoundPlus, X } from 'lucide-svelte'
  import type { Participant } from '$lib/types'

  interface Props {
    participants: Participant[]
    onClaim: (id: number) => void
    onJoin: (name: string) => void
    onClose: () => void
  }

  let { participants, onClaim, onJoin, onClose }: Props = $props()

  let newName = $state('')

  function handleJoin() {
    if (!newName.trim()) return
    onJoin(newName.trim())
    newName = ''
  }
</script>

<div
  class="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-md"
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose()
  }}
  transition:fade={{ duration: 200 }}
  role="presentation"
>
  <div
    class="w-full max-w-[420px] rounded-t-3xl max-h-[90vh] overflow-y-auto"
    style="background:var(--sk-surface);border:1px solid var(--sk-border)"
    in:fly={{ y: 100, duration: 320, easing: cubicOut }}
    out:fly={{ y: 100, duration: 240 }}
  >
    <div class="w-9 h-1 rounded-full mx-auto mt-3 bg-sk-border"></div>

    <div class="flex items-center justify-between px-5 pt-4 mb-1">
      <h2 class="text-[17px] font-bold flex items-center gap-2">
        <Icon icon={UserRoundPlus} size={18} /> Siapa kamu?
      </h2>
      <button
        type="button"
        onclick={onClose}
        class="w-8 h-8 rounded-full flex items-center justify-center border border-sk bg-sk-surface2 text-sk-text2 hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all"
        aria-label="Tutup"
      >
        <Icon icon={X} size={15} />
      </button>
    </div>
    <p class="px-5 text-xs text-sk-text2 mb-4">Pilih namamu biar bisa ikut edit, atau tambah baru.</p>

    <div class="px-5 pb-4 flex flex-col gap-2">
      {#each participants as p (p.id)}
        <button
          type="button"
          onclick={() => onClaim(p.id)}
          class="flex items-center gap-3 p-2.5 rounded-sk-sm border-[1.5px] border-sk bg-sk-surface2 hover:border-[#7c6aff] transition-all duration-200 text-left"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style="background:{p.grad}"
          >
            {p.name[0]}
          </div>
          <span class="flex-1 text-sm font-semibold">Saya {p.name}</span>
        </button>
      {/each}

      <div class="flex gap-2 mt-1">
        <input
          type="text"
          bind:value={newName}
          placeholder="Atau tulis nama baru…"
          maxlength={20}
          class="sk-input text-sm flex-1"
          aria-label="Nama baru"
          onkeydown={(e) => {
            if (e.key === 'Enter') handleJoin()
          }}
        />
        <button type="button" onclick={handleJoin} class="sk-btn-primary px-3.5 py-2 text-xs flex-shrink-0">
          Gabung
        </button>
      </div>
    </div>

    <div class="px-5 pb-8">
      <p class="text-[11px] text-sk-text3 text-center">Identitas tersimpan di device ini saja.</p>
    </div>
  </div>
</div>
