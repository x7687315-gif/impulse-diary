import { db } from './db'
import type { Entry, Goal, Adjustment } from '../types'

export interface ExportPayload {
  schemaVersion: 1
  app: 'impulse-diary'
  exportedAt: number
  entries: Entry[]
  goals: Goal[]
  adjustments: Adjustment[]
}

export async function exportAll(): Promise<ExportPayload> {
  return {
    schemaVersion: 1,
    app: 'impulse-diary',
    exportedAt: Date.now(),
    entries: await db.entries.toArray(),
    goals: await db.goals.toArray(),
    adjustments: await db.adjustments.toArray(),
  }
}

export function downloadExport(p: ExportPayload): void {
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `攒钱日记-备份-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

export async function importAll(
  json: unknown,
): Promise<{ entries: number; goals: number; adjustments: number }> {
  const p = json as ExportPayload | null
  if (
    !p ||
    p.schemaVersion !== 1 ||
    p.app !== 'impulse-diary' ||
    !Array.isArray(p.entries) ||
    !Array.isArray(p.goals) ||
    !Array.isArray(p.adjustments)
  ) {
    throw new Error('文件格式不正确，请选择本应用导出的 JSON 备份')
  }
  await db.transaction('rw', db.entries, db.goals, db.adjustments, async () => {
    await Promise.all([db.entries.clear(), db.goals.clear(), db.adjustments.clear()])
    await db.entries.bulkPut(p.entries)
    await db.goals.bulkPut(p.goals)
    await db.adjustments.bulkPut(p.adjustments)
  })
  return { entries: p.entries.length, goals: p.goals.length, adjustments: p.adjustments.length }
}
