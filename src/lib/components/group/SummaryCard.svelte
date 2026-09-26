<script lang="ts">
  import { formatMoney } from '$lib/money'

  interface Props {
    /** Minor-int. */
    totalAmount: number
    expenseCount: number
    perPerson: number
    currency?: string
  }

  let { totalAmount, expenseCount, perPerson, currency = 'IDR' }: Props = $props()
</script>

<div
  class="mx-5 mb-7 rounded-sk p-5 relative overflow-hidden border border-[rgba(124,106,255,0.3)] animate-fade-up animate-fade-up-1"
  style="background:linear-gradient(135deg,rgba(124,106,255,0.15),rgba(106,255,212,0.08))"
>
  <!-- Orb -->
  <div
    class="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
    style="background:radial-gradient(circle,rgba(124,106,255,0.2) 0%,transparent 70%)"
  ></div>

  <div class="text-[11px] font-semibold font-mono uppercase tracking-widest text-sk-text2 mb-1.5">
    Total Pengeluaran
  </div>
  <div class="text-[32px] font-bold tracking-tight mb-3.5 font-mono">
    {formatMoney(totalAmount, currency)}
  </div>
  <div class="flex gap-5">
    <div>
      <div class="text-sm font-bold font-mono text-[#7c6aff]">{expenseCount}</div>
      <div class="text-[11px] text-sk-text2">Transaksi</div>
    </div>
    <div>
      <div class="text-sm font-bold font-mono text-[#6affd4]">{formatMoney(perPerson, currency)}</div>
      <div class="text-[11px] text-sk-text2">Per orang</div>
    </div>
    <div>
      <div class="text-sm font-bold font-mono text-[#fbbf24]">3 hari</div>
      <div class="text-[11px] text-sk-text2">Durasi</div>
    </div>
  </div>
</div>
