<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import { theme } from '$lib/stores.svelte'
  import Toast from '$lib/components/ui/Toast.svelte'

  let { children } = $props()

  onMount(() => {
    theme.init()
  })
</script>

<div class="flex justify-center min-h-dvh" class:dark={theme.isDark} class:light={!theme.isDark}>
  <div class="w-full max-w-[420px] relative">
    {@render children()}
  </div>
</div>

<Toast />
