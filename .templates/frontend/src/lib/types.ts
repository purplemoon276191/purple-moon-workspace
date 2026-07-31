// Domain types for the Purple Moon personal workspace

export type ModuleKey = 'work' | 'study' | 'beauty' | 'finance' | 'diary'

export type View = 'home' | ModuleKey

export interface TodoItem {
  id: string
  module: ModuleKey
  title: string
  note?: string
  time?: string // HH:mm
  date: string // YYYY-MM-DD
  done: boolean
  skipped?: boolean
  skipReason?: string
  createdAt: number
}

export interface Habit {
  id: string
  name: string
  emoji: string
  description?: string
  category: 'life' | 'exercise'
  target: number // times per day
}

export interface HabitCheck {
  id: string
  habitId: string
  date: string // YYYY-MM-DD
  count: number
}

export interface FinanceRecord {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  note?: string
  date: string // YYYY-MM-DD
}

export interface DiaryEntry {
  id: string
  date: string // YYYY-MM-DD
  title: string
  content: string
  mood: string // emoji
  hidden?: boolean
}

export interface StudyProject {
  id: string
  name: string
  icon: string
  target: string
  deadline?: string
  plan: string
  hidden?: boolean
  todos: { id: string; title: string; done: boolean; date: string }[]
  sessions: { id: string; date: string; minutes: number }[]
}

export interface WorkspaceState {
  todos: TodoItem[]
  habits: Habit[]
  habitChecks: HabitCheck[]
  finance: FinanceRecord[]
  diary: DiaryEntry[]
  studyProjects: StudyProject[]
  avatar?: string
  background?: string
}
