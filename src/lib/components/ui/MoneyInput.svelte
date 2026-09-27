<script lang="ts">
  import { currencyMeta, parseUserInput } from '$lib/money'

  interface Props {
    /** Nilai minor-int (null = belum diisi, beda dari 0). */
    value: number | null
    currency?: string
    placeholder?: string
    class?: string
    id?: string
    label?: string
  }

  let {
    value = $bindable(null),
    currency = 'IDR',
    placeholder = '0',
    class: cls = '',
    id,
    label = 'Nominal'
  }: Props = $props()

  let focused = $state(false)
  let text = $state('')

  /** Minor int -> teks grouping tanpa simbol (simbol di prefix luar bila perlu). */
  function toDisplay(minor: number, cur: string): string {
    const { decimals, locale } = currencyMeta(cur)
    return (minor / 10 ** decimals).toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    })
  }

  // Saat tidak diketik, teks selalu cerminan value (ter-grouping rapi).
  $effect(() => {
    if (!focused) {
      text = value == null ? '' : toDisplay(value, currency)
    }
  })
</script>

<input
  {id}
  type="text"
  inputmode="decimal"
  autocomplete="off"
  {placeholder}
  aria-label={label}
  value={text}
  oninput={(e) => {
    const el = e.target as HTMLInputElement
    text = el.value
    value = parseUserInput(text, currency)
  }}
  onfocus={(e) => {
    focused = true
    // Select-all: ketik langsung menimpa nilai lama. Tanpa ini, field
    // berisi "0" + ketik "15000" = "015000" (masalah klasik di HP).
    ;(e.target as HTMLInputElement).select()
  }}
  onblur={() => (focused = false)}
  onkeydown={(e) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
  }}
  class="sk-input font-mono font-semibold {cls}"
/>
