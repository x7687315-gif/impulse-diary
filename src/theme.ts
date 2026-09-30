import type { ThemeMode } from './types'
import { loadPrefs, savePrefs } from './db/prefs'

const mq = window.matchMedia('(prefers-color-scheme: dark)')

export function resolveIsDark(mode: ThemeMode): boolean {
  return mode === 'dark' || (mode === 'system' && mq.matches)
}

export function applyTheme(mode: ThemeMode): boolean {
  const dark = resolveIsDark(mode)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#1B1A17' : '#FAFAF7')
  return dark
}

export function currentMode(): ThemeMode {
  return loadPrefs().theme ?? 'system'
}

export function persistMode(mode: ThemeMode): void {
  const p = loadPrefs()
  p.theme = mode
  savePrefs(p)
}
