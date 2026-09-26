<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import GradientPicker from '$lib/components/ui/GradientPicker.svelte'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { X, Plus, Check, Users, TriangleAlert } from 'lucide-svelte'
  import { GRADIENTS } from '$lib/stores.svelte'
  import type { Participant } from '$lib/types'

  interface Props {
    participants: Participant[]
    onClose: () => void
    onAdd: (name: string, grad: string) => void
    onRemove: (id: number) => void
    onDone: () => void
  }

  let { participants, onClose, onAdd, onRemove, onDone }: Props = $props()

  let newParticipantName = $state('')
  let newGrad = $state<string>(GRADIENTS[0])

  const newPreviewInitial = $derived(
    newParticipantName.trim() ? newParticipantName.trim()[0].toUpperCase() : '?'
  )

  function handleAdd() {
    if (!newParticipantName.trim()) return
    onAdd(newParticipantName.trim(), newGrad)
    newParticipantName = ''
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

    <div class="flex items-center justify-between px-5 pt-4 mb-4">
      <h2 class="text-[17px] font-bold flex items-center gap-2"><Icon icon={Users} size={18} /> Kelola Anggota</h2>
      <button
        type="button"
        onclick={onClose}
        class="w-8 h-8 rounded-full flex items-center justify-center border border-sk bg-sk-surface2 text-sk-text2 hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all"
        aria-label="Tutup"
      >
        <Icon icon={X} size={15} />
      </button>
    </div>

    <div class="px-5 pb-4">
      <!-- Add form -->
      <div class="bg-sk-surface2 border border-sk rounded-sk p-4 mb-4">
        <div class="sk-label mb-3">Tambah Anggota Baru</div>

        <input
          type="text"
          bind:value={newParticipantName}
          placeholder="Nama anggota..."
          maxlength={20}
          class="sk-input text-sm mb-3"
          aria-label="Nama anggota baru"
        />

        <div class="mb-3">
          <span class="sk-label">Warna Avatar</span>
          <GradientPicker bind:value={newGrad} />
        </div>

        <!-- Preview + add -->
        <div class="flex items-center gap-3 p-2.5 bg-sk-surface border border-sk rounded-sk-sm">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white flex-shrink-0"
            style="background:{newGrad}"
          >
            {newPreviewInitial}
          </div>
          <div class="flex-1">
            <div class="text-sm font-semibold">{newParticipantName || 'Nama Anggota'}</div>
            <div class="text-[11px] text-sk-text2">Preview</div>
          </div>
          <button type="button" onclick={handleAdd} class="sk-btn-primary px-3.5 py-2 text-xs"
            ><Icon icon={Plus} size={14} strokeWidth={2.5} /> Tambah</button
          >
        </div>
      </div>

      <!-- Existing list -->
      <div class="sk-label mb-3">Anggota Saat Ini ({participants.length})</div>
      <div class="flex flex-col gap-2">
        {#each participants as p, i (p.id)}
          <div class="flex items-center gap-2.5 p-2.5 rounded-sk-sm bg-sk-surface2 border border-sk">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style="background:{p.grad}"
            >
              {p.name[0]}
            </div>
            <span class="flex-1 text-sm font-semibold">{p.name}</span>
            {#if i === 0}
              <span class="sk-tag sk-tag-violet">Admin</span>
            {:else}
              <button
                type="button"
                onclick={() => onRemove(p.id)}
                class="w-7 h-7 rounded-lg border border-sk flex items-center justify-center text-sk-text3 hover:text-red-400 hover:border-red-400 hover:bg-red-500/8 transition-all"
                aria-label="Hapus {p.name}"
              >
                <Icon icon={X} size={13} />
              </button>
            {/if}
          </div>
        {/each}
      </div>

      <div
        class="mt-3.5 px-3.5 py-2.5 rounded-sk-sm bg-yellow-500/6 border border-yellow-500/20 text-xs text-sk-text2 flex items-start gap-2"
      >
        <Icon icon={TriangleAlert} size={14} class="flex-shrink-0 mt-px" />
        <span>Menghapus anggota tidak akan menghapus pengeluaran yang sudah dicatat.</span>
      </div>
    </div>

    <div class="px-5 pt-4 pb-8 border-t border-sk flex gap-2.5">
      <button type="button" onclick={onClose} class="sk-btn-ghost flex-1 py-3">Tutup</button>
      <button type="button" onclick={onDone} class="sk-btn-primary flex-[2] py-3"
        ><Icon icon={Check} size={16} strokeWidth={2.5} /> Selesai</button
      >
    </div>
  </div>
</div>
