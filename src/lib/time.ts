/**
 * Format waktu ala log aktivitas: "Hari ini · 14:32",
 * "Kemarin · 13:45", atau "11 Jul · 16:00".
 */
export function formatActivityTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso

  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')

  const startOf = (x: Date) => {
    const c = new Date(x)
    c.setHours(0, 0, 0, 0)
    return c.getTime()
  }
  const dayDiff = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000)

  if (dayDiff <= 0) return `Hari ini · ${time}`
  if (dayDiff === 1) return `Kemarin · ${time}`
  const date = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  return `${date} · ${time}`
}
