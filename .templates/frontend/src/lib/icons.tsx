import { Briefcase, BookOpen, Sparkles, Wallet, NotebookPen, type LucideIcon } from 'lucide-react'
import type { ModuleKey } from './types'

export const MODULE_ICONS: Record<ModuleKey, LucideIcon> = {
  work: Briefcase,
  study: BookOpen,
  beauty: Sparkles,
  finance: Wallet,
  diary: NotebookPen,
}
