<script lang="ts">
  import { theme } from '$lib/stores.svelte'
  import Icon from '$lib/components/ui/Icon.svelte'
  import { Sun, Moon } from 'lucide-svelte'
</script>

<button
  onclick={theme.toggle}
  class="w-9 h-9 flex items-center justify-center rounded-sk-sm border border-sk text-sk-text2 bg-sk-surface hover:border-[#7c6aff] hover:text-[#7c6aff] transition-all duration-200"
  aria-label="Toggle tema"
  title={theme.isDark ? 'Mode terang' : 'Mode gelap'}
>
  <Icon icon={theme.isDark ? Sun : Moon} size={18} />
</button>
