import { useState } from 'react'
import { Trash2, Plus, Pencil, Check, X, Minus } from 'lucide-react'
import { useStore } from '@/lib/store'
import { MODULE_MAP } from '@/lib/constants'
import type { ModuleKey, TodoItem } from '@/lib/types'
import { cn } from '@/lib/utils'

export function TodoChecklist({ date, module }: { date: string; module?: ModuleKey }) {
  const store = useStore()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [time, setTime] = useState('')
  const [pickModule, setPickModule] = useState<ModuleKey>('work')
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    title: string
    note: string
    time: string
    status: 'pending' | 'done' | 'skipped'
    skipReason: string
  }>({ title: '', note: '', time: '', status: 'pending', skipReason: '' })

  const list = store.state.todos
    .filter((t) => t.date === date && (!module || t.module === module))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))

  const add = () => {
    if (!title.trim()) return
    store.addTodo({
      module: module ?? pickModule,
      title: title.trim(),
      note: note.trim() || undefined,
      time: time.trim() || undefined,
      date,
      done: false,
    })
    setTitle('')
    setNote('')
    setTime('')
  }

  const startEdit = (t: TodoItem) => {
    const status = t.done ? 'done' : t.skipped ? 'skipped' : 'pending'
    setEditing(t.id)
    setEditForm({
      title: t.title,
      note: t.note ?? '',
      time: t.time ?? '',
      status,
      skipReason: t.skipReason ?? '',
    })
  }
  const saveEdit = (id: string) => {
    const isDone = editForm.status === 'done'
    const isSkipped = editForm.status === 'skipped'
    store.updateTodo(id, {
      title: editForm.title.trim() || 'Untitled',
      note: editForm.note.trim() || undefined,
      time: editForm.time.trim() || undefined,
      done: isDone,
      skipped: isSkipped,
      skipReason: isSkipped ? editForm.skipReason.trim() || undefined : undefined,
    })
    setEditing(null)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveEdit(id)
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      saveEdit(id)
    }
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{module ? `${MODULE_MAP[module].label} · Today` : 'Day detail'}</h3>
        <span className="text-xs text-muted-foreground">
          {list.filter((t) => t.done).length}/{list.length}
        </span>
      </div>

      <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
        {list.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Nothing here yet — add a to-do ✨</p>
        )}
        {list.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-xl border border-border/60 p-3 transition',
              t.done && 'opacity-60',
              t.skipped && 'bg-[#d4c4a8]/15 dark:bg-[#d4c4a8]/20',
            )}
          >
            {editing === t.id ? (
              <div className="space-y-2">
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  onKeyDown={(e) => handleEditKeyDown(e, t.id)}
                  placeholder="Title"
                  className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    onKeyDown={(e) => handleEditKeyDown(e, t.id)}
                    className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as typeof editForm.status })}
                    className="rounded-lg border border-border bg-background/60 px-2 py-2 text-sm outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="done">Done</option>
                    <option value="skipped">Not done</option>
                  </select>
                  <input
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                    onKeyDown={(e) => handleEditKeyDown(e, t.id)}
                    placeholder="Note"
                    className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                {editForm.status === 'skipped' && (
                  <input
                    value={editForm.skipReason}
                    onChange={(e) => setEditForm({ ...editForm, skipReason: e.target.value })}
                    onKeyDown={(e) => handleEditKeyDown(e, t.id)}
                    placeholder="Reason for not done…"
                    className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setEditing(null)}
                    className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
                    aria-label="Cancel"
                  >
                    <X className="size-4" />
                  </button>
                  <button
                    onClick={() => saveEdit(t.id)}
                    className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90"
                    aria-label="Save"
                  >
                    <Check className="size-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <button
                  onClick={() => store.toggleTodo(t.id)}
                  className={cn(
                    'mt-1 grid size-4 shrink-0 place-items-center rounded border transition',
                    t.done
                      ? 'border-primary bg-primary text-primary-foreground'
                      : t.skipped
                        ? 'border-[#d4c4a8] bg-[#d4c4a8]/15 text-[#b8a17f]'
                        : 'border-muted-foreground/30 bg-transparent',
                  )}
                  aria-label={t.done ? 'Done' : t.skipped ? 'Not done' : 'Pending'}
                >
                  {t.done && <Check className="size-3" />}
                  {t.skipped && <Minus className="size-3" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.time && (
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{t.time}</span>
                    )}
                    <span className={cn('text-sm font-medium', t.done && 'line-through', t.skipped && 'text-muted-foreground line-through decoration-amber-400')}>
                      {t.title}
                    </span>
                    {!module && (
                      <span className={cn('rounded-md px-1.5 py-0.5 text-[10px]', MODULE_MAP[t.module].chip, MODULE_MAP[t.module].accent)}>
                        {MODULE_MAP[t.module].label}
                      </span>
                    )}
                    {t.skipped && (
                      <span className="rounded-md bg-[#d4c4a8]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#b8a17f]">Not done</span>
                    )}
                  </div>
                  {t.note && <p className="mt-1 text-xs text-muted-foreground">{t.note}</p>}
                  {t.skipped && t.skipReason && (
                    <p className="mt-1 text-xs text-[#b8a17f]">Reason: {t.skipReason}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(t)}
                    className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
                    aria-label="Edit"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => store.deleteTodo(t.id)}
                    className="grid size-7 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {!module && (
          <select
            value={pickModule}
            onChange={(e) => setPickModule(e.target.value as ModuleKey)}
            className="w-full rounded-lg border border-border bg-background/60 px-2 py-2 text-sm outline-none"
          >
            {Object.values(MODULE_MAP).map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="New to-do…"
            className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={add}
            className="grid place-items-center rounded-lg bg-primary px-3 text-primary-foreground transition hover:bg-primary/90"
            aria-label="Add"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  )
}
