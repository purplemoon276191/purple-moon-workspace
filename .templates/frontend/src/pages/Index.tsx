import { useState, useEffect } from 'react'
import { StoreProvider, useStore } from '@/lib/store'
import { Sidebar } from '@/components/Sidebar'
import { Greeting } from '@/components/Greeting'
import { MiniCalendar } from '@/components/MiniCalendar'
import { TodoChecklist } from '@/components/TodoChecklist'
import { Assistant } from '@/components/Assistant'
import { WorkView } from '@/components/modules/WorkView'
import { StudyView } from '@/components/modules/StudyView'
import { BeautyView } from '@/components/modules/BeautyView'
import { FinanceView } from '@/components/modules/FinanceView'
import { DiaryView } from '@/components/modules/DiaryView'
import { MODULES } from '@/lib/constants'
import { MODULE_ICONS } from '@/lib/icons'
import { todayKey, formatNice } from '@/lib/format'
import type { View } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

function HomeView({ onSelect }: { onSelect: (v: View) => void }) {
  const store = useStore()
  const [date, setDate] = useState(todayKey())

  const marks = Array.from(new Set(store.state.todos.map((t) => t.date)))

  const selectedTodos = store.state.todos.filter((t) => t.date === date)
  const done = selectedTodos.filter((t) => t.done).length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-1">
          <MiniCalendar selected={date} onSelect={setDate} marks={marks} />
          <div className="glass rounded-2xl p-4">
            <h3 className="mb-3 font-semibold">Quick access</h3>
            <div className="grid grid-cols-2 gap-2">
              {MODULES.map((m) => {
                const c = store.state.todos.filter((t) => t.module === m.key && t.date === todayKey()).length
                const Icon = MODULE_ICONS[m.key]
                return (
                  <button
                    key={m.key}
                    onClick={() => onSelect(m.key)}
                    className="flex items-center gap-2 rounded-xl border border-border/60 p-3 text-left transition hover:bg-accent"
                  >
                    <Icon className={cn('size-5', m.accent)} />
                    <div>
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{c} tasks</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4 md:col-span-2">
          <div className="glass flex items-center justify-between rounded-2xl p-4">
            <div>
              <div className="text-sm text-muted-foreground">{formatNice(date)}</div>
              <div className="text-2xl font-semibold">
                {done}/{selectedTodos.length} done
              </div>
            </div>
            <div className="text-3xl">✨</div>
          </div>
          <TodoChecklist date={date} />
        </div>
      </div>
    </div>
  )
}

function Workspace() {
  const [view, setView] = useState<View>('home')
  const [dark, setDark] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <div className="relative flex min-h-screen">
      <div className="floral-bg pointer-events-none fixed inset-0 -z-10 opacity-70" />
      <Sidebar
        view={view}
        onSelect={setView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />
      {/* Toggle button when sidebar is collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="hidden md:flex fixed left-2 top-4 z-50 size-9 items-center justify-center rounded-xl bg-sidebar/90 border border-border backdrop-blur text-muted-foreground hover:text-foreground hover:bg-accent transition shadow-sm"
          title="Expand sidebar"
        >
          <ChevronRight className="size-4" />
        </button>
      )}
      <main className="flex-1 px-4 py-4 pb-24 md:px-8 md:py-6 md:pb-6">
        <Greeting dark={dark} onToggle={() => setDark((d) => !d)} />
        <div className="mt-4">
          {view === 'home' && <HomeView onSelect={setView} />}
          {view === 'work' && <WorkView />}
          {view === 'study' && <StudyView />}
          {view === 'beauty' && <BeautyView />}
          {view === 'finance' && <FinanceView />}
          {view === 'diary' && <DiaryView />}
        </div>
      </main>
      <Assistant open={assistantOpen} onOpenChange={setAssistantOpen} />
    </div>
  )
}

export default function Index() {
  return (
    <StoreProvider>
      <Workspace />
    </StoreProvider>
  )
}
