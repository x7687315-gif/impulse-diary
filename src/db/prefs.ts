import type { ThemeMode } from '../types'

const KEY = 'impulse-diary-prefs'

export interface AppPrefs {
  bufferHours: number
  seeded: boolean
  theme: ThemeMode
  diaryRange: number
}

export const defaultPrefs: AppPrefs = { bufferHours: 48, seeded: false, theme: 'system', diaryRange: 1 }

export function loadPrefs(): AppPrefs {
  try {
    return { ...defaultPrefs, ...(JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<AppPrefs>) }
  } catch {
    return { ...defaultPrefs }
  }
}

export function savePrefs(p: AppPrefs): void {
  localStorage.setItem(KEY, JSON.stringify(p))
}
