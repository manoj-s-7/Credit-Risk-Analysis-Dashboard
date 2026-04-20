'use client'

interface SidebarProps {
  active: string
  onChange: (tab: string) => void
}

const NAV = [
  {
    id: 'overview',
    label: 'Portfolio Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: 'analyzer',
    label: 'Data Analyzer',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    id: 'states',
    label: 'State Analysis',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5"/>
      </svg>
    ),
  },
  {
    id: 'insights',
    label: 'AI Insights',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4M12 8h.01"/>
      </svg>
    ),
  },
  {
    id: 'model',
    label: 'Model Performance',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20M4 20V10l8-6 8 6v10"/>
        <path d="M10 20v-6h4v6"/>
      </svg>
    ),
  },
  {
    id: 'explorer',
    label: 'Data Explorer',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
]

export default function Sidebar({ active, onChange }: SidebarProps) {
  return (
    <aside
      className="fixed left-0 top-0 h-full w-56 flex flex-col z-30"
      style={{ background: 'white', borderRight: '1px solid #e2e8f0' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
          >
            CQ
          </div>
          <div>
            <p className="font-semibold text-sm text-ink-900 leading-none">CreditIQ</p>
            <p className="text-xs text-ink-300 mt-0.5">Risk Platform v3</p>
          </div>
        </div>
      </div>

      {/* Live indicator */}
      <div className="px-5 py-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-ink-500">6,500 records · Live</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-ink-300 uppercase tracking-wider">
          Navigation
        </p>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`nav-item w-full text-left ${active === item.id ? 'active' : ''}`}
          >
            <span className={active === item.id ? 'text-brand-600' : 'text-ink-300'}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-100">
        <p className="text-xs text-ink-300">Indian Credit Markets</p>
        <p className="text-xs text-ink-300 mt-0.5">FastAPI + Next.js</p>
      </div>
    </aside>
  )
}
