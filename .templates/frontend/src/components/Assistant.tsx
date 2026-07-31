import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'
import { useStore } from '@/lib/store'
import { generateReply } from '@/lib/assistant'
import { cn } from '@/lib/utils'

interface Msg {
  role: 'user' | 'assistant'
  text: string
}

const BTN_SIZE = 56
const GAP = 12

export function Assistant({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const store = useStore()
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: 'hi~ I am Purple Moon assistant 🌙 What would you like to plan today?' },
  ])
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [win, setWin] = useState({ w: window.innerWidth, h: window.innerHeight })
  const dragRef = useRef({ startX: 0, startY: 0, startLeft: 0, startTop: 0, dragging: false, moved: false })
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9 })
  }, [msgs, thinking])

  useEffect(() => {
    const onResize = () => setWin({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const send = async () => {
    const text = input.trim()
    if (!text || thinking) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', text }])
    setThinking(true)

    let reply = ''
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, context: store.state }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.reply) reply = data.reply
      }
    } catch {
      /* backend not reachable — fall back to local generator */
    }
    if (!reply) reply = generateReply(text, { state: store.state })

    setThinking(false)
    setMsgs((m) => [...m, { role: 'assistant', text: reply }])
  }

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = buttonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      dragging: true,
      moved: false,
    }
    el.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true
    const el = buttonRef.current
    if (!el) return
    const pw = win.w
    const ph = win.h
    const nextX = Math.max(0, Math.min(pw - BTN_SIZE, dragRef.current.startLeft + dx))
    const nextY = Math.max(0, Math.min(ph - BTN_SIZE, dragRef.current.startTop + dy))
    setPos({ x: nextX, y: nextY })
  }, [win])

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current.dragging = false
      buttonRef.current?.releasePointerCapture(e.pointerId)
      if (!dragRef.current.moved) {
        onOpenChange(!open)
      }
    },
    [open, onOpenChange],
  )

  const chatStyle = useMemo(() => {
    const chatW = Math.min(win.w * 0.92, 384)
    const chatH = Math.min(win.h * 0.7, 560)
    const btnLeft = pos?.x ?? win.w - 24 - BTN_SIZE
    const btnTop = pos?.y ?? win.h - 24 - BTN_SIZE
    let left = btnLeft + BTN_SIZE / 2 - chatW / 2
    left = Math.max(16, Math.min(win.w - chatW - 16, left))
    const spaceAbove = btnTop
    const spaceBelow = win.h - btnTop - BTN_SIZE
    if (spaceAbove >= chatH + GAP) {
      return { left, bottom: win.h - btnTop + GAP, width: chatW, height: chatH }
    }
    if (spaceBelow >= chatH + GAP) {
      return { left, top: btnTop + BTN_SIZE + GAP, width: chatW, height: chatH }
    }
    const top = Math.max(16, (win.h - chatH) / 2)
    return { left, top, width: chatW, height: chatH }
  }, [pos, win])

  return (
    <>
      <button
        ref={buttonRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="fixed z-50 hidden md:grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition hover:scale-105"
        style={pos ? { left: pos.x, top: pos.y } : { right: '1.5rem', bottom: '1.5rem' }}
        aria-label="Assistant"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
      </button>

      {open && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl"
          style={chatStyle}
        >
          <div
            className="flex items-center justify-between gap-2 px-4 py-3 text-white"
            style={{ background: 'linear-gradient(135deg, #c49aa6 0%, #b08a94 100%)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🌙</span>
              <div>
                <div className="text-sm font-semibold">Purple Moon Assistant</div>
                <div className="text-[11px] text-white/70">Powered by CodeBuddy</div>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="grid size-8 place-items-center rounded-lg text-white/80 transition hover:bg-white/20"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto p-3">
            {msgs.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                    m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking…</div>
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t border-border p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask your assistant…"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button onClick={send} className="grid place-items-center rounded-lg bg-primary px-3 text-primary-foreground transition hover:bg-primary/90" aria-label="Send">
              <Send className="size-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
