import type { Action } from 'svelte/action'

/** Jarak geser (px) sebelum dianggap drag, bukan klik. */
const DRAG_THRESHOLD = 6

/** Toleransi (px) untuk pembulatan subpixel saat baca scrollLeft. */
const SCROLL_EPS = 2

/**
 * use:wheelX — alihkan roda mouse vertikal jadi scroll horizontal
 * pada strip (chip peserta, tab filter) yang scrollbar-nya disembunyikan.
 *
 * Kenapa perlu: scrollbar disembunyikan (scrollbar-none) + roda mouse
 * secara native scroll halaman vertikal, sehingga strip horizontal
 * praktis tidak terjangkau mouse. Touch tetap native (pan-x).
 *
 * Sopan: hanya intercept kalau strip masih bisa scroll ke arah itu;
 * di ujung, event dibiarkan lolos agar halaman tetap bisa di-scroll.
 */
export const wheelX: Action<HTMLElement> = (node) => {
  function onWheel(e: WheelEvent) {
    const el = e.currentTarget as HTMLElement
    // Trackpad sudah kirim deltaX sendiri — cukup alihkan sumbu dominan Y.
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return

    const canLeft = el.scrollLeft > 0
    const canRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1

    if ((e.deltaY > 0 && canRight) || (e.deltaY < 0 && canLeft)) {
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
  }

  // passive:false wajib agar preventDefault() diizinkan browser.
  node.addEventListener('wheel', onWheel, { passive: false })

  return {
    destroy() {
      node.removeEventListener('wheel', onWheel)
    }
  }
}

/**
 * use:dragX — drag-to-scroll (klik-tahan-geser ala peta Google Maps).
 *
 * Cara pakai: pasang bareng use:wheelX di strip horizontal.
 * Hanya aktif untuk mouse (touch tetap pakai pan native + touch-pan-x).
 *
 * Detail penting: chip di dalam strip adalah <button>/<a>. Tanpa
 * penanganan khusus, selesai drag = klik nyasar (kepilih/kena pencet).
 * Solusinya: kalau geser melewati DRAG_THRESHOLD, klik berikutnya
 * ditelan di fase capture sebelum sampai ke tombol.
 */
export const dragX: Action<HTMLElement> = (node) => {
  let down = false
  let dragged = false
  let startX = 0
  let startScroll = 0

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return
    down = true
    dragged = false
    startX = e.clientX
    startScroll = node.scrollLeft
  }

  function onPointerMove(e: PointerEvent) {
    if (!down) return
    const dx = e.clientX - startX
    if (!dragged && Math.abs(dx) > DRAG_THRESHOLD) {
      dragged = true
      node.classList.add('dragging')
    }
    if (dragged) node.scrollLeft = startScroll - dx
  }

  function endDrag() {
    down = false
    node.classList.remove('dragging')
    // `dragged` sengaja belum di-reset: dipakai penelan klik di bawah.
  }

  function swallowClick(e: MouseEvent) {
    if (!dragged) return
    e.preventDefault()
    e.stopPropagation()
    dragged = false
  }

  node.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', endDrag)
  // Capture: jalan SEBELUM onclick tombol di dalam strip.
  node.addEventListener('click', swallowClick, true)

  return {
    destroy() {
      node.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
      node.removeEventListener('click', swallowClick, true)
    }
  }
}

/**
 * use:fadeX — fade tepi strip hanya di sisi yang masih bisa digeser.
 *
 * Pasangan class CSS `mask-fade-l` / `mask-fade-r` (lihat app.css).
 * Aturan: mentok kiri -> tanpa fade kiri; mentok kanan -> tanpa fade
 * kanan; konten muat (tidak bisa scroll) -> tanpa fade sama sekali.
 * ResizeObserver menangani perubahan ukuran (font loading, dsb).
 */
export const fadeX: Action<HTMLElement> = (node) => {
  function update() {
    const max = node.scrollWidth - node.clientWidth
    const canScroll = max > SCROLL_EPS
    node.classList.toggle('mask-fade-l', canScroll && node.scrollLeft > SCROLL_EPS)
    node.classList.toggle('mask-fade-r', canScroll && node.scrollLeft < max - SCROLL_EPS)
  }

  node.addEventListener('scroll', update, { passive: true })
  const ro = new ResizeObserver(update)
  ro.observe(node)
  update()

  return {
    destroy() {
      node.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }
}
