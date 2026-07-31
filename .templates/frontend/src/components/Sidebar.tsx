import { useRef } from 'react'
import { Home, ChevronLeft, ChevronRight } from 'lucide-react'
import { MODULES } from '@/lib/constants'
import { MODULE_ICONS } from '@/lib/icons'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { View } from '@/lib/types'

function NavBtn({
  active,
  onClick,
  icon: Icon,
  label,
  accent,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
  accent?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-1 md:flex-none items-center justify-center md:justify-start gap-3 rounded-xl px-2 md:px-2.5 py-3 md:py-4 text-sm transition w-full',
        active ? 'bg-primary/15 font-medium text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      <Icon className={cn('size-6 shrink-0', active ? 'text-primary' : accent ?? 'text-muted-foreground')} />
      <span className="font-serif-display hidden md:inline truncate text-[15px]">{label}</span>
    </button>
  )
}

export function Sidebar({
  view,
  onSelect,
  collapsed,
  onToggleCollapse,
}: {
  view: View
  onSelect: (v: View) => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const store = useStore()
  const inputRef = useRef<HTMLInputElement>(null)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => store.setAvatar(String(reader.result))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <aside
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 flex flex-row justify-around md:static md:min-h-screen md:flex-col md:justify-start gap-2 md:gap-3 border-t md:border-t-0 md:border-r border-border bg-sidebar/85 p-2 md:p-5 backdrop-blur transition-all duration-300 ease-in-out overflow-hidden',
        collapsed ? 'md:w-0 md:border-r-0 md:p-0 md:opacity-0' : 'md:w-56',
      )}
    >
      <div className="hidden md:flex items-center gap-3 px-2 py-4 mb-2">
        <button
          onClick={() => inputRef.current?.click()}
          className="grid place-items-center size-11 rounded-xl bg-primary/15 text-xl overflow-hidden shrink-0"
          title="Click to change avatar"
        >
          {store.state.avatar ? (
            <img src={store.state.avatar} alt="avatar" className="h-full w-full object-cover" />
          ) : (
            <span>🌙</span>
          )}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        <div className="font-serif-display text-lg whitespace-nowrap">Purple Moon</div>
      </div>

      <NavBtn active={view === 'home'} onClick={() => onSelect('home')} icon={Home} label="Home" />
      {MODULES.map((m) => (
        <NavBtn
          key={m.key}
          active={view === m.key}
          onClick={() => onSelect(m.key)}
          icon={MODULE_ICONS[m.key]}
          label={m.label}
          accent={m.accent}
        />
      ))}

      <div className="hidden md:block md:mt-auto" />

      {/* Collapse toggle button */}
      <button
        onClick={onToggleCollapse}
        className="hidden md:flex items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        <span className="font-serif-display text-[13px]">{collapsed ? '' : 'Collapse'}</span>
      </button>
    </aside>
  )
}
