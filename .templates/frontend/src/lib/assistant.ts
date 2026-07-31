import type { WorkspaceState } from './types'
import { todayKey, formatNice } from './format'

export interface AssistantContext {
  state: WorkspaceState
}

function summarize(ctx: AssistantContext) {
  const { state } = ctx
  const today = todayKey()
  const todayTodos = state.todos.filter((t) => t.date === today)
  const done = todayTodos.filter((t) => t.done).length
  const overdue = state.todos.filter((t) => t.date < today && !t.done)
  const month = today.slice(0, 7)
  const monthFin = state.finance.filter((f) => f.date.startsWith(month))
  const income = monthFin.filter((f) => f.type === 'income').reduce((a, f) => a + f.amount, 0)
  const expense = monthFin.filter((f) => f.type === 'expense').reduce((a, f) => a + f.amount, 0)
  const habitsDone = state.habitChecks.filter((h) => h.date === today).length
  return { today, todayTodos, done, overdue, income, expense, balance: income - expense, habitsDone, diaryCount: state.diary.length }
}

// A friendly, offline assistant that understands the workspace data.
// When CODEBUDDY_API_KEY is configured, the backend bridges to the real CodeBuddy SDK.
export function generateReply(message: string, ctx: AssistantContext): string {
  const m = message.trim()
  const s = summarize(ctx)
  const lower = m.toLowerCase()

  if (!m) return 'Hi, I am your Purple Moon assistant. I can walk you through today\'s to-dos, your budget, or help capture a diary entry.'

  if (/(todo|today|schedule|plan|待办)/.test(lower) || lower.includes('today')) {
    if (s.todayTodos.length === 0) return 'You have no to-dos yet for today. Add one in Work or Study 🌙'
    const list = s.todayTodos
      .map((t, i) => `${i + 1}. ${t.done ? '✅' : '⬜'} ${t.title}${t.note ? ` (${t.note})` : ''}`)
      .join('\n')
    return `You have ${s.todayTodos.length} to-dos today, ${s.done} done:\n${list}`
  }

  if (/(overdue|late|behind|逾期)/.test(lower)) {
    if (s.overdue.length === 0) return 'Great — nothing overdue. Keep it up 🎉'
    const list = s.overdue.map((t) => `· ${t.title} (${formatNice(t.date)})`).join('\n')
    return `You have ${s.overdue.length} overdue to-dos, better tackle these first:\n${list}`
  }

  if (/(money|budget|spend|finance|expense|收支|财务)/.test(lower) || lower.includes('money')) {
    return `This month:\nIncome ¥${s.income.toFixed(2)}\nExpense ¥${s.expense.toFixed(2)}\nBalance ¥${s.balance.toFixed(2)}`
  }

  if (/(habit|check.?in|healthy|health|water|skincare|exercise|sleep|习惯|打卡)/.test(lower)) {
    return `You have checked in ${s.habitsDone} habit(s) today. Open Beauty & Health to check in on water, skincare, exercise and sleep 💧`
  }

  if (/(diary|journal|mood|心情|日记)/.test(lower)) {
    return s.diaryCount > 0
      ? `You have written ${s.diaryCount} diary entr${s.diaryCount > 1 ? 'ies' : 'y'} so far — worth a reread 📖`
      : 'No diary yet. Capture today\'s mood in Diary ✍️'
  }

  if (/(hi|hello|hey|你好|嗨)/.test(lower)) {
    return 'hi~ I am Purple Moon assistant 🌙 Want me to walk through today\'s to-dos, your budget, or plan your day?'
  }

  if (/(thank|thanks|谢谢|感谢)/.test(lower)) return 'Anytime — I am here whenever you need me 💜'

  // default: give a gentle daily summary
  return `Here is your day at a glance:\n· To-dos ${s.done}/${s.todayTodos.length} done\n· Month balance ¥${s.balance.toFixed(2)}\n· Habits checked in ${s.habitsDone}\nWant me to look into any of these?`
}

export function greetingByHour(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Late night'
  if (h < 12) return 'Good morning'
  if (h < 14) return 'Good noon'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

const GREETINGS = [
  'hi~ Purple Moon',
  'hello~ Purple Moon',
  'Hey there, dreamer ✨',
  'Rise and shine, Purple Moon',
  'Keep going, you\'re doing great',
  'Every day is a fresh start',
  'Believe you can and you\'re halfway there',
  'May the Force be with you',
  'To infinity and beyond!',
  'You\'re braver than you believe',
  'Don\'t let yesterday take up too much of today',
  'The best way to predict the future is to create it',
  'Small steps every day',
  'You are capable of amazing things',
  'Make today so awesome that yesterday gets jealous',
  'Shine bright, Purple Moon 🌙',
  'Your future self will thank you',
  'Stay soft, stay strong',
  'Collect moments, not things',
  'You are enough, exactly as you are',
]

export function randomGreeting(): string {
  return GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
}
