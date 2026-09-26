<script lang="ts">
  interface Props {
    name: string
    grad: string
    size?: 'sm' | 'md' | 'lg'  // 28 | 36 | 44
    active?: boolean
    class?: string
  }

  let { name, grad, size = 'md', active = false, class: cls = '' }: Props = $props()

  const sizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
  }

  const initial = name.trim() ? name.trim()[0].toUpperCase() : '?'
</script>

<div
  class="sk-avatar font-bold text-white transition-all duration-200 {sizes[size]} {cls}"
  class:ring-2={active}
  class:ring-[#7c6aff]={active}
  class:shadow-sk-glow-violet={active}
  style="background:{grad}"
  title={name}
>
  {initial}
</div>
