<script lang="ts">
  import { formatMoney } from '$lib/money'

  interface Props {
    /** Semua minor-int (server truth). */
    subtotal: number
    discount: number
    tax: number
    serviceCharge: number
    total: number
    currency?: string
  }

  let { subtotal, discount, tax, serviceCharge, total, currency = 'IDR' }: Props = $props()
</script>

<div class="px-5 mt-6 animate-fade-up animate-fade-up-5">
  <span class="sk-section-title block mb-3">Ringkasan</span>

  <div class="sk-card p-4">
    <div class="flex flex-col gap-2.5 mb-3">
      <div class="flex justify-between text-sm">
        <span class="text-sk-text2">Subtotal</span>
        <span class="font-mono font-semibold">{formatMoney(subtotal, currency)}</span>
      </div>

      {#if discount > 0}
        <div class="flex justify-between text-sm">
          <span class="text-sk-text2">Diskon</span>
          <span class="font-mono font-semibold text-green-400">−{formatMoney(discount, currency)}</span>
        </div>
      {/if}

      {#if tax > 0}
        <div class="flex justify-between text-sm">
          <span class="text-sk-text2">Pajak / PPN</span>
          <span class="font-mono font-semibold text-red-400">+{formatMoney(tax, currency)}</span>
        </div>
      {/if}

      {#if serviceCharge > 0}
        <div class="flex justify-between text-sm">
          <span class="text-sk-text2">Service Charge</span>
          <span class="font-mono font-semibold text-yellow-400">+{formatMoney(serviceCharge, currency)}</span>
        </div>
      {/if}
    </div>

    <div class="border-t border-sk pt-3 flex justify-between items-center">
      <span class="font-bold">Grand Total</span>
      <span class="text-2xl font-extrabold font-mono text-[#7c6aff]">{formatMoney(total, currency)}</span>
    </div>
  </div>
</div>
