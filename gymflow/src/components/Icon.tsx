import type { SVGProps } from 'react'

type IconName =
  | 'home' | 'calendar' | 'play' | 'dumbbell' | 'chart' | 'user' | 'clock' | 'flame'
  | 'chevron' | 'check' | 'search' | 'info' | 'close' | 'pause' | 'refresh' | 'target'
  | 'bolt' | 'trophy' | 'settings' | 'download' | 'trash' | 'arrow-left' | 'sparkles' | 'video'

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  play: <path d="m9 7 8 5-8 5z" fill="currentColor" stroke="none"/>,
  dumbbell: <><path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  flame: <path d="M13 3s1 4-2 6c-2-2-4-1-4-1s-3 3-1 8c1 3 3 5 6 5s6-2 6-6c0-5-5-8-5-12Z"/>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  close: <path d="M6 6l12 12M18 6 6 18"/>,
  pause: <><path d="M9 7v10M15 7v10"/></>,
  refresh: <><path d="M20 7v5h-5"/><path d="M18.5 16A8 8 0 1 1 20 10"/></>,
  target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7z"/>,
  trophy: <><path d="M8 4h8v4c0 4-2 6-4 6s-4-2-4-6z"/><path d="M8 6H4c0 4 2 6 5 6M16 6h4c0 4-2 6-5 6M12 14v4M8 21h8M10 18h4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.7a6 6 0 0 0-.8-1.9l.9-1.9-2.1-2.1-1.9.9a6 6 0 0 0-1.9-.8L10.5 2h-3l-.7 2a6 6 0 0 0-1.9.8L3 3.9.9 6l.9 1.9A6 6 0 0 0 1 9.8l-2 .7v3l2 .7a6 6 0 0 0 .8 1.9L.9 18l2.1 2.1 1.9-.9a6 6 0 0 0 1.9.8l.7 2h3l.7-2a6 6 0 0 0 1.9-.8l1.9.9L18 18l-.9-1.9a6 6 0 0 0 .8-1.9z" transform="translate(2) scale(.83)"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  'arrow-left': <><path d="m15 18-6-6 6-6"/><path d="M9 12h11"/></>,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2z"/><path d="m5 14 .8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8zM19 14l.8 1.2L21 16l-1.2.8L19 18l-.8-1.2L17 16l1.2-.8z"/></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></>,
}

export function Icon({ name, size = 22, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  )
}
