<script lang="ts">
  import { GRADIENTS } from '$lib/stores.svelte'

  interface Props {
    value: string
    onchange?: (grad: string) => void
  }

  let { value = $bindable(GRADIENTS[0]), onchange }: Props = $props()

  function pick(g: string) {
    value = g
    onchange?.(g)
  }
</script>

<div class="flex gap-2 flex-wrap" role="radiogroup" aria-label="Warna avatar">
  {#each GRADIENTS as grad}
    <button
      type="button"
      onclick={() => pick(grad)}
      class="w-6.5 h-6.5 rounded-full border-2 transition-all duration-200 flex-shrink-0
             hover:scale-110"
      class:border-white={value === grad}
      class:shadow-sk-glow-violet={value === grad}
      class:scale-110={value === grad}
      class:border-transparent={value !== grad}
      style="background:{grad}"
      style:width="26px"
      style:height="26px"
      aria-checked={value === grad}
      aria-label="Warna gradient"
    />
  {/each}
</div>
