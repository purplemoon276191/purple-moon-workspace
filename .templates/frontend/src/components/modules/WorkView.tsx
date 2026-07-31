import { useState } from 'react'
import { useStore } from '@/lib/store'
import { MiniCalendar } from '@/components/MiniCalendar'
import { TodoChecklist } from '@/components/TodoChecklist'
import { todayKey } from '@/lib/format'

export function WorkView() {
  const store = useStore()
  const [date, setDate] = useState(todayKey())

  const marks = Array.from(new Set(store.state.todos.filter((t) => t.module === 'work').map((t) => t.date)))

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">Work</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Today's to-dos sit quietly in the calendar and check off one by one</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <MiniCalendar selected={date} onSelect={setDate} marks={marks} />
        <TodoChecklist date={date} module="work" />
      </div>
    </div>
  )
}
