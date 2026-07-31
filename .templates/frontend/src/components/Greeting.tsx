import { useRef, useMemo } from 'react'
import { Moon, Sun, ImagePlus } from 'lucide-react'
import { greetingByHour, randomGreeting } from '@/lib/assistant'
import { formatNice, todayKey } from '@/lib/format'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function Greeting({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const store = useStore()
  const date = formatNice(todayKey())
  const greeting = useMemo(() => randomGreeting(), [])
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => store.setBackground(String(reader.result))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl p-6 md:p-8 text-white shadow-lg"
      style={{
        backgroundImage: store.state.background ? `url(${store.state.background})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {store.state.background ? (
        <div className={cn('absolute inset-0 bg-[#f0e1e4]/20', dark && 'bg-black/40')} />
      ) : (
        <div className={cn('absolute inset-0 bg-gradient-to-br from-[#e8cdd4]/60 via-[#e2c5cc]/60 to-[#d8b8c0]/60', dark && 'from-[#4a363c]/60 via-[#3f2d32]/60 to-[#35262b]/60')} />
      )}
      <div className="pointer-events-none absolute -top-12 -right-10 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-white/80">{greetingByHour()} · {date}</p>
          <h1
            className="mt-1 text-3xl md:text-4xl tracking-tight"
            style={{ fontFamily: "'Didot', 'Bodoni MT', 'Times New Roman', Georgia, serif" }}
          >
            {greeting}
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/80">
            Your gentle little workspace — soft, focused, and a touch floral.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            aria-label="Change background"
            title="Change background"
            className="grid size-10 place-items-center rounded-full bg-white/20 backdrop-blur transition hover:bg-white/30"
          >
            <ImagePlus className="size-5" />
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <button
            onClick={onToggle}
            aria-label="Toggle theme"
            className="grid size-10 place-items-center rounded-full bg-white/20 backdrop-blur transition hover:bg-white/30"
          >
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
