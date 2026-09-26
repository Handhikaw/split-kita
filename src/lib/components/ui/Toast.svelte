<script lang="ts">
  import { toastStore } from '$lib/stores.svelte'
</script>

<div
  class="sk-toast"
  class:show={toastStore.visible}
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  {toastStore.message}
</div>
