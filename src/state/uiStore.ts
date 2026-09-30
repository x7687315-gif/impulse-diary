import { create } from 'zustand'
import type { AdjType } from '../types'

export type Page = 'diary' | 'stats' | 'goals' | 'settings'

interface UIState {
  page: Page
  setPage: (p: Page) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  formEntryId: string | null | undefined
  openForm: (entryId?: string | null) => void
  closeForm: () => void
  adjustOpen: boolean
  adjustType: AdjType
  openAdjust: (t?: AdjType) => void
  closeAdjust: () => void
  toast: string | null
  showToast: (msg: string) => void
}

let toastTimer: ReturnType<typeof setTimeout> | undefined

export const useUI = create<UIState>((set) => ({
  page: 'diary',
  setPage: (page) => set({ page, sidebarOpen: false }),
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  formEntryId: undefined,
  openForm: (formEntryId = null) => set({ formEntryId }),
  closeForm: () => set({ formEntryId: undefined }),
  adjustOpen: false,
  adjustType: 'SAVED',
  openAdjust: (adjustType = 'SAVED') => set({ adjustOpen: true, adjustType }),
  closeAdjust: () => set({ adjustOpen: false }),
  toast: null,
  showToast: (msg) => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: msg })
    toastTimer = setTimeout(() => set({ toast: null }), 2800)
  },
}))
