<script lang="ts">
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'

  // Route /split versi dummy sudah diganti /split/[id] (baca dari API).
  // Redirect sementara sampai ada halaman daftar bill.
  onMount(() => {
    goto('/', { replaceState: true })
  })
</script>

<div class="min-h-dvh flex items-center justify-center">
  <p class="text-sm text-sk-text2">Mengalihkan…</p>
</div>
