import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { WorkspaceState, TodoItem, Habit, FinanceRecord, DiaryEntry, ModuleKey, StudyProject } from './types'
import { todayKey, uid } from './format'

const STORAGE_KEY = 'purple-moon-workspace-v1'
const UNDO_STACK_KEY = 'purple-moon-workspace-undo-v1'
const MAX_UNDO = 50

const DEFAULT_STATE: WorkspaceState = {
  todos: [
    { id: uid(), module: 'work', title: 'Draft meeting notes', note: 'Sync with product & design', time: '10:00', date: todayKey(), done: false, createdAt: Date.now() },
    { id: uid(), module: 'work', title: 'Reply client email', note: '', date: todayKey(), done: true, createdAt: Date.now() },
    { id: uid(), module: 'study', title: 'Read 30 min English', note: 'Chapter 3', time: '20:00', date: todayKey(), done: false, createdAt: Date.now() },
  ],
  habits: [
    { id: 'h-water', name: 'Drink water', emoji: '💧', category: 'life', target: 8 },
    { id: 'h-skincare', name: 'Skincare', emoji: '🧴', category: 'life', target: 2 },
    { id: 'h-exercise', name: 'Morning run', emoji: '🏃', category: 'exercise', target: 1 },
    { id: 'h-sleep', name: 'Sleep before 11pm', emoji: '🌙', category: 'life', target: 1 },
  ],
  habitChecks: [],
  finance: [
    { id: uid(), type: 'expense', amount: 24, category: 'Dining', note: 'Lunch', date: todayKey() },
  ],
  diary: [],
  studyProjects: [
    { id: 'sp-ielts', name: 'IELTS', icon: '📖', target: 'Band 7.0', plan: '', todos: [], sessions: [] },
    { id: 'sp-civil', name: 'Civil Service Exam', icon: '🏛️', target: 'Pass written test', plan: '', todos: [], sessions: [] },
    { id: 'sp-pro', name: 'Professional Growth', icon: '💻', target: 'Build 3 side projects', plan: '', todos: [], sessions: [] },
  ],
  avatar: undefined,
  background: undefined,
}

function loadUndoStack(): WorkspaceState[] {
  try {
    const raw = localStorage.getItem(UNDO_STACK_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.slice(-MAX_UNDO)
  } catch {
    return []
  }
}

function saveUndoStack(stack: WorkspaceState[]) {
  try {
    localStorage.setItem(UNDO_STACK_KEY, JSON.stringify(stack.slice(-MAX_UNDO)))
  } catch {
    /* ignore */
  }
}

function load(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>
    const state = {
      todos: parsed.todos ?? DEFAULT_STATE.todos,
      habits: parsed.habits ?? DEFAULT_STATE.habits,
      habitChecks: parsed.habitChecks ?? DEFAULT_STATE.habitChecks,
      finance: parsed.finance ?? DEFAULT_STATE.finance,
      diary: parsed.diary ?? DEFAULT_STATE.diary,
      studyProjects: parsed.studyProjects ?? DEFAULT_STATE.studyProjects,
      avatar: parsed.avatar ?? DEFAULT_STATE.avatar,
      background: parsed.background ?? DEFAULT_STATE.background,
    }
    // Ensure the skincare habit exists
    const hasSkincare = state.habits.some((h) => h.id === 'h-skincare')
    if (!hasSkincare) {
      state.habits.splice(1, 0, { id: 'h-skincare', name: 'Skincare', emoji: '🧴', category: 'life', target: 2 })
    }
    return state
  } catch {
    return DEFAULT_STATE
  }
}

interface StoreApi {
  state: WorkspaceState
  // undo
  undo: () => void
  canUndo: () => boolean
  // todos
  addTodo: (t: Omit<TodoItem, 'id' | 'createdAt'>) => void
  toggleTodo: (id: string) => void
  updateTodo: (id: string, patch: Partial<TodoItem>) => void
  deleteTodo: (id: string) => void
  // habits
  toggleHabit: (habitId: string, date: string) => void
  setHabitCount: (habitId: string, date: string, count: number) => void
  addHabit: (h: Omit<Habit, 'id'>) => void
  deleteHabit: (id: string) => void
  moveHabit: (fromIndex: number, toIndex: number) => void
  // finance
  addFinance: (f: Omit<FinanceRecord, 'id'>) => void
  deleteFinance: (id: string) => void
  // diary
  saveDiary: (d: Omit<DiaryEntry, 'id'> & { id?: string }) => void
  deleteDiary: (id: string) => void
  toggleDiaryHidden: (id: string) => void
  // appearance
  setAvatar: (url: string) => void
  setBackground: (url: string) => void
  // study
  addStudyProject: (p: Omit<StudyProject, 'id' | 'todos' | 'sessions' | 'plan'> & { plan?: string }) => void
  updateStudyProject: (id: string, patch: Partial<Omit<StudyProject, 'id'>>) => void
  deleteStudyProject: (id: string) => void
  toggleStudyProjectHidden: (id: string) => void
  addStudyTodo: (projectId: string, t: Omit<StudyProject['todos'][0], 'id'>) => void
  toggleStudyTodo: (projectId: string, todoId: string) => void
  deleteStudyTodo: (projectId: string, todoId: string) => void
  addStudySession: (projectId: string, minutes: number) => void
  // helpers
  todosByDate: (date: string) => TodoItem[]
  todosByModule: (module: ModuleKey, date: string) => TodoItem[]
  habitCount: (habitId: string, date: string) => number
  habitStreak: (habitId: string, date: string) => number
  resetAll: () => void
}

const StoreContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(load)
  const first = useRef(true)
  const undoStack = useRef<WorkspaceState[]>(loadUndoStack())

  // Save state to localStorage
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore quota errors */
    }
  }, [state])

  // Sync undo stack to localStorage
  const persistUndoStack = () => saveUndoStack(undoStack.current)

  const api = useMemo<StoreApi>(() => {
    const mutate = (fn: (s: WorkspaceState) => WorkspaceState) => {
      setState((s) => {
        // Push current state to undo stack before mutation
        undoStack.current = [...undoStack.current, JSON.parse(JSON.stringify(s))].slice(-MAX_UNDO)
        persistUndoStack()
        return fn(s)
      })
    }
    const undo = () => {
      const stack = undoStack.current
      if (stack.length === 0) return
      const prev = stack[stack.length - 1]
      undoStack.current = stack.slice(0, -1)
      persistUndoStack()
      setState(prev)
    }
    return {
      state,
      undo,
      canUndo: () => undoStack.current.length > 0,
      addTodo: (t) => mutate((s) => ({ ...s, todos: [...s.todos, { ...t, id: uid(), createdAt: Date.now() }] })),
      toggleTodo: (id) =>
        mutate((s) => ({
          ...s,
          todos: s.todos.map((x) => (x.id === id ? { ...x, done: !x.done, skipped: false, skipReason: undefined } : x)),
        })),
      updateTodo: (id, patch) => mutate((s) => ({ ...s, todos: s.todos.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteTodo: (id) => mutate((s) => ({ ...s, todos: s.todos.filter((x) => x.id !== id) })),
      toggleHabit: (habitId, date) =>
        mutate((s) => {
          const existing = s.habitChecks.find((h) => h.habitId === habitId && h.date === date)
          if (!existing) return { ...s, habitChecks: [...s.habitChecks, { id: uid(), habitId, date, count: 1 }] }
          return { ...s, habitChecks: s.habitChecks.filter((h) => h.id !== existing.id) }
        }),
      setHabitCount: (habitId, date, count) =>
        mutate((s) => {
          const existing = s.habitChecks.find((h) => h.habitId === habitId && h.date === date)
          if (count <= 0) return { ...s, habitChecks: s.habitChecks.filter((h) => !(h.habitId === habitId && h.date === date)) }
          if (existing) return { ...s, habitChecks: s.habitChecks.map((h) => (h.id === existing.id ? { ...h, count } : h)) }
          return { ...s, habitChecks: [...s.habitChecks, { id: uid(), habitId, date, count }] }
        }),
      addHabit: (h) => mutate((s) => ({ ...s, habits: [...s.habits, { ...h, id: uid() }] })),
      moveHabit: (fromIndex, toIndex) =>
        mutate((s) => {
          if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= s.habits.length || toIndex >= s.habits.length) return s
          const next = [...s.habits]
          const [moved] = next.splice(fromIndex, 1)
          next.splice(toIndex, 0, moved)
          return { ...s, habits: next }
        }),
      deleteHabit: (id) =>
        mutate((s) => ({ ...s, habits: s.habits.filter((x) => x.id !== id), habitChecks: s.habitChecks.filter((x) => x.habitId !== id) })),
      addFinance: (f) => mutate((s) => ({ ...s, finance: [...s.finance, { ...f, id: uid() }] })),
      deleteFinance: (id) => mutate((s) => ({ ...s, finance: s.finance.filter((x) => x.id !== id) })),
      saveDiary: (d) =>
        mutate((s) => {
          if (d.id) return { ...s, diary: s.diary.map((x) => (x.id === d.id ? { ...x, ...d } : x)) }
          return { ...s, diary: [...s.diary, { ...d, id: uid() }] }
        }),
      deleteDiary: (id) => mutate((s) => ({ ...s, diary: s.diary.filter((x) => x.id !== id) })),
      toggleDiaryHidden: (id) =>
        mutate((s) => ({
          ...s,
          diary: s.diary.map((x) => (x.id === id ? { ...x, hidden: !x.hidden } : x)),
        })),
      setAvatar: (url) => mutate((s) => ({ ...s, avatar: url })),
      setBackground: (url) => mutate((s) => ({ ...s, background: url })),
      addStudyProject: (p) =>
        mutate((s) => ({ ...s, studyProjects: [...s.studyProjects, { ...p, plan: p.plan ?? '', id: uid(), todos: [], sessions: [] }] })),
      updateStudyProject: (id, patch) =>
        mutate((s) => ({ ...s, studyProjects: s.studyProjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      deleteStudyProject: (id) => mutate((s) => ({ ...s, studyProjects: s.studyProjects.filter((x) => x.id !== id) })),
      toggleStudyProjectHidden: (id) =>
        mutate((s) => ({
          ...s,
          studyProjects: s.studyProjects.map((x) => (x.id === id ? { ...x, hidden: !x.hidden } : x)),
        })),
      addStudyTodo: (projectId, t) =>
        mutate((s) => ({
          ...s,
          studyProjects: s.studyProjects.map((x) =>
            x.id === projectId ? { ...x, todos: [...x.todos, { ...t, id: uid() }] } : x,
          ),
        })),
      toggleStudyTodo: (projectId, todoId) =>
        mutate((s) => ({
          ...s,
          studyProjects: s.studyProjects.map((x) =>
            x.id === projectId
              ? { ...x, todos: x.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)) }
              : x,
          ),
        })),
      deleteStudyTodo: (projectId, todoId) =>
        mutate((s) => ({
          ...s,
          studyProjects: s.studyProjects.map((x) =>
            x.id === projectId ? { ...x, todos: x.todos.filter((t) => t.id !== todoId) } : x,
          ),
        })),
      addStudySession: (projectId, minutes) =>
        mutate((s) => ({
          ...s,
          studyProjects: s.studyProjects.map((x) =>
            x.id === projectId ? { ...x, sessions: [...x.sessions, { id: uid(), date: todayKey(), minutes }] } : x,
          ),
        })),
      todosByDate: (date) => state.todos.filter((t) => t.date === date),
      todosByModule: (module, date) => state.todos.filter((t) => t.module === module && t.date === date),
      habitCount: (habitId, date) => state.habitChecks.find((h) => h.habitId === habitId && h.date === date)?.count ?? 0,
      habitStreak: (habitId, date) => {
        const habit = state.habits.find((h) => h.id === habitId)
        if (!habit) return 0
        let streak = 0
        const base = new Date(date)
        for (let i = 0; i < 365; i++) {
          const d = new Date(base)
          d.setDate(d.getDate() - i)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const count = state.habitChecks.find((h) => h.habitId === habitId && h.date === key)?.count ?? 0
          if (count >= habit.target) streak++
          else if (i === 0) continue
          else break
        }
        return streak
      },
      resetAll: () => setState(DEFAULT_STATE),
    }
  }, [state])

  // Global Cmd+Z / Ctrl+Z listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const stack = undoStack.current
        if (stack.length === 0) return
        const prev = stack[stack.length - 1]
        undoStack.current = stack.slice(0, -1)
        persistUndoStack()
        setState(prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
