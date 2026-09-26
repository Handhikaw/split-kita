<script lang="ts">
  import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { Check, Link2, Plus, ReceiptText, Sparkles, Target, Users, X } from 'lucide-svelte'
  import { theme } from '$lib/stores.svelte'

  // Scroll reveal
  let heroVisible = $state(false)

  $effect(() => {
    heroVisible = true
  })
</script>

<svelte:head>
  <title>SplitKita — Bayar bareng, tanpa ribet</title>
</svelte:head>

<!-- ── BACKGROUND ── -->
<div class="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
  <div class="absolute inset-[-50%] animate-[meshRotate_28s_ease-in-out_infinite_alternate]"
    style="background:
      radial-gradient(ellipse 60% 50% at 20% 30%, rgba(124,106,255,0.13) 0%, transparent 60%),
      radial-gradient(ellipse 50% 60% at 80% 20%, rgba(255,106,142,0.09) 0%, transparent 60%),
      radial-gradient(ellipse 70% 40% at 60% 80%, rgba(106,255,212,0.07) 0%, transparent 60%);">
  </div>
  <div class="absolute inset-0 opacity-30"
    style="background-image:radial-gradient(circle,rgba(124,106,255,0.2) 1px,transparent 1px);background-size:36px 36px;">
  </div>
</div>

<!-- ── NAV ── -->
<header class="sticky top-0 z-50 px-5 py-4 flex items-center justify-between
               backdrop-blur-xl border-b border-sk
               bg-sk-bg/85">
  <div class="text-lg font-extrabold tracking-tight text-sk-text">
    Split<span class="text-[#7c6aff]">Kita</span>
  </div>
  <div class="flex items-center gap-2">
    <ThemeToggle />
    <a href="/create"
      class="sk-btn-primary text-xs px-4 py-2">
      <Icon icon={Plus} size={14} strokeWidth={2.5} /> Buat Tagihan
    </a>
  </div>
</header>

<!-- ── HERO ── -->
<section class="relative z-10 px-5 pt-16 pb-12 text-center flex flex-col items-center gap-6
                animate-fade-up animate-fade-up-1">

  <!-- Badge -->
  <div class="sk-tag sk-tag-violet uppercase tracking-[2px] text-[10px]">
    <Icon icon={Sparkles} size={11} /> Free &amp; Open Source
  </div>

  <!-- Headline -->
  <h1 class="text-4xl font-extrabold tracking-tight leading-[1.15]">
    Bayar bareng,<br>
    <span class="gradient-text-violet">tanpa ribet.</span>
  </h1>

  <p class="text-base text-sk-text2 leading-relaxed max-w-[300px]">
    Split tagihan, patungan, atau kelola pengeluaran grup — semua dalam satu link yang bisa dibagikan.
  </p>

  <!-- CTA buttons -->
  <div class="flex flex-col gap-3 w-full max-w-[280px]">
    <a href="/create" class="sk-btn-gradient text-base py-3.5 justify-center">
      🚀 Mulai Sekarang — Gratis
    </a>
    <a href="/group" class="sk-btn-ghost text-sm py-3 justify-center">
      Lihat Contoh Tagihan →
    </a>
  </div>

  <!-- Floating card mockup -->
  <div class="relative w-full mt-4 animate-fade-up animate-fade-up-3">
    <!-- Summary card preview -->
    <div class="sk-card mx-4 p-5 relative overflow-hidden
                bg-gradient-to-br from-[rgba(124,106,255,0.15)] to-[rgba(106,255,212,0.08)]
                border-violet-sk/30">
      <div class="absolute -top-8 -right-8 w-28 h-28 rounded-full
                  bg-[radial-gradient(circle,rgba(124,106,255,0.2)_0%,transparent_70%)] pointer-events-none" />
      <div class="text-[10px] font-semibold font-mono uppercase tracking-widest text-sk-text2 mb-1">
        Total Pengeluaran
      </div>
      <div class="text-3xl font-extrabold tracking-tight mb-3">
        <span class="text-base font-normal text-sk-text2 mr-1">Rp</span>3.470.000
      </div>
      <div class="flex gap-4">
        <div>
          <div class="text-sm font-bold font-mono text-[#7c6aff]">7</div>
          <div class="text-[10px] text-sk-text2">Transaksi</div>
        </div>
        <div>
          <div class="text-sm font-bold font-mono text-[#6affd4]">Rp694.000</div>
          <div class="text-[10px] text-sk-text2">Per orang</div>
        </div>
        <div>
          <div class="text-sm font-bold font-mono text-[#fbbf24]">3 hari</div>
          <div class="text-[10px] text-sk-text2">Durasi</div>
        </div>
      </div>
      <!-- Mini avatars -->
      <div class="flex gap-1 mt-3">
        {#each [
          'linear-gradient(135deg,#7c6aff,#ff6a8e)',
          'linear-gradient(135deg,#6affd4,#4ade80)',
          'linear-gradient(135deg,#fbbf24,#f87171)',
          'linear-gradient(135deg,#38bdf8,#6366f1)',
          'linear-gradient(135deg,#fb7185,#c084fc)',
        ] as grad, i}
          <div class="w-7 h-7 rounded-full border-2 flex items-center justify-center
                      text-[10px] font-bold text-white border-sk-surface"
               style="background:{grad}">
            {['A','B','C','D','E'][i]}
          </div>
        {/each}
        <div class="w-7 h-7 rounded-full border-2 border-dashed border-sk-border
                    flex items-center justify-center text-sk-text3 text-sm">+</div>
      </div>
    </div>
  </div>
</section>

<!-- ── HOW IT WORKS ── -->
<section class="relative z-10 px-5 py-12 animate-fade-up animate-fade-up-2">
  <h2 class="text-xl font-extrabold tracking-tight text-center mb-8">
    Cara kerja
  </h2>

  <div class="flex flex-col gap-4">
    {#each [
      { n:'01', icon:Target, title:'Pilih tipe tagihan', desc:'Split Bill, Group Bill, atau Patungan — sesuaikan dengan kebutuhan.' },
      { n:'02', icon:Users, title:'Tambah peserta', desc:'Masukkan nama teman-teman, pilih warna avatar masing-masing.' },
      { n:'03', icon:ReceiptText, title:'Catat pengeluaran', desc:'Input manual atau scan struk langsung dari kamera.' },
      { n:'04', icon:Link2, title:'Bagikan &amp; selesai', desc:'Kirim link ke grup WhatsApp, semua bisa langsung lihat siapa bayar apa.' },
    ] as step}
      <div class="sk-card flex items-center gap-4 p-4">
        <div class="flex-shrink-0 text-[#7c6aff]"><Icon icon={step.icon} size={28} /></div>
        <div class="flex-1">
          <div class="text-[10px] font-mono font-bold text-[#7c6aff] mb-0.5">{step.n}</div>
          <div class="text-sm font-bold mb-0.5">{@html step.title}</div>
          <div class="text-xs text-sk-text2 leading-relaxed">{@html step.desc}</div>
        </div>
      </div>
    {/each}
  </div>
</section>

<!-- ── FEATURES ── -->
<section class="relative z-10 px-5 pb-12 animate-fade-up animate-fade-up-3">
  <h2 class="text-xl font-extrabold tracking-tight text-center mb-8">3 mode, satu app</h2>

  <div class="flex flex-col gap-3">
    {#each [
      {
        icon: ReceiptText, title: 'Split Bill',
        desc: 'Untuk satu tagihan, satu momen. Bayar bareng di restoran, scan struk, bagi otomatis.',
        color: 'from-violet-500/15 to-transparent', border: 'border-violet-500/30',
        tag: 'Gratis', tagClass: 'sk-tag-violet',
        href: '/create',
      },
      {
        icon: Users, title: 'Group Bill',
        desc: 'Banyak transaksi dalam satu grup. Liburan, nongkrong rutin — semua tercatat rapi.',
        color: 'from-teal-500/15 to-transparent', border: 'border-teal-500/30',
        tag: 'Gratis', tagClass: 'sk-tag-teal',
        href: '/group',
      },
      {
        icon: Target, title: 'Patungan',
        desc: 'Kumpulkan dana bersama untuk satu tujuan. Kado, sumbangan — lengkap dengan progress bar.',
        color: 'from-pink-500/15 to-transparent', border: 'border-pink-500/30',
        tag: 'Gratis', tagClass: 'sk-tag-pink',
        href: '/create',
      },
    ] as card}
      <a href={card.href}
        class="sk-card sk-card-hover p-5 bg-gradient-to-br {card.color} {card.border} no-underline block">
        <div class="flex items-start gap-3 mb-2">
          <span class="text-[#7c6aff]"><Icon icon={card.icon} size={24} /></span>
          <div class="flex-1">
            <div class="font-bold text-sm mb-0.5">{card.title}</div>
            <div class="text-xs text-sk-text2 leading-relaxed">{card.desc}</div>
          </div>
        </div>
        <div class="sk-tag {card.tagClass}">{card.tag}</div>
      </a>
    {/each}
  </div>
</section>

<!-- ── PRICING ── -->
<section class="relative z-10 px-5 pb-16 animate-fade-up animate-fade-up-4">
  <h2 class="text-xl font-extrabold tracking-tight text-center mb-2">Harga</h2>
  <p class="text-xs text-sk-text2 text-center mb-8">Tidak ada langganan. Bayar sekali, pakai selamanya.</p>

  <div class="grid grid-cols-2 gap-3">
    <!-- Free -->
    <div class="sk-card p-4 flex flex-col gap-3">
      <div class="text-sm font-bold">Gratis</div>
      <div class="text-2xl font-extrabold font-mono">Rp0</div>
      <ul class="flex flex-col gap-1.5 text-xs text-sk-text2">
        <li class="flex items-center gap-1.5"><Icon icon={Check} size={13} class="text-[#6affd4]" /> Group bill (2 hari)</li>
        <li class="flex items-center gap-1.5"><Icon icon={Check} size={13} class="text-[#6affd4]" /> Maks. 15 transaksi</li>
        <li class="flex items-center gap-1.5"><Icon icon={Check} size={13} class="text-[#6affd4]" /> Maks. 5 peserta</li>
        <li class="text-sk-text3 flex items-center gap-1.5"><Icon icon={X} size={13} /> Export PDF</li>
        <li class="text-sk-text3 flex items-center gap-1.5"><Icon icon={X} size={13} /> Tanpa iklan</li>
      </ul>
    </div>

    <!-- Pro -->
    <div class="sk-card p-4 flex flex-col gap-3 relative overflow-hidden
                border-[rgba(124,106,255,0.4)]"
         style="background:linear-gradient(135deg,rgba(124,106,255,0.08),rgba(255,106,142,0.05))">
      <div class="sk-tag sk-tag-violet absolute top-3 right-3"><Icon icon={Sparkles} size={11} /> PRO</div>
      <div class="text-sm font-bold mt-0.5">Pro</div>
      <div>
        <div class="text-2xl font-extrabold font-mono">Rp49.000</div>
        <div class="text-[10px] text-sk-text2 font-mono">sekali bayar · selamanya</div>
      </div>
      <ul class="flex flex-col gap-1.5 text-xs text-sk-text2">
        <li class="text-[#6affd4] flex items-center gap-1.5"><Icon icon={Check} size={13} /> Tidak kedaluwarsa</li>
        <li class="text-[#6affd4] flex items-center gap-1.5"><Icon icon={Check} size={13} /> Transaksi tak terbatas</li>
        <li class="text-[#6affd4] flex items-center gap-1.5"><Icon icon={Check} size={13} /> Export PDF &amp; CSV</li>
        <li class="text-[#6affd4] flex items-center gap-1.5"><Icon icon={Check} size={13} /> Tanpa iklan</li>
        <li class="text-[#6affd4] flex items-center gap-1.5"><Icon icon={Check} size={13} /> Sinkronisasi cloud</li>
      </ul>
    </div>
  </div>
</section>

<!-- ── FOOTER ── -->
<footer class="relative z-10 px-5 pb-8 pt-4 border-t border-sk text-center">
  <div class="text-sm font-extrabold mb-1">
    Split<span class="text-[#7c6aff]">Kita</span>
  </div>
  <div class="text-xs text-sk-text3">Bayar bareng, tanpa ribet · v1.0</div>
</footer>

<style>
  @keyframes meshRotate {
    0%   { transform: rotate(0deg)  scale(1); }
    50%  { transform: rotate(4deg)  scale(1.04); }
    100% { transform: rotate(-3deg) scale(1.02); }
  }
</style>
