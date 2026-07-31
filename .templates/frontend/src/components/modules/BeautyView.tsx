import { useState, useRef } from 'react'
import { useStore } from '@/lib/store'
import { todayKey, toKey, formatMonthYear, weekdayWeeks } from '@/lib/format'
import { HABIT_CATEGORIES } from '@/lib/constants'
import { Flame, Trash2, Plus, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F']

export function BeautyView() {
  const store = useStore()
  const today = todayKey()
  const [tab, setTab] = useState<'life' | 'exercise'>('life')
  const [name, setName] = useState('')
  const [target, setTarget] = useState('1')
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { y: now.getFullYear(), m: now.getMonth() }
  })

  const habits = store.state.habits.filter((h) => h.category === tab)
  const weeks = weekdayWeeks(month.y, month.m)
  const pendingRef = useRef<{ key: string; timer: number } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const longPressRef = useRef<{ id: string; timer: number } | null>(null)
  const [dragEnabledId, setDragEnabledId] = useState<string | null>(null)
  const dragLiveRef = useRef<{ from: string | null; to: string | null }>({ from: null, to: null })

  const addHabit = () => {
    if (!name.trim()) return
    store.addHabit({ name: name.trim(), emoji: '🌿', category: tab, target: Math.max(1, Number(target) || 1) })
    setName('')
    setTarget('1')
  }

  const prevMonth = () => setMonth((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 }))
  const nextMonth = () => setMonth((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 }))

  const handleCellClick = (habitId: string, dateKey: string) => {
    const cellKey = `${habitId}-${dateKey}`
    // double-click: cancel (remove one check)
    if (pendingRef.current?.key === cellKey) {
      window.clearTimeout(pendingRef.current.timer)
      pendingRef.current = null
      store.setHabitCount(habitId, dateKey, 0)
      return
    }
    // clear any previous pending click
    if (pendingRef.current) window.clearTimeout(pendingRef.current.timer)
    // single-click: check in (set to target count = highlight)
    const timer = window.setTimeout(() => {
      if (pendingRef.current?.timer === timer) pendingRef.current = null
      const habit = store.state.habits.find((h) => h.id === habitId)
      store.setHabitCount(habitId, dateKey, habit?.target ?? 1)
    }, 260)
    pendingRef.current = { key: cellKey, timer }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">Beauty &amp; Health</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Single click to check in (highlight), double click to cancel</p>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-card/60 p-0.5">
        {HABIT_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition',
              tab === c.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
            )}
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {habits.map((h) => {
          const streak = store.habitStreak(h.id, today)
          const isDragging = dragId === h.id
          const isDragOver = dragOverId === h.id

          const startLongPress = (id: string) => {
            const timer = window.setTimeout(() => {
              longPressRef.current = null
              setDragEnabledId(id)
            }, 350)
            longPressRef.current = { id, timer }
          }

          const cancelLongPress = () => {
            if (longPressRef.current) {
              window.clearTimeout(longPressRef.current.timer)
              longPressRef.current = null
            }
          }

          const liveReorder = (overId: string) => {
            if (!dragId || dragId === overId) return
            if (dragLiveRef.current.from === dragId && dragLiveRef.current.to === overId) return
            const fromFiltered = habits.findIndex((x) => x.id === dragId)
            const toFiltered = habits.findIndex((x) => x.id === overId)
            if (fromFiltered < 0 || toFiltered < 0) return
            const fromGlobal = store.state.habits.findIndex((x) => x.id === dragId)
            const toGlobal = store.state.habits.findIndex((x) => x.id === overId)
            if (fromGlobal === toGlobal) return
            dragLiveRef.current = { from: dragId, to: overId }
            store.moveHabit(fromGlobal, toGlobal)
          }

          return (
            <div
              key={h.id}
              draggable
              onDragStart={(e) => {
                if (dragEnabledId !== h.id) {
                  e.preventDefault()
                  return
                }
                setDragId(h.id)
              }}
              onDragEnter={() => setDragOverId(h.id)}
              onDragOver={(e) => {
                e.preventDefault()
                liveReorder(h.id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setDragId(null)
                setDragOverId(null)
                setDragEnabledId(null)
                dragLiveRef.current = { from: null, to: null }
              }}
              onDragEnd={() => {
                setDragId(null)
                setDragOverId(null)
                setDragEnabledId(null)
                dragLiveRef.current = { from: null, to: null }
              }}
              className={cn(
                'glass rounded-xl p-3 transition select-none duration-200 ease-out',
                isDragging && 'opacity-40 scale-[0.98]',
                isDragOver && 'ring-2 ring-primary/40 bg-primary/5 scale-[1.02]',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{h.emoji}</span>
                  <div>
                    <div className="text-sm font-medium leading-tight">{h.name}</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Flame className={cn('size-2.5', streak > 0 ? 'text-[#c49aa6]' : 'text-muted-foreground')} />
                      {streak}-day · target {h.target}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <div
                    className="grid cursor-grab place-items-center rounded p-0.5 text-muted-foreground/60 active:cursor-grabbing"
                    title="Long press and drag to reorder"
                    onPointerDown={(e) => {
                      if (e.button !== 0) return
                      startLongPress(h.id)
                    }}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                  >
                    <GripVertical className="size-4" />
                  </div>
                  <button
                    onClick={() => store.deleteHabit(h.id)}
                    className="grid size-5 place-items-center rounded text-destructive hover:bg-destructive/10"
                    aria-label="Delete habit"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>

              <div className="mt-2 text-[10px] font-medium text-muted-foreground">{formatMonthYear(month.y, month.m)}</div>

              <div className="mt-1">
                <div className="grid grid-cols-5 gap-0.5">
                  {WEEKDAY_LETTERS.map((w, i) => (
                    <div key={i} className="py-0.5 text-center text-[9px] font-medium text-muted-foreground">
                      {w}
                    </div>
                  ))}
                  {weeks.flat().map((date, idx) => {
                    if (!date) {
                      return <div key={idx} className="aspect-square rounded bg-muted/30" />
                    }
                    const key = toKey(date)
                    const count = store.habitCount(h.id, key)
                    const met = count >= h.target
                    const isToday = key === today
                    return (
                      <button
                        key={key}
                        onClick={() => handleCellClick(h.id, key)}
                        title={`${key}: ${count}/${h.target}`}
                        className={cn(
                          'relative flex aspect-square items-center justify-center rounded text-[10px] font-medium transition',
                          met
                            ? 'bg-primary text-primary-foreground'
                            : count > 0
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground hover:bg-accent',
                          isToday && !met && 'ring-1 ring-primary/50',
                        )}
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
        {habits.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-muted-foreground">No habits yet — add one below 🌱</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={prevMonth}
          className="flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2.5 py-1 text-xs transition hover:bg-accent"
        >
          <ChevronLeft className="size-3.5" /> Prev
        </button>
        <span className="text-xs font-semibold">{formatMonthYear(month.y, month.m)}</span>
        <button
          onClick={nextMonth}
          className="flex items-center gap-1 rounded-lg border border-border bg-card/60 px-2.5 py-1 text-xs transition hover:bg-accent"
        >
          Next <ChevronRight className="size-3.5" />
        </button>
      </div>

      <div className="glass rounded-xl p-3">
        <h3 className="mb-2 text-sm font-semibold">Add a habit</h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            placeholder={`New ${tab} habit…`}
            className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="number"
            min={1}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-16 rounded-lg border border-border bg-background/60 px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30"
            aria-label="Target per day"
          />
          <button
            onClick={addHabit}
            className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus className="size-3.5" /> Add
          </button>
        </div>
      </div>
    </div>
  )
}
