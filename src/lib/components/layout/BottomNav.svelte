<script lang="ts">
  import { page } from '$app/stores'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { Wallet, ChartColumn, Users, Settings } from 'lucide-svelte'

  interface NavItem {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any
    label: string
    href: string
  }

  const items: NavItem[] = [
    { icon: Wallet, label: 'Tagihan', href: '/group' },
    { icon: ChartColumn, label: 'Statistik', href: '/stats' },
    { icon: Users, label: 'Anggota', href: '/members' },
    { icon: Settings, label: 'Pengaturan', href: '/settings' }
  ]
</script>

<nav class="sk-bottom-nav" aria-label="Navigasi utama">
  {#each items as item}
    {@const isActive = $page.url.pathname.startsWith(item.href)}
    <a
      href={item.href}
      class="flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-sk-sm transition-all duration-200 no-underline"
      class:text-[#7c6aff]={isActive}
      class:bg-[rgba(124,106,255,0.10)]={isActive}
      class:text-sk-text2={!isActive}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon icon={item.icon} size={20} />
      <span class="text-[10px] font-semibold tracking-wide">{item.label}</span>
    </a>
  {/each}
</nav>
