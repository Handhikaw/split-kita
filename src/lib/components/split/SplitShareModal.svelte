<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { Share2, Plus, Link2, Copy, MessageCircle, Send, FileText, CheckCircle2 } from 'lucide-svelte'
  import { formatMoney } from '$lib/money'
  import { toastStore } from '$lib/stores.svelte'

  interface Props {
    title: string
    itemCount: number
    /** Kata satuan jumlah ("item" untuk split, "transaksi" untuk group). */
    unitLabel?: string
    memberCount: number
    total: number
    currency?: string
    shareUrl: string
    onClose: () => void
  }

  let { title, itemCount, unitLabel = 'item', memberCount, total, currency = 'IDR', shareUrl, onClose }: Props =
    $props()

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl).then(
      () => toastStore.show('✓ Link disalin!'),
      () => toastStore.show('Gagal menyalin link')
    )
  }

  async function systemShare() {
    const data = {
      title: `SplitKita — ${title || 'Split Bill'}`,
      text: `${title || 'Split Bill'} · ${formatMoney(total, currency)} · ${memberCount} orang`,
      url: shareUrl
    }
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share(data)
        return
      } catch {
        // dibatalkan user -> diam
        return
      }
    }
    copyLink()
  }

  function openChannel(kind: 'wa' | 'tg') {
    const text = encodeURIComponent(`${title || 'Split Bill'} · ${formatMoney(total, currency)}\n${shareUrl}`)
    const url = kind === 'wa' ? `https://wa.me/?text=${text}` : `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title || 'Split Bill')}`
    window.open(url, '_blank', 'noopener')
  }

  /** Tutup modal dulu agar tidak ikut ke dialog cetak, lalu print. */
  function printReceipt() {
    onClose()
    setTimeout(() => window.print(), 100)
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
    class="w-full max-w-[420px] rounded-t-3xl sk-card"
    in:fly={{ y: 100, duration: 310, easing: cubicOut }}
    out:fly={{ y: 100, duration: 220 }}
  >
    <div class="w-9 h-1 rounded-full mx-auto mt-3 bg-sk-border"></div>

    <div class="flex items-center justify-between px-5 pt-4 mb-5">
      <h2 class="text-base font-bold flex items-center gap-2">
        <Icon icon={Share2} size={16} class="text-[#7c6aff]" />
        Bagikan Tagihan
      </h2>
      <button
        onclick={onClose}
        class="w-8 h-8 rounded-full border border-sk bg-sk-surface2 flex items-center justify-center text-sk-text2 hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all"
        aria-label="Tutup"
      >
        <Icon icon={Plus} size={13} strokeWidth={2.5} class="rotate-45" />
      </button>
    </div>

    <div class="px-5 pb-4">
      <div class="sk-card p-3 mb-4 flex items-center justify-between">
        <div>
          <div class="text-sm font-bold">{title || 'Split Bill'}</div>
          <div class="text-xs text-sk-text2 font-mono mt-0.5">
            {itemCount} {unitLabel} · {memberCount} orang
          </div>
        </div>
        <div class="text-right">
          <div class="text-base font-extrabold font-mono text-[#7c6aff]">{formatMoney(total, currency)}</div>
          <div class="text-[10px] text-sk-text2">Grand Total</div>
        </div>
      </div>

      <p class="text-xs text-sk-text2 mb-4 leading-relaxed">
        Bagikan link ini ke semua peserta. Mereka bisa langsung lihat tagihan masing-masing tanpa perlu login.
      </p>

      <div class="flex items-center gap-2 bg-sk-surface2 border border-sk rounded-sk-sm px-3 py-2.5 mb-3">
        <Icon icon={Link2} size={13} strokeWidth={1.75} class="text-sk-text3 flex-shrink-0" />
        <span class="flex-1 text-[11px] font-mono text-sk-text2 overflow-hidden text-ellipsis whitespace-nowrap">
          {shareUrl}
        </span>
        <button type="button" onclick={copyLink} class="sk-btn-primary px-2.5 py-1 text-xs gap-1 flex-shrink-0">
          <Icon icon={Copy} size={11} strokeWidth={2.5} />
          Salin
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          type="button"
          onclick={() => openChannel('wa')}
          class="flex items-center justify-center gap-1.5 py-2.5 rounded-sk-sm border border-sk bg-sk-surface2 text-xs font-semibold text-sk-text2 hover:border-[#7c6aff] hover:text-sk-text transition-all duration-200"
        >
          <Icon icon={MessageCircle} size={13} strokeWidth={1.75} />
          WhatsApp
        </button>
        <button
          type="button"
          onclick={() => openChannel('tg')}
          class="flex items-center justify-center gap-1.5 py-2.5 rounded-sk-sm border border-sk bg-sk-surface2 text-xs font-semibold text-sk-text2 hover:border-[#7c6aff] hover:text-sk-text transition-all duration-200"
        >
          <Icon icon={Send} size={13} strokeWidth={1.75} />
          Telegram
        </button>
        <button
          type="button"
          onclick={copyLink}
          class="flex items-center justify-center gap-1.5 py-2.5 rounded-sk-sm border border-sk bg-sk-surface2 text-xs font-semibold text-sk-text2 hover:border-[#7c6aff] hover:text-sk-text transition-all duration-200"
        >
          <Icon icon={Copy} size={13} strokeWidth={1.75} />
          Salin Link
        </button>
        <button
          type="button"
          onclick={printReceipt}
          class="flex items-center justify-center gap-1.5 py-2.5 rounded-sk-sm border border-sk bg-sk-surface2 text-xs font-semibold text-sk-text2 hover:border-[#7c6aff] hover:text-sk-text transition-all duration-200"
        >
          <Icon icon={FileText} size={13} strokeWidth={1.75} />
          Cetak / PDF
        </button>
      </div>
    </div>

    <div class="px-5 pt-4 pb-8 border-t border-sk flex gap-2.5">
      <button type="button" onclick={onClose} class="sk-btn-ghost flex-1 py-3">Tutup</button>
      <button type="button" onclick={systemShare} class="sk-btn-primary flex-[2] py-3 gap-2">
        <Icon icon={CheckCircle2} size={14} strokeWidth={2} />
        Bagikan…
      </button>
    </div>
  </div>
</div>
