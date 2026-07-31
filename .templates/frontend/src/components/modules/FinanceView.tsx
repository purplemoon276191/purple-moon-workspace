import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '@/lib/store'
import { todayKey, toKey, formatMonthYear, monthMatrix, WEEKDAY_SHORT } from '@/lib/format'
import { FINANCE_CATEGORIES } from '@/lib/constants'
import { Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthShort(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1).toLocaleString('en-US', { month: 'short' })
}

export function FinanceView() {
  const store = useStore()
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(FINANCE_CATEGORIES.expense[0])
  const [note, setNote] = useState('')
  const [recordDate, setRecordDate] = useState(todayKey())
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { y: now.getFullYear(), m: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Separate trend month for chart — decoupled from expense calendar
  const [trendMonth, setTrendMonth] = useState(() => {
    const now = new Date()
    return { y: now.getFullYear(), m: now.getMonth() }
  })

  const monthStr = `${month.y}-${String(month.m + 1).padStart(2, '0')}`

  const records = store.state.finance
    .filter((r) => r.date.startsWith(monthStr))
    .sort((a, b) => b.date.localeCompare(a.date))
  const income = records.filter((r) => r.type === 'income').reduce((a, r) => a + r.amount, 0)
  const expense = records.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amount, 0)

  const chartData = useMemo(() => {
    const data: { key: string; total: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(trendMonth.y, trendMonth.m - i, 1)
      const key = monthKey(d)
      const total = store.state.finance
        .filter((r) => r.type === 'expense' && r.date.startsWith(key))
        .reduce((a, r) => a + r.amount, 0)
      data.push({ key, total })
    }
    return data
  }, [store.state.finance, trendMonth])

  const maxTotal = Math.max(...chartData.map((d) => d.total), 1)
  const chartRef = useRef<HTMLDivElement>(null)

  // SVG chart constants
  const CHART_H = 140
  const BAR_W = 36
  const GAP = 20
  const STEP = BAR_W + GAP
  const PADDING_X = 4
  const PADDING_BOTTOM = 28 // room for month labels
  const SVG_W = chartData.length * STEP + PADDING_X * 2

  // Scroll logic for bottom arrows
  const [trendScroll, setTrendScroll] = useState(0)
  const [visibleCount, setVisibleCount] = useState(5)

  useEffect(() => {
    if (!chartRef.current) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width
      setVisibleCount(Math.max(1, Math.min(chartData.length, Math.floor(w / STEP))))
    })
    ro.observe(chartRef.current)
    return () => ro.disconnect()
  }, [chartData.length, STEP])

  const maxScroll = Math.max(0, chartData.length - visibleCount)

  useEffect(() => {
    setTrendScroll((s) => Math.min(s, maxScroll))
  }, [maxScroll])

  // Scroll trend chart; auto-switch year when reaching boundary
  const scrollTrend = useCallback(
    (dir: -1 | 1) => {
      const newScroll = trendScroll + dir
      // Hit left boundary → shift to previous year's last months
      if (newScroll < 0) {
        setTrendMonth((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 }))
        setTrendScroll(11)
        return
      }
      // Hit right boundary → shift to next year's first months
      if (newScroll > maxScroll) {
        setTrendMonth((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 }))
        setTrendScroll(0)
        return
      }
      setTrendScroll(newScroll)
    },
    [trendScroll, maxScroll],
  )

  const add = () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    store.addFinance({ type, amount: amt, category, note: note.trim() || undefined, date: recordDate })
    setAmount('')
    setNote('')
  }

  const calendarDays = monthMatrix(month.y, month.m)
  const selectedRecords = selectedDate
    ? store.state.finance.filter((r) => r.date === selectedDate).sort((a, b) => b.amount - a.amount)
    : []

  const prevMonth = () => setMonth((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 }))
  const nextMonth = () => setMonth((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 }))

  return (
    <div className="space-y-2.5">
      <div>
        <h2 className="text-xl font-semibold">Finance</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Track income, expenses and daily spending</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground">Income</div>
          <div className="mt-0.5 text-lg font-semibold text-[#9db5a0]">¥{income.toFixed(2)}</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground">Expense</div>
          <div className="mt-0.5 text-lg font-semibold text-[#c49aa6]">¥{expense.toFixed(2)}</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground">Balance</div>
          <div className={cn('mt-0.5 text-lg font-semibold', income - expense >= 0 ? 'text-primary' : 'text-destructive')}>
            ¥{(income - expense).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[40%_1fr]">
        <div className="glass rounded-xl p-2.5">
          <h3 className="mb-1.5 text-sm font-semibold">Monthly expense trend</h3>
          <div className="relative">
            {/* Chart area */}
            <div ref={chartRef} className="overflow-hidden">
              <svg
                viewBox={`0 0 ${SVG_W} ${CHART_H + PADDING_BOTTOM}`}
                className="w-full"
                style={{ height: CHART_H + PADDING_BOTTOM }}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c49aa6" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#c49aa6" stopOpacity="0.25" />
                  </linearGradient>
                </defs>
                {/* Bars */}
                {chartData.map((d, i) => {
                  const pct = d.total / maxTotal
                  const barH = pct === 0 ? 0 : Math.max(pct * (CHART_H - 10), 4)
                  const x = PADDING_X + i * STEP + 2
                  const y = CHART_H - barH
                  const opacity = 0.45 + pct * 0.55
                  return (
                    <g key={d.key}>
                      <rect
                        x={x}
                        y={y}
                        width={BAR_W - 4}
                        height={barH}
                        rx="4"
                        ry="4"
                        fill={`rgba(196,154,166,${opacity})`}
                        className="transition-all duration-300"
                      />
                      {/* Amount above bar */}
                      <text
                        x={x + (BAR_W - 4) / 2}
                        y={y - 6}
                        textAnchor="middle"
                        className="fill-muted-foreground"
                        fontSize="9"
                        fontWeight="500"
                      >
                        ¥{d.total.toFixed(0)}
                      </text>
                    </g>
                  )
                })}
                {/* Line overlay */}
                <polyline
                  fill="none"
                  stroke="#a37e89"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                  points={chartData
                    .map((d, i) => {
                      const pct = d.total / maxTotal
                      const barH = pct === 0 ? 0 : Math.max(pct * (CHART_H - 10), 4)
                      const cx = PADDING_X + i * STEP + (BAR_W - 4) / 2 + 2
                      const cy = CHART_H - barH
                      return `${cx},${cy}`
                    })
                    .join(' ')}
                />
                {/* Dots on line */}
                {chartData.map((d, i) => {
                  const pct = d.total / maxTotal
                  const barH = pct === 0 ? 0 : Math.max(pct * (CHART_H - 10), 4)
                  const cx = PADDING_X + i * STEP + (BAR_W - 4) / 2 + 2
                  const cy = CHART_H - barH
                  return <circle key={d.key} cx={cx} cy={cy} r="3" fill="#a37e89" opacity="0.8" />
                })}
                {/* Month labels at bottom */}
                {chartData.map((d, i) => (
                  <text
                    key={`lbl-${d.key}`}
                    x={PADDING_X + i * STEP + (BAR_W - 4) / 2 + 2}
                    y={CHART_H + 18}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize="10"
                    fontWeight="500"
                  >
                    {formatMonthShort(d.key)}
                  </text>
                ))}
              </svg>
            </div>
            {/* Bottom scroll arrows */}
            <div className="mt-1 flex items-center justify-center gap-2">
              <button
                onClick={() => scrollTrend(-1)}
                className="grid size-6 place-items-center rounded-md hover:bg-accent transition"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="text-[10px] text-muted-foreground">
                {formatMonthShort(chartData[0].key)} – {formatMonthShort(chartData[chartData.length - 1].key)}
              </span>
              <button
                onClick={() => scrollTrend(1)}
                className="grid size-6 place-items-center rounded-md hover:bg-accent transition"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Expense calendar</h3>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="grid size-6 place-items-center rounded-md hover:bg-accent">
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="min-w-[4.5rem] text-center text-xs font-medium">{formatMonthYear(month.y, month.m)}</span>
              <button onClick={nextMonth} className="grid size-6 place-items-center rounded-md hover:bg-accent">
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {WEEKDAY_SHORT.map((w, i) => (
              <div key={i} className="py-0.5 text-center text-[9px] font-medium text-muted-foreground">
                {w}
              </div>
            ))}
            {calendarDays.map((d, idx) => {
              const key = toKey(d)
              const isCurrentMonth = d.getMonth() === month.m
              const dayExpense = store.state.finance
                .filter((r) => r.type === 'expense' && r.date === key)
                .reduce((a, r) => a + r.amount, 0)
              const isSelected = selectedDate === key
              const isToday = key === todayKey()
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedDate(isSelected ? null : key)
                    setRecordDate(key)
                  }}
                  className={cn(
                    'relative flex aspect-square flex-col items-center justify-center rounded-md text-[10px] transition',
                    isCurrentMonth ? 'bg-muted text-foreground hover:bg-accent' : 'bg-transparent text-muted-foreground/40',
                    isSelected && 'ring-2 ring-[#c49aa6] bg-[#c49aa6]/8',
                    isToday && !isSelected && 'ring-1 ring-primary/50',
                  )}
                >
                  <span>{d.getDate()}</span>
                  {dayExpense > 0 && (
                    <span className="text-[8px] text-[#c49aa6]">¥{dayExpense.toFixed(0)}</span>
                  )}
                </button>
              )
            })}
          </div>

          {selectedDate && (
            <div className="mt-2 rounded-lg border border-border/60 p-2">
              <div className="mb-1 flex items-center justify-between">
                <h4 className="text-xs font-semibold">{selectedDate} spending</h4>
                <button onClick={() => setSelectedDate(null)} className="text-[10px] text-muted-foreground hover:text-foreground">
                  Close
                </button>
              </div>
              {selectedRecords.length === 0 ? (
                <p className="text-xs text-muted-foreground">No records for this day</p>
              ) : (
                <div className="space-y-1">
                  {selectedRecords.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-md bg-background/60 px-2 py-1">
                      <div className="text-xs">
                        {r.category} {r.note && <span className="text-[10px] text-muted-foreground">· {r.note}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-[#c49aa6]">-¥{r.amount.toFixed(2)}</span>
                        <button
                          onClick={() => store.deleteFinance(r.id)}
                          className="grid size-5 place-items-center rounded text-destructive hover:bg-destructive/10"
                          aria-label="Delete"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-2.5">
        <h3 className="mb-1.5 text-sm font-semibold">Add record</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setType('expense')
                setCategory(FINANCE_CATEGORIES.expense[0])
              }}
              className={cn('flex-1 rounded-lg py-2 text-xs transition', type === 'expense' ? 'bg-[#c49aa6]/15 text-[#c49aa6]' : 'bg-muted text-muted-foreground')}
            >
              Expense
            </button>
            <button
              onClick={() => {
                setType('income')
                setCategory(FINANCE_CATEGORIES.income[0])
              }}
              className={cn('flex-1 rounded-lg py-2 text-xs transition', type === 'income' ? 'bg-[#9db5a0]/15 text-[#9db5a0]' : 'bg-muted text-muted-foreground')}
            >
              Income
            </button>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border border-border bg-background/60 px-2 py-2 text-xs outline-none"
          >
            {(type === 'expense' ? FINANCE_CATEGORIES.expense : FINANCE_CATEGORIES.income).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs outline-none"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30 sm:col-span-2"
          />
          <button onClick={add} className="flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-xs text-primary-foreground transition hover:bg-primary/90 sm:col-span-2">
            <Plus className="size-3.5" /> Add record
          </button>
        </div>
      </div>

      <div className="glass rounded-xl p-2.5">
        <h3 className="mb-1.5 text-sm font-semibold">{monthStr} records</h3>
        <div className="max-h-56 space-y-1.5 overflow-auto pr-1">
          {records.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">No records this month yet</p>}
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <div>
                <div className="text-xs font-medium">
                  {r.category} {r.note && <span className="text-[10px] text-muted-foreground">· {r.note}</span>}
                </div>
                <div className="text-[10px] text-muted-foreground">{r.date}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-semibold', r.type === 'income' ? 'text-[#9db5a0]' : 'text-[#c49aa6]')}>
                  {r.type === 'income' ? '+' : '-'}¥{r.amount.toFixed(2)}
                </span>
                <button onClick={() => store.deleteFinance(r.id)} className="grid size-6 place-items-center rounded-md text-destructive hover:bg-destructive/10" aria-label="Delete">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
