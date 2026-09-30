import {
  BookOpen,
  CreditCard,
  Flag,
  History,
  House,
  LayoutDashboard,
  Link2,
  MessageSquareText,
  ScanSearch,
  UserRound,
} from 'lucide-react'

// Desktop sidebar + mobile drawer
export const NAV_GROUPS = [
  { label: null, items: [{ to: '/', label: 'Home', icon: House }] },
  {
    label: 'Scan',
    items: [
      { to: '/scan/message', label: 'Scan Message', icon: MessageSquareText },
      { to: '/scan/url', label: 'Scan URL', icon: Link2 },
      { to: '/scan/payment', label: 'Payment Risk', icon: CreditCard },
    ],
  },
  {
    label: 'Activity',
    items: [
      { to: '/report', label: 'Report Scam', icon: Flag },
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/history', label: 'Scan History', icon: History },
    ],
  },
  { label: 'Resources', items: [{ to: '/learn', label: 'Learn Safety', icon: BookOpen }] },
  { label: 'Account', items: [{ to: '/profile', label: 'Profile', icon: UserRound }] },
]

// Mobile bottom navigation — the four most important actions
export const BOTTOM_NAV = [
  { to: '/', label: 'Home', icon: House, match: (p) => p === '/' },
  { to: '/scan/message', label: 'Scan', icon: ScanSearch, match: (p) => p.startsWith('/scan') },
  { to: '/history', label: 'History', icon: History, match: (p) => p.startsWith('/history') },
  { to: '/profile', label: 'Profile', icon: UserRound, match: (p) => p.startsWith('/profile') },
]

export const PAGE_TITLES = {
  '/': ['Overview', 'Home'],
  '/scan/message': ['Scan', 'Message'],
  '/scan/url': ['Scan', 'URL'],
  '/scan/payment': ['Scan', 'Payment risk'],
  '/report': ['Activity', 'Report scam'],
  '/dashboard': ['Activity', 'Dashboard'],
  '/history': ['Activity', 'Scan history'],
  '/learn': ['Resources', 'Learn safety'],
  '/profile': ['Account', 'Profile'],
  '/privacy': ['Legal', 'Privacy policy'],
  '/terms': ['Legal', 'Terms & conditions'],
}

export function pageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/history/')) return ['Scan history', 'Scan result']
  return ['', 'Not found']
}
