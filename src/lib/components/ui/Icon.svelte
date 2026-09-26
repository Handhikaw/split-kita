<script lang="ts">
  /**
   * Icon.svelte — Lucide icon wrapper for lucide-svelte
   *
   * Svelte 5 compatible — uses Component type, not deprecated ComponentType
   *
   * Install:
   *   npm install lucide-svelte
   *
   * Usage:
   *   import Icon from '$lib/components/ui/Icon.svelte'
   *   import { Plus, ArrowLeft, Search } from 'lucide-svelte'
   *
   *   <!-- default size 18, strokeWidth 1.75 -->
   *   <Icon icon={Plus} />
   *
   *   <!-- custom size & color -->
   *   <Icon icon={ArrowLeft} size={20} class="text-violet-400" />
   *
   *   <!-- tighter stroke for small icons -->
   *   <Icon icon={Search} size={14} strokeWidth={1.5} />
   *
   * Props:
   *   icon        — any Lucide icon component (required)
   *   size        — px size, applied to both width & height (default: 18)
   *   strokeWidth — SVG stroke width (default: 1.75)
   *   class       — extra Tailwind / CSS classes forwarded to the SVG
   */

  // NB: icon diketik `any` dengan sengaja — lucide-svelte yang terinstall
  // masih bertipe legacy (SvelteComponentTyped, gaya Svelte 4), jadi tidak
  // cocok dengan tipe `Component` Svelte 5. Wrapper ini cuma terusin props.
  interface Props {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any
    size?: number
    strokeWidth?: number
    class?: string
    color?: string
  }

  let {
    icon: IconComponent,
    size = 18,
    strokeWidth = 1.75,
    class: cls = '',
    color,
  }: Props = $props()
</script>

<!--
  Svelte 5: dynamic component via {@render} is not needed here —
  Lucide exports real Svelte components, so we can use them directly
  as long as we bind the variable to a local name first (done above).
-->
<IconComponent
  {size}
  {strokeWidth}
  class={cls}
  {color}
/>
