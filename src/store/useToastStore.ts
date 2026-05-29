import { create } from 'zustand'

interface ShowOptions {
  message: string
  actionLabel?: string
  onAction?: () => void
  duration?: number
}

interface ToastStore {
  message: string | null
  actionLabel?: string
  onAction?: () => void
  visible: boolean
  show: (opts: ShowOptions) => void
  runAction: () => void
  dismiss: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

export const useToastStore = create<ToastStore>((set, get) => ({
  message: null,
  actionLabel: undefined,
  onAction: undefined,
  visible: false,

  show: ({ message, actionLabel, onAction, duration = 5000 }) => {
    if (timer) clearTimeout(timer)
    set({ message, actionLabel, onAction, visible: true })
    timer = setTimeout(() => set({ visible: false }), duration)
  },

  runAction: () => {
    const { onAction } = get()
    if (timer) clearTimeout(timer)
    onAction?.()
    set({ visible: false })
  },

  dismiss: () => {
    if (timer) clearTimeout(timer)
    set({ visible: false })
  },
}))
