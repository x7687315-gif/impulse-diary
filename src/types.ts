export type Decision = 'BOUGHT' | 'RESISTED' | 'DEFERRED' | 'SUBSTITUTED' | 'PLANNED'
export type Motive = 'STRESS' | 'WANT' | 'SOCIAL' | 'NECESSITY' | 'OTHER'
export type Zone = 'FREE' | 'BUFFER' | 'CAUTION'
export type AdjType = 'SAVED' | 'PLANNED' | 'FUND' | 'ACTUAL'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface Entry {
  id: string
  createdAt: number
  content: string
  intendedAmount: number
  actualAmount: number
  decision: Decision
  motive: Motive | null
  zone: Zone | null
  savedAmount: number
  fundAmount: number
  targetId?: string
  tags: string[]
  bufferUntil?: number
  resolvedAt?: number
  updatedAt: number
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  createdAt: number
  deadline?: number
  status: 'ACTIVE' | 'ACHIEVED' | 'PAUSED'
}

export interface Adjustment {
  id: string
  createdAt: number
  type: AdjType
  targetId?: string
  amount: number
  reason: string
}

export const DECISION_LABEL: Record<Decision, string> = {
  BOUGHT: '已购买',
  RESISTED: '没有购买',
  DEFERRED: '待决定',
  SUBSTITUTED: '替代消费',
  PLANNED: '已计划',
}

export const MOTIVE_LABEL: Record<Motive, string> = {
  STRESS: '压力消费',
  WANT: '想要',
  SOCIAL: '社交',
  NECESSITY: '必需',
  OTHER: '其他',
}

export const ZONE_LABEL: Record<Zone, string> = {
  FREE: '随心花',
  BUFFER: '缓冲期',
  CAUTION: '谨慎考虑区',
}

export const ADJ_LABEL: Record<AdjType, string> = {
  SAVED: '已节省',
  PLANNED: '即将支出',
  FUND: '大件基金',
  ACTUAL: '实际支出',
}
