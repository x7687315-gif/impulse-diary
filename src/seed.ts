import { db } from './db/db'
import type { Entry, Goal } from './types'
import { loadPrefs, savePrefs } from './db/prefs'

function ts(dayOffset: number, h: number, m: number): number {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

// 示例数据：镜像用户手机便签里的真实记录，数字对齐设计规格
// （已节省 ¥247 · 即将支出 ¥86 · 大件基金 ¥133/¥300）
export async function seedDemoData(force = false): Promise<void> {
  const prefs = loadPrefs()
  if (prefs.seeded && !force) return

  const goal: Goal = {
    id: 'goal-demo-1',
    name: '真正喜欢的衣服',
    targetAmount: 300,
    createdAt: ts(-7, 9, 0),
    status: 'ACTIVE',
  }
  const T = goal.id

  const E = (
    o: Partial<Entry> & { createdAt: number; content: string; intendedAmount: number; decision: Entry['decision'] },
  ): Entry => ({
    id: crypto.randomUUID(),
    actualAmount: 0,
    savedAmount: 0,
    fundAmount: 0,
    motive: null,
    zone: null,
    tags: [],
    updatedAt: o.createdAt,
    ...o,
  })

  const entries: Entry[] = [
    E({ createdAt: ts(0, 1, 27), content: '看到一个 ¥21 的小东西，很喜欢。想了想不是必需，没有买。', intendedAmount: 21, decision: 'RESISTED', motive: 'WANT', zone: 'FREE', savedAmount: 21, fundAmount: 21, targetId: T }),
    E({ createdAt: ts(0, 1, 36), content: '想到刚买的东西需要保护套，大概要几块钱，买得多的话要十几块。正在纠结中。', intendedAmount: 8, decision: 'DEFERRED', motive: 'NECESSITY', zone: 'BUFFER', bufferUntil: ts(2, 1, 36) }),
    E({ createdAt: ts(0, 10, 30), content: '给同学买了一个公仔当作生日礼物。', intendedAmount: 16, actualAmount: 16, decision: 'BOUGHT', motive: 'SOCIAL', tags: ['礼物'] }),
    E({ createdAt: ts(0, 12, 33), content: '吃完饭很想喝奶茶。想了想，改喝冰箱里的柠檬茶，出去的时候再喝。', intendedAmount: 12, decision: 'SUBSTITUTED', motive: 'STRESS', savedAmount: 12 }),
    E({ createdAt: ts(-1, 20, 15), content: '决定买那件 ¥59 的外套，周五发工资再付款。', intendedAmount: 59, decision: 'PLANNED', motive: 'WANT', zone: 'CAUTION' }),
    E({ createdAt: ts(-1, 12, 5), content: '周末聚餐已经答应去了，AA 大概 ¥27。', intendedAmount: 27, decision: 'PLANNED', motive: 'SOCIAL' }),
    E({ createdAt: ts(-2, 21, 40), content: '加班完特别想点炸鸡，忍住了，回家煮了面。', intendedAmount: 35, decision: 'RESISTED', motive: 'STRESS', zone: 'CAUTION', savedAmount: 35, fundAmount: 35, targetId: T }),
    E({ createdAt: ts(-3, 12, 20), content: '午饭加了个汤。', intendedAmount: 13, actualAmount: 13, decision: 'BOUGHT', motive: 'NECESSITY' }),
    E({ createdAt: ts(-3, 15, 10), content: '种草的眼影盘，在购物车里冷静了两天，删掉了。', intendedAmount: 45, decision: 'RESISTED', motive: 'WANT', zone: 'CAUTION', savedAmount: 45, fundAmount: 45, targetId: T }),
    E({ createdAt: ts(-4, 22, 0), content: '深夜刷到 ¥62 的卫衣，差点下单，先记下来。', intendedAmount: 62, decision: 'RESISTED', motive: 'STRESS', zone: 'CAUTION', savedAmount: 62 }),
    E({ createdAt: ts(-5, 19, 30), content: '想打车回家，改骑共享单车，还挺凉快。', intendedAmount: 8, decision: 'SUBSTITUTED', motive: 'NECESSITY', savedAmount: 8 }),
    E({ createdAt: ts(-6, 11, 20), content: '直播间里很心动，退出直播间之后没有再打开。', intendedAmount: 32, decision: 'RESISTED', motive: 'WANT', zone: 'FREE', savedAmount: 32, fundAmount: 32, targetId: T }),
    E({ createdAt: ts(-7, 9, 0), content: '想买桌面收纳盒，用现成的纸盒替代了。', intendedAmount: 32, decision: 'SUBSTITUTED', motive: 'OTHER', savedAmount: 32 }),
  ]

  await db.transaction('rw', db.entries, db.goals, async () => {
    await db.goals.put(goal)
    await db.entries.bulkPut(entries)
  })

  prefs.seeded = true
  savePrefs(prefs)
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', db.entries, db.goals, db.adjustments, async () => {
    await Promise.all([db.entries.clear(), db.goals.clear(), db.adjustments.clear()])
  })
  const p = loadPrefs()
  p.seeded = false
  savePrefs(p)
}
