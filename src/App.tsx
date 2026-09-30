import { useEffect } from 'react'
import { useUI } from './state/uiStore'
import { Sidebar } from './components/Sidebar'
import { DiaryPage } from './pages/DiaryPage'
import { EntryFormGate } from './components/EntryForm'
import { IslandBar } from './components/IslandBar'
import { GoalsPage } from './pages/GoalsPage'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'
import { Toast } from './components/Toast'
import { AdjustDialog } from './components/AdjustDialog'
import { Icon } from './components/icons'
import { seedDemoData } from './seed'

const titles = { diary: '消费日记', stats: '数据统计', goals: '我的目标', settings: '设置' } as const

export default function App() {
  const page = useUI((s) => s.page)
  const setSidebarOpen = useUI((s) => s.setSidebarOpen)
  const formEntryId = useUI((s) => s.formEntryId)
  const adjustOpen = useUI((s) => s.adjustOpen)

  useEffect(() => {
    seedDemoData().catch(console.error)
  }, [])

  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)} aria-label="打开菜单">
            <Icon name="menu" />
          </button>
          <span className="topbar-title">{titles[page]}</span>
          <span style={{ width: 40 }} />
        </header>
        <div className={'page-scroll' + (page === 'diary' ? ' with-island' : '')}>
          <div className="container">
            {page === 'diary' && <DiaryPage />}
            {page === 'stats' && <StatsPage />}
            {page === 'goals' && <GoalsPage />}
            {page === 'settings' && <SettingsPage />}
          </div>
        </div>
        {page === 'diary' && <DiaryDock />}
      </main>
      {formEntryId !== undefined && <EntryFormGate entryId={formEntryId} />}
      {adjustOpen && <AdjustDialog />}
      <Toast />
    </div>
  )
}

function Placeholder({ text }: { text: string }) {
  return <div className="empty-note">{text}</div>
}

function DiaryDock() {
  const openForm = useUI((s) => s.openForm)
  return (
    <div className="island-wrap">
      <button className="fab" onClick={() => openForm(null)} aria-label="记录一次消费冲动">
        <Icon name="plus" size={24} />
      </button>
      <IslandBar />
    </div>
  )
}
