import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { MiniCalendar } from '@/components/MiniCalendar'
import { todayKey, formatNice, formatMonthYear } from '@/lib/format'
import { MOODS, EMOJI_PICKER_EMOJIS } from '@/lib/constants'
import { Trash2, Save, Bold, Italic, Underline, List, Heading, Quote, RotateCcw, Type, Minus, Plus, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DiaryView() {
  const store = useStore()
  const [date, setDate] = useState(todayKey())
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [mood, setMood] = useState(MOODS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState(14)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const autoSaveTimer = useRef<number | null>(null)
  // Local undo history for the current editing session
  const [history, setHistory] = useState<{ title: string; content: string; mood: string }[]>([])
  const historyIndex = useRef(-1)
  const isUndoing = useRef(false)

  const marks = useMemo(() => store.state.diary.filter((e) => !e.hidden).map((e) => e.date), [store.state.diary])

  // Real-time preview entry: merge current unsaved edits into the left list
  const previewEntry = useMemo(
    () => ({
      id: editingId ?? '__preview__',
      date,
      title: title.trim() || 'Untitled',
      content: editorRef.current?.innerHTML ?? content,
      mood,
      hidden: false,
    }),
    [editingId, date, title, content, mood],
  )

  const dayEntries = useMemo(() => {
    const target = filterDate ?? date
    const entries = store.state.diary
      .filter((e) => !e.hidden && e.date === target)
      .sort((a, b) => b.date.localeCompare(a.date))
    // Replace the entry for the currently edited date with the live preview
    const idx = entries.findIndex((e) => e.date === date)
    if (idx >= 0) {
      const next = [...entries]
      next[idx] = previewEntry
      return next
    }
    // If this date has no saved entry yet but user is editing, show preview at top
    if (target === date && (title.trim() || (previewEntry.content && previewEntry.content !== '<br>'))) {
      return [previewEntry, ...entries]
    }
    return entries
  }, [store.state.diary, date, filterDate, previewEntry, title])

  const hiddenEntries = useMemo(() => store.state.diary.filter((e) => e.hidden).sort((a, b) => b.date.localeCompare(a.date)), [store.state.diary])

  const selectedEntry = useMemo(
    () => store.state.diary.find((e) => e.date === date) ?? null,
    [store.state.diary, date],
  )

  useEffect(() => {
    if (selectedEntry && selectedEntry.id !== editingId) {
      setEditingId(selectedEntry.id)
      setTitle(selectedEntry.title)
      setContent(selectedEntry.content)
      setMood(selectedEntry.mood)
      setFilterDate(selectedEntry.date)
      const entry = { title: selectedEntry.title, content: selectedEntry.content, mood: selectedEntry.mood }
      setHistory([entry])
      historyIndex.current = 0
    } else if (!selectedEntry && editingId) {
      reset()
    }
  }, [selectedEntry, editingId])

  // Sync contentEditable HTML when switching entries without losing cursor while typing
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content
    }
  }, [editingId, date])

  const openEntry = (e: { id: string; date: string; title: string; content: string; mood: string; hidden?: boolean }) => {
    setDate(e.date)
    setEditingId(e.id)
    setTitle(e.title)
    setContent(e.content)
    setMood(e.mood)
    setFilterDate(e.date)
    setLastSaved(null)
    const entry = { title: e.title, content: e.content, mood: e.mood }
    setHistory([entry])
    historyIndex.current = 0
  }

  const reset = () => {
    setEditingId(null)
    setTitle('')
    setContent('')
    setMood(MOODS[0])
    setDate(todayKey())
    setFilterDate(null)
    setLastSaved(null)
    setHistory([])
    historyIndex.current = -1
    if (editorRef.current) editorRef.current.innerHTML = ''
  }

  const save = () => {
    const html = editorRef.current?.innerHTML ?? content
    if ((!html || html === '<br>') && !title.trim()) return
    store.saveDiary({
      id: editingId ?? undefined,
      date,
      title: title.trim() || 'Untitled',
      content: html === '<br>' ? '' : html,
      mood,
    })
    // Keep editor open and update editingId if it was a new entry
    if (!editingId) {
      const saved = store.state.diary.find((e) => e.date === date)
      if (saved) setEditingId(saved.id)
    }
    setLastSaved(new Date().toLocaleTimeString())
  }

  // Push local history snapshot when user stops typing
  const pushHistory = (snapshot: { title: string; content: string; mood: string }) => {
    if (isUndoing.current) return
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex.current + 1)
      next.push(snapshot)
      if (next.length > 30) next.shift()
      historyIndex.current = next.length - 1
      return next
    })
  }

  const undo = () => {
    if (historyIndex.current <= 0) {
      // Fall back to global store undo if no local history
      store.undo()
      return
    }
    historyIndex.current -= 1
    isUndoing.current = true
    const snapshot = history[historyIndex.current]
    setTitle(snapshot.title)
    setContent(snapshot.content)
    setMood(snapshot.mood)
    if (editorRef.current) editorRef.current.innerHTML = snapshot.content
    window.setTimeout(() => {
      isUndoing.current = false
    }, 0)
  }

  // Auto-save after user stops typing
  const scheduleAutoSave = () => {
    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = window.setTimeout(() => {
      const snapshot = { title, content: editorRef.current?.innerHTML ?? content, mood }
      pushHistory(snapshot)
      save()
    }, 1500)
  }

  // Cmd+S / Ctrl+S save, Cmd+Z / Ctrl+Z undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        const snapshot = { title, content: editorRef.current?.innerHTML ?? content, mood }
        pushHistory(snapshot)
        save()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [date, title, content, mood, editingId, history])

  // Cleanup auto-save timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current)
    }
  }, [])

  const exec = (command: string, value: string | undefined = undefined) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    // sync latest HTML back to state
    setContent(editorRef.current?.innerHTML ?? '')
    scheduleAutoSave()
  }

  const toolbar = [
    { icon: Heading, label: 'Heading', action: () => exec('formatBlock', 'H2') },
    { icon: Bold, label: 'Bold', action: () => exec('bold') },
    { icon: Italic, label: 'Italic', action: () => exec('italic') },
    { icon: Underline, label: 'Underline', action: () => exec('underline') },
    { icon: List, label: 'List', action: () => exec('insertUnorderedList') },
    { icon: Quote, label: 'Quote', action: () => exec('formatBlock', 'blockquote') },
  ]

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-4 md:grid-cols-4">
      {/* Left: calendar + month entries */}
      <div className="flex flex-col gap-4 md:col-span-1">
        <MiniCalendar
          selected={date}
          onSelect={(d) => {
            setDate(d)
            setFilterDate(d)
          }}
          marks={marks}
        />

        <div className="glass flex flex-1 flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">{filterDate ? formatNice(filterDate) : formatMonthYear(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1)}</h3>
              <p className="text-xs text-muted-foreground">{dayEntries.length} entries</p>
            </div>
            <div className="flex items-center gap-1">
              {filterDate && (
                <button
                  onClick={() => setFilterDate(null)}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Show all
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 space-y-1 overflow-auto p-2">
            {dayEntries.length === 0 && hiddenEntries.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">No entries for this day</p>
            )}
            {dayEntries.map((e) => (
              <div
                key={e.id}
                className={cn(
                  'group flex items-start gap-2 rounded-xl px-3 py-2 transition',
                  e.date === date ? 'bg-primary/10' : 'hover:bg-accent',
                )}
              >
                <button onClick={() => openEntry(e)} className="flex flex-1 items-start gap-2 text-left">
                  <span className="text-base">{e.mood}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{e.title}</div>
                    <div
                      className="diary-snippet line-clamp-2 text-[10px] text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: e.content }}
                    />
                    <div className="text-[10px] text-muted-foreground">{formatNice(e.date)}</div>
                  </div>
                </button>
                <div className="flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => store.toggleDiaryHidden(e.id)}
                    className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent"
                    title="Hide"
                    aria-label="Hide"
                  >
                    <EyeOff className="size-3" />
                  </button>
                  <button
                    onClick={() => store.deleteDiary(e.id)}
                    className="grid size-6 place-items-center rounded text-destructive hover:bg-destructive/10"
                    title="Delete"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))}
            {hiddenEntries.length > 0 && (
              <div className="mt-2 border-t border-border pt-2">
                {/* Sealed envelope container */}
                <div className="relative mx-1 mt-1 overflow-hidden rounded-lg border-2 border-dashed border-[#c4a77d]/60 bg-[#d4b896]/15">
                  {/* Envelope flap — triangular top */}
                  <div className="relative">
                    <div
                      className="mx-auto h-0 w-0"
                      style={{
                        borderLeft: '50% solid transparent',
                        borderRight: '50% solid transparent',
                        borderTop: '20px solid #c4a77d',
                        borderLeftWidth: 'calc(50% - 0px)',
                        borderRightWidth: 'calc(50% - 0px)',
                      }}
                    />
                  </div>
                  {/* Wax seal — rose emoji */}
                  <div className="absolute left-1/2 top-2 -translate-x-1/2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#c4a77d]/20 text-lg leading-none shadow-sm">
                      🌹
                    </span>
                  </div>
                  {/* Label */}
                  <div className="px-3 pb-1 pt-4 text-center">
                    <div className="text-[11px] font-medium text-[#8b7355]">Sealed Envelope</div>
                    <div className="text-[9px] text-[#b8a48a]">{hiddenEntries.length} hidden {hiddenEntries.length === 1 ? 'entry' : 'entries'}</div>
                  </div>
                  {/* Hidden entries list inside envelope */}
                  <div className="space-y-1 px-2 pb-3">
                    {hiddenEntries.map((e) => (
                      <div
                        key={e.id}
                        className="group flex items-start gap-2 rounded-lg px-2 py-1.5 opacity-70 transition hover:bg-[#c4a77d]/15 hover:opacity-100"
                      >
                        <button onClick={() => openEntry(e)} className="flex flex-1 items-start gap-2 text-left">
                          <span className="text-base">{e.mood}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium">{e.title}</div>
                            <div className="text-[10px] text-muted-foreground">{formatNice(e.date)}</div>
                          </div>
                        </button>
                        <div className="flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => store.toggleDiaryHidden(e.id)}
                            className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-accent"
                            title="Unhide"
                            aria-label="Unhide"
                          >
                            <Eye className="size-3" />
                          </button>
                          <button
                            onClick={() => store.deleteDiary(e.id)}
                            className="grid size-6 place-items-center rounded text-destructive hover:bg-destructive/10"
                            title="Delete"
                            aria-label="Delete"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Lace border at bottom */}
                  <div
                    className="h-2"
                    style={{
                      background: 'repeating-conic-gradient(#c4a77d 0% 25%, transparent 0% 50%) 50% / 8px 8px',
                      opacity: 0.3,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: memo-style editor */}
      <div className="flex flex-col gap-3 md:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Diary</h2>
          <div className="flex items-center gap-2">
            {editingId && (
              <button
                onClick={reset}
                className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent"
              >
                <RotateCcw className="size-3.5" /> New
              </button>
            )}
            <button
              onClick={() => store.deleteDiary(editingId!)}
              disabled={!editingId}
              className="grid size-8 place-items-center rounded-lg text-destructive transition hover:bg-destructive/10 disabled:opacity-30"
              aria-label="Delete"
            >
              <Trash2 className="size-4" />
            </button>
            <button
              onClick={save}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground transition hover:bg-primary/90"
            >
              <Save className="size-3.5" /> Save
            </button>
          </div>
          {lastSaved && <div className="text-right text-[10px] text-muted-foreground">Saved at {lastSaved}</div>}
        </div>

        <div className="glass flex flex-1 flex-col overflow-hidden rounded-2xl">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => {
              const value = e.target.value
              setTitle(value)
              scheduleAutoSave()
            }}
            onBlur={() => pushHistory({ title, content: editorRef.current?.innerHTML ?? content, mood })}
            placeholder="Title"
            className="border-b border-border bg-transparent px-5 pt-5 pb-2 text-2xl font-semibold placeholder:text-muted-foreground/50 focus:outline-none"
          />

          {/* Date + mood */}
          <div className="flex items-center justify-between border-b border-border px-5 py-2">
            <div className="text-xs text-muted-foreground">{formatNice(date)}</div>
            <div className="relative flex items-center gap-1">
              {MOODS.slice(0, 5).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMood(m)
                    scheduleAutoSave()
                    pushHistory({ title, content: editorRef.current?.innerHTML ?? content, mood: m })
                  }}
                  className={cn(
                    'grid size-8 place-items-center rounded-full text-lg transition',
                    mood === m ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-accent',
                  )}
                >
                  {m}
                </button>
              ))}
              <button
                onClick={() => setShowEmojiPicker((v) => !v)}
                className={cn(
                  'grid size-8 place-items-center rounded-full text-lg transition',
                  showEmojiPicker ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-accent',
                )}
                aria-label="More emojis"
              >
                •••
              </button>
              {showEmojiPicker && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-border bg-popover p-3 shadow-lg">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Choose emoji</div>
                  <div className="grid max-h-60 grid-cols-7 gap-1 overflow-auto">
                    {EMOJI_PICKER_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setMood(emoji)
                          setShowEmojiPicker(false)
                          scheduleAutoSave()
                          pushHistory({ title, content: editorRef.current?.innerHTML ?? content, mood: emoji })
                        }}
                        className={cn(
                          'grid h-8 place-items-center rounded-lg text-lg transition hover:bg-accent',
                          mood === emoji && 'bg-primary/20 ring-1 ring-primary',
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Format toolbar */}
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <div className="flex items-center gap-1">
              {toolbar.map((t) => (
                <button
                  key={t.label}
                  onClick={t.action}
                  title={t.label}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent"
                  aria-label={t.label}
                >
                  <t.icon className="size-4" />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Type className="size-3.5 text-muted-foreground" />
              <button
                onClick={() => setFontSize((s) => Math.max(12, s - 1))}
                className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent"
                aria-label="Smaller"
              >
                <Minus className="size-3" />
              </button>
              <span className="min-w-[1.5rem] text-center text-xs text-muted-foreground">{fontSize}</span>
              <button
                onClick={() => setFontSize((s) => Math.min(24, s + 1))}
                className="grid size-7 place-items-center rounded-lg text-muted-foreground transition hover:bg-accent"
                aria-label="Larger"
              >
                <Plus className="size-3" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="relative flex-1">
            <div
              ref={editorRef}
              contentEditable
              onInput={() => {
                const html = editorRef.current?.innerHTML ?? ''
                setContent(html)
                scheduleAutoSave()
              }}
              style={{ fontSize: `${fontSize}px` }}
              className="editor-content h-full w-full overflow-auto bg-transparent p-5 leading-relaxed outline-none"
              data-placeholder="Start writing…"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
