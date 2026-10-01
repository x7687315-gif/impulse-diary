import { useRef, useState } from 'react'
import { loadPrefs, savePrefs } from '../db/prefs'
import { exportAll, downloadExport, importAll } from '../db/backup'
import { seedDemoData, clearAllData } from '../seed'
import { db } from '../db/db'
import { useUI } from '../state/uiStore'

const BUFFER_OPTIONS = [24, 48, 72]
const CLEAN_RANGES = [
  { days: 30, label: '30 天前' },
  { days: 90, label: '3 个月前' },
  { days: 365, label: '1 年前' },
]

function cnDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export function SettingsPage() {
  const showToast = useUI((s) => s.showToast)
  const setThemeMode = useUI((s) => s.setThemeMode)
  const [prefs, setPrefs] = useState(loadPrefs())
  const [busy, setBusy] = useState(false)
  const [cleanDays, setCleanDays] = useState(30)
  const [cleanAdj, setCleanAdj] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function setBuffer(h: number) {
    const p = { ...prefs, bufferHours: h }
    setPrefs(p)
    savePrefs(p)
    showToast(`缓冲期默认时长改为 ${h} 小时`)
  }

  async function doExport() {
    const payload = await exportAll()
    downloadExport(payload)
    showToast(`已导出 ${payload.entries.length} 条记录`)
  }

  async function doImport(file: File) {
    if (!window.confirm('导入会替换当前所有数据（记录 / 目标 / 调整），确定继续吗？')) return
    setBusy(true)
    try {
      const text = await file.text()
      const r = await importAll(JSON.parse(text))
      showToast(`导入完成：${r.entries} 条记录 · ${r.goals} 个目标`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '导入失败')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function doClean() {
    const cutoff = Date.now() - cleanDays * 864e5
    const cnt = await db.entries.where('createdAt').below(cutoff).count()
    const adjCnt = cleanAdj ? await db.adjustments.where('createdAt').below(cutoff).count() : 0
    if (cnt === 0 && adjCnt === 0) {
      showToast('这个范围之前没有可清理的数据')
      return
    }
    const msg =
      `将删除 ${cnDate(cutoff)} 之前的 ${cnt} 条记录` +
      (cleanAdj ? ` 和 ${adjCnt} 条调整流水` : '') +
      '，不可恢复。确定继续吗？（建议先导出备份）'
    if (!window.confirm(msg)) return
    if (!window.confirm('再次确认：真的要清理吗？')) return
    setBusy(true)
    await db.transaction('rw', db.entries, db.adjustments, async () => {
      await db.entries.where('createdAt').below(cutoff).delete()
      if (cleanAdj) await db.adjustments.where('createdAt').below(cutoff).delete()
    })
    setBusy(false)
    showToast(`已清理 ${cnt} 条记录${cleanAdj ? ` · ${adjCnt} 条调整流水` : ''}`)
  }

  return (
    <div>
      <p className="page-title">这是你的私人日记本</p>

      <div className="card-block">
        <p className="block-title">外观与偏好</p>
        <div className="set-row">
          <span className="set-label">
            主题
            <span className="sub">「跟随系统」会在晚上自动切换成深色</span>
          </span>
          <span className="chips">
            {(
              [
                ['system', '跟随系统'],
                ['light', '浅色'],
                ['dark', '深色'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                className={'chip' + (prefs.theme === mode ? ' on' : '')}
                onClick={() => {
                  setPrefs({ ...prefs, theme: mode })
                  setThemeMode(mode)
                }}
              >
                {label}
              </button>
            ))}
          </span>
        </div>
        <div className="set-row">
          <span className="set-label">
            缓冲期默认时长
            <span className="sub">「延迟决定」时的默认等待时间，到期后日记顶部会提醒你</span>
          </span>
          <span className="chips">
            {BUFFER_OPTIONS.map((h) => (
              <button key={h} className={'chip' + (prefs.bufferHours === h ? ' on' : '')} onClick={() => setBuffer(h)}>
                {h}h
              </button>
            ))}
          </span>
        </div>
      </div>

      <div className="card-block">
        <p className="block-title">数据</p>
        <div className="set-row">
          <span className="set-label">
            导出备份
            <span className="sub">全部记录导出为 JSON 文件，可导入到手机端</span>
          </span>
          <button className="btn small" onClick={doExport}>导出</button>
        </div>
        <div className="set-row">
          <span className="set-label">
            导入备份
            <span className="sub">用之前导出的 JSON 文件恢复（会替换当前数据）</span>
          </span>
          <button className="btn small" disabled={busy} onClick={() => fileRef.current?.click()}>
            选择文件
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void doImport(f)
            }}
          />
        </div>
        <div className="set-row">
          <span className="set-label">
            载入示例数据
            <span className="sub">想看看功能长什么样？载入一周的示例记录</span>
          </span>
          <button
            className="btn small"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm('会叠加写入示例数据（不删除现有记录），继续吗？')) return
              setBusy(true)
              await seedDemoData(true)
              setBusy(false)
              showToast('示例数据已载入')
            }}
          >
            载入
          </button>
        </div>
        <div className="set-row">
          <span className="set-label">
            清空全部数据
            <span className="sub">删除所有记录、目标与调整，不可恢复，请先导出备份</span>
          </span>
          <button
            className="btn small danger"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm('确定清空全部数据？此操作不可恢复！')) return
              if (!window.confirm('再次确认：真的要清空吗？建议先导出备份。')) return
              setBusy(true)
              await clearAllData()
              setBusy(false)
              showToast('已清空全部数据')
            }}
          >
            清空
          </button>
        </div>
      </div>

      <div className="card-block">
        <p className="block-title">清理历史数据</p>
        <div className="set-row">
          <span className="set-label">
            清理范围
            <span className="sub">删除该时间点之前的记录；目标与偏好不受影响</span>
          </span>
          <span className="chips">
            {CLEAN_RANGES.map((r) => (
              <button
                key={r.days}
                className={'chip' + (cleanDays === r.days ? ' on' : '')}
                onClick={() => setCleanDays(r.days)}
              >
                {r.label}
              </button>
            ))}
          </span>
        </div>
        <div className="set-row">
          <span className="set-label">
            同时清理手动调整流水
            <span className="sub">调整记录一并删除，统计基线随之重置</span>
          </span>
          <button className={'chip' + (cleanAdj ? ' on' : '')} onClick={() => setCleanAdj(!cleanAdj)}>
            {cleanAdj ? '✓ 一并清理' : '保留'}
          </button>
        </div>
        <div className="set-row">
          <span className="set-label">
            执行清理
            <span className="sub">不可恢复 —— 数据随时可以导出，清理前建议先备份</span>
          </span>
          <button className="btn small danger" disabled={busy} onClick={doClean}>
            清理
          </button>
        </div>
      </div>

      <div className="card-block">
        <p className="block-title">关于</p>
        <div className="about">
          攒钱日记 · v0.2.2（手机版）
          <br />
          「不是记录我花了多少钱，而是记录我如何面对自己的消费欲望。」
          <br />
          所有数据只存在这台设备浏览器的 IndexedDB 里，不联网、不上传、没有账号。
          换设备时用导出 / 导入搬家。它不是记账软件，也不评判你的消费 —— 只帮你看见自己的欲望，并把冲动变成真正想要的东西。
        </div>
      </div>
    </div>
  )
}
