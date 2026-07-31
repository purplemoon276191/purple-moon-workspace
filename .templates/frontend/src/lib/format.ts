// Date + formatting helpers (no external deps, small & safe)

export function todayKey(d = new Date()): string {
  return toKey(d)
}

export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatNice(key: string): string {
  const d = fromKey(key)
  return `${WEEKDAY_LABELS[d.getDay()]}, ${MONTH_LABELS[d.getMonth()]} ${d.getDate()}`
}

export function formatMonthYear(y: number, m: number): string {
  return `${MONTH_LABELS[m]} ${y}`
}

export function lastNDays(n: number): string[] {
  const out: string[] = []
  const base = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    out.push(toKey(d))
  }
  return out
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function monthMatrix(year: number, month: number): Date[] {
  // returns a 6x7 grid (42 cells) of dates covering the month
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }
  return cells
}

/** Returns weeks containing only Monday-Friday dates for a given month.
 *  Each inner array has 5 cells [Mon, Tue, Wed, Thu, Fri].
 */
export function weekdayWeeks(year: number, month: number): (Date | null)[][] {
  const weeks: (Date | null)[][] = []
  let week: (Date | null)[] = [null, null, null, null, null]
  const last = new Date(year, month + 1, 0)
  for (let d = 1; d <= last.getDate(); d++) {
    const date = new Date(year, month, d)
    const wd = date.getDay()
    if (wd === 0 || wd === 6) continue
    const col = wd - 1
    week[col] = date
    if (col === 4) {
      weeks.push(week)
      week = [null, null, null, null, null]
    }
  }
  if (week.some(Boolean)) weeks.push(week)
  return weeks
}

export function monthStart(year: number, month: number): Date {
  return new Date(year, month, 1)
}
