import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { MiniCalendar } from '@/components/MiniCalendar'
import { todayKey } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ArrowLeft, Plus, Trash2, Play, Pause, RotateCcw, Check, Clock, ListTodo, FileText, Eye, EyeOff } from 'lucide-react'
import type { StudyProject } from '@/lib/types'

const ICONS = ['📖', '🏛️', '💻', '🧮', '🌍', '🎨', '🧪', '💼', '📝', '🎯']

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function ProjectCard({ p, onClick }: { p: StudyProject; onClick: () => void }) {
  const store = useStore()
  const total = p.todos.length
  const done = p.todos.filter((t) => t.done).length
  const progress = total === 0 ? 0 : Math.round((done / total) * 100)
  const focusMin = p.sessions.reduce((a, s) => a + s.minutes, 0)
  return (
    <div className="glass flex flex-col rounded-2xl p-4 transition hover:bg-accent/40">
      <div className="flex w-full items-start justify-between">
        <button onClick={onClick} className="text-left">
          <span className="text-3xl">{p.icon}</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => store.toggleStudyProjectHidden(p.id)}
            className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent"
            title={p.hidden ? 'Unhide' : 'Hide'}
            aria-label={p.hidden ? 'Unhide' : 'Hide'}
          >
            {p.hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </button>
          <button
            onClick={() => store.deleteStudyProject(p.id)}
            className="grid size-7 place-items-center rounded-lg text-destructive transition hover:bg-destructive/10"
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      <button onClick={onClick} className="mt-2 w-full text-left">
        <div className="font-semibold">{p.name}</div>
        <div className="text-xs text-muted-foreground">{p.target}</div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-[#a99fc1] transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{done}/{total} tasks</span>
          <span>{Math.floor(focusMin / 60)}h {focusMin % 60}m focus</span>
        </div>
      </button>
    </div>
  )
}

function Tab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent',
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

function ProjectDetail({ project, onBack }: { project: StudyProject; onBack: () => void }) {
  const store = useStore()
  const [tab, setTab] = useState<'plan' | 'todos' | 'focus'>('todos')
  const [date, setDate] = useState(todayKey())
  const [todoTitle, setTodoTitle] = useState('')
  const [plan, setPlan] = useState(project.plan)

  useEffect(() => {
    setPlan(project.plan)
  }, [project.id, project.plan])

  const savePlan = (v: string) => {
    setPlan(v)
    store.updateStudyProject(project.id, { plan: v })
  }

  const addTodo = () => {
    if (!todoTitle.trim()) return
    store.addStudyTodo(project.id, { title: todoTitle.trim(), done: false, date })
    setTodoTitle('')
  }

  const marks = Array.from(new Set(project.todos.map((t) => t.date)))

  const total = project.todos.length
  const done = project.todos.filter((t) => t.done).length
  const progress = total === 0 ? 0 : Math.round((done / total) * 100)
  const focusMin = project.sessions.reduce((a, s) => a + s.minutes, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="grid size-8 place-items-center rounded-lg bg-muted hover:bg-accent">
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{project.icon}</span>
            <h2 className="text-xl font-semibold">{project.name}</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{project.target}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Tab active={tab === 'plan'} onClick={() => setTab('plan')} icon={FileText} label="Plan" />
        <Tab active={tab === 'todos'} onClick={() => setTab('todos')} icon={ListTodo} label="Todos" />
        <Tab active={tab === 'focus'} onClick={() => setTab('focus')} icon={Clock} label="Focus" />
      </div>

      {tab === 'plan' && (
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-2 text-sm font-semibold">Study plan</h3>
          <textarea
            value={plan}
            onChange={(e) => savePlan(e.target.value)}
            placeholder="Write your study plan, schedule, or resources here…"
            rows={10}
            className="w-full rounded-lg border border-border bg-background/60 p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {tab === 'todos' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <MiniCalendar selected={date} onSelect={setDate} marks={marks} />
            <div className="glass rounded-2xl p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">{date} todos</h3>
                <span className="text-xs text-muted-foreground">{done}/{total} total</span>
              </div>
              <div className="max-h-[200px] space-y-2 overflow-auto pr-1">
                {project.todos
                  .filter((t) => t.date === date)
                  .map((t) => (
                    <div key={t.id} className={cn('flex items-center gap-3 rounded-xl border border-border/60 p-3', t.done && 'opacity-60')}>
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => store.toggleStudyTodo(project.id, t.id)}
                        className="size-4 accent-[var(--primary)]"
                      />
                      <span className={cn('flex-1 text-sm', t.done && 'line-through')}>{t.title}</span>
                      <button
                        onClick={() => store.deleteStudyTodo(project.id, t.id)}
                        className="grid size-7 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                {project.todos.filter((t) => t.date === date).length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">No todos for this day</p>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-lg border border-border bg-background/60 px-2 py-2 text-xs outline-none"
                />
                <input
                  value={todoTitle}
                  onChange={(e) => setTodoTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                  placeholder="New task…"
                  className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button onClick={addTodo} className="grid place-items-center rounded-lg bg-primary px-3 text-primary-foreground">
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-xs text-muted-foreground">Task completion</div>
              <div className="mt-1 text-2xl font-semibold text-[#a99fc1]">{progress}%</div>
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-[#a99fc1]" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-xs text-muted-foreground">Tasks done</div>
              <div className="mt-1 text-2xl font-semibold text-primary">{done}/{total}</div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-xs text-muted-foreground">Total focus</div>
              <div className="mt-1 text-2xl font-semibold text-[#9db5a0]">
                {Math.floor(focusMin / 60)}h {focusMin % 60}m
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'focus' && <FocusTimer projectId={project.id} />}
    </div>
  )
}

function FocusTimer({ projectId }: { projectId: string }) {
  const store = useStore()
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<'countdown' | 'countup'>('countdown')
  const [minutes, setMinutes] = useState('25')
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<number | null>(null)

  const targetSeconds = Number(minutes) * 60 || 0
  const displaySeconds = mode === 'countdown' ? Math.max(0, targetSeconds - elapsed) : elapsed

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1
          if (mode === 'countdown' && next >= targetSeconds) {
            window.clearInterval(intervalRef.current!)
            setRunning(false)
            store.addStudySession(projectId, Math.ceil(targetSeconds / 60))
            return targetSeconds
          }
          return next
        })
      }, 1000)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [running, mode, targetSeconds, projectId, store])

  const reset = () => {
    setRunning(false)
    setElapsed(0)
  }

  const toggleMode = (newMode: 'countdown' | 'countup') => {
    setMode(newMode)
    setRunning(false)
    setElapsed(0)
  }

  const handleMinutesChange = (v: string) => {
    const num = v.replace(/\D/g, '')
    setMinutes(num || '1')
    setRunning(false)
    setElapsed(0)
  }

  const finishSession = () => {
    if (elapsed > 0) {
      store.addStudySession(projectId, Math.ceil(elapsed / 60))
    }
    reset()
  }

  return (
    <div className="glass rounded-2xl p-6 text-center">
      <div className="mb-3 flex items-center justify-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What are you focusing on?"
          className="w-56 rounded-lg border border-border bg-background/60 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {mode === 'countdown' ? 'Countdown' : 'Count up'}
      </div>
      <div className="text-5xl font-semibold tabular-nums">{formatTime(displaySeconds)}</div>

      {mode === 'countdown' && !running && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className="text-xs text-muted-foreground">Set</span>
          <input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => handleMinutesChange(e.target.value)}
            className="w-14 rounded border border-border bg-background/60 px-1.5 py-0.5 text-center text-xs outline-none"
          />
          <span className="text-xs text-muted-foreground">min</span>
        </div>
      )}

      {mode === 'countup' && running && (
        <div className="mt-2 flex items-center justify-center">
          <button
            onClick={finishSession}
            className="rounded-lg bg-[#9db5a0]/20 px-3 py-1 text-xs font-medium text-[#9db5a0] transition hover:bg-[#9db5a0]/30"
          >
            <Check className="mr-1 inline size-3" />
            Finish &amp; save
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          onClick={() => setRunning(!running)}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground transition hover:bg-primary/90"
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={reset}
          className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-accent"
        >
          <RotateCcw className="size-4" />
        </button>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={() => toggleMode('countdown')}
          className={cn(
            'rounded-lg px-3 py-1 text-xs transition',
            mode === 'countdown' ? 'bg-[#a99fc1]/20 text-[#a99fc1]' : 'bg-muted text-muted-foreground',
          )}
        >
          Countdown
        </button>
        <button
          onClick={() => toggleMode('countup')}
          className={cn(
            'rounded-lg px-3 py-1 text-xs transition',
            mode === 'countup' ? 'bg-[#9db5a0]/20 text-[#9db5a0]' : 'bg-muted text-muted-foreground',
          )}
        >
          Count up
        </button>
      </div>
    </div>
  )
}

export function StudyView() {
  const store = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newDeadline, setNewDeadline] = useState('')
  const [showHidden, setShowHidden] = useState(false)

  const visibleProjects = store.state.studyProjects.filter((p) => !p.hidden)
  const hiddenProjects = store.state.studyProjects.filter((p) => p.hidden)
  const project = selected ? store.state.studyProjects.find((p) => p.id === selected) : null

  const addProject = () => {
    if (!newName.trim()) return
    store.addStudyProject({
      name: newName.trim(),
      icon: ICONS[store.state.studyProjects.length % ICONS.length],
      target: newTarget.trim() || 'Keep going',
      deadline: newDeadline || undefined,
    })
    setNewName('')
    setNewTarget('')
    setNewDeadline('')
    setShowAdd(false)
  }

  if (project) {
    return <ProjectDetail project={project} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">Study</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Pick a project to plan, track tasks, and focus with Pomodoro.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleProjects.map((p) => (
          <ProjectCard key={p.id} p={p} onClick={() => setSelected(p.id)} />
        ))}
      </div>

      {hiddenProjects.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowHidden((v) => !v)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showHidden ? 'Hide' : 'Show'} {hiddenProjects.length} hidden project{hiddenProjects.length > 1 ? 's' : ''}
          </button>
          {showHidden && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hiddenProjects.map((p) => (
                <ProjectCard key={p.id} p={p} onClick={() => setSelected(p.id)} />
              ))}
            </div>
          )}
        </div>
      )}

      {!showAdd ? (
        <button
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm text-muted-foreground transition hover:bg-accent"
        >
          <Plus className="size-4" /> Add study project
        </button>
      ) : (
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold">New project</h3>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none"
            />
            <input
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="Target"
              className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none"
            />
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setShowAdd(false)} className="rounded-lg bg-muted px-4 py-2 text-xs text-muted-foreground transition hover:bg-accent">
              Cancel
            </button>
            <button onClick={addProject} className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs text-primary-foreground transition hover:bg-primary/90">
              <Check className="size-3.5" /> Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
