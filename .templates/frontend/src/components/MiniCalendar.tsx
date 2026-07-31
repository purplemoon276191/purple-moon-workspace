import { useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Grid3X3 } from 'lucide-react'
import { monthMatrix, todayKey, fromKey, toKey, sameMonth, formatMonthYear, WEEKDAY_SHORT, MONTH_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'

export function MiniCalendar({
  selected,
  onSelect,
  marks,
}: {
  selected: string
  onSelect: (k: string) => void
  marks?: string[]
}) {
  const sel = fromKey(selected)
  const [view, setView] = useState({ y: sel.getFullYear(), m: sel.getMonth() })
  const [mode, setMode] = useState<'month' | 'year'>('month')
  const today = todayKey()
  const markSet = new Set(marks ?? [])

  const prev = () =>
    setView((p) => {
      if (mode === 'year') return { y: p.y - 1, m: p.m }
      return p.m - 1 < 0 ? { y: p.y - 1, m: 11 } : { ...p, m: p.m - 1 }
    })
  const next = () =>
    setView((p) => {
      if (mode === 'year') return { y: p.y + 1, m: p.m }
      return p.m + 1 > 11 ? { y: p.y + 1, m: 0 } : { ...p, m: p.m + 1 }
    })

  const selectMonth = (m: number) => {
    setView((p) => ({ ...p, m }))
    setMode('month')
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">{mode === 'year' ? view.y : formatMonthYear(view.y, view.m)}</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('month')}
            className={cn(
              'grid size-8 place-items-center rounded-lg transition',
              mode === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
            aria-label="Month view"
            title="Month"
          >
            <CalendarDays className="size-4" />
          </button>
          <button
            onClick={() => setMode('year')}
            className={cn(
              'grid size-8 place-items-center rounded-lg transition',
              mode === 'year' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            )}
            aria-label="Year view"
            title="Year"
          >
            <Grid3X3 className="size-4" />
          </button>
          <div className="mx-1 h-4 w-px bg-border" />
          <button onClick={prev} className="grid size-8 place-items-center rounded-lg hover:bg-accent" aria-label="Previous">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={next} className="grid size-8 place-items-center rounded-lg hover:bg-accent" aria-label="Next">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {mode === 'month' ? (
        <>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAY_SHORT.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthMatrix(view.y, view.m).map((d, i) => {
              const key = toKey(d)
              const inMonth = sameMonth(d, new Date(view.y, view.m, 1))
              const isToday = key === today
              const isSel = key === selected
              const hasMark = markSet.has(key)
              return (
                <button
                  key={i}
                  onClick={() => onSelect(key)}
                  className={cn(
                    'relative grid aspect-square place-items-center rounded-lg text-sm transition',
                    !inMonth && 'opacity-35',
                    isSel ? 'bg-primary font-semibold text-primary-foreground shadow-sm' : 'hover:bg-accent',
                    isToday && !isSel && 'ring-1 ring-primary/50',
                  )}
                >
                  {d.getDate()}
                  {hasMark && (
                    <span className={cn('absolute bottom-1 h-1.5 w-1.5 rounded-full', isSel ? 'bg-primary-foreground' : 'bg-primary')} />
                  )}
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {MONTH_LABELS.map((label, m) => {
            const isSel = m === view.m
            const daysInMonth = new Date(view.y, m + 1, 0).getDate()
            const hasMark = Array.from({ length: daysInMonth }, (_, i) => toKey(new Date(view.y, m, i + 1))).some((k) => markSet.has(k))
            return (
              <button
                key={m}
                onClick={() => selectMonth(m)}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-xl py-3 text-xs transition',
                  isSel ? 'bg-primary font-semibold text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                <span className="text-sm">{label}</span>
                {hasMark && <span className={cn('mt-1 h-1 w-1 rounded-full', isSel ? 'bg-primary-foreground' : 'bg-primary')} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
