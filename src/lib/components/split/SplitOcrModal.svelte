<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { ScanLine, Scan, Camera, FileImage, Loader2, CheckCircle2, Plus } from 'lucide-svelte'
  import { formatMoney } from '$lib/money'

  interface Props {
    currency?: string
    onApply: (items: { name: string; price: number; qty: number }[]) => void
    onClose: () => void
  }

  let { currency = 'IDR', onApply, onClose }: Props = $props()

  // SIMULASI (belum ada OCR backend): daftar struk pura-pura + delay.
  // Kontrak onApply sama persis dengan OCR asli nanti: [{name, price minor-int, qty}].
  type OcrStep = 'idle' | 'scanning' | 'done'
  let ocrStep = $state<OcrStep>('idle')

  const OCR_DETECTED = [
    { name: 'Nasi Ayam Kampung', qty: 2, price: 38000 },
    { name: 'Jus Jeruk Peras', qty: 3, price: 20000 },
    { name: 'Pisang Goreng Keju', qty: 1, price: 28000 },
    { name: 'Es Teh Manis', qty: 4, price: 12000 }
  ]

  let ocrSelected = $state<boolean[]>(OCR_DETECTED.map(() => true))

  async function startOcr() {
    ocrStep = 'scanning'
    ocrSelected = OCR_DETECTED.map(() => true)
    await new Promise((r) => setTimeout(r, 2400))
    ocrStep = 'done'
  }

  function close() {
    ocrStep = 'idle'
    onClose()
  }

  function apply() {
    onApply(OCR_DETECTED.filter((_, i) => ocrSelected[i]).map((it) => ({ ...it })))
    ocrStep = 'idle'
  }
</script>

<div
  class="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-md"
  onclick={(e) => {
    if (e.target === e.currentTarget) close()
  }}
  transition:fade={{ duration: 200 }}
  role="presentation"
>
  <div
    class="w-full max-w-[420px] rounded-t-3xl sk-card max-h-[88vh] overflow-y-auto"
    in:fly={{ y: 100, duration: 310, easing: cubicOut }}
    out:fly={{ y: 100, duration: 220 }}
  >
    <div class="w-9 h-1 rounded-full mx-auto mt-3 bg-sk-border"></div>

    <div class="flex items-center justify-between px-5 pt-4 mb-5">
      <h2 class="text-base font-bold flex items-center gap-2">
        <Icon icon={ScanLine} size={16} class="text-[#7c6aff]" />
        Scan Struk
      </h2>
      <button
        onclick={close}
        class="w-8 h-8 rounded-full border border-sk bg-sk-surface2 flex items-center justify-center text-sk-text2 hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all"
        aria-label="Tutup"
      >
        <Icon icon={Plus} size={13} strokeWidth={2.5} class="rotate-45" />
      </button>
    </div>

    <div class="px-5 pb-4">
      {#if ocrStep === 'idle'}
        <div
          class="border-2 border-dashed border-sk rounded-sk p-8 mb-4 text-center hover:border-[#7c6aff] transition-all duration-200 cursor-pointer"
          onclick={startOcr}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && startOcr()}
        >
          <Icon icon={Scan} size={36} strokeWidth={1.25} class="text-sk-text3 mx-auto mb-3" />
          <p class="text-sm font-semibold text-sk-text2 mb-1">Drop foto struk di sini</p>
          <p class="text-xs text-sk-text3 mb-5">atau pilih dari galeri / ambil foto</p>
          <div class="flex gap-2 justify-center">
            <button
              type="button"
              onclick={(e) => {
                e.stopPropagation()
                startOcr()
              }}
              class="sk-btn-primary px-4 py-2 text-xs gap-1.5"
            >
              <Icon icon={Camera} size={13} strokeWidth={2} />
              Kamera
            </button>
            <button
              type="button"
              onclick={(e) => {
                e.stopPropagation()
                startOcr()
              }}
              class="sk-btn-ghost px-4 py-2 text-xs gap-1.5"
            >
              <Icon icon={FileImage} size={13} strokeWidth={1.75} />
              Galeri
            </button>
          </div>
        </div>
      {:else if ocrStep === 'scanning'}
        <div class="flex flex-col items-center py-10 gap-5">
          <div class="relative">
            <Icon icon={ScanLine} size={44} strokeWidth={1.25} class="text-[#7c6aff]" />
            <div class="absolute inset-0 flex items-center justify-center">
              <Icon icon={Loader2} size={22} strokeWidth={2} class="text-[#7c6aff] animate-spin" />
            </div>
          </div>
          <p class="text-sm font-semibold text-sk-text2">Membaca struk...</p>
          <div class="flex items-center gap-2">
            {#each ['Mendeteksi', 'Membaca harga', 'Validasi'] as step, i}
              <div class="flex items-center gap-2">
                <div
                  class="h-1 w-14 rounded-full transition-all duration-700"
                  style="background:{i === 0 ? '#7c6aff' : 'var(--sk-border)'}"
                ></div>
                {#if i < 2}<div class="w-1 h-1 rounded-full bg-sk-border"></div>{/if}
              </div>
            {/each}
          </div>
          <p class="text-xs text-sk-text3">Memproses gambar...</p>
        </div>
      {:else}
        <div class="mb-5">
          <div class="flex items-center gap-2 mb-3">
            <Icon icon={CheckCircle2} size={14} strokeWidth={2} class="text-green-400" />
            <span class="text-xs font-semibold text-sk-text2">
              {OCR_DETECTED.length} item terdeteksi — pilih yang ingin ditambahkan
            </span>
          </div>

          <div class="flex flex-col gap-2">
            {#each OCR_DETECTED as item, i}
              <button
                type="button"
                onclick={() => (ocrSelected[i] = !ocrSelected[i])}
                class="flex items-center gap-3 p-3 rounded-sk-sm border transition-all duration-150 text-left"
                class:border-[#7c6aff]={ocrSelected[i]}
                class:bg-[rgba(124,106,255,0.07)]={ocrSelected[i]}
                class:border-sk={!ocrSelected[i]}
                class:bg-sk-surface2={!ocrSelected[i]}
              >
                <div
                  class="w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-150"
                  class:bg-[#7c6aff]={ocrSelected[i]}
                  class:border-[#7c6aff]={ocrSelected[i]}
                  class:border-sk={!ocrSelected[i]}
                >
                  {#if ocrSelected[i]}
                    <Icon icon={CheckCircle2} size={12} strokeWidth={2.5} class="text-white" />
                  {/if}
                </div>

                <span class="flex-1 text-sm font-semibold">{item.name}</span>
                <span class="text-[11px] font-mono text-sk-text2 flex-shrink-0">×{item.qty}</span>
                <span class="text-sm font-bold font-mono text-[#7c6aff] flex-shrink-0 ml-1">
                  {formatMoney(item.price, currency)}
                </span>
              </button>
            {/each}
          </div>
        </div>

        <button
          type="button"
          onclick={apply}
          disabled={!ocrSelected.some(Boolean)}
          class="w-full sk-btn-primary py-3 gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon icon={CheckCircle2} size={15} strokeWidth={2} />
          Tambahkan {ocrSelected.filter(Boolean).length} Item ke Tagihan
        </button>
      {/if}
    </div>
  </div>
</div>
