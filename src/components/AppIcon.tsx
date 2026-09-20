import type { SVGProps } from 'react';

export type AppIconName =
  | 'home'
  | 'calendar'
  | 'cart'
  | 'box'
  | 'book'
  | 'store'
  | 'user'
  | 'more'
  | 'utensils'
  | 'snowflake'
  | 'leaf'
  | 'basket'
  | 'euro'
  | 'users'
  | 'check';

type AppIconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: AppIconName;
  size?: number;
};

export default function AppIcon({ name, size = 22, ...props }: AppIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...props,
  };

  switch (name) {
    case 'home':
      return <svg {...common}><path d="M3.5 10.6 12 3.4l8.5 7.2"/><path d="M5.5 9.8V21h13V9.8"/><path d="M9.3 21v-6h5.4v6"/></svg>;
    case 'calendar':
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>;
    case 'cart':
      return <svg {...common}><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 7H6"/><circle cx="10" cy="20" r="1.25"/><circle cx="18" cy="20" r="1.25"/></svg>;
    case 'box':
      return <svg {...common}><path d="m4 7 8-4 8 4-8 4-8-4Z"/><path d="M4 7v10l8 4 8-4V7M12 11v10"/></svg>;
    case 'book':
      return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21V5.5Z"/></svg>;
    case 'store':
      return <svg {...common}><path d="M4 10v10h16V10"/><path d="M3 10 5 4h14l2 6"/><path d="M3 10c0 1.2 1 2 2.2 2S7.4 11.2 7.4 10c0 1.2 1 2 2.3 2s2.3-.8 2.3-2c0 1.2 1 2 2.3 2s2.3-.8 2.3-2c0 1.2 1 2 2.2 2S21 11.2 21 10"/><path d="M9 20v-5h6v5"/></svg>;
    case 'user':
      return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.7-4.2 3.3-6.5 7.5-6.5s6.8 2.3 7.5 6.5"/></svg>;
    case 'more':
      return <svg {...common}><circle cx="5" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.25" fill="currentColor" stroke="none"/></svg>;
    case 'utensils':
      return <svg {...common}><path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M15 3v8c0 1.1.9 2 2 2h2V3c-2.3 0-4 2-4 4.5V13M19 13v8"/></svg>;
    case 'snowflake':
      return <svg {...common}><path d="M12 2v20M4.2 6.5l15.6 11M4.2 17.5l15.6-11"/><path d="m9 4 3 2 3-2M9 20l3-2 3 2M5.5 9.4l.4-3.6 3.3-1.4M18.5 14.6l-.4 3.6-3.3 1.4M5.5 14.6l.4 3.6 3.3 1.4M18.5 9.4l-.4-3.6-3.3-1.4"/></svg>;
    case 'leaf':
      return <svg {...common}><path d="M20.5 3.5C13 3.7 6 6.2 4.5 12.1c-1.1 4.2 2.3 7.6 6.5 6.5 5.9-1.5 8.4-8.5 8.6-16Z"/><path d="M5 20c3.2-5 7-8.4 12-11"/></svg>;
    case 'basket':
      return <svg {...common}><path d="M4 9h16l-1.4 10H5.4L4 9Z"/><path d="M8 9 12 3l4 6M3 9h18M8.5 13v3M12 13v3M15.5 13v3"/></svg>;
    case 'euro':
      return <svg {...common}><path d="M18 5.5A7 7 0 1 0 18 18.5"/><path d="M5 10h9M5 14h8"/></svg>;
    case 'users':
      return <svg {...common}><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20c.4-4 2.5-6.1 5.5-6.1s5.1 2.1 5.5 6.1M14 14.4c3.6-.5 5.8 1.3 6.5 4.6"/></svg>;
    case 'check':
      return <svg {...common}><path d="m5 12.5 4.2 4.2L19 7"/></svg>;
  }
}
