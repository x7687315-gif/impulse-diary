import type { ReactNode } from 'react'

const paths = {
  diary: <><rect x="4" y="3.5" width="16" height="17" rx="3" /><path d="M4 9h16M8.5 3.5v3M15.5 3.5v3" /></>,
  chart: <><path d="M4 20.5V11M10 20.5V4.5M16 20.5v-6.5M21 20.5H3" /></>,
  target: <><circle cx="12" cy="12" r="8.6" /><circle cx="12" cy="12" r="3.2" /><path d="M12 3.4v2M12 18.6v2M3.4 12h2M18.6 12h2" /></>,
  gear: <><circle cx="12" cy="12" r="3.4" /><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M18.5 5.5l-1.8 1.8M7.3 16.7l-1.8 1.8" /></>,
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  left: <path d="M14 6.5L8.5 12l5.5 5.5" />,
  right: <path d="M10 6.5l5.5 5.5-5.5 5.5" />,
  saved: <><path d="M12 3.5v9M8.5 9.5L12 13l3.5-3.5" /><path d="M4.5 16v2.5A1.8 1.8 0 0 0 6.3 20.3h11.4a1.8 1.8 0 0 0 1.8-1.8V16" /></>,
  outgoing: <><path d="M6.5 17.5l11-11" /><path d="M9.5 6.5h8v8" /></>,
  fund: <><circle cx="12" cy="12" r="8.4" /><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" /></>,
  clock: <><circle cx="12" cy="12" r="8.4" /><path d="M12 7.5V12l3 2.1" /></>,
  trash: <><path d="M4.5 6.5h15M9.5 6V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3V6" /><path d="M6.5 6.5l1 12.2A1.6 1.6 0 0 0 9.1 20.2h5.8a1.6 1.6 0 0 0 1.6-1.5l1-12.2" /><path d="M10 10.5v5.5M14 10.5v5.5" /></>,
  moon: <path d="M20 13.6A8.2 8.2 0 0 1 10.4 4 8.2 8.2 0 1 0 20 13.6z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M18.7 5.3l-1.5 1.5M6.8 17.2l-1.5 1.5" /></>,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof paths

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
