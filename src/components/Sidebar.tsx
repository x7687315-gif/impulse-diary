import { useUI, type Page } from '../state/uiStore'
import { Icon, type IconName } from './icons'

const items: { key: Page; label: string; icon: IconName }[] = [
  { key: 'diary', label: '消费日记', icon: 'diary' },
  { key: 'stats', label: '数据统计', icon: 'chart' },
  { key: 'goals', label: '我的目标', icon: 'target' },
  { key: 'settings', label: '设置', icon: 'gear' },
]

export function Sidebar() {
  const page = useUI((s) => s.page)
  const setPage = useUI((s) => s.setPage)
  const open = useUI((s) => s.sidebarOpen)
  const setOpen = useUI((s) => s.setSidebarOpen)

  return (
    <>
      <div className={'scrim' + (open ? ' show' : '')} onClick={() => setOpen(false)} />
      <aside className={'sidebar' + (open ? ' open' : '')}>
        <div className="brand">攒钱日记</div>
        {items.map((it) => (
          <button
            key={it.key}
            className={'side-link' + (page === it.key ? ' active' : '')}
            onClick={() => setPage(it.key)}
          >
            <Icon name={it.icon} />
            {it.label}
          </button>
        ))}
        <div className="side-foot">
          本地优先 · 数据只存在这台设备上
          <br />不联网 · 不上传 · 随时导出
        </div>
      </aside>
    </>
  )
}
