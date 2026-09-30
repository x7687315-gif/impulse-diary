import Dexie, { type EntityTable } from 'dexie'
import type { Entry, Goal, Adjustment } from '../types'

// Dexie 单例：整个应用只有这一个实例（禁止在组件内 new Dexie）
export const db = new Dexie('impulse-diary') as Dexie & {
  entries: EntityTable<Entry, 'id'>
  goals: EntityTable<Goal, 'id'>
  adjustments: EntityTable<Adjustment, 'id'>
}

db.version(1).stores({
  entries: 'id, createdAt, decision, motive, targetId',
  goals: 'id, createdAt, status',
  adjustments: 'id, createdAt, type, targetId',
})
